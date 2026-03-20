import xlsx from 'xlsx';

const path = "/Users/andreslopez/Desktop/XL Ideas/IIRS SAS/1. Zeticas/1. Control de facturación Z.xlsm";

try {
    const wb = xlsx.readFile(path);
    console.log(wb.SheetNames);
} catch (e) {
    console.log(e.message);
}
