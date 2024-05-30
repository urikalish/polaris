function getTimeStr() {
    const currentDateTime = new Date();
    const day = String(currentDateTime.getDate()).padStart(2, '0');
    const month = String(currentDateTime.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = String(currentDateTime.getFullYear()).slice(2, 4); // Get the last two digits of the year
    const hours = String(currentDateTime.getHours()).padStart(2, '0');
    const minutes = String(currentDateTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentDateTime.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function log(...msg) {
    console.log(`[${getTimeStr()}] ${msg.join(' ')}`);
}
function error(...msg) {
    console.error(`[${getTimeStr()}] ########## ERROR ########## ${msg.join(' ')}`);
}

module.exports = {
    log,
    error,
};
