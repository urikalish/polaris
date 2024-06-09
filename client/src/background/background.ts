async function getDataFromServer(request: any) {
    try {
        const res = await fetch(`${request.serverUrl}/${request.type}${request.params ? `?${request.params}` : ''}`);
        const responseObj = await res.json();
        if (responseObj.error) {
            return { type: request.type, error: responseObj.error };
        } else {
            return { type: request.type, data: responseObj.data };
        }
    } catch (error: any) {
        if (error.toString() === 'TypeError: Failed to fetch') {
            return { type: request.type, error: 'Unable to fetch data from the server' };
        } else {
            return { type: request.type, error: error.toString() };
        }
    }
}

chrome.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
    if (request.type === 'pull-requests') {
        getDataFromServer(request).then((response) => {
            sendResponse(response);
        });
        return true;
    }
});

const SECONDS_BEFORE_FIRST_UPDATE_AWAITED_REVIEWS = 10;
const MINUTES_BETWEEN_UPDATE_AWAITED_REVIEWS = 1;

function updateAwaitedReviews() {
    const STORAGE_MAIN_KEY = 'polaris';
    chrome.storage.local.get(STORAGE_MAIN_KEY, (data: any) => {
        const { serverUrl, gitHubUserName } = data[STORAGE_MAIN_KEY];
        if (!serverUrl || !gitHubUserName) {
            return;
        }
        const request = {
            type: 'awaited-reviews',
            serverUrl,
            params: `username=${gitHubUserName}`,
        };
        getDataFromServer(request).then((response) => {
            if (response.error) {
                console.log(response.error);
                chrome.browserAction.setBadgeText({ text: '' });
                return;
            }
            chrome.action.setBadgeBackgroundColor({ color: '#444' });
            chrome.action.setBadgeText({ text: response.data.numberOfAwaitedReviews.toString() });
            setTimeout(updateAwaitedReviews, MINUTES_BETWEEN_UPDATE_AWAITED_REVIEWS * 60 * 1000);
        });
    });
}

function init() {
    setTimeout(() => {
        updateAwaitedReviews();
    }, SECONDS_BEFORE_FIRST_UPDATE_AWAITED_REVIEWS * 1000);
}

init();
