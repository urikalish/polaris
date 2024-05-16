require('dotenv').config();
const axios = require('axios');
const cors = require('cors');
const express = require('express');

const GITHUB_BASE_URL = process.env.GITHUB_BASE_URL;
const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME;
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const GITHUB_AUTH_TOKEN = process.env.GITHUB_AUTH_TOKEN;
const PORT = 1948;

let allPRs = [];

const app = express();
app.use(cors());

app.get('/pull-requests', async (req, res) => {
    try {
        const username = req.query.username;
        const prs = allPRs.filter((pr) => pr.creator === username || pr.reviewers.includes(username) || pr.assignees.includes(username));
        console.log(`${username} has ${prs.length} relevant PRs`);
        res.send({ data: { prs } });
    } catch (error) {
        res.send({ error: error.toString() });
    }
});

async function refreshGitHubData() {
    const allPrs = [];

    const headers = {
        Accept: 'application/vnd.github.text+json',
        Authorization: `token ${GITHUB_AUTH_TOKEN}`,
    };

    const apiUrlBase = `${GITHUB_BASE_URL}/api/v3/repos/${GITHUB_ORG_NAME}/${GITHUB_REPO_NAME}`;

    for (let page = 1; page <= 1; page++) {
        const url = `${apiUrlBase}/pulls?state=all&per_page=100&page=${page}`;
        try {
            let res = await axios.get(url, { headers });
            const prs = await res.data;
            for (let pr of prs) {
                const prRecord = {
                    number: pr.number,
                    htmlUrl: pr.html_url,
                    state: pr.merged_at ? 'merged' : pr.closed_at ? 'closed' : 'open',
                    title: pr.title,
                    branch: pr.head.ref,
                    creator: pr.user.login,
                    assignees: pr.assignees ? pr.assignees.map((a) => a.login) : [],
                    reviewers: pr.requested_reviewers ? pr.requested_reviewers.map((rr) => rr.login) : [],
                    reviews: [],
                };

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

                allPRs.push(prRecord);
            }
        } catch (error) {
            console.log(error);
        }
    }

    return allPrs;
}

async function init() {
    console.log('Server starting...');
    allPrs = await refreshGitHubData();
    app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
}

init().then(() => {});
