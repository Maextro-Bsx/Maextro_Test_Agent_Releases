/**
 * Filters row data based on field configuration.
 *
 * Steps:
 * 1. Iterates through each row in the input data
 * 2. Initializes a new filtered row object
 * 3. Loops through each field in the row
 * 4. Skips fields not present in fieldConfig (if provided)
 * 5. Excludes empty, null, or undefined values
 * 6. Adds valid fields to the filtered row
 * 7. Returns a new array of filtered row objects
 *
 * @param rowsData - Array of raw data rows
 * @param fieldConfig - Field configuration object used to validate allowed fields
 * @returns Array of filtered row objects
 *
 * Example:
 * const filteredData = filterRowData(rowsData, fieldConfig);
 */
export function filterRowData(rowsData: any[], fieldConfig: any) {

  return rowsData.map(row => {

    const filteredRow: Record<string, string> = {};

    for (const field in row) {

      if (fieldConfig && !fieldConfig[field]) continue;

      const value = row[field];

      if (value !== '' && value !== null && value !== undefined) {
        filteredRow[field] = value;
      }
    }

    return filteredRow;
  });
}