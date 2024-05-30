import { AppBackground } from './components/AppBackground/AppBackground.tsx';
import { AppMasthead } from './components/AppMasthead/AppMasthead.tsx';
import { Tab, Tabs } from '@mui/material';
import { SyntheticEvent, useCallback, useEffect, useState } from 'react';

import './App.css';
import { Settings } from './views/Settings/Settings.tsx';
import { ConfigObj, loadConfigValues, saveConfigValues } from './services/config.ts';
import { PullRequests } from './views/PullRequests/PullRequests.tsx';
import { About } from './views/About/About.tsx';

function App() {
    const [config, setConfig] = useState<ConfigObj | null>(null);
    const [tabIndex, setTabIndex] = useState(0);

    useEffect(() => {
        loadConfigValues((configObj) => {
            setConfig(configObj);
        });
    }, []);

    const handleChangeTab = useCallback((_e: SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    }, []);

    const handleUpdateConfig = useCallback(
        (configChangesObj: object) => {
            const newConfig = { ...config, ...configChangesObj };
            saveConfigValues(newConfig);
            setConfig(newConfig);
        },
        [config],
    );

    return (
        <div className={`height--100 overflow--hidden theme--${config?.uiTheme || 'dark'}`}>
            <AppBackground uiTheme={config?.uiTheme} />
            <div className="main-container">
                <AppMasthead />

                <Tabs value={tabIndex} onChange={handleChangeTab} aria-label="basic tabs example">
                    <Tab label="Pull Requests" />
                    <Tab label="Settings" />
                    <Tab label="About" />
                </Tabs>

                {tabIndex === 0 && (
                    <PullRequests serverUrl={config?.serverUrl} gitHubUserName={config?.gitHubUserName} prsFilterRole={config?.prsFilterRole} onUpdateConfig={handleUpdateConfig} />
                )}
                {tabIndex === 1 && <Settings serverUrl={config?.serverUrl} gitHubUserName={config?.gitHubUserName} uiTheme={config?.uiTheme} onUpdateConfig={handleUpdateConfig} />}
                {tabIndex === 2 && <About />}
            </div>
        </div>
    );
}

export default App;
