require("fs");
const {JSDOM} = require('jsdom');
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
    storageFormat = "<table class=\"wrapped\"><colgroup> <col /> <col /> </colgroup><tbody><tr><th>Row1</th><td>Col1</td></tr><tr><th><div class=\"content-wrapper\"><p><br /></p><ac:structured-macro ac:name=\"text-data\" ac:schema-version=\"1\" ac:macro-id=\"bfa6a564-5950-41ae-90cb-05f5164a3595\"><ac:parameter ac:name=\"name\">rows</ac:parameter><ac:parameter ac:name=\"atlassian-macro-output-type\">INLINE</ac:parameter><ac:rich-text-body><p><br /></p></ac:rich-text-body></ac:structured-macro><p><br /></p></div></th><td><div class=\"content-wrapper\"><ac:structured-macro ac:name=\"text-data\" ac:schema-version=\"1\" ac:macro-id=\"136ad864-6b25-4798-88f3-9795d181aae6\"><ac:parameter ac:name=\"name\">cols</ac:parameter><ac:parameter ac:name=\"atlassian-macro-output-type\">INLINE</ac:parameter><ac:rich-text-body><p><br /></p></ac:rich-text-body></ac:structured-macro></div></td></tr></tbody></table><ac:structured-macro ac:name=\"details\" ac:schema-version=\"1\" ac:macro-id=\"9d6889de-1303-45cf-9360-aebe2f306a62\"><ac:rich-text-body><ac:structured-macro ac:name=\"table-data\" ac:schema-version=\"1\" ac:macro-id=\"c6938745-8777-4af6-8830-ad62a554881c\"><ac:parameter ac:name=\"name\">ApproversTable</ac:parameter><ac:parameter ac:name=\"initialRows\">1</ac:parameter><ac:rich-text-body><table class=\"wrapped relative-table\" style=\"width: 100.0%;\"><colgroup> <col style=\"width: 21.9569%;\" /> <col style=\"width: 19.4915%;\" /> <col style=\"width: 58.5516%;\" /> </colgroup><tbody><tr><th style=\"text-align: left;\">Approver Name</th><th style=\"text-align: left;\">Approval Date</th><th style=\"text-align: left;\">Approver's Notes</th></tr><tr><td style=\"text-align: left;\"><div class=\"content-wrapper\"><ac:structured-macro ac:name=\"list-data\" ac:schema-version=\"1\" ac:macro-id=\"a9a27dee-ffa7-4405-86c3-f0545da79c7b\"><ac:parameter ac:name=\"multiple\">true</ac:parameter><ac:parameter ac:name=\"name\">ApproverName</ac:parameter><ac:parameter ac:name=\"type\">auto complete</ac:parameter><ac:parameter ac:name=\"atlassian-macro-output-type\">INLINE</ac:parameter><ac:rich-text-body><ac:structured-macro ac:name=\"user-options\" ac:schema-version=\"1\" ac:macro-id=\"56eb40c4-2ec1-4e56-8186-130ddc4ef01e\"><ac:rich-text-body><p><br /></p></ac:rich-text-body></ac:structured-macro></ac:rich-text-body></ac:structured-macro></div></td><td style=\"text-align: left;\"><div class=\"content-wrapper\"><ac:structured-macro ac:name=\"date-data\" ac:schema-version=\"1\" ac:macro-id=\"82bc8d5e-f9a8-4d8c-affd-abc6d030bf37\"><ac:parameter ac:name=\"name\">ApprovedDate</ac:parameter><ac:parameter ac:name=\"atlassian-macro-output-type\">INLINE</ac:parameter></ac:structured-macro></div></td><td style=\"text-align: left;\"><div class=\"content-wrapper\"><ac:structured-macro ac:name=\"text-data\" ac:schema-version=\"1\" ac:macro-id=\"d75ee71b-f189-43fd-9d8f-0ce12baba83a\"><ac:parameter ac:name=\"name\">ApproverNotes</ac:parameter><ac:parameter ac:name=\"content\">text</ac:parameter><ac:parameter ac:name=\"atlassian-macro-output-type\">INLINE</ac:parameter><ac:rich-text-body><p><br /></p></ac:rich-text-body></ac:structured-macro></div></td></tr></tbody></table></ac:rich-text-body></ac:structured-macro></ac:rich-text-body></ac:structured-macro>";
    const dom = new JSDOM(storageFormat);

    // Get all Macros in the Page
    const structuredMacroNodes = dom.window.document.querySelectorAll('ac\\:structured-macro');

    // For every macro, check if it contains any of the Scaffolding macros
    for (const node of structuredMacroNodes) {
        // TODO: Add the rest of the Scaffolding macros
        // TODO: fix query logic. It worked previously using raw storage format, but does not work when using the response from the HTTP request since it contains escaped characters.
        const tableDataNodes = node.querySelectorAll('[ac\\:name="\\"table-data\\""]');
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
    const fs = require('fs');
    const csv = require('csv-stringify');
    const lock = require('async-lock');
    const fileLock = new lock();

    await fileLock.acquire('nested_macros.csv', async function (done) {
        const csvString = csv.stringify(data);
        fs.appendFileSync('data.csv', csvString);
        done();
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
    const storageBody = resBody.body;
    return storageBody;
}

const main = async () => {
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
            await useDomParser(storageFormat, allPageIdsInSpace[j]);
        }
    }
}

main().then(r => console.log("Done!"));