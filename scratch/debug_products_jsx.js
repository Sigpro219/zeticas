import fs from 'fs';

const productsPath = "C:/Users/German Higuera/OneDrive/Documentos/Projects/zeticas/src/pages/Products.jsx";
const content = fs.readFileSync(productsPath, 'utf8');
const lines = content.split('\n');

console.log("--- LINES 625 to 645 ---");
for (let i = 624; i < 645; i++) {
  console.log(`${i + 1}: [${lines[i]}]`);
}
