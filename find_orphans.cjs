const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dir, exts, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, exts, fileList);
    } else {
      if (exts.includes(path.extname(filePath))) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const allTsFiles = getAllFiles(srcDir, ['.ts', '.tsx']);
const allContents = allTsFiles.map(f => fs.readFileSync(f, 'utf8'));

for (const file of allTsFiles) {
  if (file.endsWith('main.tsx') || file.endsWith('App.tsx') || file.endsWith('vite-env.d.ts')) continue;
  
  const basename = path.basename(file, path.extname(file));
  let isImported = false;
  
  for (let i = 0; i < allTsFiles.length; i++) {
    if (allTsFiles[i] === file) continue;
    // Check if imported using standard import syntax
    if (allContents[i].includes(`/${basename}'`) || allContents[i].includes(`/${basename}"`) || allContents[i].includes(`import ${basename}`) || allContents[i].includes(`import { ${basename}`) || allContents[i].includes(`import {${basename}`)) {
      isImported = true;
      break;
    }
  }
  
  if (!isImported) {
    console.log("Orphaned:", file);
  }
}
