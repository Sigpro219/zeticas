import xlsx from 'xlsx';

const paths = [
    "/Users/andreslopez/Desktop/XL Ideas/IIRS SAS/1. Zeticas/Clientes SIIGO.xlsx",
    "/Users/andreslopez/Desktop/XL Ideas/IIRS SAS/1. Zeticas/Proveedores.xlsx",
    "/Users/andreslopez/Desktop/XL Ideas/IIRS SAS/1. Zeticas/Bancos.xlsx",
    "/Users/andreslopez/Desktop/XL Ideas/IIRS SAS/1. Zeticas/Costo 2026.xlsx",
    "/Users/andreslopez/Desktop/XL Ideas/IIRS SAS/1. Zeticas/Cargue_Masivo_Clientes.xls.xlsx"
];

const results = [];

paths.forEach(p => {
    try {
        const wb = xlsx.readFile(p);
        results.push({
            file: p,
            sheets: wb.SheetNames.map(s => {
                const ws = wb.Sheets[s];
                const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
                return { name: s, headers: data[0] };
            })
        });
    } catch (e) {
        results.push({ file: p, error: e.message });
    }
});

console.log(JSON.stringify(results, null, 2));
