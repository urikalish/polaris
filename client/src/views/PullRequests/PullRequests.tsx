import './PullRequests.css';
import { useCallback, useState } from 'react';
import { Button, FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import { ConfigObj } from '../../services/config.ts';
import { sendMsgToBgPage } from '../../services/msg-handler.ts';
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
};

const stateFilters = [PrState.OPEN, PrState.MERGED, PrState.DRAFT, PrState.CLOSED];

function getImgSrcByState(state: PrState): string {
    let img = '';
    switch (state) {
        case PrState.OPEN:
            img = prOpenImg;
            break;
        case PrState.MERGED:
            img = prMergedImg;
            break;
        case PrState.DRAFT:
            img = prDraftImg;
            break;
        case PrState.CLOSED:
            img = prClosedImg;
            break;
    }
    return img;
}

function getReviewStateForReviewer(pr: PullRequestRec, reviewerName: string): ReviewState {
    const review = pr.reviews.find((r) => r.user === reviewerName);
    return review ? review.state : ReviewState.AWAITING;
}

function getImgSrcForReviewState(pr: PullRequestRec, reviewerName: string): string {
    let img = rvAwaitingImg;
    const reviewState = getReviewStateForReviewer(pr, reviewerName);
    switch (reviewState) {
        case ReviewState.AWAITING:
            img = rvAwaitingImg;
            break;
        case ReviewState.COMMENTED:
            img = rvCommentedImg;
            break;
        case ReviewState.APPROVED:
            img = rvApprovedImg;
            break;
        case ReviewState.CHANGES_REQUESTED:
            img = rvChangesImg;
            break;
        case ReviewState.DISMISSED:
            img = rvDismissedImg;
            break;
    }
    return img;
}

type PullRequestsProps = {
    config: ConfigObj | null;
};

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
        const username = config?.gitHubUserName;
        if (!username) {
            alert('Username is undefined, please check the settings tab');
            setLoading(false);
            return;
        }
        const params = `username=${username}`;
        sendMsgToBgPage({ type: 'pull-requests', params }, (response: any) => {
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
                setPrs(response.data['prs']);
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
                                    <img src={getImgSrcByState(pr.state)} className="pr-state-img" title={pr.state} alt="state image" />
                                </div>
                                <a href={pr.htmlUrl} target="_blank" className="pr-link">
                                    {pr.number}
                                </a>
                                <span className="pr-title ellipsis" title={pr.title}>
                                    {pr.title}
                                </span>
                            </div>
                            <div className="pr-line">
                                {pr.reviewers.map((reviewerName) => (
                                    <div
                                        key={reviewerName}
                                        className={`pr-reviewer pr-review-state--${getReviewStateForReviewer(pr, reviewerName)}`}
                                        title={getReviewStateForReviewer(pr, reviewerName).replace('_', ' ')}
                                    >
                                        <img src={getImgSrcForReviewState(pr, reviewerName)} className="pr-review-state-img" alt="review state" />
                                        <span className="pr-reviewer-name">{reviewerName.toLowerCase()}</span>
                                    </div>
                                ))}
                            </div>
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
