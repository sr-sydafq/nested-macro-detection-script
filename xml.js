const {JSDOM} = require('jsdom');
const fs = require('fs');

// CLI arguments
let HOSTNAME = 'http://localhost:9093';
let USERNAME = '';
let PASSWORD = '';
let START = 0;
let LIMIT = 500;

const PARAMETERS = process.argv.slice(2); // first 2 arguments are node setup location and the current file name

const displayHelp = () => {
    console.log(`Usage: node "./xml" [parameters]
        -h, --help              Display help menu
        -hn, --hostname         Set Confluence hostname, i.e http://localhost:9093
        -u,  --user             Set Confluence username, i.e admin
        -p,  --password         Set Confluence user password, i.e admin
        -s,  --start            Set the start offset for Space/SpaceTemplate/Page searches, i.e 0
        -l,  --limit            Set the limit for Space/SpaceTemplate/Page searches, i.e 500
    `);
};

const readCliParameters = () => {
    PARAMETERS.forEach(parameter => {
        if (PARAMETERS.includes('-h') || PARAMETERS.includes('--help')) {
            displayHelp();
            return;
        }

        if (PARAMETERS.indexOf(parameter) % 2 === 1) return;

        let flagIndex = PARAMETERS.indexOf(parameter);
        let flagValue = PARAMETERS[flagIndex + 1];

        switch (parameter) {
            case '-hn':
            case '--hostname':
                HOSTNAME = flagValue;
                break;
            case '-u':
            case '--user':
                USERNAME = flagValue;
                break;
            case '-p':
            case '--password':
                PASSWORD = flagValue;
                break;
            case '-s':
            case '--start':
                START = parseInt(flagValue, 10);
                break;
            case '-l':
            case '--limit':
                LIMIT = parseInt(flagValue, 10);
                break;
        }
    });
};

/**
 * This function is used to determine if the given page contains a nested Scaffolding macro.
 * @param storageFormat the storage format of the page
 * @param pageId the ID of the page
 */
const useDomParser = async (storageFormat, pageId) => {
    let foundNested = false;
    const dom = new JSDOM(storageFormat);

    // Get all Macros in the Page
    const structuredMacroNodes = dom.window.document.querySelectorAll('ac\\:structured-macro');

    // For every macro, check if it contains any of the Scaffolding macros
    outerLoop:
        for (const node of structuredMacroNodes) {
            // TODO: Add the rest of the Scaffolding macros
            // TODO: fix query logic. It worked previously using raw storage format, but does not work when using the response from the HTTP request since it contains escaped characters.
            const arrOfScaffMacros = [
                "table-data",
                "text-data",
                "date-data",
                "excerpt-data",
                "list-data",
                "number-data",
                "get-data",
                "eval-data",
                "hidden-data",
                "group-data",
                "repeating-data",
                "content-data",
                "option-data",
                "set-data",
                "live-template"
            ];

            for (const scaffMacro of arrOfScaffMacros) {
                if (node.querySelectorAll('[ac:name="' + scaffMacro + '"]').length > 0) {
                    foundNested = true
                    break outerLoop;
                }
            }
        }
    if (foundNested) {
        await saveToCSV(pageId);
    }
}

/**
 * Saves the given array of data to a CSV file in a synchronous fashion. UNTESTED
 * @param data an array of data to save to a CSV file
 * @returns {Promise<void>} nothing
 */
async function saveToCSV(data) {
    const lock = require('async-lock');
    const fileLock = new lock();

    await fileLock.acquire('nested_macros.csv', async function (done) {
        fs.appendFileSync('data.csv', data.toString() + "\n");
        done();
    });
}

async function clearCSVFileFromRoot() {
    if (fs.existsSync('data.csv')) {
        /*        await fs.unlink('data.csv', (err) => {
                    if (err) throw err;
                    console.log('path/file.txt was deleted');
                }); */
        console.log('path/file.txt was deleted')
    } else {
        console.log("no data.csv found")
    }
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

    let spaceKeys = [];
    let hasMoreResults = true;

    let defaultStart = START && START > 0 ? START : 0;
    const defaultLimit = LIMIT && LIMIT > 0 && LIMIT <= 500 ? LIMIT : 500;

    while (hasMoreResults) {
        // Does not retrieve archived spaces.
        const res = await fetch(`${HOSTNAME}/rest/api/space?start=${defaultStart}&limit=${defaultLimit}`, {
            headers: headers
        });

        const resBody = await res.json();
        const spaces = resBody.results;
        const currentSpaceKeys = spaces.map(space => space.key);
        spaceKeys = spaceKeys.concat(currentSpaceKeys);

        if (resBody.size < defaultLimit) {
            hasMoreResults = false;
        } else {
            defaultStart += defaultLimit;
        }
    }

    return spaceKeys;
}

/**
 * Returns all the page IDs in the given space.
 * @param spaceId the ID of the space.
 * @returns {Promise<*[]>} an array of page IDs.
 */
