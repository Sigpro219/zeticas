import fs from 'fs';

const filepath = "C:/Users/German Higuera/OneDrive/Documentos/Projects/zeticas/src/pages/Products.jsx";
const content = fs.readFileSync(filepath, 'utf8');
const lines = content.split('\n');

// Verify line 628 and 640 content to be absolutely sure
console.log("Replacing:");
console.log(`Start line 628: ${lines[627].trim()}`);
console.log(`End line 640: ${lines[639].trim()}`);

const newLines = [
  "                                            <td>",
  "                                                <div ",
  "                                                    onClick={() => p.category?.toLowerCase() !== 'materia prima' && handleTableImageClick(p)}",
  "                                                    className={p.category?.toLowerCase() !== 'materia prima' ? \"table-image-cell\" : \"\"}",
  "                                                    style={{ ",
  "                                                        display: 'flex', ",
  "                                                        gap: '0.75rem', ",
  "                                                        alignItems: 'center', ",
  "                                                        cursor: p.category?.toLowerCase() !== 'materia prima' ? 'pointer' : 'default',",
  "                                                        position: 'relative'",
  "                                                     }}",
  "                                                     title={p.category?.toLowerCase() !== 'materia prima' ? \"Haga clic para subir fotografía\" : \"\"}",
  "                                                >",
  "                                                    {p.category?.toLowerCase() !== 'materia prima' && ("
];

// splice lines from index 627 to index 639 (13 lines total)
lines.splice(627, 13, ...newLines);

fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
console.log("Successfully patched C:/Users/German Higuera/OneDrive/Documentos/Projects/zeticas/src/pages/Products.jsx!");
