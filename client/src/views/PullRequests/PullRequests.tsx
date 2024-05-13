import './PullRequests.css';
import { useCallback, useState } from 'react';
import { Button } from '@mui/material';
import { ConfigObj } from '../../services/config.ts';
import { sendMsgToBgPage } from '../../services/msg-handler.ts';

type PullRequestsProps = {
    config: ConfigObj | null;
};

export function PullRequests({ config }: PullRequestsProps) {
    const [canRefresh, setCanRefresh] = useState(true);

    const handleRefresh = useCallback(() => {
        setCanRefresh(false);
        sendMsgToBgPage({ type: 'pull-requests', params: '' }, (response: any) => {
            alert(response.data.username);
            setCanRefresh(true);
        });
    }, []);

    return (
        <div className="pull-requests content-with-actions">
            <div className="content-panel">{config?.gitHubUserName}</div>
            <div className="actions-panel">
                <Button variant="contained" onClick={handleRefresh} disabled={!canRefresh}>
                    Refresh
                </Button>
            </div>
        </div>
    );
}
