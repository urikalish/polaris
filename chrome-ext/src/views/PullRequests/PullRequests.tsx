import './PullRequests.css';
import { useCallback } from 'react';
import { Button } from '@mui/material';
import { ConfigObj } from '../../services/config.ts';

type PullRequestsProps = {
    config: ConfigObj | null;
};

export function PullRequests({ config }: PullRequestsProps) {
    const handleRefresh = useCallback(() => {
        alert('refresh');
    }, []);

    return (
        <div className="pull-requests content-with-actions">
            <div className="content-panel">{config?.gitHubUserName}</div>
            <div className="actions-panel">
                <Button variant="contained" onClick={handleRefresh}>
                    Refresh
                </Button>
            </div>
        </div>
    );
}
