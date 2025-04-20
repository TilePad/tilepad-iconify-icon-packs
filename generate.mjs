import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import {
  downloadNPMPackage,
  IconSet,
  exportToDirectory,
  execAsync,
} from "@iconify/tools";
import * as path from "node:path";
import { existsSync } from "node:fs";

// Directories
const cacheDir = "cache";
const outDir = "packs";
const distDir = "dist";

// Download all icon sets
console.log("Downloading latest package");
const downloaded = await downloadNPMPackage({
  package: "@iconify/json",
  target: cacheDir,
});
console.log("Downloaded version", downloaded.version);

// Get a list of icon sets
const list = JSON.parse(
  await readFile(downloaded.contentsDir + "/collections.json", "utf8")
);
const prefixes = Object.keys(list);
console.log("Got", prefixes.length, "icon sets");

let icons = [];

async function processIconSet(prefix) {
  // Read file
  const data = JSON.parse(
    await readFile(downloaded.contentsDir + "/json/" + prefix + ".json", "utf8")
  );

  // Create IconSet
  const iconSet = new IconSet(data);

  const iconInfo = iconSet.info;
  const id = iconSet.prefix;
  const author = `${iconInfo.author.name} (${iconInfo.author.url})`;

  icons.push({
    "id": `com.jacobtread.iconify.${id}`,
    "name": iconInfo.name,
    "authors": [
      ["Jacobtread (Icon Pack)", "Iconify", `${author}`]
    ],
    "description": `Iconify ${iconInfo.name} Icon pack`,
    "repo": "TilePad/tilepad-iconify-icon-packs",
    "fileName": `com.jacobtread.iconify.${id}.tilepadIcons`,
  })

  const manifest = createManifest(iconSet);
  const outPath = path.join(outDir, iconSet.prefix);

  // Export it
  console.log("Exporting", iconSet.info.name, outPath);

  if (!existsSync(outPath)) {
    await mkdir(outPath, { recursive: true });
  }

  // Write the manifest file
  await writeFile(path.join(outPath, "manifest.toml"), manifest);

  const icons = iconSet.list();
  const iconsJSON = JSON.stringify(
    icons.map((icon) => ({
      path: `icons/${icon}.svg`,
      name: icon,
    }))
  );

  // Write the manifest file
  await writeFile(path.join(outPath, "icons.json"), iconsJSON);

  const iconsPath = path.join(outPath, "icons");
  await exportToDirectory(iconSet, {
    target: iconsPath,
  });

  await replaceInSvgFiles(iconsPath);

  if (!existsSync(distDir)) {
    await mkdir(distDir, { recursive: true });
  }

  await execAsync(
    `tilepad bundle-icon-pack --path ${outPath} --output ${distDir}`
  );
}

const firstArg = process.argv[2];

if (firstArg) {
  // Export specific icon set
  await processIconSet(firstArg);
} else {
  // Export each icon set (15 packs at a time)
  const BATCH_SIZE = 15;
  for (let i = 0; i < prefixes.length; i += BATCH_SIZE) {
    const batch = prefixes.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((prefix) => processIconSet(prefix)));
  }
}
await writeFile("dist/icon-packs.json", JSON.stringify(icons), 'utf-8')

async function replaceInSvgFiles(dirPath) {
  try {
    const files = await readdir(dirPath);

    for (const file of files) {
      if (path.extname(file) === '.svg') {
        const filePath = path.join(dirPath, file);
        const content = await readFile(filePath, 'utf8');

        const updatedContent = content.replace(/currentColor/g, '#ffffff');
        await writeFile(filePath, updatedContent, 'utf8');
        console.log(`Updated ${file}`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

function createManifest(iconSet) {
  const iconInfo = iconSet.info;
  const id = iconSet.prefix;
  const author = `${iconInfo.author.name} (${iconInfo.author.url})`;

  return `[icons]
id = "com.jacobtread.iconify.${id}"
name = "${iconInfo.name}"
version = "${iconInfo.version ?? "1.0.0"}"
authors = ["Jacobtread (Icon Pack)", "Iconify", "${author}"]
description = "Iconify ${iconInfo.name} Icon pack"`;
}
