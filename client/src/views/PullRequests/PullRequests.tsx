import './PullRequests.css';
import { useCallback, useState } from 'react';
import { Button } from '@mui/material';
import { ConfigObj } from '../../services/config.ts';

type PullRequestsProps = {
    config: ConfigObj | null;
};

export function PullRequests({ config }: PullRequestsProps) {
    const [canRefresh, setCanRefresh] = useState(true);

    const handleRefresh = useCallback(() => {
        setCanRefresh(false);
        chrome.runtime.sendMessage({ action: 'get-pull-requests' }, (response) => {
            alert(response.msg);
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
