import * as XLSX from 'xlsx';

export class ExcelParser {

  /**
   * Parses an Excel sheet and extracts configuration, data, and validation sections.
   *
   * Steps:
   * 1. Reads the Excel file and retrieves the specified sheet
   * 2. Converts sheet data into a 2D array (raw format)
   * 3. Identifies section start indices:
   *    - Field Config section
   *    - Data section
   *    - Validation section
   * 4. Parses Field Config section:
   *    - Supports BOTH new (Config-based) and old (Field Name-based) formats
   *    - Initializes field properties (mandatory, readonly, editable, action)
   *    - Derives editable flag from readonly
   * 5. Parses Data section:
   *    - Extracts headers
   *    - Converts rows into structured objects
   *    - Skips empty rows and irrelevant columns
   * 6. Parses Validation section (if present):
   *    - Extracts validation headers
   *    - Builds structured validation row objects
   * 7. Returns structured output containing fieldConfig, rowsData, and validationRows
   *
   * @param filePath - Path to the Excel file
   * @param sheetName - Name of the sheet to parse
   * @returns Object containing:
   *  - fieldConfig: Field configuration metadata
   *  - rowsData: Array of data records
   *  - validationRows: Array of validation records
   *
   * Example:
   * const { fieldConfig, rowsData, validationRows } =
   *   parseSheet('data.xlsx', 'Sheet1');
   */
  static parseSheet(filePath: string, sheetName: string) {
   
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    let configStart = -1;
    let dataStart = -1;
    let validationStart = -1;
    
    // Identify sections
    raw.forEach((row: any[], index: number) => {
      const firstCell = row[0]?.toString().trim();
      if (firstCell === 'Field Name' || firstCell === 'Config') configStart = index;
      if (firstCell === 'Record') dataStart = index;
      if (firstCell === 'Expected Record' || firstCell === 'Expected Task') validationStart = index;
    });
    if (configStart === -1) throw new Error('Field Config section not found');
    if (dataStart === -1) throw new Error('Data section not found');

    // Field Config Section (Supports BOTH formats)
    const fieldConfig: Record<string, any> = {};
    const headerRow = raw[configStart].map(h => h?.toString().trim());

    // NEW FORMAT (Config-based)
    if (headerRow[0] === 'Config') {
      const fields = headerRow.slice(1);
      fields.forEach(field => {
        fieldConfig[field] = {
          mandatory: false,
          readonly: false,
          editable: true,
          action: 'input'
        };
      });

      for (let i = configStart + 1; i < dataStart; i++) {
        const row = raw[i];
        if (!row || !row[0]) continue;
        const configType = row[0].toString().trim();
        fields.forEach((field, index) => {
          const value = row[index + 1]?.toString().trim();
          switch (configType) {
            case 'Mandatory':
              fieldConfig[field].mandatory = value === 'Y';
              break;
            case 'ReadOnly':
              fieldConfig[field].readonly = value === 'Y';
              break;
            case 'Action':
              fieldConfig[field].action = value || 'input';
              break;
          }
        });
      }
    } else {
      for (let i = configStart + 1; i < dataStart; i++) {
        const row = raw[i];
        if (!row || !row[0]) continue;
        const fieldName = row[0].toString().trim();
        if (!fieldName) continue;
        fieldConfig[fieldName] = {
          mandatory: row[1]?.toString().trim() === 'Y',
          readonly: row[2]?.toString().trim() === 'Y',
          editable: true, // default
          action: row[4]?.toString().trim() || 'input'
        };
      }
    }
    Object.keys(fieldConfig).forEach(field => {
      fieldConfig[field].editable = !fieldConfig[field].readonly;
    });

    // Data Section (Section 2)
    const headers = raw[dataStart].map(h => h?.toString().trim());
    const rowsData: Record<string, string>[] = [];
    const dataEnd = validationStart !== -1 ? validationStart : raw.length;
    for (let i = dataStart + 1; i < dataEnd; i++) {
      const row = raw[i];
      if (!row || row.length === 0) continue;
      if (row[0]?.toString().trim() === 'Expected Record') break;
      const rowObj: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (!header || header === 'Record') return;
        const value = row[index];
        const valStr =
          value !== undefined && value !== null ? String(value).trim() : '';
        if (valStr !== '') {
          rowObj[header] = valStr;
        }
      });
      if (Object.keys(rowObj).length > 0) {
        rowsData.push(rowObj);
      }
    }
    // Validation Section (Section 3)
    const validationRows: Record<string, string>[] = [];
    if (validationStart !== -1) {
      const valHeaders = raw[validationStart].map(h => h?.toString().trim());
      for (let i = validationStart + 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.length === 0) continue;
        const rowObj: Record<string, string> = {};
        valHeaders.forEach((header, index) => {
          if (!header || header === 'Expected Record') return;
          const value = row[index];
          if (value !== undefined && value !== null) {
            rowObj[header] = String(value).trim();
          }
        });
        if (Object.keys(rowObj).length > 0) {
          validationRows.push(rowObj);
        }
      }
    }
    return { fieldConfig, rowsData, validationRows };
  }
}
