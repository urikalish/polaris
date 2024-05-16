require('dotenv').config();
const { Worker } = require('worker_threads');
const cors = require('cors');
const express = require('express');

const PORT = 1948;

const app = express();
app.use(cors());

let allPRs = [];

const gitHubWorker = new Worker('./github-worker.js');
gitHubWorker.on('message', (result) => {
    allPRs = result;
});
function refreshGitHubData() {
    gitHubWorker.postMessage({});
}

app.get('/pull-requests', async (req, res) => {
    try {
        const username = req.query.username;
        const prs = allPRs.filter((pr) => pr.creator === username || pr.reviewers.includes(username) || pr.assignees.includes(username));
        res.send({ data: { prs } });
    } catch (error) {
        res.send({ error: error.toString() });
    }
});

function init() {
    console.log('Server starting...');
    app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
    refreshGitHubData();
}

init();
