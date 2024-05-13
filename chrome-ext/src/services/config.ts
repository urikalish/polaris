export type ConfigObj = {
    gitHubUserName?: string;
};

const STORAGE_MAIN_KEY = 'polaris';

export function loadConfigValues(cb: (configObj: ConfigObj) => void) {
    chrome.storage.local.get(STORAGE_MAIN_KEY, (data: any) => {
        const configObj = data[STORAGE_MAIN_KEY];
        cb({
            gitHubUserName: configObj?.gitHubUserName || 'john-doe',
        });
    });
}

export function saveConfigValues(configObj: ConfigObj) {
    chrome.storage.local.set({ [STORAGE_MAIN_KEY]: configObj }, () => {});
}
