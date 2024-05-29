const fs = require('fs');
const { parentPort } = require('worker_threads');
const axios = require('axios');
require('dotenv').config();

const GITHUB_BASE_URL = process.env.GITHUB_BASE_URL;
const GITHUB_REPOS = process.env.GITHUB_REPOS;
const GITHUB_AUTH_TOKEN = process.env.GITHUB_AUTH_TOKEN;
const GITHUB_MAX_NUM_OF_PRS_PER_REPO = parseInt(process.env.GITHUB_MAX_NUM_OF_PRS_PER_REPO);
const PRS_PERSISTENT_FILE = process.env.PRS_PERSISTENT_FILE;

const repoPaths = GITHUB_REPOS.split(',');
const logging = process.env.LOGGING === 'true';

const gitHubApiUrlBase = `${GITHUB_BASE_URL}/api/v3/repos`;
const gitHubApiConfig = {
    headers: {
        Accept: 'application/vnd.github.text+json',
        Authorization: `token ${GITHUB_AUTH_TOKEN}`,
    },
};

let updateCount = 0;

function loadPrsFromFile() {
    if (!fs.existsSync(PRS_PERSISTENT_FILE)) {
        return [];
    }
    const jsonData = fs.readFileSync(PRS_PERSISTENT_FILE, 'utf8');
    return JSON.parse(jsonData);
}

function savePrsToFile(prs) {
    const prsJsonStr = JSON.stringify(prs, null, 2);
    fs.writeFile(PRS_PERSISTENT_FILE, prsJsonStr, (err) => {
        if (err) {
            console.error(`Error writing to ${PRS_PERSISTENT_FILE}`, err);
        }
    });
}

async function getPrRecord(repoPath, pr) {
    const prRecord = {
        repoName: pr.head.repo.name,
        repoFullName: pr.head.repo.full_name,
        number: pr.number,
        htmlUrl: pr.html_url,
        state: '',
        title: pr.title,
        branch: pr.head.ref,
        creator: pr.user.login,
        assignees: pr.assignees ? pr.assignees.map((a) => a.login) : [],
        reviewers: pr.requested_reviewers ? pr.requested_reviewers.map((rr) => rr.login) : [],
        reviews: [],
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        closedAt: pr.closed_at,
        mergedAt: pr.merged_at,
        mergeCommitSha: pr.merge_commit_sha,
    };
    try {
        //handle state
        if (pr.draft) {
            prRecord.state = 'draft';
        } else if (pr.merged_at) {
            prRecord.state = 'merged';
        } else if (pr.closed_at) {
            prRecord.state = 'closed';
        } else {
            prRecord.state = 'open';
        }

        //handle reviews
        const url = `${gitHubApiUrlBase}/${repoPath}/pulls/${prRecord.number}/reviews`;
        const res = await axios.get(url, gitHubApiConfig);
        const reviews = await res.data;
        for (let review of reviews) {
            if (!review.user) {
                continue;
            }
            const reviewerName = review.user.login;
            if (!prRecord.reviewers.includes(reviewerName)) {
                prRecord.reviewers.push(reviewerName);
            }
            const r = prRecord.reviews.find((r) => r.user === reviewerName);
            if (r) {
                r.state = review.state.toLowerCase();
            } else {
                prRecord.reviews.push({ user: reviewerName, state: review.state.toLowerCase() });
            }
        }

        //sort
        prRecord.assignees.sort();
        prRecord.reviewers.sort();
        prRecord.reviews.sort((a, b) => a.user.localeCompare(b.user));
    } catch (error) {
        console.error('error on getPrRecord()', error.message);
    }
    return prRecord;
}

async function getPagePrs(repoPath, pageNumber, outdatedPrs) {
    const pagePrs = [];
    try {
        const url = `${gitHubApiUrlBase}/${repoPath}/pulls?state=all&per_page=100&page=${pageNumber}`;
        let res = await axios.get(url, gitHubApiConfig);
        const prs = await res.data;
        for (let pr of prs) {
            try {
                const outdatedPr = outdatedPrs.find((p) => p.htmlUrl === pr.html_url);
                const wasPrActive = outdatedPr && ['open', 'draft'].includes(outdatedPr.state);
                const prRecord = outdatedPr && !wasPrActive ? outdatedPr : await getPrRecord(repoPath, pr);
                pagePrs.push(prRecord);
            } catch (error) {
                console.error(`error on pr ${pr.number}`, error.message);
            }
        }
    } catch (error) {
        console.error('error on getPagePrs()', error.message);
    }
    return pagePrs;
}

async function getRepoPrs(repoPath, outdatedPrs) {
    let repoPrs = [];
    try {
        const pagePrsPromises = [];
        const numberOfPages = Math.trunc(GITHUB_MAX_NUM_OF_PRS_PER_REPO / 100);
        for (let pageNumber = 1; pageNumber <= numberOfPages; pageNumber++) {
            pagePrsPromises.push(getPagePrs(repoPath, pageNumber, outdatedPrs));
        }
        const results = await Promise.all(pagePrsPromises);
        results.forEach((result) => {
            repoPrs = [...repoPrs, ...result];
        });
    } catch (error) {
        console.error('error on getRepoPrs()', error.message);
    }
    return repoPrs;
}

async function getPrs(outdatedPrs) {
    let updatedPrs = [];
    try {
        const repoPrsPromises = [];
        repoPaths.forEach((repoPath) => {
            repoPrsPromises.push(getRepoPrs(repoPath, outdatedPrs));
        });
        const results = await Promise.all(repoPrsPromises);
        results.forEach((result) => {
            updatedPrs = [...updatedPrs, ...result];
        });
    } catch (error) {
        console.error('error on getPrs()', error.message);
    }
    return updatedPrs;
}

parentPort.on('message', async () => {
    try {
        const startTime = Date.now();
        const updatedPrs = await getPrs(updateCount % 60 === 0 ? [] : loadPrsFromFile());
        savePrsToFile(updatedPrs);
        updateCount++;
        if (logging) {
            console.log(`< prs ${Math.round((Date.now() - startTime) / 1000)}s`);
        }
        parentPort.postMessage(updatedPrs);
    } catch (error) {
        console.error('error on github worker', error);
    }
});
