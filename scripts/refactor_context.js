import fs from 'fs';

const filePath = 'src/context/BusinessContext.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Refactor collection(db, 'name') to tCol('name')
content = content.replace(/collection\(db,\s*/g, 'tCol(');

// Refactor doc(db, 'name', 'id') to tDoc('name', 'id')
content = content.replace(/doc\(db,\s*/g, 'tDoc(');

// Fix useEffect dependency array
// Find the useEffect block and add tenantId or ensure it's there
// Since I already did a replace_file_content for the beginning of BusinessProvider, 
// I should just check if the useEffect I failed to replace earlier is still original.

fs.writeFileSync(filePath, content);
console.log('✅ BusinessContext.jsx refactored with tCol/tDoc helpers.');
