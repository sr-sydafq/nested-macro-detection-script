const {JSDOM} = require('jsdom');
const fs = require('fs');

let HOSTNAME = 'http://localhost:9092';
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
        -s,  --start            Set the start offset for Space/SpaceTemplate/Page searches i.e 0 - (you are recommended to leave this at default)
        -l,  --limit            Set the limit for Space/SpaceTemplate/Page searches i.e 500 - (you are recommended to leave this at default)
    `);
};

const readCliParameters = () => {
    const PARAMETER_MAP = {
        '-hn': '--hostname',
        '-u': '--user',
        '-p': '--password',
        '-s': '--start',
        '-l': '--limit'
    };

    for (let i = 0; i < PARAMETERS.length; i += 2) {
        const parameter = PARAMETERS[i];
        const value = PARAMETERS[i + 1];

        switch (PARAMETER_MAP[parameter] || parameter) {
            case '--hostname':
                HOSTNAME = value;
                break;
            case '--user':
                USERNAME = value;
                break;
            case '--password':
                PASSWORD = value;
                break;
            case '--start':
                START = parseInt(value, 10);
                break;
            case '--limit':
                LIMIT = parseInt(value, 10);
                break;
            case '-h':
            case '--help':
                displayHelp();
                process.exit(0);
        }
    }
};

const SCAFFOLDING_MACROS = [
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

/**
 * This function is used to determine if the given page contains a nested Scaffolding macro and saves the spaceId + contentId to the csv if true.
 * @param storageFormat the storage format of the page
 * @param contentId the ID of the page
 * @param spaceId the ID of the space
 */
const checkForNestedScaffoldingMacro = async (storageFormat, contentId, spaceId) => {
    const dom = new JSDOM(storageFormat);

    // Get all Macros in the Page
    const structuredMacroNodes =
        dom.window.document.querySelectorAll('ac\\:structured-macro');

    // For every macro, check if it contains any of the Scaffolding macros
    for (const node of structuredMacroNodes) {
        for (const scaffoldingMacro of SCAFFOLDING_MACROS) {
            if (node.querySelectorAll('[ac:name="' + scaffoldingMacro + '"]').length > 0) {
                await saveToCSV(spaceId, contentId);
                return;
            }
        }
    }
}

/**
 * Saves the given array of data to a CSV file in a synchronous fashion.Here's the continuation of the refactored code:

 * @param spaceId spaceId of the contentId
 * @param contentId the contentId - either pageId or space template Id if they contain a nested Scaffolding macro
 * @returns {Promise<void>} nothing
 */
function saveToCSV(spaceId, contentId) {
    fs.appendFileSync('data.csv', `${spaceId},${contentId.toString()}\n`);
}

/**
 * Checks if data.csv exists in the current directory. If it does not exist, it will create it, else it will continue
 * writing in it.
 * @returns {Promise<void>} nothing
 */
const checkIfCSVExists = async () => {
    if (!fs.existsSync('data.csv')) {
        console.log("No data.csv found. Creating data.csv");
        fs.writeFileSync('data.csv', 'spaceId,contentId\n');
    } else {
        console.log('data.csv found, continuing write');
    }
}

/**
 * This function is used to initialize the auth and the start/limit offsets for the requests.
 * @returns {{headers: {Authorization: string}, startOffset: (number), limitOffset: (number)}}
 */
function initializeRequest() {
    const auth = "Basic " + Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");

    const headers = {
        'Authorization': auth
    };

    let startOffset = START && START > 0 ? START : 0;
    const limitOffset = LIMIT && LIMIT > 0 && LIMIT <= 500 ? LIMIT : 500;
    return {headers, startOffset, limitOffset};
}

/**
 * Returns all the space IDs in the given Confluence instance.
 * @returns {Promise<*>} an array of space IDs
 */
const getAllSpaceIds = async () => {
    let {headers, startOffset, limitOffset} = initializeRequest();

    let spaceKeys = [];
    let hasMoreResults = true;
    while (hasMoreResults) {
        // Does not retrieve archived spaces.
        const res = await fetch(`${HOSTNAME}/rest/api/space?start=${startOffset}&limit=${limitOffset}`, {
            headers: headers,
            timeout: 10000
        });

        const resBody = await res.json();
        const spaces = resBody.results;
        const currentSpaceKeys = spaces.map(space => space.key);
        spaceKeys = spaceKeys.concat(currentSpaceKeys);

        if (resBody.size < limitOffset) {
            hasMoreResults = false;
        } else {
            startOffset += limitOffset;
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
    let {headers, startOffset, limitOffset} = initializeRequest();

    let pageIds = [];
    let hasMoreResults = true;
    while (hasMoreResults) {
        const res = await fetch(`${HOSTNAME}/rest/api/space/${spaceId}/content?start=${startOffset}&limit=${limitOffset}`, {
            headers: headers,
            timeout: 10000
        });

        const resBody = await res.json();
        const pages = resBody.page.results;
        const currentPageIds = pages.map(page => page.id);
        pageIds = pageIds.concat(currentPageIds);

        if (resBody.page.size < limitOffset) {
            hasMoreResults = false;
        } else {
            startOffset += limitOffset;
        }
    }

    return pageIds;
}

/**
 * Returns the storage format of the given page.
 * @paramHere's the continuation of the refactored code:

 * @param pageId the ID of the page.
 * @returns {Promise<*|null|ReadableStream<any>|Blob|ArrayBufferView|ArrayBuffer|FormData|URLSearchParams|string|string|ReadableStream<Uint8Array>|HTMLElement>} the storage format of the page.
 */
const getStorageFormat = async (pageId) => {
    const {headers} = initializeRequest();

    const res = await fetch(`${HOSTNAME}/rest/api/content/${pageId}?expand=body.storage`, {
        headers: headers,
        timeout: 10000
    });

    const resBody = await res.json();
    return resBody.body;
}

/**
 * Returns all the space templates in the given space.
 * @param spaceId the ID of the space.
 * @returns {Promise<*[]>} an array of space templates.
 */
const getListOfSpaceTemplatesInSpace = async (spaceId) => {
    let {headers, startOffset, limitOffset} = initializeRequest();

    let templates = [];
    let hasMoreResults = true;
    while (hasMoreResults) {
        const res = await fetch(`${HOSTNAME}/rest/experimental/template/page?spaceKey=${spaceId}&expand=body&start=${startOffset}&limit=${limitOffset}`, {
            headers: headers,
            timeout: 10000
        });

        const resBody = await res.json();
        const currentTemplates = resBody.results;
        templates = templates.concat(currentTemplates);

        if (resBody.size < limitOffset) {
            hasMoreResults = false;
        } else {
            startOffset += limitOffset;
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
            await checkForNestedScaffoldingMacro(item.body.storage.value, item.templateId, spaceId);
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
        await checkForNestedScaffoldingMacro(storageFormat.storage.value, pageId, spaceId);
    }
}

const main = async () => {
    try {
        readCliParameters();
        await checkIfCSVExists();
        const allSpaceIdsInConfluenceInstance = await getAllSpaceIds();
        console.log("All space IDs in Confluence:", allSpaceIdsInConfluenceInstance);

        for (const spaceId of allSpaceIdsInConfluenceInstance) {
            await processPagesInSpace(spaceId);
            await processSpaceTemplates(spaceId);
        }
        console.log("Done!");
    } catch (error) {
        console.log(error);
        fs.appendFileSync('error.log', error + '\n');
    }
}

main();
