import xlsx from 'xlsx';

const path = "/Users/andreslopez/Desktop/XL Ideas/IIRS SAS/1. Zeticas/Costo 2026.xlsx";

try {
    const wb = xlsx.readFile(path);
    const ws = wb.Sheets['Precios sal '];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    console.log(JSON.stringify(data.slice(0, 10), null, 2));
} catch (e) {
    console.log(e.message);
}
