const fs = require('fs');
const path = require('path');
// Path relative to this script in scripts folder
const filePath = path.join(__dirname, '..', 'src', 'pages', 'Inventory.jsx');
try {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace \" with " globally
    // We are looking for literal backslash followed by double quote
    const originalLength = content.length;
    content = content.replace(/\\"/g, '"');
    if (content.length !== originalLength) {
        fs.writeFileSync(filePath, content);
        console.log('Successfully fixed escaped quotes in Inventory.jsx');
    } else {
        console.log('No escaped quotes found to fix.');
    }
} catch (err) {
    console.error('Error fixing file:', err);
}
