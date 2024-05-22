const fs = require('fs');
const { parentPort } = require('worker_threads');
const axios = require('axios');
require('dotenv').config();

const GITHUB_BASE_URL = process.env.GITHUB_BASE_URL;
const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME;
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const GITHUB_AUTH_TOKEN = process.env.GITHUB_AUTH_TOKEN;
const GITHUB_MAX_NUM_OF_PRS = parseInt(process.env.GITHUB_MAX_NUM_OF_PRS);
const PRS_PERSISTENT_FILE = process.env.PRS_PERSISTENT_FILE;

const gitHubRepoApiUrlBase = `${GITHUB_BASE_URL}/api/v3/repos/${GITHUB_ORG_NAME}/${GITHUB_REPO_NAME}`;
const gitHubApiConfig = {
    headers: {
        Accept: 'application/vnd.github.text+json',
        Authorization: `token ${GITHUB_AUTH_TOKEN}`,
    },
};

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

async function getPrRecord(pr) {
    const prRecord = {
        repoName: pr.head.repo.name,
        number: pr.number,
        htmlUrl: pr.html_url,
        state: '',
        title: pr.title,
        branch: pr.head.ref,
        creator: pr.user.login,
        assignees: pr.assignees ? pr.assignees.map((a) => a.login) : [],
        reviewers: pr.requested_reviewers ? pr.requested_reviewers.map((rr) => rr.login) : [],
        reviews: [],
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
        const url = `${gitHubRepoApiUrlBase}/pulls/${prRecord.number}/reviews`;
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

async function getPagePrs(pageNumber, outdatedPrs) {
    const pagePrs = [];
    try {
        const url = `${gitHubRepoApiUrlBase}/pulls?state=all&per_page=100&page=${pageNumber}`;
        let res = await axios.get(url, gitHubApiConfig);
        const prs = await res.data;
        for (let pr of prs) {
            try {
                const outdatedPr = outdatedPrs.find((p) => p.number === pr.number);
                const wasPrActive = outdatedPr && ['open', 'draft'].includes(outdatedPr.state);
                const prRecord = outdatedPr && !wasPrActive ? outdatedPr : await getPrRecord(pr);
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

async function getPrs(outdatedPrs) {
    let updatedPrs = [];
    try {
        const pagePrsPromises = [];
        const numberOfPages = Math.trunc(GITHUB_MAX_NUM_OF_PRS / 100);
        for (let pageNumber = 1; pageNumber <= numberOfPages; pageNumber++) {
            pagePrsPromises.push(getPagePrs(pageNumber, outdatedPrs));
        }
        const results = await Promise.all(pagePrsPromises);
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
        console.log('updating prs...');
        const startTime = Date.now();
        const outdatedPrs = loadPrsFromFile();
        const updatedPrs = await getPrs(outdatedPrs);
        savePrsToFile(updatedPrs);
        console.log(`prs updated in ${Math.round((Date.now() - startTime) / 1000)} seconds`);
        parentPort.postMessage(updatedPrs);
    } catch (error) {
        console.error('error on github worker', error);
    }
});
