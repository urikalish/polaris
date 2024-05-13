chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'get-pull-requests') {
        const response = { msg: 'Hello' };
        sendResponse(response);
    }
});
