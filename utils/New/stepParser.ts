import * as XLSX from 'xlsx';
import { logger } from '@utils/logger';
export type ViewData = {
  viewName: string;
  headers: string[];
  records: Record<string, string>[];
  multiOrg?: boolean;
  addRecords: number;
  deleteRecords: number[]; 
};

export class StepParser {

  /**
   * Parses an Excel sheet and extracts structured view-based data.
   *
   * This function reads a sheet containing multiple "View - X" sections and
   * converts each matching view into a structured object containing headers
   * and row-wise records.
   *
   * Steps:
   * 1. Load Excel file and access the specified worksheet.
   * 2. Convert sheet into a 2D array format using sheet_to_json.
   * 3. Iterate through rows to locate sections starting with "View -".
   * 4. Filter views based on the provided expectedViews list.
   * 5. For each matching view:
   *    a. Extract view name.
   *    b. Validate the presence of a "Records" row.
   *    c. Extract column headers from the "Records" row.
   *    d. Iterate through subsequent rows until:
   *       - next "View -" section OR
   *       - empty row
   *    e. Build structured records by mapping headers to row values.
   * 6. Collect all parsed views into a final array.
   * 7. Return structured ViewData for further processing.
   *
   * @param filePath Path to the Excel file.
   * @param sheetName Name of the worksheet containing view data.
   * @param expectedViews List of view names to include in parsing.
   *
   * @returns Array of ViewData objects containing:
   *          - viewName: Name of the view section
   *          - headers: Column headers for the view
   *          - records: Array of row-wise key-value mappings
   *
   * @throws Error If sheet is missing or required "Records" structure is invalid.
   *
   * Example:
   * const views = Parser.parse('data.xlsx', 'Sheet1', ['Header View', 'Detail View']);
   */
  static parse(filePath: string,sheetName: string,expectedViews: string[]): ViewData[] {

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Step sheet not found: ${sheetName}`);
    }
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const views: ViewData[] = [];
    let i = 0;
    while (i < raw.length) {
      const row = raw[i];
      const firstCell = row?.[0]?.toString().trim();
      const fullRowText = row?.map(c => c?.toString().trim()).join(' ') || '';
      
      if (firstCell && firstCell.startsWith('View -')) {
        const viewName = firstCell.replace('View -', '').trim();
        // ✅ Extract Add Records
        const addMatch = fullRowText.match(/add\s*records\s*-\s*(\d+)/i);
        const addRecords = addMatch ? Number(addMatch[1]) : 0;
        // ✅ Extract Delete Records
        const deleteMatch = fullRowText.match(/delete\s*records\s*-\s*([\d,\s]+)/i);
        const deleteRecords = deleteMatch? deleteMatch[1].split(',').map(x => x.trim()).filter(x => x !== '').map(x => Number(x))
          .filter(n => !isNaN(n) && n > 0) : [];
        const isMultiOrg = /multiorg\s*-\s*yes/i.test(fullRowText);
        if (!expectedViews.includes(viewName)) {
          i++;
          continue;
        }
        logger.info(`Parsing View: ${viewName} - MultiOrg: ${isMultiOrg}`);
        const recordsRow = raw[i + 1];
        if (!recordsRow || recordsRow[0]?.toString().trim() !== 'Records') {
          throw new Error(`Missing 'Records' row for view: ${viewName}`);
        }
        const headers = recordsRow.slice(1).map(h => h?.toString().trim()).filter(Boolean);
        if (headers.length === 0) {
          throw new Error(`No valid headers for view: ${viewName}`);
        }
        const records: Record<string, string>[] = [];
        let j = i + 2;
        while (j < raw.length) {
          const currentRow = raw[j];
          if (!currentRow || currentRow.length === 0) break;
          const nextCell = currentRow[0]?.toString().trim();
          if (nextCell && nextCell.startsWith('View -')) break;
          const record: Record<string, string> = {};
          headers.forEach((header, index) => {
            const value = currentRow[index + 1]; 
            if (
              value !== undefined &&
              value !== null &&
              String(value).trim() !== ''
            ) {
              record[header] = String(value).trim();
            }
          });
          const hasAnyValue = headers.some((_, index) => {
            const value = currentRow[index + 1];
            return value !== undefined && value !== null && String(value).trim() !== '';
          });
          // ✅ Push record EVEN IF EMPTY (important for MultiOrg)
          records.push(hasAnyValue ? record : {});
          j++;
        }
        views.push({viewName,headers,records,multiOrg: isMultiOrg,addRecords,deleteRecords});
        i = j;
        continue;
      }
      i++;
    }
    return views;
  }
}