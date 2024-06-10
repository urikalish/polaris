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
                chrome.action.setBadgeText({ text: '' });
                return;
            }
            chrome.action.setBadgeBackgroundColor({ color: '#444' });
            chrome.action.setBadgeText({ text: response.data?.numberOfAwaitedReviews.toString() || '' });
        });
    });
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateAwaitedReviews') {
        updateAwaitedReviews();
    }
});

const MINUTES_BEFORE_FIRST_UPDATE_AWAITED_REVIEWS = 1 / 6;
const MINUTES_BETWEEN_AWAITED_REVIEWS_UPDATES = 5;

function init() {
    chrome.action.setBadgeText({ text: '' });
    chrome.alarms.create('updateAwaitedReviews', {
        delayInMinutes: MINUTES_BEFORE_FIRST_UPDATE_AWAITED_REVIEWS,
        periodInMinutes: MINUTES_BETWEEN_AWAITED_REVIEWS_UPDATES,
    });
}

init();
