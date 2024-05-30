require('dotenv').config();
const GITHUB_MINUTES_BETWEEN_UPDATES = process.env.GITHUB_MINUTES_BETWEEN_UPDATES;
const JENKINS_MINUTES_BETWEEN_UPDATES = process.env.JENKINS_MINUTES_BETWEEN_UPDATES;

const { log, error } = require('./common.js');
const { Worker } = require('worker_threads');
const cors = require('cors');
const express = require('express');

const PORT = process.env.SERVER_PORT;

const app = express();
app.use(cors());

let allPrs = [];
let allBuilds = [];

let buildsUpdateCount = 0;
let prsUpdateCount = 0;

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
    prsUpdateCount++;
    if (prsUpdateCount === 1) {
        log('prs ready');
    }
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
    buildsUpdateCount++;
    if (buildsUpdateCount === 1) {
        log('builds ready');
    }
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
        if (prs.length > 0) {
            log(`${prs.length} prs --> ${username}`);
        } else {
            error(`no prs found for user ${username}`);
        }
        res.send({ data: { prs } });
    } catch (error) {
        error('error on getting pull requests', error);
        res.send({ error: error.toString() });
    }
});

function init() {
    log('server starting...');
    app.listen(PORT, () => {
        log(`server listening on port ${PORT}`);
        updateBuilds();
        updatePrs();
    });
}

init();
