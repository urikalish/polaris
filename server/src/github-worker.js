const { parentPort } = require('worker_threads');
const axios = require('axios');

const GITHUB_BASE_URL = process.env.GITHUB_BASE_URL;
const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME;
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const GITHUB_AUTH_TOKEN = process.env.GITHUB_AUTH_TOKEN;

async function getPRs() {
    const allPrs = [];

    const apiUrlBase = `${GITHUB_BASE_URL}/api/v3/repos/${GITHUB_ORG_NAME}/${GITHUB_REPO_NAME}`;
    const headers = {
        Accept: 'application/vnd.github.text+json',
        Authorization: `token ${GITHUB_AUTH_TOKEN}`,
    };

    const NUMBER_OF_PAGES = 3;
    const PRS_PER_PAGE = 100;

    for (let page = 1; page <= NUMBER_OF_PAGES; page++) {
        const url = `${apiUrlBase}/pulls?state=all&per_page=${PRS_PER_PAGE}&page=${page}`;
        try {
            let res = await axios.get(url, { headers });
            const prs = await res.data;
            for (let pr of prs) {
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
                const url = `${apiUrlBase}/pulls/${prRecord.number}/reviews`;
                const res = await axios.get(url, { headers });
                const reviews = await res.data;
                reviews.forEach((review) => {
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
                });

                allPrs.push(prRecord);
            }
        } catch (error) {
            console.log(error);
        }
    }

    return allPrs;
}

parentPort.on('message', async (/*message*/) => {
    const result = await getPRs();
    parentPort.postMessage(result);
});
