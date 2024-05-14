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
};

type PullRequestsProps = {
    config: ConfigObj | null;
};

export function PullRequests({ config }: PullRequestsProps) {
    const [loading, setLoading] = useState(false);
    const [prs, setPrs] = useState<PullRequestRec[]>([]);

    const handleRefresh = useCallback(() => {
        setPrs([]);
        setLoading(true);
        const params = config?.gitHubUserName ? `username=${config?.gitHubUserName}` : '';
        sendMsgToBgPage({ type: 'pull-requests', params }, (response: any) => {
            if (response.error) {
                alert('Error: ' + response.error);
            } else {
                //alert(JSON.stringify(response.data['prs']));
                setPrs(response.data['prs']);
            }
            setLoading(false);
        });
    }, [config]);

    return (
        <div className="pull-requests content-with-actions overflow--hidden">
            <div className="prs-container position--relative overflow--auto">
                {loading && <img src={loadingImage} className="loading-spinner" alt="Loading..." />}
                {prs.map((pr) => (
                    <div key={pr.number} className="pr-container content-panel">
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
            <div className="actions-panel">
                <Button variant="contained" onClick={handleRefresh} disabled={loading}>
                    Refresh
                </Button>
            </div>
        </div>
    );
}
