const mammoth = require("mammoth");
const fs = require("fs").promises;
const path = require("path");

const baseDir = path.join(__dirname, 'public', 'document', '06. Tổng đài đã sửa_2025328641', '06. Tổng đài đã sửa');
const groupFolders = [
    'ok Nhóm 2',
    'ok Nhóm 3',
    'ok Nhóm 4',
    'ok Nhóm 5',
    'ok Nhóm 6'
];

async function convertDocToText(inputPath, outputPath) {
    try {
        const result = await mammoth.extractRawText({ path: inputPath });
        await fs.writeFile(outputPath, result.value);
        console.log(`Successfully converted ${inputPath} to ${outputPath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`Error: Input file not found at ${inputPath}`);
        } else {
            console.error(`Error converting ${inputPath}:`, error.message || error);
        }
    }
}

async function processGroups() {
    for (const group of groupFolders) {
        const groupPath = path.join(baseDir, group);
        try {
            const files = await fs.readdir(groupPath);
            const docFiles = files.filter(file => file.endsWith('.docx') || file.endsWith('.doc'));

            if (docFiles.length === 0) {
                console.log(`No .doc or .docx files found in ${group}.`);
                continue;
            }

            for (const file of docFiles) {
                const inputFile = path.join(groupPath, file);
                const outputFile = path.join(groupPath, `${path.parse(file).name}.txt`);
                await convertDocToText(inputFile, outputFile);
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.error(`Error: Directory not found at ${groupPath}`);
            } else {
                console.error(`Error processing directory ${groupPath}:`, error);
            }
        }
    }
}

processGroups(); 