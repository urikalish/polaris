import './PullRequests.css';
import { useCallback, useState } from 'react';
import { Button, FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import { ConfigObj } from '../../services/config.ts';
import loadingImg from './img/loading.svg';
import prOpenImg from './img/pr-open.svg';
import prMergedImg from './img/pr-merged.svg';
import prDraftImg from './img/pr-draft.svg';
import prClosedImg from './img/pr-closed.svg';
import rvApprovedImg from './img/rv-approved.svg';
import rvAwaitingImg from './img/rv-awaiting.svg';
import rvCommentedImg from './img/rv-commented.svg';
import rvChangesImg from './img/rv-changes.svg';
import rvDismissedImg from './img/rv-dismissed.svg';

enum PrState {
    OPEN = 'open',
    MERGED = 'merged',
    DRAFT = 'draft',
    CLOSED = 'closed',
}

enum ReviewState {
    AWAITING = 'awaiting',
    COMMENTED = 'commented',
    CHANGES_REQUESTED = 'changes_requested',
    APPROVED = 'approved',
    DISMISSED = 'dismissed',
}

enum MyRole {
    CREATOR = 'creator',
    REVIEWER = 'reviewer',
    ASSIGNEE = 'assignee',
}

enum JobType {
    CUSTOM_QUICK_DEV = 'custom-quick-dev',
    CUSTOM_QUICK_PROD = 'custom-quick-prod',
    CUSTOM_FULL = 'custom-full',
}

const customJobTypes: JobType[] = [JobType.CUSTOM_QUICK_DEV, JobType.CUSTOM_QUICK_PROD, JobType.CUSTOM_FULL];

function getBuildShortName(jt: JobType) {
    if (jt === JobType.CUSTOM_QUICK_DEV) {
        return 'QuickDev';
    }
    if (jt === JobType.CUSTOM_QUICK_PROD) {
        return 'QuickProd';
    }
    if (jt === JobType.CUSTOM_FULL) {
        return 'Full';
    }
    return '???';
}

enum BuildResult {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    UNSTABLE = 'UNSTABLE',
    ABORTED = 'ABORTED',
}

type BuildRec = {
    jobType: JobType;
    jobName: string;
    number: number;
    url: string;
    branch: string;
    timestamp: number;
    inProgress: boolean;
    result: BuildResult;
    userId: string;
    userName: string;
};

type PullRequestRec = {
    number: number;
    htmlUrl: string;
    state: PrState;
    title: string;
    branch: string;
    creator: string;
    assignees: string[];
    reviewers: string[];
    reviews: { user: string; state: ReviewState }[];
    myRole: MyRole;
    builds: BuildRec[];
};

const stateFilters = [PrState.OPEN, PrState.MERGED, PrState.DRAFT, PrState.CLOSED];

const stateToImg = {
    [PrState.OPEN]: prOpenImg,
    [PrState.MERGED]: prMergedImg,
    [PrState.DRAFT]: prDraftImg,
    [PrState.CLOSED]: prClosedImg,
};

const reviewStateToImg = {
    [ReviewState.AWAITING]: rvAwaitingImg,
    [ReviewState.COMMENTED]: rvCommentedImg,
    [ReviewState.CHANGES_REQUESTED]: rvChangesImg,
    [ReviewState.APPROVED]: rvApprovedImg,
    [ReviewState.DISMISSED]: rvDismissedImg,
};

function getReviewStateForReviewer(pr: PullRequestRec, reviewerName: string): ReviewState {
    const review = pr.reviews.find((r) => r.user === reviewerName);
    return review ? review.state : ReviewState.AWAITING;
}

function getImgSrcForReviewState(pr: PullRequestRec, reviewerName: string): string {
    const reviewState = getReviewStateForReviewer(pr, reviewerName);
    return reviewStateToImg[reviewState];
}

type PullRequestsProps = {
    config: ConfigObj | null;
};

function getLatestCustomBuilds(pr: PullRequestRec): BuildRec[] {
    if (pr.builds.length === 0) {
        return [];
    }
    const result: BuildRec[] | null = [];
    customJobTypes.forEach((jt) => {
        const jobBuilds = pr.builds.filter((b: BuildRec) => b.jobType === jt);
        let latestBuildTimestamp = 0;
        let latestBuildRec: BuildRec | null = null;
        jobBuilds.forEach((b: BuildRec) => {
            if (b.timestamp > latestBuildTimestamp) {
                latestBuildTimestamp = b.timestamp;
                latestBuildRec = b;
            }
        });
        if (latestBuildRec) {
            result.push(latestBuildRec);
        }
    });
    return result;
}

export function PullRequests({ config }: PullRequestsProps) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(true);
    const [merged, setMerged] = useState(true);
    const [draft, setDraft] = useState(false);
    const [closed, setClosed] = useState(false);
    const [role, setRole] = useState<MyRole>(MyRole.CREATOR);
    const [prs, setPrs] = useState<PullRequestRec[]>([]);

    const handleRefresh = useCallback(() => {
        setPrs([]);
        setLoading(true);
        const serverUrl = config?.serverUrl;
        if (!serverUrl) {
            alert('Server URL is undefined, please check the settings tab');
            setLoading(false);
            return;
        }
        const username = config?.gitHubUserName;
        if (!username) {
            alert('GitHub Username is undefined, please check the settings tab');
            setLoading(false);
            return;
        }
        const params = `username=${username}`;
        chrome.runtime.sendMessage({ type: 'pull-requests', params, serverUrl }, (response: any) => {
            if (response.error) {
                alert('Error: ' + response.error);
            } else {
                const prs: PullRequestRec[] = response.data['prs'];
                prs.forEach((pr) => {
                    if (pr.creator === username) {
                        pr.myRole = MyRole.CREATOR;
                    } else if (pr.reviewers.includes(username)) {
                        pr.myRole = MyRole.REVIEWER;
                    } else if (pr.assignees.includes(username)) {
                        pr.myRole = MyRole.ASSIGNEE;
                    }
                });
                setPrs(prs);
            }
            setLoading(false);
        });
    }, [config]);

    const handleToggleStateFilter = useCallback((e: any) => {
        switch (e.target.dataset.toggle) {
            case PrState.OPEN:
                setOpen((val) => !val);
                break;
            case PrState.MERGED:
                setMerged((val) => !val);
                break;
            case PrState.DRAFT:
                setDraft((val) => !val);
                break;
            case PrState.CLOSED:
                setClosed((val) => !val);
                break;
        }
    }, []);

    const handleChangeRoleFilter = useCallback((_event: any, value: any) => {
        setRole(value);
    }, []);

    return (
        <div className="pull-requests content-with-actions">
            <div className={`prs-wrapper ${open ? 'open' : ''} ${merged ? 'merged' : ''} ${draft ? 'draft' : ''} ${closed ? 'closed' : ''} ${role}`}>
                {loading && <img src={loadingImg} className="loading-spinner" alt="Loading..." />}
                {prs.length && (
                    <div className="prs-filters">
                        <div>
                            {stateFilters.map((f) => (
                                <Button className={`filter-btn filter-btn--${f}`} data-toggle={f} onClick={handleToggleStateFilter}>
                                    {f}
                                </Button>
                            ))}
                        </div>
                        <FormControl>
                            <RadioGroup row value={role} onChange={handleChangeRoleFilter}>
                                <FormControlLabel value={MyRole.CREATOR} control={<Radio size="small" />} label={MyRole.CREATOR} />
                                <FormControlLabel value={MyRole.REVIEWER} control={<Radio size="small" />} label={MyRole.REVIEWER} />
                                <FormControlLabel value={MyRole.ASSIGNEE} control={<Radio size="small" />} label={MyRole.ASSIGNEE} />
                            </RadioGroup>
                        </FormControl>
                    </div>
                )}
                <div className="prs-container custom-scroll">
                    {prs.map((pr) => (
                        <div key={pr.number} className={`pr-container content-panel ${pr.state} ${pr.myRole}`}>
                            <div className="pr-line">
                                <div className={`pr-state pr-state--${pr.state}`}>
                                    <img src={stateToImg[pr.state]} className="pr-state-img" title={pr.state} alt="state image" />
                                </div>
                                <a href={pr.htmlUrl} target="_blank" className="pr-link">
                                    {pr.number}
                                </a>
                                <span className="pr-title ellipsis" title={pr.title}>
                                    {pr.title}
                                </span>
                            </div>
                            {pr.reviewers.length > 0 && (
                                <div className="pr-line">
                                    {pr.reviewers.map((reviewerName) => (
                                        <div
                                            key={reviewerName}
                                            className={`pr-reviewer pr-review-state--${getReviewStateForReviewer(pr, reviewerName)}`}
                                            title={getReviewStateForReviewer(pr, reviewerName).replace('_', ' ')}
                                        >
                                            <img src={getImgSrcForReviewState(pr, reviewerName)} className="pr-review-state-img" alt="review state" />
                                            <span className="pr-reviewer-name">{reviewerName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {pr.builds.length > 0 && (
                                <div className="pr-line">
                                    {getLatestCustomBuilds(pr).map((b) => (
                                        <div
                                            key={b.url}
                                            className={`custom-build custom-build--${b.inProgress ? 'running' : b.result.toLowerCase()}`}
                                            title={b.inProgress ? 'running' : b.result.toLowerCase()}
                                        >
                                            <div className="build-led"></div>
                                            <a href={b.url} target="_blank" className="pr-link">
                                                <span className="custom-build-title">{`${getBuildShortName(b.jobType)}#${b.number}`}</span>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className="actions-panel">
                <Button variant="contained" onClick={handleRefresh} disabled={loading}>
                    Refresh
                </Button>
            </div>
        </div>
    );
}
