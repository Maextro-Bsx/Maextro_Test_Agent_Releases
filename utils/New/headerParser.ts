import { logger } from '@utils/logger';
import * as XLSX from 'xlsx';

export type StepMeta = {
  stepNo: string;
  taskType: string;
  views: string[];
  action: string;
  rejectingTo: string;
};

export type HeaderData = {requestDetails: Record<string, string>;steps: StepMeta[];};

export class HeaderParser {

  /**
   * Parses an Excel header sheet and extracts request details and step metadata.
   *
   * Steps:
   * 1. Reads the Excel file using XLSX.
   * 2. Loads the specified worksheet.
   * 3. Extracts request-level key-value pairs from the first section:
   *    - Row 1: headers
   *    - Row 2: values
   * 4. Locates the "Step No" section in the sheet.
   * 5. Reads step configuration rows until an empty/invalid row is encountered.
   * 6. Builds a structured list of steps with:
   *    - stepNo
   *    - taskType
   *    - views (comma-separated list converted to array)
   *    - action (default: "Save")
   *    - condition (optional)
   * 7. Logs parsed request details and steps.
   * 8. Returns a structured object containing both requestDetails and steps.
   *
   * @param filePath Path to the Excel file.
   * @param sheetName Name of the worksheet containing header and step data.
   *
   * @returns HeaderData object containing:
   *          - requestDetails: key-value pairs from header section
   *          - steps: array of parsed step metadata
   *
   * @throws Error If sheet is not found or step section is missing.
   *
   * Example:
   * const data = HeaderParser.parse('testdata.xlsx', 'Header');
   */
  static parse(filePath: string, sheetName: string): HeaderData {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Header sheet not found: ${sheetName}`);
    }
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    let requestDetails: Record<string, string> = {};
    const steps: StepMeta[] = [];
    let i = 0;

    //Request Details
    const headers = raw[i]?.map(h => h?.toString().trim());
    const values = raw[i + 1];
    headers.forEach((header: string, index: number) => {
      if (!header) return;
      const value = values?.[index];
      requestDetails[header] = value ? String(value).trim() : '';
    });
    i += 2;

    //FIND STEP SECTION
    while (i < raw.length) {
      const row = raw[i];
      const firstCell = row?.[0]?.toString().trim();
      if (firstCell === 'Step No') break;
      i++;
    }
    if (i >= raw.length) {
      throw new Error('Step section not found in header sheet');
    }
    const stepHeaders = raw[i].map(h => h?.toString().trim());
    i++;

    //PARSE STEPS
    while (i < raw.length) {
      const row = raw[i];
      if (!row || row.length === 0) {
        i++;
        continue;
      }
      const stepNo = row[0]?.toString().trim();
      if (!stepNo) break;
      const taskType = row[1]?.toString().trim();
      const viewsRaw = row[2]?.toString().trim();
      const action = row[3]?.toString().trim() || 'Save';
      const rejectingTo = row[4]?.toString().trim();
      const views = viewsRaw? viewsRaw.split(',').map((v: string) => v.trim()): [];
      steps.push({stepNo,taskType,views,action,rejectingTo});
      i++;
    }
    logger.info(`Request Details: ${JSON.stringify(requestDetails)}`);
    logger.info(`Steps: ${JSON.stringify(steps)}`);
    return {requestDetails,steps};
  }
}