const getAllPageIdsFromSpace = async (spaceId) => {
    const auth = "Basic " + new Buffer(USERNAME + ":" + PASSWORD).toString("base64");

    const headers = {
        'Authorization': auth
    };

    let pageIds = [];
    let hasMoreResults = true;

    let defaultStart = START && START > 0 ? START : 0;
    const defaultLimit = LIMIT && LIMIT > 0 && LIMIT <= 500 ? LIMIT : 500;

    while (hasMoreResults) {
        const res = await fetch(`${HOSTNAME}/rest/api/space/${spaceId}/content?start=${defaultStart}&limit=${defaultLimit}`, {
            headers: headers
        });

        const resBody = await res.json();
        const pages = resBody.page.results;
        const currentPageIds = pages.map(page => page.id);
        pageIds = pageIds.concat(currentPageIds);

        if (resBody.page.size < defaultLimit) {
            hasMoreResults = false;
        } else {
            defaultStart += defaultLimit;
        }
    }

    return pageIds;
}

/**
 * Returns the storage format of the given page.
 * @param pageId the ID of the page.
 * @returns {Promise<*|null|ReadableStream<any>|Blob|ArrayBufferView|ArrayBuffer|FormData|URLSearchParams|string|string|ReadableStream<Uint8Array>|HTMLElement>} the storage format of the page.
 */
const getStorageFormat = async (pageId) => {
    const auth = "Basic " + new Buffer(USERNAME + ":" + PASSWORD).toString("base64");

    const headers = {
        'Authorization': auth
    };

    const res = await fetch(`${HOSTNAME}/rest/api/content/${pageId}?expand=body.storage`, {
        headers: headers
    });

    const resBody = await res.text();
    const formattedResponse = JSON.parse(resBody);
    return formattedResponse.body;
}

/**
 * Returns all the space templates in the given space.
 * @param spaceId the ID of the space.
 * @returns {Promise<*[]>} an array of space templates.
 */
const getListOfSpaceTemplatesInSpace = async (spaceId) => {
    const auth = "Basic " + new Buffer(USERNAME + ":" + PASSWORD).toString("base64");

    const headers = {
        'Authorization': auth
    };

    let templates = [];
    let hasMoreResults = true;

    let defaultStart = START && START > 0 ? START : 0;
    const defaultLimit = LIMIT && LIMIT > 0 && LIMIT <= 500 ? LIMIT : 500;

    while (hasMoreResults) {
        const res = await fetch(`${HOSTNAME}/rest/experimental/template/page?spaceKey=${spaceId}&expand=body&start=${defaultStart}&limit=${defaultLimit}`, {
            headers: headers
        });

        const resBody = await res.json();
        const currentTemplates = resBody.results;
        templates = templates.concat(currentTemplates);

        if (resBody.size < defaultLimit) {
            hasMoreResults = false;
        } else {
            defaultStart += defaultLimit;
        }
    }

    return templates;
}

/**
 * Parent function to process whether Space Templates in a given Space contains nested Scaffolding macros.
 * @param spaceId the ID of the space.
 * @returns {Promise<void>} void.
 */
const processSpaceTemplates = async (spaceId) => {
    const spaceTemplates = await getListOfSpaceTemplatesInSpace(spaceId);
    if (spaceTemplates.length) {
        console.log(`All space templates in space ${spaceId} :`, spaceTemplates);
        for (const item of spaceTemplates) {
            await useDomParser(item.body.storage.value, item.templateId);
        }
    } else {
        console.log("No space template was found in " + spaceId);
    }
}

/**
 * Parent function to process whether Pages in a given Space contains nested Scaffolding macros.
 * @param spaceId the ID of the space.
 * @returns {Promise<void>} void.
 */
const processPagesInSpace = async (spaceId) => {
    const pageIdsInCurrentSpace = await getAllPageIdsFromSpace(spaceId);
    console.log(`All page IDs in space ${spaceId} :`, pageIdsInCurrentSpace);

    for (const pageId of pageIdsInCurrentSpace) {
        const storageFormat = await getStorageFormat(pageId);
        await useDomParser(storageFormat.storage.value, pageId);
    }
}

const main = async () => {
    readCliParameters();
    if (PARAMETERS.includes('-h') || PARAMETERS.includes('--help')) {
        return false;
    }

    await clearCSVFileFromRoot();
    const allSpaceIdsInConfluenceInstance = await getAllSpaceIds();
    console.log("All space IDs in Confluence:", allSpaceIdsInConfluenceInstance);

    console.log("Retrieving all page IDs in all spaces...");
    for (const spaceId of allSpaceIdsInConfluenceInstance) {
        await processPagesInSpace(spaceId);
        await processSpaceTemplates(spaceId);
    }
    return true;
}

main().then((didExecuteMainTask) => {
    if (didExecuteMainTask) {
        console.log("Done!");
    }
});