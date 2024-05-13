const SERVER_URL = 'http://localhost:1948';

chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener(async (request) => {
        if (['pull-requests'].includes(request.type)) {
            try {
                const res = await fetch(`${SERVER_URL}/${request.type}${request.params ? `?${request.params}` : ''}`);
                const responseObj = await res.json();
                if (responseObj.error) {
                    port.postMessage({ type: request.type, error: responseObj.error });
                } else {
                    port.postMessage({ type: request.type, data: responseObj.data });
                }
            } catch (error: any) {
                port.postMessage({ type: request.type, error: error.toString() });
            }
        }
    });
});
