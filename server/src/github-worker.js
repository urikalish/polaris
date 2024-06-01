require('dotenv').config();
const GITHUB_INTERNAL_URL = process.env.GITHUB_INTERNAL_URL;
const GITHUB_INTERNAL_REPOS = process.env.GITHUB_INTERNAL_REPOS;
const GITHUB_INTERNAL_AUTH_TOKEN = process.env.GITHUB_INTERNAL_AUTH_TOKEN;
// const GITHUB_PUBLIC_URL = process.env.GITHUB_PUBLIC_URL;
// const GITHUB_PUBLIC_REPOS = process.env.GITHUB_PUBLIC_REPOS;
const GITHUB_MAX_NUM_OF_PRS_PER_REPO = parseInt(process.env.GITHUB_MAX_NUM_OF_PRS_PER_REPO);
const PRS_PERSISTENT_FILE = process.env.PRS_PERSISTENT_FILE;

const { logMsg, logError } = require('./common.js');
const fs = require('fs');
const { parentPort } = require('worker_threads');
const axios = require('axios');

const logging = process.env.LOGGING === 'true';

const repos = [];
GITHUB_INTERNAL_REPOS.split(',').forEach((repoOrgAndName) => {
    repos.push({
        repoOrgAndName: repoOrgAndName,
        apiUrl: `${GITHUB_INTERNAL_URL}/api/v3/repos/${repoOrgAndName}`,
        apiConfig: {
            headers: {
                Accept: 'application/vnd.github.text+json',
                Authorization: `token ${GITHUB_INTERNAL_AUTH_TOKEN}`,
            },
        },
    });
});
// GITHUB_PUBLIC_REPOS.split(',').forEach((repoOrgAndName) => {
//     repos.push({
//         repoOrgAndName: repoOrgAndName,
//         apiUrl: `${GITHUB_PUBLIC_URL}/${repoOrgAndName}`,
//         apiConfig: {
//             headers: {
//                 Accept: 'application/vnd.github.text+json',
//             },
//         },
//     });
// });

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
            logError(`Error writing to ${PRS_PERSISTENT_FILE}`, err.message);
        }
    });
}

async function getPrRecord(repo, pr) {
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
        const url = `${repo.apiUrl}/pulls/${prRecord.number}/reviews`;
        const res = await axios.get(url, repo.apiConfig);
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
    } catch (err) {
        logError('error on getPrRecord()', err.message);
    }
    return prRecord;
}

async function getPagePrs(repo, pageNumber, outdatedPrs) {
    const pagePrs = [];
    try {
        const url = `${repo.apiUrl}/pulls?state=all&per_page=100&page=${pageNumber}`;
        let res = await axios.get(url, repo.apiConfig);
        const prs = await res.data;
        for (let pr of prs) {
            try {
                const outdatedPr = outdatedPrs.find((p) => p.htmlUrl === pr.html_url);
                const wasPrActive = outdatedPr && ['open', 'draft'].includes(outdatedPr.state);
                const prRecord = outdatedPr && !wasPrActive ? outdatedPr : await getPrRecord(repo, pr);
                pagePrs.push(prRecord);
            } catch (err) {
                logError(`error on pr ${pr.number}`, err.message);
            }
        }
    } catch (err) {
        logError('error on getPagePrs()', repo.repoOrgAndName, err.message);
    }
    return pagePrs;
}

async function getRepoPrs(repo, outdatedPrs) {
    let repoPrs = [];
    try {
        const pagePrsPromises = [];
        const numberOfPages = Math.trunc(GITHUB_MAX_NUM_OF_PRS_PER_REPO / 100);
        for (let pageNumber = 1; pageNumber <= numberOfPages; pageNumber++) {
            pagePrsPromises.push(getPagePrs(repo, pageNumber, outdatedPrs));
        }
        const results = await Promise.all(pagePrsPromises);
        results.forEach((result) => {
            repoPrs = [...repoPrs, ...result];
        });
    } catch (err) {
        logError('error on getRepoPrs()', err.message);
    }
    return repoPrs;
}

async function getPrs(outdatedPrs) {
    let updatedPrs = [];
    try {
        const repoPrsPromises = [];
        repos.forEach((repo) => {
            repoPrsPromises.push(getRepoPrs(repo, outdatedPrs));
        });
        const results = await Promise.all(repoPrsPromises);
        results.forEach((result) => {
            updatedPrs = [...updatedPrs, ...result];
        });
    } catch (err) {
        logError('error on getPrs()', err.message);
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
            logMsg(`< prs ${Math.round((Date.now() - startTime) / 1000)}s`);
        }
        parentPort.postMessage(updatedPrs);
    } catch (err) {
        logError('error on github worker', err.message);
    }
});
