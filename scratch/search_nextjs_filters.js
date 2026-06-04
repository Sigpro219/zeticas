import fs from 'fs';
import path from 'path';

const searchDir = "C:/Users/German Higuera/OneDrive/Documentos/Projects/zeticas-next/src";
const query = /producto terminado/i;

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    let filepath = path.join(dir, file);
    let stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else if (stat.isFile() && /\.(tsx|ts|js|jsx)$/.test(file)) {
      callback(filepath);
    }
  });
}

console.log("Searching for 'producto terminado' in next.js files...");
walk(searchDir, filepath => {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (query.test(line)) {
      console.log(`${filepath}:${index + 1}: ${line.trim()}`);
    }
  });
});
