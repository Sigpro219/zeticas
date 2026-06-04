import fs from 'fs';

const filepath = "C:/Users/German Higuera/OneDrive/Documentos/Projects/zeticas/src/pages/Inventory.jsx";
if (fs.existsSync(filepath)) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (/image|img/i.test(line)) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log("File not found");
}
