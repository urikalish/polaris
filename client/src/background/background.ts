const SERVER_URL = 'http://localhost:1948';

chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener(async (request) => {
        if (['pull-requests'].includes(request.type)) {
            const res = await fetch(`${SERVER_URL}/${request.type}${request.params ? `?${request.params}` : ''}`);
            const responseObj = await res.json();
            port.postMessage(responseObj);
        }
    });
});
