import './Settings.css';
import { Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';

type SettingsProps = {
    serverUrl?: string;
    gitHubUserName?: string;
    uiTheme?: string;
    onUpdateConfig: (configChangesObj: object) => void;
};
export function Settings({ serverUrl, gitHubUserName, uiTheme, onUpdateConfig }: SettingsProps) {
    const [newServerUrl, setNewServerUrl] = useState(serverUrl || '');
    const [newGitHubUserName, setNewGitHubUserName] = useState(gitHubUserName || '');
    const [newUiTheme, setNewUiTheme] = useState(uiTheme || '');
    const [canSave, setCanSave] = useState(false);

    useEffect(() => {}, []);

    const handleChangeServerUrl = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            setNewServerUrl(e.target.value);
            setCanSave(!!e.target.value && !!newGitHubUserName);
        },
        [newGitHubUserName],
    );

    const handleChangeGitHubUserName = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            setNewGitHubUserName(e.target.value);
            setCanSave(!!e.target.value && !!newServerUrl);
        },
        [newServerUrl],
    );

    const handleChangeUiTheme = useCallback(
        (e: SelectChangeEvent<string>) => {
            setNewUiTheme(e.target.value);
            setCanSave(!!newServerUrl && !!newGitHubUserName);
        },
        [newServerUrl, newGitHubUserName],
    );

    const handleSave = useCallback(() => {
        onUpdateConfig({ serverUrl: newServerUrl.trim() || '', gitHubUserName: newGitHubUserName.trim() || '', uiTheme: newUiTheme.trim() || '' });
        setCanSave(false);
    }, [newServerUrl, newGitHubUserName, newUiTheme, onUpdateConfig]);

    return (
        <div className="settings content-with-actions">
            <div className="content-panel border">
                <div className="settings-form">
                    <FormControl>
                        <TextField id="server-url" label="Server URL" variant="outlined" value={newServerUrl} error={!newServerUrl} onChange={handleChangeServerUrl} />
                    </FormControl>
                    <FormControl>
                        <TextField
                            id="github-username"
                            label="GitHub Username"
                            variant="outlined"
                            value={newGitHubUserName}
                            error={!newGitHubUserName}
                            onChange={handleChangeGitHubUserName}
                        />
                    </FormControl>
                    <FormControl>
                        <InputLabel id="ui-theme-label">UI Theme</InputLabel>
                        <Select labelId="ui-theme-label" id="ui-theme-select" value={newUiTheme} label="Ui Theme" onChange={handleChangeUiTheme}>
                            <MenuItem value="light">Light</MenuItem>
                            <MenuItem value="dark">Dark</MenuItem>
                            <MenuItem value="bokeh">Bokeh (animated)</MenuItem>
                        </Select>
                    </FormControl>
                </div>
            </div>
            <div className="actions-panel">
                <Button variant="contained" disabled={!canSave} onClick={handleSave}>
                    Save
                </Button>
            </div>
        </div>
    );
}
