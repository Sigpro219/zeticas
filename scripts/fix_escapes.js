const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'pages', 'Inventory.jsx');
let content = fs.readFileSync(filePath, 'utf8');
// Replace \" with " globally
content = content.replace(/\\"/g, '"');
fs.writeFileSync(filePath, content);
console.log('Fixed escaped quotes in Inventory.jsx');
