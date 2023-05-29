const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const now = new Date();
const timeString = now.toLocaleTimeString('en-GB', {hour12: false});
const dateString = now.toLocaleDateString('en-GB');
const timestamp = `${timeString.replace(/:/g, "-")}_${dateString.split('/').join('-')}`;

const sourceFile = path.join(__dirname, 'xml.js');
const destDir = path.join(__dirname, 'packaged');
const destFile = path.join(destDir, `xml.js`);

// Create the new directory if it doesn't exist
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
}

// Copy xml.js to the new directory
fs.copyFileSync(sourceFile, destFile);
console.log(`Copied ${sourceFile} to ${destFile}`);

// Copy README_TEMPLATE.md to the new directory and replace SCRIPT_NAME with the filename
const readmeTemplate = fs.readFileSync(path.join(__dirname, 'README_TEMPLATE.md'), 'utf8');
const readmeContents = readmeTemplate.replace(/SCRIPT_NAME/g, `xml.js`);
fs.writeFileSync(path.join(destDir, 'README.md'), readmeContents);
console.log(`Created README.md in ${destDir}`);

// Create a zip file
const output = fs.createWriteStream(path.join(__dirname, `packaged_${timestamp}.zip`));
const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
});

output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('Archiver has been finalized and the output file descriptor has closed.');

    // Delete the 'packaged' directory
    fs.rmdirSync(destDir, { recursive: true });
    console.log(`Deleted directory ${destDir}`);
});

archive.on('error', function(err) {
    throw err;
});

archive.pipe(output);
archive.directory(destDir, false);
archive.finalize();
