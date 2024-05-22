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

function updatePrBuilds() {
    allPrs.forEach((pr) => {
        pr.builds = [];
        if (pr.state === 'open') {
            allBuilds.forEach((b) => {
                if (pr.branch === b.branch) {
                    pr.builds.push(b);
                }
            });
        }
    });
}

const gitHubWorker = new Worker('./github-worker.js');
gitHubWorker.on('message', (updatedPrs) => {
    allPrs = updatedPrs;
    updatePrBuilds();
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
    updatePrBuilds();
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
        console.log(`prs sent to ${username}`);
        res.send({ data: { prs } });
    } catch (error) {
        console.error('error on getting pull requests', error);
        res.send({ error: error.toString() });
    }
});

function init() {
    console.log('server starting...');
    app.listen(PORT, () => {
        console.log(`server listening on port ${PORT}`);
        updateBuilds();
        updatePrs();
    });
}

init();
