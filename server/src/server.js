require('dotenv').config();
const GITHUB_MINUTES_BETWEEN_UPDATES = process.env.GITHUB_MINUTES_BETWEEN_UPDATES;
const JENKINS_MINUTES_BETWEEN_UPDATES = process.env.JENKINS_MINUTES_BETWEEN_UPDATES;

const { Worker } = require('worker_threads');
const cors = require('cors');
const express = require('express');

const PORT = process.env.SERVER_PORT;

const app = express();
app.use(cors());

let allPrs = [];
let allBuilds = [];

const gitHubWorker = new Worker('./github-worker.js');
gitHubWorker.on('message', (updatedPrs) => {
    allPrs = updatedPrs;
    setTimeout(
        () => {
            updatePrs();
        },
        GITHUB_MINUTES_BETWEEN_UPDATES * 60 * 1000,
    );
});
function updatePrs() {
    gitHubWorker.postMessage(null);
}

const jenkinsHubWorker = new Worker('./jenkins-worker.js');
jenkinsHubWorker.on('message', (updatedBuilds) => {
    allBuilds = updatedBuilds;
    setTimeout(
        () => {
            updateBuilds();
        },
        JENKINS_MINUTES_BETWEEN_UPDATES * 60 * 1000,
    );
});

function updateBuilds() {
    jenkinsHubWorker.postMessage(null);
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
    updateBuilds();
    updatePrs();
    app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
}

init();
