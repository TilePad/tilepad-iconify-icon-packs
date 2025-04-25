import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const tag = process.env.RELEASE_TAG;
if (!tag) throw new Error("RELEASE_TAG must be defined")

// Get all icon pack files from the dist folder
const distDir = path.join(process.cwd(), 'dist');
const iconPackFiles = (await fs.readdir(distDir))
    .filter((file) => file.endsWith('.tilepadIcons'))
    .map((file) => path.join(distDir, file));

const uploadFile = (filePath) => {
    return new Promise((resolve, reject) => {
        console.log(`Uploading: ${filePath}`);
        exec(`gh release upload "${tag}" "${filePath}" --clobber`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Failed to upload: ${filePath}`, stderr);
                reject(new Error(`Failed to upload ${filePath}`));
            } else {
                console.log(`Successfully uploaded: ${filePath}`);
                resolve(stdout);
            }
        });
    });
};

const uploadAllInBatches = async () => {
    const batchSize = 8;
    for (let i = 0; i < iconPackFiles.length; i += batchSize) {
        const batch = iconPackFiles.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1

        console.log(`Uploading batch ${batchNumber}...`);
        try {
            await Promise.all(batch.map(file => uploadFile(file)));
            console.log(`Batch ${batchNumber} uploaded successfully.`);
        } catch (error) {
            console.error(`Error uploading batch ${batchNumber}.`);
            process.exit(1);
        }
    }
};

await uploadAllInBatches();