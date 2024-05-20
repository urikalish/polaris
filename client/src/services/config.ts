export type ConfigObj = {
    serverUrl?: string;
    gitHubUserName?: string;
    uiTheme?: string;
};

const STORAGE_MAIN_KEY = 'polaris';

export function loadConfigValues(cb: (configObj: ConfigObj) => void) {
    chrome.storage.local.get(STORAGE_MAIN_KEY, (data: any) => {
        const configObj = data[STORAGE_MAIN_KEY];
        cb({
            serverUrl: configObj?.serverUrl || `http://localhost:3000`,
            gitHubUserName: configObj?.gitHubUserName || 'john-doe',
            uiTheme: configObj?.uiTheme || 'bokeh',
        });
    });
}

export function saveConfigValues(configObj: ConfigObj) {
    chrome.storage.local.set({ [STORAGE_MAIN_KEY]: configObj }, () => {});
}
