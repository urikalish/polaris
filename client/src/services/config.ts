import { PrState, PrUserRole } from './enums.ts';

export type ConfigObj = {
    serverUrl?: string;
    gitHubUserName?: string;
    uiTheme?: string;
    prsStatesFilter?: string;
    prsRoleFilter?: string;
};

const STORAGE_MAIN_KEY = 'polaris';

export function loadConfigValues(cb: (configObj: ConfigObj) => void) {
    chrome.storage.local.get(STORAGE_MAIN_KEY, (data: any) => {
        const configObj = data[STORAGE_MAIN_KEY];
        cb({
            serverUrl: configObj?.serverUrl || `http://chrome-ext.octane.admlabs.aws.swinfra.net:8082`,
            gitHubUserName: configObj?.gitHubUserName || '',
            uiTheme: configObj?.uiTheme || 'dark',
            prsStatesFilter: configObj?.prsStatesFilter || PrState.OPEN,
            prsRoleFilter: configObj?.prsRoleFilter || PrUserRole.CREATOR,
        });
    });
}

export function saveConfigValues(configObj: ConfigObj) {
    chrome.storage.local.set({ [STORAGE_MAIN_KEY]: configObj }, () => {});
}
