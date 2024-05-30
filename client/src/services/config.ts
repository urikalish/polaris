import { PrUserRole } from './enums.ts';

export type ConfigObj = {
    serverUrl?: string;
    gitHubUserName?: string;
    uiTheme?: string;
    prsFilterRole?: string;
};

const STORAGE_MAIN_KEY = 'polaris';

export function loadConfigValues(cb: (configObj: ConfigObj) => void) {
    chrome.storage.local.get(STORAGE_MAIN_KEY, (data: any) => {
        const configObj = data[STORAGE_MAIN_KEY];
        cb({
            serverUrl: configObj?.serverUrl || `http://chrome-ext.octane.admlabs.aws.swinfra.net:8082`,
            gitHubUserName: configObj?.gitHubUserName || '',
            uiTheme: configObj?.uiTheme || 'dark',
            prsFilterRole: configObj?.prsFilterRole || PrUserRole.CREATOR,
        });
    });
}

export function saveConfigValues(configObj: ConfigObj) {
    chrome.storage.local.set({ [STORAGE_MAIN_KEY]: configObj }, () => {});
}
