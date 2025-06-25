const fs = require("fs").promises;
const path = require("path");

const baseDir = path.join(__dirname, 'public', 'document', '06. Tổng đài đã sửa_2025328641', '06. Tổng đài đã sửa');
const groupFolders = [
    'ok Nhóm 2',
    'ok Nhóm 3',
    'ok Nhóm 4',
    'ok Nhóm 5'
];

async function formatFileContent(filePath) {
    try {
        const originalContent = await fs.readFile(filePath, 'utf-8');
        const lines = originalContent.replace(/\r/g, '').split('\n');
        const newLines = [];
        let i = 0;
        while (i < lines.length) {
            const currentLine = lines[i]?.trim();
            const nextLine = (i + 1 < lines.length) ? lines[i + 1]?.trim() : null;

            // Check if the current line is just an option marker like "A)"
            if (currentLine && /^[A-H]\)$/.test(currentLine) && nextLine && !/^[A-H]\)/.test(nextLine) && !nextLine.startsWith('Đáp án')) {
                // If so, merge it with the next line
                newLines.push(`${currentLine} ${nextLine}`);
                i += 2; // Skip the next line as it has been merged
            } else {
                // Otherwise, keep the original line
                newLines.push(lines[i]);
                i += 1;
            }
        }
        const newContent = newLines.join('\n');
        await fs.writeFile(filePath, newContent, 'utf-8');
        console.log(`Successfully formatted ${filePath}`);
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
    }
}

async function processGroups() {
    console.log('Starting file formatting process...');
    for (const group of groupFolders) {
        const groupPath = path.join(baseDir, group);
        try {
            const files = await fs.readdir(groupPath);
            const txtFiles = files.filter(file => file.endsWith('.txt'));

            if (txtFiles.length === 0) {
                console.log(`No .txt files found in ${group}.`);
                continue;
            }

            for (const file of txtFiles) {
                const filePath = path.join(groupPath, file);
                await formatFileContent(filePath);
            }
        } catch (error) {
            console.error(`Error processing directory ${groupPath}:`, error);
        }
    }
    console.log('File formatting process completed.');
}

processGroups(); 