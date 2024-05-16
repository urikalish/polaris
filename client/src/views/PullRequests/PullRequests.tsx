import './PullRequests.css';
import { useCallback, useState } from 'react';
import { Button } from '@mui/material';
import { ConfigObj } from '../../services/config.ts';
import { sendMsgToBgPage } from '../../services/msg-handler.ts';
import loadingImage from './loading.svg';
import prOpenImage from './pr-open.svg';
import prMergedImage from './pr-merged.svg';
import prDraftImage from './pr-draft.svg';
import prClosedImage from './pr-closed.svg';

type PullRequestRec = {
    number: number;
    htmlUrl: string;
    state: 'open' | 'merged' | 'draft' | 'closed';
    title: string;
    branch: string;
    creator: string;
    assignees: string[];
    reviewers: string[];
    reviews: { user: string; state: 'commented' | 'changes_requested' | 'approved' }[];
    type?: 'creator' | 'reviewer' | 'assignee';
};

const filters = ['open', 'merged', 'draft', 'closed', 'creator', 'reviewer', 'assignee'];

function getImgSrcByState(state: string): string {
    let img = '';
    switch (state) {
        case 'open':
            img = prOpenImage;
            break;
        case 'merged':
            img = prMergedImage;
            break;
        case 'draft':
            img = prDraftImage;
            break;
        case 'closed':
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
    const [creator, setCreator] = useState(true);
    const [reviewer, setReviewer] = useState(false);
    const [assignee, setAssignee] = useState(false);
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
                        pr.type = 'creator';
                    } else if (pr.reviewers.includes(username)) {
                        pr.type = 'reviewer';
                    } else if (pr.assignees.includes(username)) {
                        pr.type = 'assignee';
                    }
                });
                setPrs(response.data['prs']);
            }
            setLoading(false);
        });
    }, [config]);

    const handleFilterToggle = useCallback((e: any) => {
        switch (e.target.dataset.toggle) {
            case 'open':
                setOpen((val) => !val);
                break;
            case 'merged':
                setMerged((val) => !val);
                break;
            case 'draft':
                setDraft((val) => !val);
                break;
            case 'closed':
                setClosed((val) => !val);
                break;
            case 'creator':
                setCreator((val) => !val);
                break;
            case 'reviewer':
                setReviewer((val) => !val);
                break;
            case 'assignee':
                setAssignee((val) => !val);
                break;
        }
    }, []);

    return (
        <div className="pull-requests content-with-actions">
            <div
                className={`prs-wrapper ${open ? 'open' : ''} ${merged ? 'merged' : ''} ${draft ? 'draft' : ''} ${closed ? 'closed' : ''} ${creator ? 'creator' : ''} ${reviewer ? 'reviewer' : ''} ${assignee ? 'assignee' : ''}`}
            >
                {loading && <img src={loadingImage} className="loading-spinner" alt="Loading..." />}
                {prs.length && (
                    <div className="prs-filter">
                        {filters.map((f) => (
                            <Button className={`filter-btn filter-btn--${f}`} data-toggle={f} onClick={handleFilterToggle}>
                                {f}
                            </Button>
                        ))}
                    </div>
                )}
                <div className="prs-container custom-scroll">
                    {prs.map((pr) => (
                        <div key={pr.number} className={`pr-container content-panel ${pr.state} ${pr.type}`}>
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
                                <span>(C) {pr.creator.toLowerCase()}</span>
                                <span>(R) {pr.reviewers.toString().toLowerCase()}</span>
                                <span>(A) {pr.assignees.toString().toLowerCase()}</span>
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
