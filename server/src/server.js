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
        const prs = allPRs.filter((pr) => pr.owner === username || pr.reviewers.includes(username) || pr.assignees.includes(username));
        res.send({ type: 'pull-requests', data: { prs } });
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

function getLastPartOfUrl(url) {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
}

async function refreshGitHubData() {
    const allPrs = [];

    const headers = {
        Accept: 'application/vnd.github.text+json',
        Authorization: `token ${GITHUB_AUTH_TOKEN}`,
    };
    for (let page = 1; page <= 3; page++) {
        let prs;
        const url = `${GITHUB_BASE_URL}/api/v3/repos/${GITHUB_ORG_NAME}/${GITHUB_REPO_NAME}/pulls?state=all&per_page=100&page=${page}`;
        try {
            const res = await axios.get(url, { headers });
            prs = await res.data;
            prs.forEach((pr) => {
                const prRecord = {
                    id: pr.id,
                    htmlUrl: pr['html_url'],
                    state: pr.state,
                    title: pr.title,
                    branch: pr.head.ref,
                    owner: getLastPartOfUrl(pr.user.url),
                    reviewers: pr['requested_reviewers'] ? pr['requested_reviewers'].map((rr) => rr['login']) : [],
                    assignees: pr['assignees'] ? pr['assignees'].map((rr) => rr['login']) : [],
                };
                console.log(prRecord);
                allPRs.push(prRecord);
            });
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
