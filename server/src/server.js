require('dotenv').config();
const GITHUB_MINUTES_BETWEEN_UPDATES = process.env.GITHUB_MINUTES_BETWEEN_UPDATES;
const JENKINS_MINUTES_BETWEEN_UPDATES = process.env.JENKINS_MINUTES_BETWEEN_UPDATES;
const JENKINS_ENABLED = process.env.JENKINS_ENABLED;

const { logMsg, logError } = require('./common.js');
const { Worker } = require('worker_threads');
const cors = require('cors');
const express = require('express');

const PORT = process.env.SERVER_PORT;

const app = express();
app.use(cors());

let allPrs = [];
let allBuilds = [];
let awaitedReviews = {};

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

function updateAwaitedReviews() {
    awaitedReviews = {};
    for (let pr of allPrs) {
        if (pr.state !== 'open') {
            continue;
        }
        for (let r of pr.reviews) {
            if (r.state !== 'awaiting') {
                continue;
            }
            if (awaitedReviews[r.user]) {
                awaitedReviews[r.user]++;
            } else {
                awaitedReviews[r.user] = 1;
            }
        }
    }
}

const gitHubWorker = new Worker('./github-worker.js');
gitHubWorker.on('message', (updatedPrs) => {
    allPrs = updatedPrs;
    updatePrBuilds();
    updateAwaitedReviews();
    prsUpdateCount++;
    if (prsUpdateCount === 1) {
        logMsg('prs ready');
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
        logMsg('builds ready');
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
        const userName = req.query.username;
        const prs = allPrs.filter((pr) => pr.creator === userName || pr.reviewers.includes(userName) || pr.assignees.includes(userName));
        if (prs.length > 0) {
            logMsg(userName);
        } else {
            logError(`no prs found for user ${userName}`);
        }
        res.send({ data: { prs } });
    } catch (err) {
        logError('error on getting pull requests', err.message);
        res.send({ error: err.toString() });
    }
});

app.get('/awaited-reviews', async (req, res) => {
    try {
        const userName = req.query.username;
        const numberOfAwaitedReviews = awaitedReviews[userName] || 0;
        res.send({ data: { userName, numberOfAwaitedReviews } });
    } catch (err) {
        logError('error on getting awaited reviews', err.message);
        res.send({ error: err.toString() });
    }
});

function init() {
    logMsg('server starting...');
    app.listen(PORT, () => {
        logMsg(`server listening on port ${PORT}`);
        if (JENKINS_ENABLED === 'true') {
            updateBuilds();
        }
        updatePrs();
    });
}

init();
