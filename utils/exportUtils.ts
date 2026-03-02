
import * as XLSX from 'xlsx';

/**
 * Exports data to an XLSX file. Supports single array of data or array of sheets.
 * @param dataOrSheets Array of objects (rows) OR array of objects with {data, name} for multiple sheets.
 * @param fileName Name of the file to be saved (without extension).
 * @param sheetName Name of the sheet (only used for single array mode).
 */
export const exportToXLSX = (dataOrSheets: any[], fileName: string, sheetName: string = 'Dados') => {
  try {
    const workbook = XLSX.utils.book_new();
    
    // Check if it's multiple sheets (array of objects with 'data' and 'name' properties)
    const isMultiSheet = Array.isArray(dataOrSheets) && 
                         dataOrSheets.length > 0 && 
                         typeof dataOrSheets[0] === 'object' && 
                         'name' in dataOrSheets[0] && 
                         'data' in dataOrSheets[0];

    if (isMultiSheet) {
      dataOrSheets.forEach((sheet: any) => {
        const worksheet = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      });
    } else {
      const worksheet = XLSX.utils.json_to_sheet(dataOrSheets);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
    
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Error exporting to XLSX:', error);
  }
};
