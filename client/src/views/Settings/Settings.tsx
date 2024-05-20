import './Settings.css';
import { ConfigObj } from '../../services/config.ts';
import { Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';
import { ChangeEvent, useCallback, useState } from 'react';

type SettingsProps = {
    config: ConfigObj | null;
    onSaveConfig: (configObj: ConfigObj) => void;
};
export function Settings({ config, onSaveConfig }: SettingsProps) {
    const [serverUrl, setServerUrl] = useState(config?.serverUrl || '');
    const [gitHubUserName, setGitHubUserName] = useState(config?.gitHubUserName || '');
    const [uiTheme, setUiTheme] = useState(config?.uiTheme || '');

    const handleChangeServerUrl = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setServerUrl(e.target.value);
    }, []);

    const handleChangeGitHubUserName = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setGitHubUserName(e.target.value);
    }, []);

    const handleChangeUiTheme = useCallback((e: SelectChangeEvent<string>) => {
        setUiTheme(e.target.value);
    }, []);

    const handleSave = useCallback(() => {
        const configOj: ConfigObj = {
            serverUrl: serverUrl.trim() || '',
            gitHubUserName: gitHubUserName.trim() || '',
            uiTheme: uiTheme.trim() || '',
        };
        onSaveConfig(configOj);
    }, [serverUrl, gitHubUserName, uiTheme, onSaveConfig]);

    return (
        <div className="settings content-with-actions">
            <div className="content-panel">
                <div className="settings-form">
                    <FormControl>
                        <TextField id="server-url" label="Server URL" variant="outlined" value={serverUrl} onChange={handleChangeServerUrl} />
                    </FormControl>
                    <FormControl>
                        <TextField id="github-username" label="GitHub Username" variant="outlined" value={gitHubUserName} onChange={handleChangeGitHubUserName} />
                    </FormControl>
                    <FormControl>
                        <InputLabel id="ui-theme-label">UI Theme</InputLabel>
                        <Select labelId="ui-theme-label" id="ui-theme-select" value={uiTheme} label="Ui Theme" onChange={handleChangeUiTheme}>
                            <MenuItem value="dark">Dark</MenuItem>
                            <MenuItem value="bokeh">Bokeh (animated)</MenuItem>
                        </Select>
                    </FormControl>
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
