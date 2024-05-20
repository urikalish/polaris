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

let updateBuildsStartTime = 0;
let updatePrsStartTime = 0;

function updatePrBuilds() {
    allPrs.forEach((pr) => {
        pr.builds = [];
        allBuilds.forEach((b) => {
            if (pr.branch === b.branch) {
                pr.builds.push(b);
            }
        });
    });
}

const gitHubWorker = new Worker('./github-worker.js');
gitHubWorker.on('message', (updatedPrs) => {
    allPrs = updatedPrs;
    updatePrBuilds();
    console.log(`prs updated in ${Math.round((Date.now() - updatePrsStartTime) / 1000)} seconds`);
    setTimeout(
        () => {
            updatePrs();
        },
        GITHUB_MINUTES_BETWEEN_UPDATES * 60 * 1000,
    );
});
function updatePrs() {
    console.log('updating prs...');
    updatePrsStartTime = Date.now();
    gitHubWorker.postMessage(null);
}

const jenkinsHubWorker = new Worker('./jenkins-worker.js');
jenkinsHubWorker.on('message', (updatedBuilds) => {
    allBuilds = updatedBuilds;
    updatePrBuilds();
    console.log(`builds updated in ${Math.round((Date.now() - updatePrsStartTime) / 1000)} seconds`);
    setTimeout(
        () => {
            updateBuilds();
        },
        JENKINS_MINUTES_BETWEEN_UPDATES * 60 * 1000,
    );
});

function updateBuilds() {
    console.log('updating builds...');
    updateBuildsStartTime = Date.now();
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
