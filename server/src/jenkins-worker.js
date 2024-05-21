const fs = require('fs');
const { parentPort } = require('worker_threads');
const axios = require('axios');
require('dotenv').config();

const JENKINS_USERNAME = process.env.JENKINS_USERNAME;
const JENKINS_API_TOKEN = process.env.JENKINS_API_TOKEN;
const JENKINS_JOB_BASE_URL = process.env.JENKINS_JOB_BASE_URL;
const JENKINS_CUSTOM_QUICK_URL = process.env.JENKINS_CUSTOM_QUICK_URL;
const JENKINS_CUSTOM_FULL_URL = process.env.JENKINS_CUSTOM_FULL_URL;
const BUILDS_PERSISTENT_FILE = process.env.BUILDS_PERSISTENT_FILE;

const CUSTOM_QUICK = 'custom-quick';
const CUSTOM_FULL = 'custom-full';

let jobToUrlMap = [];

const jenkinsApiConfig = {
    auth: {
        username: JENKINS_USERNAME,
        password: JENKINS_API_TOKEN,
    },
};

function initJobToUrlMap() {
    const customJobToUrlMap = {
        [CUSTOM_QUICK]: JENKINS_CUSTOM_QUICK_URL,
        [CUSTOM_FULL]: JENKINS_CUSTOM_FULL_URL,
    };
    for (let cj in customJobToUrlMap) {
        for (let i = 1; i <= 5; i++) {
            jobToUrlMap.push({ jobType: cj, jobOrdinal: i, jobUrl: customJobToUrlMap[cj] + i });
        }
    }
}

function loadBuildsFromFile() {
    if (!fs.existsSync(BUILDS_PERSISTENT_FILE)) {
        return [];
    }
    const jsonData = fs.readFileSync(BUILDS_PERSISTENT_FILE, 'utf8');
    return JSON.parse(jsonData);
}

function saveBuildsToFile(builds) {
    const buildsJsonStr = JSON.stringify(builds, null, 2);
    fs.writeFile(BUILDS_PERSISTENT_FILE, buildsJsonStr, (err) => {
        if (err) {
            console.error(`Error writing to ${BUILDS_PERSISTENT_FILE}`, err);
        }
    });
}

async function getBuildRecord(jobType, jobOrdinal, jobName, buildNumber, buildUrl) {
    const buildRec = {
        jobType,
        jobOrdinal,
        jobName,
        number: buildNumber,
        url: buildUrl,
        branch: '',
        timestamp: 0,
        inProgress: false,
        result: '',
        userId: '',
        userName: '',
    };
    let res = await axios.get(`${buildUrl}/api/json`, jenkinsApiConfig);
    const data = await res.data;
    buildRec.timestamp = data.timestamp;
    buildRec.inProgress = data.inProgress;
    buildRec.result = data.result;
    let action = res.data.actions.find((a) => a.causes);
    const causes = action.causes.find((c) => c.userId);
    if (causes) {
        buildRec.userId = causes.userId;
        buildRec.userName = causes.userName;
    }
    action = res.data.actions.find((a) => a.parameters);
    const branch = action.parameters.find((p) => p.name === 'SCM_BRANCH');
    if (branch) {
        buildRec.branch = branch.value;
    }

    return buildRec;
}

async function getBuilds(outdatedBuilds) {
    const updatedBuilds = [];

    for (let j of jobToUrlMap) {
        const url = `${JENKINS_JOB_BASE_URL}/${j.jobUrl}/api/json`;
        try {
            let res = await axios.get(url, jenkinsApiConfig);
            const data = await res.data;
            for (let build of data.builds) {
                try {
                    const outdatedBuild = outdatedBuilds.find((b) => b.url === build.url);
                    const wasBuildActive = outdatedBuild && outdatedBuild.inProgress;
                    const buildRecord = outdatedBuild && !wasBuildActive ? outdatedBuild : await getBuildRecord(j.jobType, j.jobOrdinal, data.name, build.number, build.url);
                    updatedBuilds.push(buildRecord);
                } catch (error) {
                    console.error(`error on build ${data.name} #${build.number}`, error.message);
                }
            }
        } catch (error) {
            console.error('error on getBuilds()', error.message);
        }
    }

    return updatedBuilds;
}

parentPort.on('message', async () => {
    try {
        console.log('updating builds...');
        const startTime = Date.now();
        const outdatedBuilds = loadBuildsFromFile();
        const updatedBuilds = await getBuilds(outdatedBuilds);
        saveBuildsToFile(updatedBuilds);
        console.log(`builds updated in ${Math.round((Date.now() - startTime) / 1000)} seconds`);
        parentPort.postMessage(updatedBuilds);
    } catch (error) {
        console.error('error on jenkins worker', error);
    }
});

function init() {
    initJobToUrlMap();
}

init();
