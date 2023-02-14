require("fs");
const { JSDOM } = require('jsdom');
const fs = require('fs');
require("async-lock");


// Constants
const HOSTNAME = 'localhost:9090';
const USERNAME = 'admin';
const PASSWORD = 'admin';

/**
 * This function is used to determine if the given page contains a nested Scaffolding macro.
 * @param storageFormat the storage format of the page
 * @param pageId the ID of the page
 */
const useDomParser = async (storageFormat, pageId) => {
    let foundNested = false;
    // console.log(storageFormat);
    // storageFormat = storageFormat.replace(/\\"/g, '"');
    const dom = new JSDOM(storageFormat);

    // Get all Macros in the Page
    const structuredMacroNodes = dom.window.document.querySelectorAll('ac\\:structured-macro');

    // For every macro, check if it contains any of the Scaffolding macros
    for (const node of structuredMacroNodes) {
        // TODO: Add the rest of the Scaffolding macros
        // TODO: fix query logic. It worked previously using raw storage format, but does not work when using the response from the HTTP request since it contains escaped characters.
        const tableDataNodes = node.querySelectorAll('[ac:name="table-data"]');
        const textDataNodes = node.querySelectorAll('[ac\\:name="\\"text-data\\""]');
        const dateDataNodes = node.querySelectorAll('[ac\\:name="\\"date-data\\""]');

        if (textDataNodes.length > 0) {
            foundNested = true;
        } else if (dateDataNodes.length > 0) {
            foundNested = true;
        } else if (tableDataNodes.length > 0) {
            foundNested = true;
        }
    }
    if (foundNested) {
        console.log("Found a nested Scaffolding macro in pageId: " + pageId);
        // Save the page ID to my csv file
        await saveToCSV([pageId]);

    }
    console.log("No nested Scaffolding data found in page:", pageId);
}

/**
 * Saves the given array of data to a CSV file in a synchronous fashion. UNTESTED
 * @param data an array of data to save to a CSV file
 * @returns {Promise<void>} nothing
 */
async function saveToCSV(data) {
    const csv = require('csv-stringify');
    const lock = require('async-lock');
    const fileLock = new lock();

    await fileLock.acquire('nested_macros.csv', async function (done) {
        // const csvString = csv.stringify(data);
        fs.appendFileSync('data.csv', data.toString() + "\n");
        done();
    });
}

async function clearCSVFileFromRoot() {
    await fs.unlink('data.csv', (err) => {
        if (err) throw err;
        console.log('path/file.txt was deleted');
    });
}


/**
 * Returns all the space IDs in the given Confluence instance.
 * @returns {Promise<*>} an array of space IDs
 */
const getAllSpaceIds = async () => {
    const auth = "Basic " + new Buffer(USERNAME + ":" + PASSWORD).toString("base64");

    const headers = {
        'Authorization': auth
    };

    const res = await fetch(`http://${HOSTNAME}/rest/api/space`, {
        headers: headers
    });

    const resBody = await res.json();
    // console.log("resBody", resBody);

    const spaces = resBody.results;
    const spaceKeys = spaces.map(space => space.key);
    return spaceKeys;
}

const getAllPagesInSpace = async (spaceId) => {
    const auth = "Basic " + new Buffer(USERNAME + ":" + PASSWORD).toString("base64");

    const headers = {
        'Authorization': auth
    };

    const res = await fetch(`http://${HOSTNAME}/rest/api/space/${spaceId}/content?start=0&type=page`, {
        headers: headers
    });

    const resBody = await res.json();
    // console.log("resBody", resBody);

    const pages = resBody.page.results;
    const pageIds = pages.map(page => page.id);
    return pageIds;
}

const getStorageFormat = async (pageId) => {
    const auth = "Basic " + new Buffer(USERNAME + ":" + PASSWORD).toString("base64");

    const headers = {
        'Authorization': auth
    };

    const res = await fetch(`http://${HOSTNAME}/rest/api/content/${pageId}?expand=body.storage`, {
        headers: headers
    });

    const resBody = await res.text();
    // console.log("resBody", resBody);
    const formattedResponse = JSON.parse(resBody);
    const storageBody = formattedResponse.body;
    return storageBody;
}

const main = async () => {
    await clearCSVFileFromRoot();
    // Does not include archived spaces
    const allSpaceIdsInConfluenceInstance = await getAllSpaceIds();
    console.log("All space IDs in main:", allSpaceIdsInConfluenceInstance);

    for (let i = 0; i < allSpaceIdsInConfluenceInstance.length; i++) {
        // For each space, get their pages
        const allPageIdsInSpace = await getAllPagesInSpace(allSpaceIdsInConfluenceInstance[i]);
        console.log("All page IDs in space:", allPageIdsInSpace);

        // For all the pages, get their storage format and determine if it's a nested Scaffolding macro
        for (let j = 0; j < allPageIdsInSpace.length; j++) {
            const storageFormat = await getStorageFormat(allPageIdsInSpace[j]);
            await useDomParser(storageFormat.storage.value, allPageIdsInSpace[j]);
        }
    }
}

main().then(r => console.log("Done!"));
