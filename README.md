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
- `-hn, --hostname`: Set Confluence hostname, i.e `http://localhost:9093`
- `-u, --user`: Set Confluence username, i.e `admin`
- `-p, --password`: Set Confluence user password, i.e `admin`
- `-s, --start`: Set the start offset for Space/SpaceTemplate/Page searches i.e `0` - (you are recommended to leave this at default)
- `-l, --limit`: Set the limit for Space/SpaceTemplate/Page searches i.e `500` - (you are recommended to leave this at default)

## Output

The script will create a CSV file named `data.csv` in the same directory. This file will contain the spaceId and contentId (either pageId or space template Id) if they contain a nested Scaffolding macro.

