export type ConfigObj = {
    gitHubUserName?: string;
};

export function loadConfigValues(cb: (configObj: ConfigObj) => void) {
    chrome.storage.local.get('polaris', (data: any) => {
        const configObj = data.polaris;
        cb({
            gitHubUserName: configObj?.gitHubUserName || 'john-doe',
        });
    });
}

export function saveConfigValues(configObj: ConfigObj) {
    chrome.storage.local.set({ polaris: configObj }, () => {});
}
