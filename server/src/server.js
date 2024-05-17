require('dotenv').config();
const GITHUB_MINUTES_BETWEEN_UPDATES = process.env.GITHUB_MINUTES_BETWEEN_UPDATES;

const { Worker } = require('worker_threads');
const cors = require('cors');
const express = require('express');

const PORT = 1948;

const app = express();
app.use(cors());

let allPrs = [];

const gitHubWorker = new Worker('./github-worker.js');
gitHubWorker.on('message', (updatedPrs) => {
    allPrs = updatedPrs;
    setTimeout(
        () => {
            updatePrs(allPrs);
        },
        GITHUB_MINUTES_BETWEEN_UPDATES * 60 * 1000,
    );
});
function updatePrs(outdatedPrs) {
    gitHubWorker.postMessage(outdatedPrs);
}

app.get('/pull-requests', async (req, res) => {
    try {
        const username = req.query.username;
        const prs = allPrs.filter((pr) => pr.creator === username || pr.reviewers.includes(username) || pr.assignees.includes(username));
        res.send({ data: { prs } });
    } catch (error) {
        res.send({ error: error.toString() });
    }
});

function init() {
    console.log('Server starting...');
    app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
    updatePrs(allPrs);
}

init();
