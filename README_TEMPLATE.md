# Confluence Scaffolding Macro Checker

This script checks for nested Scaffolding macros in a Confluence instance.

## Setup

1. Install [Node.js](https://nodejs.org/) if you haven't already.
2. Open a terminal/command prompt.
3. Navigate to the directory containing this README file.
4. Run `npm install` to install the necessary packages.

## Using the Script

To use the script, follow these steps:

1. Open your terminal.
2. Navigate to the directory containing the script.
3. Run the script with the necessary flags. Here's an example:

```bash
node "./xml" -hn http://localhost:9093 -u admin -p admin
```

### Flags

- `-h, --help`: Display help menu
- `-u, --user`: Set Confluence username, i.e `admin`
- `-p, --password`: Set Confluence user password, i.e `admin`
- `-s, --space`: Set Confluence space key, i.e `DS` or leave blank to search all spaces.
- `-hn, --hostname`: Set Confluence hostname, i.e `http://localhost:9093`
- `-st, --start`: Set the start offset for Space/SpaceTemplate/Page searches i.e `0` - (you are recommended to leave this at default)
- `-ll, --limit`: Set the limit for Space/SpaceTemplate/Page searches i.e `500` - (you are recommended to leave this at default)

## Output

The script will create two output files:
- `affected_pages.csv` which will be continuously written to as the script runs and it will contain spaceId, pageId of affected pages.
- `affected_spaces.csv` which will be written when the script finishes and it will contain spaceId,totalAffectedPages.
