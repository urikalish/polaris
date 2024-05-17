const { parentPort } = require('worker_threads');
const axios = require('axios');
const GITHUB_BASE_URL = process.env.GITHUB_BASE_URL;
const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME;
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const GITHUB_AUTH_TOKEN = process.env.GITHUB_AUTH_TOKEN;
const GITHUB_MAX_NUM_OF_PRS = parseInt(process.env.GITHUB_MAX_NUM_OF_PRS);
const gitHubRepoApiUrlBase = `${GITHUB_BASE_URL}/api/v3/repos/${GITHUB_ORG_NAME}/${GITHUB_REPO_NAME}`;
const gitHubApiHeaders = {
    Accept: 'application/vnd.github.text+json',
    Authorization: `token ${GITHUB_AUTH_TOKEN}`,
};

async function getPrRecord(pr) {
    const prRecord = {
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
    const res = await axios.get(url, { headers: gitHubApiHeaders });
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

    return prRecord;
}

function isPrActive(pr) {
    return ['open', 'draft'].includes(pr.state);
}

async function getPrs(outdatedPrs) {
    console.log('get PRs...');
    const updatedPrs = [];

    const numberOfPages = Math.trunc(GITHUB_MAX_NUM_OF_PRS / 100);
    const totalCount = GITHUB_MAX_NUM_OF_PRS;
    let count = 0;
    let lastReportedPercentage = 0;

    for (let page = 1; page <= numberOfPages; page++) {
        const url = `${gitHubRepoApiUrlBase}/pulls?state=all&per_page=100&page=${page}`;
        try {
            let res = await axios.get(url, { headers: gitHubApiHeaders });
            const prs = await res.data;
            for (let pr of prs) {
                try {
                    const outdatedPr = outdatedPrs.find((p) => p.number === pr.number);
                    const prRecord = outdatedPr && !isPrActive(outdatedPr) ? outdatedPr : await getPrRecord(pr);
                    updatedPrs.push(prRecord);
                } catch (error) {
                    console.error(`error on pr ${pr.number}`, error);
                }
                count++;
                const percentage = Math.trunc((count / totalCount) * 100);
                if (percentage % 10 === 0 && percentage !== lastReportedPercentage) {
                    console.log(`${percentage}%`);
                    lastReportedPercentage = percentage;
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    console.log('get PRs - DONE');
    return updatedPrs;
}

parentPort.on('message', async (outdatedPrs) => {
    const updatedPrs = await getPrs(outdatedPrs);
    parentPort.postMessage(updatedPrs);
});
