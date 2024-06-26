import './PullRequests.css';
import { useCallback, useEffect, useState } from 'react';
import { Button, FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import loadingImg from './img/loading.svg';
import prOpenImg from './img/pr-open.svg';
import prMergedImg from './img/pr-merged.svg';
import prDraftImg from './img/pr-draft.svg';
import prClosedImg from './img/pr-closed.svg';
import rvApprovedImg from './img/rv-approved.svg';
import rvAwaitingImg from './img/rv-awaiting.svg';
import rvChangesImg from './img/rv-changes.svg';
import rvCommentedImg from './img/rv-commented.svg';
import rvDismissedImg from './img/rv-dismissed.svg';
import rvOwnerImg from './img/rv-owner.svg';
import rvPendingImg from './img/rv-pending.svg';
import { PrUserRole, PrState } from '../../services/enums.ts';

enum ReviewState {
    OWNER = 'owner',
    AWAITING = 'awaiting',
    PENDING = 'pending',
    COMMENTED = 'commented',
    CHANGES_REQUESTED = 'changes_requested',
    APPROVED = 'approved',
    DISMISSED = 'dismissed',
}

enum JobType {
    CUSTOM_QUICK = 'custom-quick',
    CUSTOM_FULL = 'custom-full',
}

const customJobTypes: JobType[] = [JobType.CUSTOM_QUICK, JobType.CUSTOM_FULL];

function getBuildShortName(jt: JobType) {
    if (jt === JobType.CUSTOM_QUICK) {
        return 'Quick';
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
    jobOrdinal: number;
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
    repoName: string;
    repoFullName: string;
    number: number;
    htmlUrl: string;
    state: PrState;
    title: string;
    branch: string;
    creator: string;
    assignees: string[];
    reviewers: string[];
    reviews: { user: string; state: ReviewState }[];
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    mergedAt: string | null;
    mergeCommitSha: string | null;
    myRole: PrUserRole;
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
    [ReviewState.OWNER]: rvOwnerImg,
    [ReviewState.AWAITING]: rvAwaitingImg,
    [ReviewState.PENDING]: rvPendingImg,
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

type PullRequestsProps = {
    serverUrl?: string;
    gitHubUserName?: string;
    prsFilterStates?: string;
    prsStatesFilter?: string;
    prsRoleFilter?: string;
    onUpdateConfig: (configChangesObj: object) => void;
};

export function PullRequests({ serverUrl, gitHubUserName, prsStatesFilter, prsRoleFilter, onUpdateConfig }: PullRequestsProps) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(true);
    const [merged, setMerged] = useState(false);
    const [draft, setDraft] = useState(false);
    const [closed, setClosed] = useState(false);
    const [role, setRole] = useState<PrUserRole>(PrUserRole.CREATOR);
    const [prs, setPrs] = useState<PullRequestRec[]>([]);

    const handleRefresh = useCallback(() => {
        setPrs([]);
        setLoading(true);
        if (!serverUrl || !gitHubUserName) {
            setLoading(false);
            return;
        }
        const params = `username=${gitHubUserName}`;
        chrome.runtime.sendMessage({ type: 'pull-requests', params, serverUrl }, (response: any) => {
            if (response.error) {
                alert('Error: ' + response.error);
            } else {
                const prs: PullRequestRec[] = response.data['prs'];
                prs.forEach((pr) => {
                    if (pr.creator === gitHubUserName) {
                        pr.myRole = PrUserRole.CREATOR;
                    } else if (pr.reviewers.includes(gitHubUserName)) {
                        pr.myRole = PrUserRole.REVIEWER;
                    } else if (pr.assignees.includes(gitHubUserName)) {
                        pr.myRole = PrUserRole.ASSIGNEE;
                    }
                });
                prs.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : a.updatedAt < b.updatedAt ? 1 : 0));
                setPrs(prs);
            }
            setLoading(false);
        });
    }, [serverUrl, gitHubUserName]);

    useEffect(() => {
        if (serverUrl && gitHubUserName) {
            handleRefresh();
        }
    }, [serverUrl, gitHubUserName, handleRefresh]);

    useEffect(() => {
        if (prsStatesFilter) {
            const states = prsStatesFilter.split(',');
            setOpen(states.includes(PrState.OPEN));
            setMerged(states.includes(PrState.MERGED));
            setDraft(states.includes(PrState.DRAFT));
            setClosed(states.includes(PrState.CLOSED));
        }
    }, [prsStatesFilter]);

    const handleToggleStateFilter = useCallback(
        (e: any) => {
            let o = open;
            let m = merged;
            let d = draft;
            let c = closed;
            switch (e.target.dataset.toggle) {
                case PrState.OPEN:
                    o = !o;
                    setOpen((val) => !val);
                    break;
                case PrState.MERGED:
                    m = !m;
                    setMerged((val) => !val);
                    break;
                case PrState.DRAFT:
                    d = !d;
                    setDraft((val) => !val);
                    break;
                case PrState.CLOSED:
                    c = !c;
                    setClosed((val) => !val);
                    break;
            }
            const newStates = [];
            if (o) {
                newStates.push(PrState.OPEN);
            }
            if (m) {
                newStates.push(PrState.MERGED);
            }
            if (d) {
                newStates.push(PrState.DRAFT);
            }
            if (c) {
                newStates.push(PrState.CLOSED);
            }
            onUpdateConfig({ prsStatesFilter: newStates.join(',') });
        },
        [open, merged, draft, closed, onUpdateConfig],
    );

    useEffect(() => {
        if (prsRoleFilter) {
            setRole(prsRoleFilter as PrUserRole);
        }
    }, [prsRoleFilter]);

    const handleChangeRoleFilter = useCallback(
        (_event: any, value: any) => {
            setRole(value);
            onUpdateConfig({ prsRoleFilter: value });
        },
        [onUpdateConfig],
    );

    return (
        <div className="pull-requests content-with-actions">
            <div className={`prs-wrapper content-panel border ${open ? 'open' : ''} ${merged ? 'merged' : ''} ${draft ? 'draft' : ''} ${closed ? 'closed' : ''} ${role}`}>
                {loading && <img src={loadingImg} className="loading-spinner" alt="Loading..." />}
                {prs.length > 0 && (
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
                                <FormControlLabel value={PrUserRole.CREATOR} control={<Radio size="small" />} label={PrUserRole.CREATOR} />
                                <FormControlLabel value={PrUserRole.REVIEWER} control={<Radio size="small" />} label={PrUserRole.REVIEWER} />
                                <FormControlLabel value={PrUserRole.ASSIGNEE} control={<Radio size="small" />} label={PrUserRole.ASSIGNEE} />
                            </RadioGroup>
                        </FormControl>
                    </div>
                )}
                {prs.length > 0 && (
                    <div className="prs-container custom-scroll">
                        {prs.map((pr) => (
                            <div key={pr.number} className={`pr-container ${pr.state} ${pr.myRole}`}>
                                <div className="pr-left-side">
                                    <div className="pr-line--grid">
                                        <div className={`pr-state pr-state--${pr.state}`}>
                                            <img src={stateToImg[pr.state]} className="pr-state-img" title={pr.state} alt="state image" />
                                        </div>
                                        <a href={pr.htmlUrl} target="_blank" className="pr-link">
                                            <span className="pr-number">[{pr.number}]</span>
                                        </a>
                                        <span className="pr-title ellipsis" title={pr.title}>
                                            {pr.title}
                                        </span>
                                    </div>
                                    <div className="pr-line--flex">
                                        <div className="pr-reviewer pr-review-state--owner" title="owner">
                                            <img src={reviewStateToImg[ReviewState.OWNER]} className="pr-review-state-img" alt="review state" />
                                            <span className="pr-reviewer-name">{pr.creator}</span>
                                        </div>
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
                                </div>
                                <div className="pr-right-side">
                                    {pr.builds.length > 0 && (
                                        <>
                                            {getLatestCustomBuilds(pr).map((b) => (
                                                <div className="pr-line--flex">
                                                    <div
                                                        key={b.url}
                                                        className={`custom-build custom-build--${b.inProgress ? 'running' : b.result.toLowerCase()}`}
                                                        title={b.inProgress ? 'running' : b.result.toLowerCase()}
                                                    >
                                                        <div className="build-led"></div>
                                                        <a href={b.url} target="_blank" className="pr-link">
                                                            <span className="custom-build-title">{getBuildShortName(b.jobType)}</span>
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="actions-panel">
                <Button variant="contained" onClick={handleRefresh} disabled={loading}>
                    Refresh
                </Button>
            </div>
        </div>
    );
}
