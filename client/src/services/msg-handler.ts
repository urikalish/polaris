const msgToCbMap: Map<string, (...args: any[]) => any> = new Map();

const port = chrome.runtime.connect();
port.onMessage.addListener(function (response) {
    if (msgToCbMap.has(response.type)) {
        const cb = msgToCbMap.get(response.type);
        if (cb) {
            cb(response);
        }
    }
});

export function registerMsgCb(msgType: string, cb: any) {
    msgToCbMap.set(msgType, cb);
}

export function unregisterMsgCb(msgType: string) {
    msgToCbMap.delete(msgType);
}

export function sendMsgToBgPage(request: { type: string; params: string }, cb: any) {
    registerMsgCb(request.type, cb);
    port.postMessage(request);
}
