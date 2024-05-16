import './PullRequests.css';
import { useCallback, useState } from 'react';
import { Button, FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import { ConfigObj } from '../../services/config.ts';
import { sendMsgToBgPage } from '../../services/msg-handler.ts';
import loadingImage from './loading.svg';
import prOpenImage from './pr-open.svg';
import prMergedImage from './pr-merged.svg';
import prDraftImage from './pr-draft.svg';
import prClosedImage from './pr-closed.svg';

enum PrState {
    OPEN = 'open',
    MERGED = 'merged',
    DRAFT = 'draft',
    CLOSED = 'closed',
}

enum ReviewState {
    COMMENTED = 'commented',
    CHANGES_REQUESTED = 'changes_requested',
    APPROVED = 'approved',
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
            img = prOpenImage;
            break;
        case PrState.MERGED:
            img = prMergedImage;
            break;
        case PrState.DRAFT:
            img = prDraftImage;
            break;
        case PrState.CLOSED:
            img = prClosedImage;
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
            alert('Username is undefined');
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
                {loading && <img src={loadingImage} className="loading-spinner" alt="Loading..." />}
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
                            <div className="pr-line">{pr.reviewers.length > 0 && <span>(R) {pr.reviewers.toString().toLowerCase()}</span>}</div>
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
