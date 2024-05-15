import './PullRequests.css';
import { useCallback, useState } from 'react';
import { Button } from '@mui/material';
import { ConfigObj } from '../../services/config.ts';
import { sendMsgToBgPage } from '../../services/msg-handler.ts';
import loadingImage from './loading.svg';

type PullRequestRec = {
    number: number;
    htmlUrl: string;
    state: string;
    title: string;
    branch: string;
    owner: string;
    reviewers: string[];
    assignees: string[];
    type?: string;
};

type PullRequestsProps = {
    config: ConfigObj | null;
};

export function PullRequests({ config }: PullRequestsProps) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(true);
    const [merged, setMerged] = useState(true);
    const [closed, setClosed] = useState(false);
    const [owner, setOwner] = useState(true);
    const [reviewer, setReviewer] = useState(true);
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
                    if (pr.owner === username) {
                        pr.type = 'owner';
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

    const handleToggleOpen = useCallback(() => {
        setOpen((val) => !val);
    }, []);

    const handleToggleMerged = useCallback(() => {
        setMerged((val) => !val);
    }, []);

    const handleToggleClosed = useCallback(() => {
        setClosed((val) => !val);
    }, []);
    const handleToggleOwner = useCallback(() => {
        setOwner((val) => !val);
    }, []);

    const handleToggleReviewer = useCallback(() => {
        setReviewer((val) => !val);
    }, []);

    const handleToggleAssignee = useCallback(() => {
        setAssignee((val) => !val);
    }, []);

    return (
        <div className="pull-requests content-with-actions overflow--hidden">
            <div
                className={`prs-wrapper height--100 overflow--hidden ${open ? 'open' : ''} ${merged ? 'merged' : ''} ${closed ? 'closed' : ''} ${owner ? 'owner' : ''} ${reviewer ? 'reviewer' : ''} ${assignee ? 'assignee' : ''}`}
            >
                {loading && <img src={loadingImage} className="loading-spinner" alt="Loading..." />}
                {prs.length && (
                    <div className="prs-filter position--relative display--flex align-items--center">
                        <Button className="filter-btn filter-btn--open" onClick={handleToggleOpen}>
                            open
                        </Button>
                        <Button className="filter-btn filter-btn--merged" onClick={handleToggleMerged}>
                            merged
                        </Button>
                        <Button className="filter-btn filter-btn--closed" onClick={handleToggleClosed}>
                            closed
                        </Button>
                        <Button className="filter-btn filter-btn--owner" onClick={handleToggleOwner}>
                            owner
                        </Button>
                        <Button className="filter-btn filter-btn--reviewer" onClick={handleToggleReviewer}>
                            reviewer
                        </Button>
                        <Button className="filter-btn filter-btn--assignee" onClick={handleToggleAssignee}>
                            assignee
                        </Button>
                    </div>
                )}
                <div className="prs-container position--relative overflow--auto custom-scroll">
                    {prs.map((pr) => (
                        <div key={pr.number} className={`pr-container content-panel ${pr.state} ${pr.type}`}>
                            <div className="pr-line">
                                <span className={`pr-state pr-state--${pr.state}`}>{pr.state}</span>
                                <a href={pr.htmlUrl} target="_blank" className="pr-link">
                                    {pr.number}
                                </a>
                                <span className="pr-title ellipsis" title={pr.title}>
                                    {pr.title}
                                </span>
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
