import XLSX from 'xlsx';
import path from 'path';

const filePath = "C:\\Users\\Usuario\\OneDrive\\Documentos\\Proyectos Delta CoreTech\\2026\\Zeticas\\Proveedores.xlsx";
try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  console.log(JSON.stringify(jsonData.slice(0, 5), null, 2));
} catch (err) {
  console.error("Error reading XLSX:", err.message);
}
