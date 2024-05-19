import './Settings.css';
import { ConfigObj } from '../../services/config.ts';
import { Button, TextField } from '@mui/material';
import { ChangeEvent, useCallback, useState } from 'react';

type SettingsProps = {
    config: ConfigObj | null;
    onSaveConfig: (configObj: ConfigObj) => void;
};
export function Settings({ config, onSaveConfig }: SettingsProps) {
    const [serverUrl, setServerUrl] = useState(config?.serverUrl || '');
    const [gitHubUserName, setGitHubUserName] = useState(config?.gitHubUserName || '');

    const handleChangeServerUrl = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setServerUrl(e.target.value);
    }, []);

    const handleChangeGitHubUserName = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setGitHubUserName(e.target.value);
    }, []);

    const handleSave = useCallback(() => {
        const configOj: ConfigObj = {
            serverUrl: serverUrl.trim() || '',
            gitHubUserName: gitHubUserName.trim() || '',
        };
        onSaveConfig(configOj);
    }, [serverUrl, gitHubUserName, onSaveConfig]);

    return (
        <div className="settings content-with-actions">
            <div className="content-panel">
                <div className="settings-form">
                    <TextField id="server-url" label="Server URL" variant="outlined" value={serverUrl} onChange={handleChangeServerUrl} />
                    <TextField id="github-username" label="GitHub UserName" variant="outlined" value={gitHubUserName} onChange={handleChangeGitHubUserName} />
                </div>
            </div>
            <div className="actions-panel">
                <Button variant="contained" onClick={handleSave}>
                    Save
                </Button>
            </div>
        </div>
    );
}
