# Confluence Nested Scaffolding Macro Finder

This script is designed to find nested Scaffolding macros in a Confluence instance. It checks all pages and space templates in all spaces for the presence of nested Scaffolding macros.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have installed [Node.js](https://nodejs.org/en/download/) and npm (comes with Node.js).
- You have a Confluence instance where you have administrative access.

## Installing Dependencies

To install the necessary dependencies, navigate to the directory containing the script in your terminal and run the following command:

```bash
npm install
```

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
- `-sp, --space`: Set Confluence space key, i.e `DS
- `-hn, --hostname`: Set Confluence hostname, i.e `http://localhost:9093`
- `-st, --start`: Set the start offset for Space/SpaceTemplate/Page searches i.e `0` - (you are recommended to leave this at default)
- `-ll, --limit`: Set the limit for Space/SpaceTemplate/Page searches i.e `500` - (you are recommended to leave this at default)

## Output

The script will create two output files:
- affected_pages.csv which will be continuously written to as the script runs and it will contain spaceId, pageId of affected pages.
- affected_spaces.csv which will be written when the script finishes and it will contain spaceId of affected spaces and count of affected pages respectively.

