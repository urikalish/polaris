async function getPrsFromServer(request: any) {
    try {
        const res = await fetch(`${request.serverUrl}/${request.type}${request.params ? `?${request.params}` : ''}`);
        const responseObj = await res.json();
        if (responseObj.error) {
            return { type: request.type, error: responseObj.error };
        } else {
            return { type: request.type, data: responseObj.data };
        }
    } catch (error: any) {
        return { type: request.type, error: error.toString() };
    }
}

chrome.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
    if (['pull-requests'].includes(request.type)) {
        getPrsFromServer(request).then((response) => {
            sendResponse(response);
        });
        return true;
    }
});
