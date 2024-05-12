const localStorageConfigKey = 'polaris';

export type ConfigObj = {
    gitHubUserName?: string;
};

export function loadConfigValues(cb: (configObj: ConfigObj) => void) {
    chrome.storage.local.get([localStorageConfigKey], (configObj: ConfigObj) => {
        console.log(configObj);
        cb({
            gitHubUserName: configObj.gitHubUserName || 'john-doe',
        });
    });
}

export function saveConfigValues(configObj: ConfigObj) {
    console.log(configObj);
    chrome.storage.local.set({ localStorageConfigKey: configObj }, () => {});
}
