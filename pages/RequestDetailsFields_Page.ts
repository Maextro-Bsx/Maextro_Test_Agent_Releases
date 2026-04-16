import { Page, Locator , expect} from '@playwright/test';
import BasePage from './Base_Page';
import { requestDetailsFieldsLocators } from '@locators/RequestDetailsFields_locators';
// import { Task } from '@utils/taskTransformer';
import { Task } from '@utils/New/taskBuilder';
import { MyTasklistPage } from '@pages/MyTasklist_Page';
import { logger } from '@utils/logger';

export class RequestDetailsFieldsPage extends BasePage {

  private locators;

  constructor(page: Page) {
    super(page);
    this.locators = requestDetailsFieldsLocators(page);
  }

/**
 * Gets the 0-based column index for a given column name.
 *
 * Steps:
 * 1. Finds the column header by name
 * 2. Reads `aria-colindex` attribute
 * 3. Converts it to 0-based index
 *
 * @param columnName - Name of the column
 * @returns 0-based column index
 *
 * Example usage:
 * const index = await MaterialDetailsPage.getColumnIndex('Material Type');
 */
private async getColumnIndex(columnName: string): Promise<number> {
  const headers = this.locators.tableGrid.locator('td[role="columnheader"]');
  await headers.first().waitFor({ state: 'visible' , timeout: 10000});
  const count = await headers.count();
  for (let i = 0; i < count; i++) {
    const text = (await headers.nth(i).locator('bdi').textContent())?.trim();
    if (text?.toLowerCase() === columnName.toLowerCase()) {
      return i;
    }
  }
  throw new Error(`Column "${columnName}" not found`);
}

/**
 * Gets a data row locator by index.
 *
 * Note:
 * - rowIndex is 0-based for data rows.
 * - Header row is automatically skipped.
 * - Internally, +1 is added because the first row in SAP grid is the header.
 *
 * @param rowIndex - 0-based index of the data row
 *                   (0 = first data row, 1 = second data row, etc.)
 *
 * @returns Locator for the specified data row
 *
 * Example:
 * const row = this.getRowByIndex(0); // First data row
 */
private getRowByIndex(rowIndex: number): Locator {
  return this.locators.tableRows
    .filter({ hasNot: this.page.locator('.sapUiTableRowHidden') })
    .nth(rowIndex);
}

/**
 * Gets a specific cell by row index and column name.
 *
 * Steps:
 * 1. Get column index using `getColumnIndex`
 * 2. Get row using `getRowByIndex`
 * 3. Return the cell at the specified column index within that row
 *
 * @param rowIndex - Zero-based index of the row
 * @param columnName - Column header name
 * @returns Locator for the cell
 *
 * Example:
 * const cell = await MaterialDetailsPage.getCell(0, 'Industry sector');
 */
private async getCell(rowIndex: number, columnName: string): Promise<Locator> {
  const columnIndex = await this.getColumnIndex(columnName);
  const row = this.getRowByIndex(rowIndex);
  return row.locator('td.sapUiTableContentCell').nth(columnIndex);
}

/**
 * Enters a value into a specific table cell by activating edit mode and filling the input field.
 *
 * Steps:
 * 1. Locate the target cell using row index and field name.
 * 2. Scroll the cell into view to ensure it is visible in the viewport.
 * 3. Double-click the cell to activate edit mode.
 * 4. Locate the input element inside the activated cell.
 * 5. Fill the input field with the provided value.
 *
 * @param rowIndex The zero-based index of the row containing the target cell.
 * @param fieldName The column/field name identifying the cell.
 * @param value The value to be entered into the cell.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.enterValueInCell(0, 'Quantity', '10');
 */
private async enterValueInCell(rowIndex: number, fieldName: string, value: string) {
  const cell = await this.getCell(rowIndex, fieldName);
  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick();
  const input = cell.locator('input.sapMInputBaseInner').first();
  await input.fill(value);
}

/**
 * Enters data into multiple table rows and their respective fields.
 *
 * Steps:
 * 1. Validate that the provided row data length matches the expected row count.
 * 2. Throw an error if the mismatch is detected to prevent inconsistent input.
 * 3. Iterate through each row index.
 * 4. For each row, iterate through all field-value pairs.
 * 5. Enter the value into the corresponding cell using the row index and field name.
 *
 * @param rowCount The expected number of rows to be filled.
 * @param rowsData Array of objects representing row data (field-value mappings).
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.enterRowsData(2, [
 *   { Quantity: '10', Price: '100' },
 *   { Quantity: '5', Price: '50' }
 * ]);
 */
async enterRowsData(rowCount: number, rowsData: Record<string, string>[]) {
  if (rowsData.length !== rowCount) {
    throw new Error(`rowsData length (${rowsData.length}) does not match rowCount (${rowCount})`);
  }
  for (let i = 0; i < rowCount; i++) {
    const rowData = rowsData[i];
    for (const [fieldName, value] of Object.entries(rowData)) {
      await this.enterValueInCell(i, fieldName, value);
    }
  }
}

/**
 * Gets multiple field values for a single row identified by row index.
 *
 * Steps:
 * 1. Iterate over all requested field names
 * 2. Get the cell using `getCell` for each field in the specified row
 * 3. Read `textContent()` and trim the result
 * 4. Return an object containing fieldName: value pairs
 *
 * @param rowIndex - Zero-based index of the row
 * @param fieldNames - Array of column header names to fetch
 * @returns Object containing fieldName: value pairs
 *
 * Example:
 * const data = await MaterialDetailsPage.getRowData(0, ['Material Type', 'UOM']);
 */
// async getRowData(rowIndex: number, fieldNames: string[]): Promise<Record<string, string>> {
//   const result: Record<string, string> = {};
//   for (const fieldName of fieldNames) {
//     const cell = await this.getCell(rowIndex, fieldName);
//     const input = cell.locator('input.sapMInputBaseInner').first();
//       if (await input.count()) {
//         result[fieldName] = (await input.inputValue()).trim();
//       } else {
//         result[fieldName] = (await cell.textContent())?.trim() || '';
//       }
//   }
//   return result;
// }

/**
 * Retrieves data from a table for the specified number of rows and fields.
 *
 * Steps:
 * 1. Log the number of rows being fetched.
 * 2. Wait for table headers to become visible.
 * 3. Wait for the table rows to be visible.
 * 4. Confirm that the table is ready for interaction.
 * 5. Iterate through each row up to the specified row count.
 * 6. For each field in the row:
 *    a. Locate the corresponding cell.
 *    b. Check if the cell contains an input element.
 *    c. If input exists, extract its value.
 *    d. Otherwise, extract the text content of the cell.
 * 7. Log each row's extracted data.
 * 8. Store all row data in an array and return it.
 *
 * @param rowCount The number of rows to fetch from the table.
 * @param fieldNames Array of column/field names to extract.
 *
 * @returns Promise<Record<string, string>[]> Array of row data objects.
 *
 * Example:
 * const data = await page.getRowsData(3, ['Material', 'Quantity']);
 */
async getRowsData(rowCount: number, fieldNames: string[]): Promise<Record<string, string>[]> {
  
  logger.info(`Fetching ${rowCount} rows from table`);
  const headers = this.locators.columnHeaders;
  await headers.first().waitFor({ state: 'visible', timeout: 15000 });
  await this.locators.tableRows.first().waitFor({state: 'visible',timeout: 10000});
  logger.info('Table is ready');
  const rowsData: Record<string, string>[] = [];

  for (let i = 0; i < rowCount; i++) {
    const rowData: Record<string, string> = {};
    for (const fieldName of fieldNames) {
      const cell = await this.getCell(i, fieldName);
      const input = cell.locator('input.sapMInputBaseInner').first();
      if (await input.count()) {
        rowData[fieldName] = (await input.inputValue()).trim();
      } else {
        rowData[fieldName] = (await cell.textContent())?.trim() || '';
      }
    }
    logger.info(`Row ${i + 1}: ${JSON.stringify(rowData)}`);
    rowsData.push(rowData);
  }
  return rowsData;
}

/**
 * Validates table row data against expected values.
 *
 * Steps:
 * 1. Log the validation process start.
 * 2. Log both actual UI data and expected data for debugging.
 * 3. Compare the number of rows between actual and expected data.
 * 4. Throw an error if row counts do not match.
 * 5. Iterate through each row:
 *    a. Log the row being validated.
 *    b. Iterate through each field in the expected row.
 *    c. Skip metadata fields like "Expected Record" and "Record".
 *    d. Ignore empty, null, or undefined expected values.
 *    e. Convert "No Value" to an empty string for comparison.
 *    f. Trim actual values from UI.
 *    g. Compare actual and expected values using assertions.
 *    h. Log successful validation for each field.
 *
 * @param rowsData Actual data extracted from the UI table.
 * @param expectedData Expected data used for validation.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.validateRowsData(actualData, expectedData);
 */
async validateRowsData(rowsData: Record<string, string>[],expectedData: Record<string, string>[]): Promise<void> {
  logger.info(`Validating rows data`);
  logger.info(`Data fetched from UI: ${JSON.stringify(rowsData)}`);
  logger.info(`Data expected: ${JSON.stringify(expectedData)}`);
  if (rowsData.length !== expectedData.length) {
    throw new Error(`Row count mismatch: expected ${expectedData.length} rows but found ${rowsData.length}`);
  }
  rowsData.forEach((row, index) => {
    const expectedRow = expectedData[index];
    logger.info(`Validating Row ${index + 1}`);
    for (const field of Object.keys(expectedRow)) {
      if (field === 'Expected Record' || field === 'Record') continue;
      const rawExpected = expectedRow[field];
      if (rawExpected === undefined || rawExpected === null || rawExpected === '') continue;
      const expectedValue = rawExpected === 'No Value' ? '' : rawExpected;
      const actualValue = (row[field] ?? '').trim();
      expect(actualValue,`Row ${index + 1}: Field "${field}" mismatch`).toBe(expectedValue);
      logger.info(`Validated row ${index + 1}: ${field} = "${actualValue}"`);
    }
  });
}



/**
 * Enters a single field value for a specific row identified by row index.
 *
 * Steps:
 * 1. Call `enterValueInCell` for the specified row and column
 *
 * @param rowIndex - Zero-based index of the row
 * @param fieldName - Column header name
 * @param value - Value to enter into the field
 *
 * Example:
 * await MaterialDetailsPage.enterField(0, 'UOM', 'KG');
 */
  async enterField(rowIndex: number, fieldName: string, value: string) {
    await this.enterValueInCell(rowIndex, fieldName, value);
  }


/**
 * Gets a single field value for a specific row identified by row index.
 *
 * Steps:
 * 1. Get the cell using `getCell`
 * 2. Read `textContent()` and trim the result
 * 3. Return the field value as a string
 *
 * @param rowIndex - Zero-based index of the row
 * @param fieldName - Column header name
 * @returns Text value of the field
 *
 * Example:
 * const uom = await MaterialDetailsPage.getFieldValue(0, 'UOM');
 */
  async getFieldValue(rowIndex: number, fieldName: string): Promise<string> {
    const cell = await this.getCell(rowIndex, fieldName);
    return (await cell.textContent())?.trim() || '';
  }

/**
 * Clicks the "Status Complete" button.
 *
 * Steps:
 * 1. Wait for the button to be visible
 * 2. Perform click action
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.clickStatusComplete();
 */
// async clickStatusComplete() {
//   await this.locators.statusCompleteButton.waitFor({ state: 'visible' });
//   await this.click(this.locators.statusCompleteButton);
//   await this.page.waitForTimeout(1000);
//   await this.waitForSAPPageReady();

// }

// async clickStatusComplete(): Promise<void> {
//   try {
//     await this.locators.statusCompleteButton.waitFor({ state: 'visible', timeout: 5000 });
//     const isEnabled = await this.locators.statusCompleteButton.isEnabled();
//     const editViewEnabled = await this.locators.editViewButton.isEnabled();
//     if (isEnabled) {
//       await this.click(this.locators.statusCompleteButton);
//       await this.waitForSAPPageReady();
//       await this.locators.editViewButton.waitFor({ state: 'visible', timeout: 10000 });
//       console.log('Status completed');
//     } else if (editViewEnabled) {
//       console.log('Status already completed, skipping');
//     }
    
//   } catch {
//     console.log('Status button not available, skipping');
//   }
// }

/**
 * Marks the current task/status as "Complete" in the SAP UI and waits for UI transition.
 *
 * Steps:
 * 1. Wait briefly to allow the UI to stabilize.
 * 2. Locate the "Status Complete" button.
 * 3. Locate the "Edit View" button (used to confirm UI transition).
 * 4. Click the "Status Complete" button.
 * 5. Wait for either:
 *    a. The "Edit View" button to become visible, or
 *    b. The "Status Complete" button to reappear.
 * 6. Wait briefly to ensure the UI has fully updated.
 * 7. Log completion of the status update.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.clickStatusComplete();
 */
async clickStatusComplete(): Promise<void> {
  const statusBtn = this.locators.statusCompleteButton;
  const editBtn = this.locators.editViewButton;
  await this.page.waitForTimeout(1000);
  logger.info('Clicking Status Complete...');
  await statusBtn.click(); 
  await Promise.race([
    editBtn.waitFor({ state: 'visible', timeout: 15000 }),
    statusBtn.waitFor({ state: 'visible', timeout: 15000 })
  ]);
  await this.page.waitForTimeout(1000);
  logger.info('Status completed');
 
}

/**
 * Clicks the "Status Complete" button for a specific view and handles view-specific error scenarios.
 *
 * Steps:
 * 1. Wait briefly to allow the UI to stabilize.
 * 2. Click the "Status Complete" button.
 * 3. Wait for either:
 *    a. The "Edit View" button to appear, or
 *    b. The "Status Complete" button to remain visible.
 * 4. Wait briefly for UI update completion.
 * 5. If the view is "bd1":
 *    a. Check if an error dialog is displayed.
 *    b. If the error dialog appears:
 *       i. Close the error dialog.
 *       ii. Log the action.
 *       iii. Retry clicking the "Status Complete" button.
 *       iv. Wait for the UI to stabilize again.
 * 6. Log completion of the status update.
 *
 * @param viewName The name of the view (used for conditional error handling, e.g., "bd1").
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.clickStatusCompleteForView('bd1');
 */
async clickStatusCompleteForView(viewName: string): Promise<void> {
  const statusBtn = this.locators.statusCompleteButton;
  const editBtn = this.locators.editViewButton;
  await this.page.waitForTimeout(1000);
  logger.info('Clicking Status Complete...');
  await statusBtn.click(); 
  await Promise.race([
    editBtn.waitFor({ state: 'visible', timeout: 15000 }),
    statusBtn.waitFor({ state: 'visible', timeout: 15000 })
  ]);
  await this.page.waitForTimeout(1000);
  if (viewName.toLowerCase() === 'bd1') {
  let isErrorDialog = false;
  try {
    await this.locators.closeDialogButton.waitFor({ state: 'visible', timeout: 4000 });
    isErrorDialog = true;
  } catch {
    isErrorDialog = false;
  }
  if (isErrorDialog) { 
    await this.locators.closeDialogButton.click();
    console.log('Clicked on close button of error message');
    await this.page.waitForTimeout(1000);
    await statusBtn.click(); 
    console.log('Clicked Status Complete again');
    await this.page.waitForTimeout(2000);
  }
}
  logger.info('Status completed');
}

/**
 * Clicks the "Submit Task" button.
 *
 * Steps:
 * 1. Wait for the button to be visible
 * 2. Perform click action
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.clickSubmitTask();
 */
async clickSubmitTask() {
  await this.locators.submitTaskButton.waitFor({ state: 'visible' });
  await this.click(this.locators.submitTaskButton);
}

/**
 * Clicks the "Save" menu item.
 *
 * Steps:
 * 1. Wait for the menu item to be visible
 * 2. Perform click action
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.clickSaveMenuItem();
 */
async clickSaveMenuItem() {
  await this.page.waitForLoadState('domcontentloaded');
  await this.locators.saveMenuItem.waitFor({ state: 'visible' });
  await this.click(this.locators.saveMenuItem);
}

/**
 * Clicks the "Save As Draft" menu item.
 *
 * Steps:
 * 1. Wait for the menu item to be visible
 * 2. Perform click action
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.clickSaveAsDraft();
 */
async clickSaveAsDraft() {
  await this.locators.saveAsDraftMenuItem.waitFor({ state: 'visible' });
  await this.click(this.locators.saveAsDraftMenuItem);
}


/**
 * Clicks the cancel button in the confirmation dialog.
 *
 * Steps:
 * 1. Click the cancel button
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.clickCancelConfirm();
 */
async clickCancelConfirm() {
  await this.locators.cancelButton.click();
}

/**
 * Clicks the "Save" button.
 *
 * Steps:
 * 1. Wait for the page to finish loading (DOM content loaded)
 * 2. Wait for the "Save" button to be visible
 * 3. Perform click action
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.clickSaveButton();
 */
async clickSaveButton() {
  await this.page.waitForLoadState('networkidle');
  await this.locators.saveButton.waitFor({state: 'visible',timeout: 20000});
  await this.locators.saveButton.click();
}


/**
 * Waits for the Request Details page to be fully loaded.
 *
 * Steps:
 * 1. Wait for the "Status Complete" button to be visible
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.waitForRequestDetailsPage();
 */
async waitForRequestDetailsPage(): Promise<void> {
  await this.locators.statusCompleteButton.waitFor({ state: 'visible' });
}

/**
 * Retrieves the request number from the success message displayed in the SAP UI.
 *
 * Steps:
 * 1. Locate the success message element in the UI.
 * 2. Wait until the success message becomes visible.
 * 3. Extract the text content from the success message.
 * 4. Validate that the message text exists.
 * 5. Extract the request number using a regular expression.
 * 6. Throw an error if the request number is not found in the message.
 * 7. Remove any leading zeros from the extracted request number.
 * 8. Return the cleaned request number.
 *
 * @returns Promise<string> The extracted request number.
 *
 * Example:
 * const requestNumber = await page.getRequestNumber();
 */
async getRequestNumber(): Promise<string> {
  const locator = this.locators.requestSuccessMessage;
  await locator.waitFor({ state: 'visible' });
  const text = await locator.textContent();
  if (!text) {
    throw new Error('Success message text not found');
  }
  const match = text.match(/Request\s+(\d+)\s+created/i);
  if (!match) {
    throw new Error('Request number not found in success message');
  }
  // Remove leading zeros
  return match[1].replace(/^0+/, '');
}

/**
 * Validates that the Edit View button is visible and the status progress bar reaches completion (100%).
 *
 * Steps:
 * 1. Locate the Edit View button and status progress bar elements.
 * 2. Wait for the Edit View button to become visible.
 * 3. Wait for the progress bar to become visible.
 * 4. Wait until the progress bar value reaches 100% (aria-valuenow = "100").
 * 5. Log successful completion when progress reaches 100%.
 * 6. Return true once validation is successful.
 *
 * @returns Promise<boolean> True if the progress bar reaches 100%.
 *
 * Example:
 * const isCompleted = await page.validateEditViewAndStatusProgressBar();
 */
async validateEditViewAndStatusProgressBar(): Promise<boolean> {
  const editViewButton = this.locators.editViewButton;
  const progressBar = this.locators.statusCompleteIndicator;

  await editViewButton.waitFor({ state: 'visible', timeout: 20000 });
  await progressBar.waitFor({ state: 'visible', timeout: 20000 });

  // Wait until progress reaches 100 (auto-retry)
  await expect(progressBar).toHaveAttribute('aria-valuenow', '100', {timeout: 20000});
  logger.info('Progress reached 100%');
  return true;
}

/**
 * Validates that the specified fields are marked as mandatory in the UI.
 *
 * Steps:
 * 1. Log the list of fields being validated.
 * 2. Initialize a list to track fields that are not mandatory.
 * 3. Iterate through each field name:
 *    a. Locate the column header for the field.
 *    b. Wait for the field header to become visible within the timeout.
 *    c. Check if the element exists in the DOM.
 *    d. If not found or not visible, mark it as non-mandatory.
 * 4. If any non-mandatory fields are found:
 *    a. Throw an error listing those fields.
 * 5. If all fields are mandatory, log success.
 *
 * @param fieldNames Array of field names expected to be mandatory.
 * @param timeout Maximum time to wait for each field to appear (default: 15000ms).
 *
 * @returns Promise<boolean> True if all fields are mandatory.
 *
 * Example:
 * await page.validateMandatoryFields(['Material', 'Quantity']);
 */
async validateMandatoryFields(fieldNames: string[],timeout = 15000): Promise<boolean> {

  logger.info(`Validating mandatory fields: ${fieldNames.join(', ')}`);
  const nonMandatoryFields: string[] = [];
  for (const fieldName of fieldNames) {
    const locator = this.locators.mandatoryColumnHeader(fieldName);
    try {
      // Wait until the column header appears on the screen
      await locator.waitFor({ state: 'visible', timeout });
      const count = await locator.count();
      if (count === 0) {
        nonMandatoryFields.push(fieldName);
      }
    } catch {
      // If waitFor fails, treat it as not found
      nonMandatoryFields.push(fieldName);
    }
  }
  if (nonMandatoryFields.length > 0) {
    throw new Error(
      `The following fields are NOT mandatory: ${nonMandatoryFields.join(', ')}`
    );
  }
  logger.info('All specified fields are mandatory');
  return true;
}

/**
 * Validates that specified fields in a table row are auto-populated with values.
 *
 * Steps:
 * 1. Log the fields being validated for the given row index.
 * 2. Initialize arrays to track empty fields and store populated values.
 * 3. Iterate through each field name:
 *    a. Locate the corresponding cell using row index and field name.
 *    b. Check if the cell contains an input element.
 *    c. If input exists:
 *       i. Wait for the input to be visible.
 *       ii. Extract its value.
 *    d. Otherwise, extract the text content of the cell.
 * 4. Trim and evaluate the extracted value.
 * 5. If the value is empty, add the field to the empty fields list.
 * 6. If the value exists, store it in the populated values object.
 * 7. If any fields are not populated, throw an error listing them.
 * 8. Log successful validation if all fields are populated.
 * 9. Return an object containing all populated field values.
 *
 * @param rowIndex The zero-based index of the row to validate.
 * @param fieldNames Array of field names expected to be auto-populated.
 *
 * @returns Promise<Record<string, string>> Object containing populated field values.
 *
 * Example:
 * const values = await page.validateFieldsAutoPopulated(0, ['Material', 'Plant']);
 */
async validateFieldsAutoPopulated(rowIndex: number,fieldNames: string[]): Promise<Record<string, string>> {

  logger.info(`Validating auto-populated fields for row ${rowIndex + 1}: ${fieldNames.join(', ')}`);
  const emptyFields: string[] = [];
  const populatedValues: Record<string, string> = {};
  for (const fieldName of fieldNames) {
    const cell = await this.getCell(rowIndex, fieldName);
    const input = cell.locator('input.sapMInputBaseInner');
    let value: string;
    if (await input.count()) {
      await input.waitFor({ state: 'visible' });
      value = (await input.inputValue()).trim();
    } else {
      value = (await cell.textContent())?.trim() || '';
    }
    if (!value) {
      emptyFields.push(fieldName);
    } else {
      populatedValues[fieldName] = value;
    }
  }
  if (emptyFields.length > 0) {
    throw new Error(`The following fields are NOT auto-populated in row ${rowIndex + 1}: ${emptyFields.join(', ')}`);
  }
  logger.info(`All fields in row ${rowIndex + 1} are auto-populated`);
  return populatedValues;
}

/**
 * Retrieves the column index for a given field name from the table headers.
 *
 * Steps:
 * 1. Locate all column header elements in the table.
 * 2. Get the total number of headers.
 * 3. Iterate through each header by index.
 * 4. Extract and trim the header text.
 * 5. Check if the header text contains the given field name.
 * 6. If a match is found, return the corresponding column index.
 * 7. If no match is found after iteration, throw an error.
 *
 * @param fieldName The column header name to search for.
 *
 * @returns Promise<number> The zero-based index of the matching column.
 *
 * @throws Error If the column with the specified field name is not found.
 *
 * Example:
 * const index = await page.getColumnIndexForHelperOption('Material');
 */
private async getColumnIndexForHelperOption(fieldName: string): Promise<number> {

    const headers = this.locators.columnHeaders;
    const count = await headers.count();
    for (let i = 0; i < count; i++) {
      const text = await headers.nth(i).innerText();
      if (text.trim().includes(fieldName)) {
        return i;
      }
    }
    throw new Error(`Column "${fieldName}" not found in table header`);
}

/**
 * Validates the Value Help (F4 help) options for a specific field in a table row.
 *
 * Steps:
 * 1. Log the field and row being validated.
 * 2. Determine the column index dynamically using the field name.
 * 3. Click the Value Help icon for the specified cell.
 * 4. Wait for the Value Help dialog to become visible.
 * 5. Wait for the UI to fully load and stabilize.
 * 6. Extract all available rows from the Value Help dialog.
 * 7. For each row:
 *    a. Collect all cell text values.
 *    b. Normalize whitespace and combine values into a single string.
 *    c. Store non-empty entries into an array of actual values.
 * 8. Validate that each expected value exists in the actual Value Help list.
 * 9. Close the Value Help dialog.
 * 10. Wait until the dialog is fully closed.
 * 11. Log successful validation.
 *
 * @param rowIndex The zero-based index of the table row.
 * @param fieldName The field/column name whose Value Help is being validated.
 * @param expectedValues Array of expected values that should appear in Value Help.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.validateFieldValueHelp(0, 'Material', ['Steel', 'Aluminium']);
 */
async validateFieldValueHelp(rowIndex: number,fieldName: string,expectedValues: string[]): Promise<void> {

  logger.info(`Validating Value Help for field "${fieldName}" in row ${rowIndex + 1}`);
  // Get column index dynamically
  const colIndex = await this.getColumnIndexForHelperOption(fieldName);
  const valueHelpIcon =this.locators.getValueHelpIcon(rowIndex, colIndex);
  await valueHelpIcon.click();
  await this.locators.valueHelpDialog.waitFor({ state: 'visible' });
  await this.page.waitForLoadState('networkidle');
  await this.page.waitForTimeout(500);

  // Capture values
  const rows = this.locators.valueHelpDialogRows;
  const rowCount = await rows.count();
  const actualValues: string[] = [];

  for (let i = 0; i < rowCount; i++) {
    const cells = await rows.nth(i).locator('td').allTextContents();
    const combinedText = cells.map(v => v.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' - ');

    if (combinedText)
        actualValues.push(combinedText);
    }

    // Validate expected values
    for (const expected of expectedValues) {
      const found = actualValues.some(actual =>actual.includes(expected));
      expect(found,`Expected value "${expected}" not found in value help list`).toBeTruthy();
    }

    // Close dialog
    await this.locators.closeDialogButton.click();
    await this.locators.valueHelpDialog.waitFor({ state: 'hidden' });
    logger.info(`Value Help validation passed for field "${fieldName}" in row ${rowIndex + 1}`);
}

/**
 * Submits a create request in SAP UI and captures the generated request number.
 *
 * Steps:
 * 1. Log the submission process start.
 * 2. Validate that the Edit View is active and the progress bar is completed.
 * 3. Click the Submit Task button.
 * 4. Click the Save menu item.
 * 5. Wait for the confirmation message to appear.
 * 6. Confirm submission by clicking the submit confirmation button.
 * 7. Wait for success-related UI messages:
 *    a. Success title
 *    b. Request raised title
 *    c. Success message containing request number
 * 8. Extract the request number from the success message.
 * 9. Log the captured request number.
 * 10. Wait for SAP loader to disappear.
 * 11. Return the request number.
 *
 * @returns Promise<string> The generated request number after successful submission.
 *
 * Example:
 * const requestId = await page.submitCreateRequestAndCaptureNumber();
 */
async submitCreateRequestAndCaptureNumber(): Promise<string> {

  logger.info('Submitting request and capturing request number...');
  await this.validateEditViewAndStatusProgressBar();
  await this.clickSubmitTask();
  await this.clickSaveMenuItem();
  await this.locators.confirmMessage.waitFor({ state: 'visible' });
  await this.locators.submitConfirmButton.click();
  await this.locators.successTitle.waitFor({ state: 'visible' });
  await this.locators.requestRaisedTitle.waitFor({ state: 'visible' });
  await this.locators.requestSuccessMessage.waitFor({ state: 'visible' });
  const requestNumber = await this.getRequestNumber();
  logger.info(`Request Number: ${requestNumber}`);
  await this.waitForSAPLoader();
  return requestNumber;
}

/**
 * Completes a task by saving changes, handling confirmation (if shown), and returning to the task list.
 *
 * Steps:
 * 1. Log the start of the task completion process.
 * 2. Click the Save button to trigger task completion.
 * 3. Wait for any SAP loader to disappear.
 * 4. Pause briefly to allow UI transitions.
 * 5. Check if a confirmation popup is visible:
 *    a. If visible, click the "Yes" button to confirm.
 *    b. Wait for success-related messages:
 *       - Success title
 *       - Save success message
 *       - Task closed message
 * 6. Click the "Back to Task List" button.
 * 7. Wait for the loader to disappear again after navigation.
 * 8. Log completion of task workflow.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.completeTask();
 */
async completeTask(): Promise<void> {

  logger.info('Completing task Save workflow');
  await this.clickSaveButton();
  await this.waitForLoaderToDisappear();
  await this.page.waitForTimeout(2000);
  const isConfirmVisible = await this.locators.confirmYesButton.isVisible({ timeout: 3000 }).catch(() => false);
  if (isConfirmVisible) {
    logger.info('Confirm popup detected → clicking Yes');
    await this.locators.confirmYesButton.click();
    await this.waitForLocatorSafe(this.locators.successTitle);
    await this.waitForLocatorSafe(this.locators.saveSuccessMessage);
    await this.waitForLocatorSafe(this.locators.taskClosedMessage);
  }
  await this.locators.backToTaskListButton.click();
  await this.waitForLoaderToDisappear();
  logger.info('Task completed and navigated back to Task List');
}

/**
 * Handles the approval flow in SAP UI by managing confirmation, success, and result/error states.
 *
 * Steps:
 * 1. Retry up to 3 times to detect initial approval state:
 *    a. Check if confirmation popup is visible.
 *       - If visible, click "Yes" and wait for SAP loader.
 *       - Exit the loop after handling confirmation.
 *    b. Check if success title is visible.
 *       - If visible, wait for approval success message.
 *       - Log approval success and return.
 *    c. Wait briefly before retrying.
 * 2. After initial retries, monitor result/log state for up to 8 attempts:
 *    a. If result screen is visible:
 *       - Log all result messages.
 *       - Return successfully.
 *    b. If log/error screen is visible:
 *       - Log error messages.
 *       - Throw an error indicating approval failure.
 *    c. Wait before next retry cycle.
 * 3. If no valid state is reached after all retries, throw a final failure error.
 *
 * @returns Promise<void>
 *
 * @throws Error If approval fails or logs indicate an error state.
 *
 * Example:
 * await page.handleApproveFlow();
 */
private async handleApproveFlow(): Promise<void> {

  for (let i = 0; i < 3; i++) {
    const isConfirmVisible = await this.locators.dataINSAPERPConfirmMessage.isVisible({ timeout: 1500 }).catch(() => false);
    if (isConfirmVisible) {
      logger.info(`Confirm popup detected`);
      await this.locators.confirmYesButton.click();
      await this.waitForSAPLoader();
      break;
    }
    const isSuccessVisible = await this.locators.successTitle.isVisible({ timeout: 1500 }).catch(() => false);
    if (isSuccessVisible) {
      await this.waitForLocatorSafe(this.locators.approvalSuccessMessage);
      logger.info('Approval successful');
      return;
    }
    await this.page.waitForTimeout(1000);
  }

  for (let i = 0; i < 8; i++) {
    const isResultVisible = await this.locators.resultTitle.isVisible({ timeout: 2000 }).catch(() => false);
    if (isResultVisible) {
      logger.info(`Result detected`);
      const messages = await this.locators.messageLocator.allTextContents();
      logger.info('--- RESULT MESSAGES ---');
      messages.forEach(text => logger.info(text.trim()));
      return;
    }

    const isLogVisible = await this.locators.logTitle.isVisible({ timeout: 2000 }).catch(() => false);
    if (isLogVisible) {
      logger.error(`Log detected`);
      const messages = await this.locators.messageLocator.allTextContents();
      logger.error('--- ERROR LOG MESSAGES ---');
      messages.forEach(text => logger.error(text.trim()));
      throw new Error('Approval failed due to Log messages');
    }
    await this.page.waitForTimeout(2500); // 🔥 longer wait
  }
  throw new Error('Approve flow failed after retries');
}

/**
 * Completes approval workflow.
 *
 * Steps:
 * 1. Click Status Complete
 * 2. Validate Edit View and Progress bar
 * 3. Click Submit Task
 * 4. Select Approve option
 * 5. Validate approval success message
 * 6. Exit workflow
 *
 * Example:
 * await requestDetailsFields.approveTask();
 */
// async approveTask(): Promise<void> {
//   logger.info('Approving task');
//   await this.clickSubmitTask();
//   const approve = this.locators.approveMenuItem;
//   await this.waitForLocatorSafe(approve);
//   await approve.click();
//   await this.page.waitForTimeout(2000);
//   logger.info('Clicked Approve');
//   let isConfirmVisible = false; ;
//   for(let i=0;i<2;i++){
//      isConfirmVisible = await this.locators.dataINSAPERPConfirmMessage.isVisible({ timeout: 2000 }).catch(() => false);
//     if (isConfirmVisible) {
//       logger.info(`Result title detected on attempt ${i + 1}`);
//       break;
//     }
//     }
//   if (isConfirmVisible) {
//     logger.info('Confirm popup detected → clicking Yes');
//     await this.locators.confirmYesButton.click();
//     await this.waitForSAPLoader();
//     await this.page.waitForTimeout(30000);
//   }
//   let isResultTiltleVisible = false;
//   for(let i=0;i<2;i++){
//      isResultTiltleVisible = await this.locators.resultTitle.isVisible({ timeout: 2000 }).catch(() => false);
//     if (isResultTiltleVisible) {
//       logger.info(`Result title detected on attempt ${i + 1}`);
//       break;
//     }
//   }
//   if (isResultTiltleVisible) {
//       const messages = await this.locators.messageLocator.allTextContents();
//       messages.forEach(text => logger.info(text.trim()));
//   } else {
//       await this.waitForLocatorSafe(this.locators.successTitle);
//       await this.waitForLocatorSafe(this.locators.approvalSuccessMessage);
//   }
//   await this.locators.backToTaskListButton.click();
//   await this.waitForLoaderToDisappear();
//   logger.info('Task approved and navigated back to Task List');
// }

/**
 * Approves a task in SAP UI by submitting it, selecting approve action, and handling approval workflow.
 *
 * Steps:
 * 1. Log the start of the approval process.
 * 2. Click the Submit Task button to open available actions.
 * 3. Wait for the Approve menu item to become visible.
 * 4. Click the Approve option.
 * 5. Log that approval has been initiated.
 * 6. Execute the approval flow handler to manage:
 *    - Confirmation dialogs
 *    - Success messages
 *    - Result or error states
 * 7. Click the Back to Task List button.
 * 8. Wait for any loader to disappear after navigation.
 * 9. Log successful completion of task approval.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.approveTask();
 */
async approveTask(): Promise<void> {

  logger.info('Approving task');
  await this.clickSubmitTask();
  const approve = this.locators.approveMenuItem;
  await this.waitForLocatorSafe(approve);
  await approve.click();
  logger.info('Clicked Approve');
  await this.handleApproveFlow();
  await this.locators.backToTaskListButton.click();
  await this.waitForLoaderToDisappear();
  logger.info('Task approved and navigated back to Task List');
}

/**
 * Performs a rejection action on a SAP task and routes it to a target step.
 *
 * Steps:
 * 1. Log the rejection configuration (reason, step, comment).
 * 2. Initialize default rejection values and override them from input params.
 * 3. Validate that the target "rejectingTo" step is defined.
 * 4. Parse input parameters (reason, step, comment) from key-value pairs.
 * 5. Log final rejection configuration.
 * 6. Open task actions via Submit Task.
 * 7. Click the Reject menu option.
 * 8. Select rejection reason from dropdown.
 * 9. Select target step from dropdown.
 * 10. Enter rejection comment in the text area.
 * 11. Submit the rejection.
 * 12. Wait for success confirmation.
 * 13. Retrieve the step the task was rejected to.
 * 14. Validate the rejected-to value is not null.
 * 15. Navigate back to the task list.
 * 16. Wait for loader to disappear.
 * 17. Log completion of rejection flow.
 *
 * @param task The task object containing metadata including default rejectingTo step.
 * @param params Array of configuration strings in "key=value" format (e.g., reason=..., step=..., comment=...).
 *
 * @returns Promise<string | null> The step to which the task was rejected.
 *
 * @throws Error If rejectingTo is not defined for the task.
 *
 * Example:
 * const rejectedStep = await page.RejectTask(task, [
 *   "reason=Invalid Data",
 *   "comment=Auto rejection"
 * ]);
 */
async RejectTask(task: Task, params: string[]): Promise<string | null> {

  logger.info(`Performing REJECT action: ${JSON.stringify(params)}`);
  let reason = 'Inaccurate Customer Data';
  // let step = 'Tax Data collection - BC_APPDATA';
  // let step ='Requester Review - TDODDAPANENI';
  // let step = 'BP Data collection - A_DATA';
  let step = task.rejectingTo;
  let comment = 'Rejected via automation';

  if (!step) {
    throw new Error(`Rejecting To not defined for ${task.step}`);
  }
  // Parse params from Excel
  params.forEach(p => {const [key, value] = p.split('=');

    switch (key?.toLowerCase()) {
      case 'reason':
        reason = value;
        break;
      case 'step':
        step = value;
        break;
      case 'comment':
        comment = value;
        break;
    }
  });

  logger.info(`Reject Config → Reason: ${reason}, Step: ${step}, Comment: ${comment}`);
  // Execute reject flow
  await this.clickSubmitTask();
  await this.waitForLocatorSafe(this.locators.rejectMenuItem);
  await this.locators.rejectMenuItem.click();
  logger.info('Clicked Reject menu');
  // Reason
  await this.page.waitForTimeout(2000);
  await this.waitForLocatorSafe(this.locators.rejectReasonDropdown);
  await this.locators.rejectReasonDropdown.click();
  await this.selectSAPFioriDropdown(this.locators.rejectReasonDropdown, reason);
  logger.info(`Selected Reason: ${reason}`);
  // Step
  await this.waitForLocatorSafe(this.locators.rejectStepDropdown);
  await this.locators.rejectStepDropdown.click();
  await this.selectSAPFioriDropdown(this.locators.rejectStepDropdown, step);
  logger.info(`Selected Step: ${step}`);
  // Comment
  await this.waitForLocatorSafe(this.locators.rejectCommentsTextarea);
  await this.locators.rejectCommentsTextarea.fill(comment);
  logger.info(`Entered Comment: ${comment}`);
  // Submit
  await this.waitForLocatorSafe(this.locators.submitRejectionButton);
  await this.locators.submitRejectionButton.click();
  await this.waitForLocatorSafe(this.locators.successTitle);
  await this.page.waitForTimeout(1000);
  logger.info('Clicked Submit Rejection');
  // Exit
  const rejectedToStep = await this.getRejectedToStep();
  logger.info(`Rejected to: ${rejectedToStep}`);
  expect(rejectedToStep).not.toBeNull();
  await this.locators.backToTaskListButton.click();
  await this.waitForLoaderToDisappear();
  logger.info('Rejection completed and navigated back to Task List');
  return rejectedToStep;
}


async ReviewTask(): Promise<void> {
  console.log('Performing REVIEW action');

  // work on review task flow
}

/**
 * Retrieves all error messages displayed in the SAP UI error list.
 *
 * Steps:
 * 1. Wait for the first error item to become visible.
 * 2. Initialize an array to store formatted error messages.
 * 3. Get the total number of error items in the UI.
 * 4. Iterate through each error item:
 *    a. Locate the error item by index.
 *    b. Extract the error title text.
 *    c. Extract the error description text.
 *    d. Trim and combine both into a single formatted string.
 * 5. Return the list of formatted error messages.
 *
 * @returns Promise<string[]> Array of error messages in "title | description" format.
 *
 * Example:
 * const errors = await page.getAllErrorMessages();
 */
async getAllErrorMessages(): Promise<string[]> {

  await this.locators.errorItems.first().waitFor({ state: 'visible' });
  const messages: string[] = [];
  const count = await this.locators.errorItems.count();
  for (let i = 0; i < count; i++) {
      const item = this.locators.errorItems.nth(i);
      const title = await this.locators.errorTitle(item).innerText();
      const description = await this.locators.errorDescription(item).innerText();
      messages.push(`${title.trim()} | ${description.trim()}`);
  }
  return messages;
}

/**
 * Validates mandatory field error messages for empty fields in a table-based UI.
 *
 * Steps:
 * 1. Log the fields and row range being validated.
 * 2. Fetch current table data from the UI.
 * 3. Build expected error keywords for fields that are empty.
 * 4. If no empty fields are found, skip validation.
 * 5. Trigger validation by clicking the Status Complete button.
 * 6. Wait for error messages to appear in the UI.
 * 7. Retrieve all actual error messages from the UI.
 * 8. Normalize both expected and actual error formats for consistent comparison.
 * 9. Validate that each expected error exists in the actual error list.
 * 10. Log each successfully validated error.
 * 11. Compare expected vs actual error counts and throw an error if mismatched.
 * 12. Close the error dialog.
 * 13. Log successful validation completion.
 *
 * @param rowCount Number of rows to validate in the table.
 * @param fields Array of field names that are mandatory.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.validateMandatoryFieldErrorMessage(3, ['Material', 'Quantity']);
 */
async validateMandatoryFieldErrorMessage(rowCount: number,fields: string[]): Promise<void> {

  logger.info(`Validating mandatory field error messages for fields: ${fields.join(', ')} in first ${rowCount} rows`);
  // Read UI data FIRST
  const rowsDataFromUI = await this.getRowsData(rowCount, fields);
  logger.info(`UI Data: ${JSON.stringify(rowsDataFromUI)}`);
  const expectedKeywords: string[] = [];

  // Build expected errors ONLY for empty fields
  rowsDataFromUI.forEach((row, index) => {
    fields.forEach(field => {
      const value = (row[field] ?? '').trim();

      if (!value) {
        expectedKeywords.push(`Row${index + 1} - ${field}`);
      }
    });
  });

  logger.info(`Expected Errors: ${expectedKeywords.join(', ')}`);
  if (expectedKeywords.length === 0) {
    logger.info("No mandatory field errors → skipping validation");
    return; 
  }
  await this.clickStatusComplete();
  await this.locators.errorItems.first().waitFor({ state: 'visible', timeout: 10000 });
  await this.page.waitForTimeout(500);
  const actualErrors = await this.getAllErrorMessages();
  logger.info(`Actual Errors: ${actualErrors.join(', ')}`);
  const normalize = (text: string) =>text.replace(/\s+/g, ' ').replace(/Row\s*:?\s*(\d+)/gi, 'Row$1').replace(/\s*-\s*/g, ' - ').trim();
  // Validate expected errors
  for (const keyword of expectedKeywords) {
    const normalizedKeyword = normalize(keyword);
    const found = actualErrors.some(error =>normalize(error).includes(normalizedKeyword));
    expect(found,`Expected error containing "${keyword}" not found.\n\nActual Errors:\n${actualErrors.join('\n')}`).toBeTruthy();
    logger.info(`Validated error: ${keyword}`);
  }
  // Count validation
  logger.info(`Expected error count: ${expectedKeywords.length}, Actual error count: ${actualErrors.length}`);
  if (actualErrors.length !== expectedKeywords.length) {
    throw new Error(
      `Error count mismatch.\nExpected: ${expectedKeywords.length}\nActual: ${actualErrors.length}\n\nActual Errors:\n${actualErrors.join('\n')}`
    );
  }
  // Close dialog
  await this.locators.closeDialogButton.click();
  logger.info('Mandatory field error message validation passed');
}


/**
 * Validates the number of error messages displayed in the SAP UI.
 *
 * Steps:
 * 1. Wait for at least one error item to become visible.
 * 2. Count all error items currently displayed in the UI.
 * 3. Compare the actual error count with the expected count.
 * 4. Assert that both values match.
 *
 * @param expectedCount The expected number of error messages.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.validateErrorCount(3);
 */
async validateErrorCount(expectedCount: number) {

  await this.locators.errorItems.first().waitFor({ state: 'visible' });
  const count = await this.locators.errorItems.count();
  expect(count).toBe(expectedCount);
}

/**
 * Validates that specified fields are in read-only state for the given number of table rows.
 *
 * Steps:
 * 1. Log the fields being validated and the row range.
 * 2. Wait for the table rows to be visible and stable.
 * 3. Iterate through each row up to the given row count.
 * 4. For each field:
 *    a. Determine the column index dynamically.
 *    b. Locate the read-only field wrapper for the row and column.
 *    c. Wait for the wrapper to be visible and stable.
 *    d. Allow a short delay for SAP UI to apply read-only state.
 *    e. Check multiple indicators of read-only state:
 *       - CSS class indicators
 *       - HTML readonly attribute
 *       - HTML disabled attribute
 *       - Custom field-level disable flag
 * 5. Assert that the field is read-only.
 * 6. Log validation success for each field.
 *
 * @param rowCount Number of rows to validate.
 * @param fieldNames Array of field names expected to be read-only.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.validateFieldsReadOnly(3, ['Material', 'Quantity']);
 */
async validateFieldsReadOnly(rowCount: number, fieldNames: string[]): Promise<void> {

  logger.info(`Validating read-only fields: ${fieldNames.join(', ')} in first ${rowCount} rows`);
  await this.locators.tableRows.first().waitFor({ state: 'visible', timeout: 30000 });
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    for (const fieldName of fieldNames) {
      const colIndex = await this.getColumnIndex(fieldName);
      const wrapper = this.locators.readOnlyFieldWrapper(rowIndex, colIndex);
      
      // Wait for the wrapper to be visible AND stable
      await wrapper.waitFor({ state: 'visible', timeout: 10000 });
      await this.page.waitForTimeout(500); // Let SAP apply the readonly class
      const classValue = await wrapper.getAttribute('class');
      const input = wrapper.locator('input').first();
      const readonlyAttr = await input.getAttribute('readonly');
      const disabledAttr = await input.getAttribute('disabled');
      const fieldLevelDisable = await wrapper.getAttribute('data-fieldleveldisable');
      // Check for readonly via class, readonly attribute, or disabled attribute
      const isReadonly = 
        classValue?.includes('sapMInputBaseReadonly') ||
        classValue?.includes('readOnlyF4') ||
        readonlyAttr === 'readonly' ||
        disabledAttr === 'disabled' ||
        fieldLevelDisable === 'X';
      
      expect(
        isReadonly,
        `Field "${fieldName}" in row ${rowIndex + 1} is NOT read-only.\nClass: ${classValue}\nReadonly attr: ${readonlyAttr}\nDisabled attr: ${disabledAttr}`
      ).toBeTruthy();
      logger.info(`Validated ${fieldName} (row ${rowIndex + 1}) is read-only - Class: ${classValue}`);
    }
  }
}

/**
 * Captures a key-value mapping from table rows based on two specified fields.
 *
 * Steps:
 * 1. Log the mapping being captured (keyField → valueField).
 * 2. Count total rows in the table.
 * 3. If no rows are found, throw an error.
 * 4. Fetch all row data for the specified key and value fields.
 * 5. Initialize an empty object to store the mapping.
 * 6. Iterate through each row:
 *    a. Extract key and value from the row data.
 *    b. Skip the row if either key or value is empty.
 *    c. Store the mapping in a key-value object.
 *    d. Log each captured mapping with row index.
 * 7. Return the final field map object.
 *
 * @param keyField The field name used as the map key.
 * @param valueField The field name used as the map value.
 *
 * @returns Promise<Record<string, string>> Object mapping keyField values to valueField values.
 *
 * Example:
 * const map = await page.captureFieldMapWithValues('Material', 'Quantity');
 */
async captureFieldMapWithValues(keyField: string, valueField: string): Promise<Record<string, string>> {
  
  logger.info(`Capturing field map: ${keyField} → ${valueField}`);
  const rowCount = await this.locators.tableRows.count();
  if (rowCount === 0) {
    throw new Error(`No rows found in table while capturing ${keyField} → ${valueField} mapping`);
  }
  // Get all row data at once
  const allRowsData = await this.getRowsData(rowCount, [keyField, valueField]);
  const fieldMap: Record<string, string> = {};
  allRowsData.forEach((rowData, index) => {
    const key = rowData[keyField];
    const value = rowData[valueField];
    // Skip empty rows
    if (!key || !value) return;
    fieldMap[key] = value;
    logger.info(`Captured mapping: ${keyField}="${key}" → ${valueField}="${value}" in row ${index + 1}`);
  });
  return fieldMap;
}

/**
 * Validates that a target field in the table matches expected values based on a previously captured mapping.
 *
 * Steps:
 * 1. Log the validation process for the mapped field relationship.
 * 2. Count the total number of rows in the table.
 * 3. If no rows exist, throw an error.
 * 4. Fetch all row data for the key field and target field.
 * 5. Iterate through each row:
 *    a. Extract the key and actual target field value.
 *    b. Skip rows where the key is empty.
 *    c. Ensure a mapping exists for the key in the provided field map.
 *    d. Retrieve the expected value from the mapping.
 *    e. Assert that the actual value matches the expected value.
 * 6. Log successful validation for each mapped entry.
 *
 * @param fieldMap Pre-captured mapping of keyField → expected targetField values.
 * @param keyField The field used as the mapping key.
 * @param targetField The field whose values are being validated against the mapping.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.validateMappedField(map, 'Material', 'Plant');
 */
async validateMappedField(fieldMap: Record<string, string>, keyField: string, targetField: string): Promise<void> {
    
  logger.info(`Validating mapped field "${targetField}" against key "${keyField}" using provided mapping`);
  const rowCount = await this.locators.tableRows.count();
  if (rowCount === 0) {
    throw new Error(`No rows found while validating mapped field "${targetField}"`);
  }
  // Get all row data at once
  const allRowsData = await this.getRowsData(rowCount, [keyField, targetField]);
  allRowsData.forEach((rowData, index) => {
    const key = rowData[keyField];
    const actualValue = rowData[targetField];
    // Skip empty rows
    if (!key) return;
    if (!(key in fieldMap)) {
      throw new Error(`No mapping found for ${keyField} "${key}"`);
    }
    const expectedValue = fieldMap[key];
    expect(actualValue, `Mapped value mismatch for ${keyField} "${key}" in row ${index + 1}`).toBe(expectedValue);
    logger.info(`Validated mapping: ${keyField}="${key}" → ${targetField}="${actualValue}"`);
  });
}

/**
 * Selects a table row based on BP Number and clicks the "BP : Add Roles" button.
 *
 * Steps:
 * 1. Log the BP number being searched.
 * 2. Start a retry loop until the timeout is reached.
 * 3. Check if table rows are loaded:
 *    a. If no rows exist, wait and retry.
 * 4. Fetch all visible rows' BP numbers from the UI.
 * 5. Find the row index matching the given BP number.
 * 6. If the row is found:
 *    a. Locate and select the checkbox for that row.
 *    b. Wait for the checkbox to become visible.
 *    c. Scroll into view and click the checkbox.
 *    d. Wait briefly for UI update.
 *    e. Wait for the "BP Add Roles" button to become visible.
 *    f. Click the "BP Add Roles" button.
 *    g. Wait briefly for navigation/action to complete.
 *    h. Exit the function successfully.
 * 7. If not found, wait and retry.
 * 8. If timeout is reached, throw an error.
 *
 * @param bpNumber The BP Number to search and select.
 * @param timeout Maximum time to wait for the BP row to appear (default: 60000ms).
 *
 * @returns Promise<void>
 *
 * @throws Error If the BP number is not found within the timeout period.
 *
 * Example:
 * await page.selectRowByBPAndClickAddRoles('BP12345');
 */
async selectRowByBPAndClickAddRoles(bpNumber: string, timeout = 60000): Promise<void> {
  
  logger.info(`Selecting row with BP No "${bpNumber}" and clicking "BP : Add Roles"`);
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    // Get the actual number of rows in the table
    const rowCount = await this.locators.tableRows.count();
    if (rowCount === 0) {
      // Table not loaded yet, wait and retry
      await this.page.waitForTimeout(500);
      continue;
    }
    // Get all rows' BP No at once
    const rowsData = await this.getRowsData(rowCount, ['BP No']);
    // Find the index of the row with the target BP No
    const targetIndex = rowsData.findIndex(row => row['BP No']?.trim() === bpNumber);
    if (targetIndex >= 0) {
      // Click the checkbox for that row
      const checkbox = this.locators.tableRowSelectionCheckbox(targetIndex);
      await this.locators.tableGrid.locator(checkbox).waitFor({ state: 'visible', timeout: 10000 });
      await this.locators.tableGrid.locator(checkbox).scrollIntoViewIfNeeded();
      await this.locators.tableGrid.locator(checkbox).click();
      await this.page.waitForTimeout(1000);
      // Click the BP Add Roles button
      await this.locators.bpAddRolesButton.waitFor({ state: 'visible', timeout: 10000 });
      await this.locators.bpAddRolesButton.click();
      await this.page.waitForTimeout(1000);
      return;
    }
    // Wait a bit before retrying
    await this.page.waitForTimeout(1000);
  }
  throw new Error(`BP No "${bpNumber}" not found in table after ${timeout / 1000}s`);
}

/**
 * Validates the "Add Roles" dialog table rows against expected values and confirms the selection.
 *
 * Steps:
 * 1. Log validation start.
 * 2. Wait for the Add Roles dialog to become visible.
 * 3. Extract all table headers and build a header-to-column-index map.
 * 4. Log detected headers for debugging purposes.
 * 5. Iterate through each expected row:
 *    a. Locate the row by index in the table.
 *    b. Wait for the row to become visible.
 *    c. For each expected field in the row:
 *       i. Resolve the column index from the header map.
 *       ii. Locate the corresponding cell.
 *       iii. Wait for the cell to be visible.
 *       iv. Extract value from input field if present, otherwise from text content.
 *       v. Compare actual value with expected value.
 *       vi. Throw an error if mismatch is found.
 *       vii. Log successful validation per field.
 * 6. Click the Confirm button to submit selected roles.
 * 7. Wait for confirmation button to disappear (dialog closes).
 *
 * @param expectedRows Array of row objects containing rowIndex and expected field values.
 *
 * @returns Promise<void>
 *
 * @throws Error If any column is not found or any field value mismatches expected data.
 *
 * Example:
 * await page.validateAddRolesDialogRows([
 *   { rowIndex: 0, values: { Role: 'Admin', Status: 'Active' } }
 * ]);
 */
async validateAddRolesDialogRows(expectedRows: { rowIndex: number; values: Record<string, string> }[]): Promise<void> {
  
  logger.info(`Validating Add Roles dialog rows against expected data`);  
  const dialog = this.locators.addRolesDialog;
  await dialog.waitFor({ state: 'visible', timeout: 10000 });
  // Grab all headers from the Add Roles table
  const headers = dialog.locator('table[id^="__table"] div.sapUiTableCellInner span.sapMLabelTextWrapper bdi.sapUiSelectable');
  const headerCount = await headers.count();
  const headerMap: Record<string, number> = {};
  for (let i = 0; i < headerCount; i++) {
    const headerText = (await headers.nth(i).textContent())?.trim();
    if (headerText) headerMap[headerText.replace(/\s+/g, ' ')] = i;
  }
  logger.info(`Detected headers in Add Roles table: ${JSON.stringify(headerMap)}`);
  for (const row of expectedRows) {
    const { rowIndex, values } = row;
    const rowLocator = dialog.locator('table[id^="__table"] tr[id*="rows-row"]').nth(rowIndex);
    await rowLocator.waitFor({ state: 'visible', timeout: 5000 });
    for (const fieldName of Object.keys(values)) {
      const colIndex = headerMap[fieldName.replace(/\s+/g, ' ')];
      if (colIndex === undefined) {
        throw new Error(`Column "${fieldName}" not found in Add Roles table`);
      }
      const cellLocator = rowLocator.locator('td.sapUiTableContentCell').nth(colIndex);
      await cellLocator.waitFor({ state: 'visible', timeout: 5000 });
      const input = cellLocator.locator('input');
      const actualValue =(await input.count()) > 0? (await input.inputValue()).trim(): (await cellLocator.textContent())?.trim() || '';
      const expectedValue = values[fieldName];

      if (actualValue !== expectedValue) {
        throw new Error(
          `Row ${rowIndex + 1}: Field "${fieldName}" expected "${expectedValue}", but found "${actualValue}"`
        );
      }
      logger.info(`Row ${rowIndex + 1} validated: ${fieldName} = ${actualValue}`);
    }
  }
  await this.locators.confirmButton.click();
  await this.page.waitForTimeout(500);
  await this.locators.confirmButton.waitFor({ state: 'hidden', timeout: 10000 });
}

/**
 * Retrieves the number of visible data rows in the SAP table.
 *
 * Steps:
 * 1. Locate the SAP application iframe container.
 * 2. Target all visible table rows excluding hidden rows.
 * 3. Count the number of matching rows.
 * 4. Log the total row count for debugging purposes.
 * 5. Return the row count.
 *
 * @returns Promise<number> Number of visible data rows in the table.
 *
 * Example:
 * const rowCount = await page.getTableDataRowCount();
 */
async getTableDataRowCount(): Promise<number> {
  const frame = this.page.frameLocator('.sapUShellApplicationContainer iframe');
  const rows = frame.locator('table[id^="__table"] tr.sapUiTableRow.sapUiTableContentRow:not(.sapUiTableRowHidden)');
  const count = await rows.count();
  console.log(`SAP Data Rows: ${count}`);
  return count;
}

/**
 * Retrieves the number of visible (non-hidden) records in the SAP table.
 *
 * Steps:
 * 1. Locate the SAP application container using frame locator.
 * 2. Wait for at least one table row to be visible.
 * 3. Retrieve all row elements from the table.
 * 4. Iterate through each row:
 *    a. Check the row's CSS class attribute.
 *    b. Exclude rows marked as "sapUiTableRowHidden".
 *    c. Count only visible (active) data rows.
 * 5. Return the total number of visible data rows.
 *
 * @returns Promise<number> Number of visible records in the table.
 *
 * Example:
 * const count = await page.getRecordsCount();
 */
async getRecordsCount(): Promise<number> {

  const frame = this.page.frameLocator('.sapUShellApplicationContainer');
  await frame.locator('tr[id*="rows-row"]').first().waitFor();
  const rows = frame.locator('tr[id*="rows-row"]');
  const totalRows = await rows.count();
  let dataRows = 0;
  for (let i = 0; i < totalRows; i++) {
    const className = await rows.nth(i).getAttribute('class');
    if (!className?.includes('sapUiTableRowHidden')) {
      dataRows++;
    }
  }
  return dataRows;
}

/**
 * Validates a cross-view field value using a previously captured mapping and conditional filters.
 *
 * Steps:
 * 1. Log the validation context including target field, conditions, and key field.
 * 2. Retrieve total number of rows in the table.
 * 3. Fetch row data for:
 *    - Key field
 *    - Target field
 *    - All condition fields
 * 4. Initialize a flag to track if any row matches the given conditions.
 * 5. Iterate through each row:
 *    a. Check if the row satisfies all provided conditions.
 *    b. If not, skip the row.
 *    c. Mark that at least one matching row exists.
 *    d. Extract the key field value (e.g., BP number).
 *    e. Retrieve actual and expected values for comparison.
 *    f. Validate that expected mapping exists for the key.
 *    g. Assert that actual value matches the mapped expected value.
 *    h. Log successful cross-view validation for the row.
 * 6. After iteration, throw an error if no rows matched the conditions.
 *
 * @param capturedMap Pre-captured mapping of keyField → expected targetField values.
 * @param conditions Key-value pairs used to filter rows before validation.
 * @param keyField Field used as the mapping key (e.g., BP No).
 * @param targetField Field whose value is validated against the mapping.
 *
 * @returns Promise<void>
 *
 * @throws Error If no rows match the conditions or mapping is missing for a key.
 *
 * Example:
 * await page.validateCrossViewFieldWithCondition(
 *   map,
 *   { Status: 'Active' },
 *   'BP No',
 *   'Role'
 * );
 */
async validateCrossViewFieldWithCondition(capturedMap: Record<string, string>,conditions: Record<string, string>,
  keyField: string,targetField: string): Promise<void> {
  logger.info(`Validating field "${targetField}" with conditions ${JSON.stringify(conditions)} using mapping on key "${keyField}"`);  
  const rowCount = await this.locators.tableRows.count();
  const rowsData = await this.getRowsData(rowCount, [keyField, targetField, ...Object.keys(conditions)]);
  let matched = false;
  rowsData.forEach((row, index) => {
    const isMatch = Object.entries(conditions).every(([field, value]) => {
      return (row[field] ?? '').trim() === value;
    });
    if (!isMatch) return;
    matched = true;
    const bpNo = row[keyField];
    const actualValue = (row[targetField] ?? '').trim();
    const expectedValue = capturedMap[bpNo];
    if (!expectedValue) {
      throw new Error(`No mapping found for ${keyField}="${bpNo}"`);
    }
    expect(
      actualValue,
      `Row ${index + 1}: ${targetField} mismatch for ${JSON.stringify(conditions)} (BP No="${bpNo}")`
    ).toBe(expectedValue);
    logger.info(`Cross-view validated: ${JSON.stringify(conditions)} → ${bpNo} → ${targetField}="${actualValue}"`);
  });
  if (!matched) {
    throw new Error(`No rows matched condition: ${JSON.stringify(conditions)}`);
  }
}

/**
 * Validates conditional field rules against table row data.
 *
 * Steps:
 * 1. Log the conditions and expected field rules being validated.
 * 2. Iterate through each row in the provided dataset.
 * 3. For each row:
 *    a. Check whether all provided conditions match the row values.
 *    b. If conditions do not match, skip the row.
 *    c. If conditions match:
 *       i. Validate each expected field rule against the row.
 *       ii. Normalize expected values (treat "No Value" as empty string).
 *       iii. Compare actual vs expected values.
 *       iv. Assert correctness using strict equality.
 *       v. Log successful rule validation.
 *
 * @param rowsData Array of row objects representing table data.
 * @param conditions Key-value pairs that define when validation should be applied.
 * @param expectedFields Key-value pairs defining expected field values when conditions match.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.validateConditionalFieldRule(
 *   rows,
 *   { Status: 'Active' },
 *   { Role: 'Admin', Type: 'Full' }
 * );
 */
async validateConditionalFieldRule(rowsData: Record<string, string>[],conditions: Record<string, string>,
  expectedFields: Record<string, string>): Promise<void> {
  logger.info(`Validating conditional field rules with conditions ${JSON.stringify(conditions)} and expected fields ${JSON.stringify(expectedFields)}`);
  rowsData.forEach((row, index) => {
    // Check if ALL conditions match
    const isMatch = Object.entries(conditions).every(([field, value]) => {
      return (row[field] ?? '').trim() === value;
    });
    if (!isMatch) return;
      // Validate expected fields
      Object.entries(expectedFields).forEach(([field, expected]) => {
      const actual = (row[field] ?? '').trim();
      const expectedValue = expected === 'No Value' ? '' : expected;
      expect(actual,`Row ${index + 1}: ${field} should be "${expectedValue}" when ${JSON.stringify(conditions)}`).toBe(expectedValue);
      logger.info(`Rule Passed: ${JSON.stringify(conditions)} → ${field}="${actual}"`);
    });
  });
}

/**
 * Selects a value from a dropdown field inside a specific table cell.
 *
 * Steps:
 * 1. Locate the target cell using row index and field name.
 * 2. Scroll the cell into view to ensure it is interactable.
 * 3. Click the cell to activate the dropdown input.
 * 4. Locate the dropdown input inside the cell.
 * 5. Fill the input with the provided value.
 * 6. Confirm the selection by pressing "Enter".
 *
 * @param rowIndex The zero-based index of the row.
 * @param fieldName The column/field name of the dropdown.
 * @param value The value to select from the dropdown.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.selectDropdownByField(0, 'Country', 'India');
 */
async selectDropdownByField(rowIndex: number, fieldName: string, value: string) {

  const cell = await this.getCell(rowIndex, fieldName);
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  const dropdownInput = cell.locator('input');
  await dropdownInput.fill(value);
  await dropdownInput.press('Enter');
}

/**
 * Selects a value using the Value Help (F4 help) dialog for a specific table field.
 *
 * Steps:
 * 1. Determine the column index for the given field name.
 * 2. Locate and click the Value Help icon for the specified row and column.
 * 3. Wait for the Value Help dialog to become visible.
 * 4. Use the search box inside the dialog to filter results by the given value.
 * 5. Wait briefly for the filtered results to load.
 * 6. Locate the matching row in the dialog based on the provided value.
 * 7. Click the matching row to select it.
 * 8. Close the Value Help dialog.
 *
 * @param rowIndex The zero-based index of the table row.
 * @param fieldName The field/column name where Value Help should be used.
 * @param value The value to search and select from the Value Help dialog.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.selectViaValueHelp(0, 'Material', 'Steel');
 */
async selectViaValueHelp(rowIndex: number, fieldName: string, value: string) {

  const colIndex = await this.getColumnIndex(fieldName);
  const icon = this.locators.getValueHelpIcon(rowIndex, colIndex);
  await icon.waitFor({ state: 'visible' });
  await icon.click();
  await this.locators.valueHelpDialog.waitFor({ state: 'visible' });
  const searchBox = this.page.getByRole('searchbox');
  await searchBox.fill(value);
  await this.page.waitForTimeout(500);
  const row = this.locators.valueHelpDialogRows.filter({ hasText: value }).first();
  await row.click();
  await this.locators.closeDialogButton.click();
}

/**
 * Executes dynamic data entry into a table based on field-level action mapping.
 *
 * Steps:
 * 1. Log the number of rows and the provided action mapping.
 * 2. Iterate through each row of input data.
 * 3. For each field in the row:
 *    a. Extract the field value.
 *    b. Determine the action type from actionMap (default: input).
 *    c. Skip the field if value is empty.
 * 4. Execute field interaction based on action type:
 *    - "input" → enter value directly into the field.
 *    - "dropdown" → select value from dropdown.
 *    - "search" / "valuehelp" → select value using Value Help dialog.
 *    - default → fallback to input and log a warning.
 * 5. Catch and log errors per field without stopping execution.
 * 6. Continue processing remaining fields and rows even if some fail.
 *
 * @param rowsData Array of row objects containing field-value pairs.
 * @param actionMap Mapping of field names to interaction types (input, dropdown, valuehelp, search).
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.executeDynamicData(
 *   [{ Material: 'Steel', Qty: '10' }],
 *   { Material: 'valuehelp', Qty: 'input' }
 * );
 */
async executeDynamicData(rowsData: any[],actionMap: Record<string, string>) {

  logger.info(`Executing dynamic data entry for ${rowsData.length} rows with action map: ${JSON.stringify(actionMap)}`);
  const rowCount = rowsData.length;
  for (let i = 0; i < rowCount; i++) {
    const row = rowsData[i];
    for (const field in row) {
      const value = row[field];
      const action = actionMap[field] || 'input';
      if (!value) continue;
      try {
        switch (action.toLowerCase()) {
          case 'input':
            await this.enterField(i, field, value);
            break;
          case 'dropdown':
            await this.selectDropdownByField(i, field, value);
            break;
          case 'search':
          case 'valuehelp':
            await this.selectViaValueHelp(i, field, value);
            break;
          default:
            logger.warn(`Unknown action "${action}" for field "${field}", defaulting to input`);
            await this.enterField(i, field, value);
        }
      } catch (err) {
        logger.warn(`Skipping field ${field}: ${err}`);
      }
    }
  }
}

/**
 * Checks whether a given field exists as a visible form label on the page.
 *
 * Steps:
 * 1. Locate the form label element for the given field name.
 * 2. Attempt to wait briefly (2 seconds) for the label to become visible.
 * 3. If the label becomes visible within the timeout, return true.
 * 4. If the wait fails (timeout or not found), return false.
 *
 * @param fieldName The name of the form field to check.
 *
 * @returns Promise<boolean> True if the form field label is visible, otherwise false.
 *
 * Example:
 * const exists = await page.isFormField('Customer Name');
 */
async isFormField(fieldName: string): Promise<boolean> {
  const label = this.locators.formLabel(fieldName);
  try {
    await label.first().waitFor({ state: 'visible', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Handles input into a table cell field using a progressive fallback strategy.
 *
 * Steps:
 * 1. Locate the target cell using row index and field name.
 * 2. Scroll the cell into view and activate edit mode via double click.
 * 3. Attempt primary input method:
 *    a. Locate input element inside the cell.
 *    b. Clear existing value.
 *    c. Fill the new value.
 *    d. Wait briefly for UI stabilization.
 * 4. If input fails, log a warning (fallback logic exists but currently commented out):
 *    - Dropdown selection (optional fallback)
 *    - Value help dialog selection (final fallback)
 * 5. If all methods fail (when enabled), an error would be thrown.
 *
 * Note:
 * - Currently only the direct input strategy is active.
 * - Dropdown and value help strategies are prepared but disabled.
 *
 * @param rowIndex The zero-based index of the table row.
 * @param fieldName The field/column name to interact with.
 * @param value The value to enter into the field.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.handleTableField(0, 'Material', 'Steel');
 */
async handleTableField(rowIndex: number, fieldName: string, value: string) {

  const cell = await this.getCell(rowIndex, fieldName);
  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick();
  const input = cell.locator('input').first();
  // ✅ STEP 1: TRY INPUT
  try {
    logger.info(`TABLE INPUT → ${fieldName}`);
    await input.fill('');
    await input.fill(value);
    // await input.type(value, { delay: 50 });
    // const entered = await input.inputValue();
    // await input.press('Enter');
    await this.page.waitForTimeout(100);
    // if (entered?.trim()) return;
  } catch (e) {
    logger.warn(`TABLE INPUT failed → ${fieldName}`);
  }
  // ✅ STEP 2: TRY DROPDOWN
  // try {
  //   logger.info(`TABLE DROPDOWN → ${fieldName}`);
  //   await input.fill(value);
  //   await input.press('Enter');
  //   return;
  // } catch (e) {
  //   logger.warn(`TABLE DROPDOWN failed → ${fieldName}`);
  // }
  // // ✅ STEP 3: VALUE HELP (LAST)
  // try {
  //   logger.info(`TABLE VALUE HELP → ${fieldName}`);
  //   await this.selectViaValueHelp(rowIndex, fieldName, value);
  //   return;
  // } catch (e) {
  //   logger.error(`TABLE VALUE HELP failed → ${fieldName}`);
  // }
  // throw new Error(`Unable to set table field: ${fieldName}`);
}

/**
 * Detects the current UI view type (FORM or TABLE) based on visible elements.
 *
 * Steps:
 * 1. Check if the table grid locator is visible on the page.
 * 2. If the table is visible, classify the view as "TABLE".
 * 3. If the table is not visible (or check fails), default to "FORM".
 *
 * @returns Promise<'FORM' | 'TABLE'> The detected view type.
 *
 * Example:
 * const viewType = await page.detectViewType();
 */
async detectViewType(): Promise<'FORM' | 'TABLE'> {

  // If table exists → it's TABLE view
  const tableVisible = await this.locators.tableGrid.isVisible().catch(() => false);
  if (tableVisible) {
    return 'TABLE';
  }
  return 'FORM';
}

// async executeDynamicDataN(rowsData: any[]) {

//   logger.info(`Executing dynamic data entry for ${rowsData.length} rows}`);
//   const rowCount = rowsData.length;
//   for (let i = 0; i < rowCount; i++) {
//     const row = rowsData[i];
//     for (const field in row) {
//       const value = row[field];
//       if (!value) continue;
//       try {
//         await this.enterField(i, field, value);
//         logger.info(`Typed ${field} = ${value}`);
//       } catch (err) {
//         logger.warn(`Input failed for ${field}, trying value help`);
//         try {
//           await this.selectViaValueHelp(i, field, value);
//           logger.info(`ValueHelp used for ${field} = ${value}`);
//         } catch (err2) {
//           logger.error(`Failed field ${field}: ${err2}`);
//         }
//       }
//     }
//   }
// }

/**
 * Executes dynamic data entry into either FORM or TABLE view based on detected UI state.
 *
 * Steps:
 * 1. Log the number of rows being processed.
 * 2. Detect the current view type (FORM or TABLE).
 * 3. Log the detected view type for debugging.
 * 4. Iterate through each row of input data.
 * 5. For each field in the row:
 *    a. Skip empty values.
 *    b. If view is FORM:
 *       - Use form field handler to set the value.
 *    c. If view is TABLE:
 *       - Use table cell handler to set the value.
 *    d. Log successful field entry.
 * 6. Catch and log any field-level errors without stopping execution.
 *
 * Note:
 * - View type is detected once before processing all rows.
 * - FORM and TABLE handling logic is delegated to dedicated helper methods.
 *
 * @param rowsData Array of row objects containing field-value pairs.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.executeDynamicDataN([
 *   { Name: 'John', Age: '30' }
 * ]);
 */
async executeDynamicDataN(rowsData: any[]) {

  logger.info(`Executing dynamic data entry for ${rowsData.length} rows}`);
  const viewType = await this.detectViewType();
  logger.info(`VIEW TYPE DETECTED → ${viewType}`);
  const rowCount = rowsData.length;
  for (let i = 0; i < rowCount; i++) {
    const row = rowsData[i];
    for (const field in row) {
      const value = row[field];
      if (!value) continue;
      try {
        if (viewType === 'FORM') {
          logger.info(`FORM → ${field}`);
          await this.setFormFieldValue(field, value);
        } else {
          logger.info(`TABLE → ${field}`);
          await this.handleTableField(i, field, value);
        }
        logger.info(`Typed ${field} = ${value}`);
      } catch (err) {
        logger.warn(`Input failed for ${field}`);
      }
    }
  }
}

/**
 * Validates "Add Roles" data against Excel-driven expected input by matching BP records
 * and verifying dialog table values.
 *
 * Steps:
 * 1. Log validation start with provided expected rows.
 * 2. Group expected validation rows by BP No into a lookup structure.
 * 3. Iterate through each UI row based on rowCount:
 *    a. Extract BP No from UI data.
 *    b. Extract BP Name from input data.
 *    c. Validate BP No exists; throw error if missing.
 *    d. Select the corresponding BP row and open "Add Roles" dialog.
 *    e. Build a placeholder key (e.g., "$1", "$2") to match grouped expected data.
 *    f. Retrieve expected rows for the current BP.
 *    g. Throw error if no expected data exists for the BP.
 *    h. Transform expected rows into dialog validation format.
 * 4. Call dialog validation method to verify UI matches expected values.
 *
 * @param rowCount Total number of BP records to validate.
 * @param bpRowsData UI data containing BP numbers.
 * @param bPRowInputData Input dataset containing BP names.
 * @param validationRows Expected validation dataset (from Excel).
 *
 * @returns Promise<void>
 *
 * @throws Error If BP number is missing or expected validation data is not found.
 *
 * Example:
 * await page.validateAddRolesFromExcel(3, uiData, inputData, excelData);
 */
async validateAddRolesFromExcel(rowCount: number,bpRowsData: any[],bPRowInputData: any[],validationRows: any[]): Promise<void> {

  logger.info(`Validating Add Roles: ${validationRows}`);
  const groupedExpected: Record<string, any[]> = {};
  for (const row of validationRows) {
    const key = row['BP No']; 
    if (!groupedExpected[key]) {
      groupedExpected[key] = [];
    }
    groupedExpected[key].push(row);
  }
  logger.info(`Validating field "${groupedExpected}"`); 
  // Loop records
  for (let i = 0; i < rowCount; i++) {
    const bpNo = bpRowsData[i]['BP No'];   // from UI
    const bpName = bPRowInputData[i]['BP Name'];
    if (!bpNo) {
      throw new Error(`BP No missing for record ${i + 1}`);
    }
    await this.selectRowByBPAndClickAddRoles(bpNo);
    const placeholderKey = `$${i + 1}`;   // "$1", "$2"
    const expectedRowsRaw = groupedExpected[placeholderKey];
    if (!expectedRowsRaw) {
      throw new Error(`No expected data found for BP ${placeholderKey}`);
    }
    const expectedRows = expectedRowsRaw.map((row, index) => ({rowIndex: index,
      values: {'BP Role': row['BP Role'],'BP No': bpNo,'Name': bpName}
    }));

    // Validate dialog
    await this.validateAddRolesDialogRows(expectedRows);
  }
}

/**
 * Extracts the "rejected to step" information from the rejection success message.
 *
 * Steps:
 * 1. Wait for the rejection success message to become visible.
 * 2. Retrieve the message text content.
 * 3. If no text is found, return null.
 * 4. Log the raw rejection message for debugging.
 * 5. Attempt to extract a step number using regex (e.g., "step 100").
 *    a. Convert extracted numeric string into integer.
 *    b. Format it as "Step X" and return it.
 * 6. If no numeric step is found:
 *    a. Check if message contains "requestor/requester".
 *    b. If found, assume it is "Step 1".
 * 7. If no matching pattern is found, return null.
 *
 * @returns Promise<string | null> The resolved rejection step or null if not found.
 *
 * Example:
 * const step = await page.getRejectedToStep();
 */
async getRejectedToStep(): Promise<string | null> {

  const locator = this.locators.rejectSuccessMessageDynamic;
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  const text = await locator.textContent();
  if (!text) return null;
  console.log(` Reject message: ${text}`);
  const match = text.match(/step\s+(\d+)/i);
  if (match) {
    const rawStep = match[1];        // "0000000100"
    const stepNumber = parseInt(rawStep, 10); // 100
    return `Step ${stepNumber}`;
  }
  if (text.toLowerCase().includes('requestor') || text.toLowerCase().includes('requester')) {
    return 'Step 1';
  }
  return null;
}

/**
 * Executes a workflow action for a given task based on the configured action string.
 *
 * Steps:
 * 1. Extract the raw action string from the task (may include parameters using "|").
 * 2. Split the action into:
 *    - Primary action (e.g., save, approve, reject, review)
 *    - Optional parameters (params array)
 * 3. Normalize action name to lowercase for consistent handling.
 * 4. Log the action being executed.
 * 5. Ensure UI is ready before performing actions:
 *    a. Wait for Edit View button to be visible.
 *    b. Validate Edit View and progress bar readiness.
 * 6. Execute workflow action based on type:
 *    - "save" → complete task and exit.
 *    - "approve" → approve task and exit.
 *    - "reject" → execute rejection flow and return rejected step.
 *    - "review" → execute review workflow.
 * 7. Throw an error if the action type is not recognized.
 *
 * @param task The workflow task containing action definition and metadata.
 *
 * @returns Promise<string | null>
 *          - Returns rejected step (for reject flow) or null for other actions.
 *
 * @throws Error If the action type is unknown or unsupported.
 *
 * Example:
 * await page.executeWorkflowAction({
 *   action: "reject|Reason=Invalid|Step=2",
 *   step: "Step 1"
 * });
 */
async executeWorkflowAction(task: Task): Promise<string | null> {
  
  const actionRaw = task.action;
  const [action, ...params] = actionRaw.split('|');
  const normalizedAction = action.toLowerCase();
  logger.info(`Executing action: ${actionRaw}`);
  await this.locators.editViewButton.waitFor({ state: 'visible' });
  await this.validateEditViewAndStatusProgressBar();
  switch (normalizedAction) {
    case 'save' :
      await this.completeTask();
      return null;
      break;
    case 'approve':
      await this.approveTask();
      return null;
      break;
    case 'reject':
      return await this.RejectTask(task,params);
      break;
    case 'review':
      await this.ReviewTask(); // yet to work
      return null;
      break;
    default:
      throw new Error(`Unknown workflow action: ${actionRaw}`);
  }
}

/**
 * Handles post-workflow actions after executing a task (e.g., rejection flow handling).
 *
 * Steps:
 * 1. Execute the workflow action for the given task.
 * 2. Capture the returned rejected step (if any).
 * 3. If a rejected step is returned:
 *    a. Log the rejected step for debugging.
 *    b. Reset execution state from the rejected step onward.
 *    c. Re-add the rejected step back into the task list.
 *    d. Validate that the rejected step is visible again in the task list UI.
 *
 * Note:
 * - This method primarily handles workflow reprocessing scenarios (e.g., reject → rework → retry).
 * - Only rejection flows return a step value; other actions return null.
 *
 * @param myTasklistPage Instance of MyTasklistPage used for task state management and validations.
 * @param requestNumber The request identifier used to locate tasks in UI.
 * @param task The task being executed.
 * @param tasks Mutable list of remaining workflow tasks.
 *
 * @returns Promise<void>
 *
 * Example:
 * await handleWorkflowAction(tasklistPage, "REQ123", task, tasks);
 */
async  handleWorkflowAction(myTasklistPage: MyTasklistPage,requestNumber: string,task: Task,tasks: Task[]): Promise<void> {
  
  const rejectedToStep = await this.executeWorkflowAction(task);
  if (rejectedToStep) {
    logger.info(`Validating rejected step: ${rejectedToStep}`);
    myTasklistPage.resetExecutionFromStep(rejectedToStep);
    myTasklistPage.reAddTask(tasks, rejectedToStep);
    await myTasklistPage.validateTaskPresentByStep(requestNumber, rejectedToStep);
  }
}

/**
 * Retrieves metadata for a form field including input element, value help icon, and field type info.
 *
 * Steps:
 * 1. Locate the form label for the given field name.
 * 2. Wait for the label to become visible.
 * 3. Extract the "for" attribute to identify the linked input field ID.
 * 4. If no input ID is found, throw an error (broken label-input association).
 * 5. Locate the input element using the extracted ID.
 * 6. Wait for the input field to become visible.
 * 7. Locate the field container wrapping the input element.
 * 8. Locate the value help (F4) icon inside the container.
 * 9. Read the container CSS class to determine field type.
 * 10. Identify whether the field is a dropdown based on class name.
 *
 * @returns An object containing:
 *          - input: Locator for the input field
 *          - valueHelp: Locator for value help icon (if available)
 *          - isDropdown: boolean indicating dropdown field type
 *
 * @throws Error If the field label is not linked to an input element.
 *
 * Example:
 * const meta = await page.getFormFieldMeta('Customer Name');
 * await meta.input.fill('ABC');
 */
async getFormFieldMeta(fieldName: string) {

  const label = this.locators.formLabel(fieldName);
  await label.waitFor({ state: 'visible', timeout: 15000 });
  const inputId = await label.getAttribute('for');
  if (!inputId) {
    throw new Error(`Field "${fieldName}" not linked to input`);
  }
  const input = this.locators.formInputById(inputId);
  await input.waitFor({ state: 'visible' });
  const container = this.locators.formFieldContainer(input).first();
  const valueHelp = this.locators.formValueHelpIcon(container);
  const classAttr = await container.getAttribute('class') || '';
  const isDropdown = classAttr?.includes('sapMComboBox');
  return {input,valueHelp,isDropdown};
}

/**
 * Selects a value from the Value Help (F4) dialog.
 *
 * Steps:
 * 1. Wait for the Value Help dialog to become visible.
 * 2. Locate the search box inside the dialog.
 * 3. Fill the search box with the provided value to filter results.
 * 4. Locate the matching row in the filtered results.
 * 5. Click the first matching row to select the value.
 * 6. Close the Value Help dialog.
 *
 * @param value The value to search and select from the dialog.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.selectFromValueHelpDialog('Steel');
 */
async selectFromValueHelpDialog(value: string) {
  await this.locators.valueHelpDialog.waitFor({ state: 'visible' });
  const search = this.page.getByRole('searchbox');
  await search.fill(value);
  const row = this.locators.valueHelpDialogRows.filter({ hasText: value }).first();
  await row.click();
  await this.locators.closeDialogButton.click();
}

// async setFormFieldValue(fieldName: string, value: string) {
//   const meta = await this.getFormFieldMeta(fieldName);
//   // VALUE HELP
//   if (await meta.valueHelp.count()) {
//     await meta.valueHelp.click();
//     await this.selectFromValueHelpDialog(value);   // check this later if index is needed
//     return;
//   }
//   // DROPDOWN
//   if (meta.isDropdown) {
//     await meta.input.fill(value);
//     await meta.input.press('Enter');
//     return;
//   }
//   // DEFAULT INPUT
//   await meta.input.fill(value);
// }

/**
 * Sets a value for a form field using a progressive fallback strategy.
 *
 * Steps:
 * 1. Retrieve form field metadata (input, value help icon, dropdown detection).
 * 2. Try primary input method:
 *    a. Wait for input field to be visible.
 *    b. Click into the field to activate it.
 *    c. Clear any existing value.
 *    d. Fill the new value.
 *    e. Wait briefly for UI stabilization.
 * 3. If input method fails, log a warning (fallback logic exists but is currently commented out):
 *    - Dropdown selection (optional fallback based on field type).
 *    - Value help dialog selection (final fallback using F4 help).
 *
 * Note:
 * - Currently only direct input strategy is active.
 * - Dropdown and value help strategies are prepared but disabled.
 *
 * @param fieldName The label/name of the form field.
 * @param value The value to set in the field.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.setFormFieldValue('Customer Name', 'ABC Corp');
 */
async setFormFieldValue(fieldName: string, value: string) {

  const meta = await this.getFormFieldMeta(fieldName);
  try {
    logger.info(`FORM INPUT → ${fieldName}`);
    await meta.input.waitFor({ state: 'visible' });
    await meta.input.click(); 
    await meta.input.fill('');
    await meta.input.fill(value);
    // await meta.input.type(value, { delay: 50 });
    // await meta.input.press('Enter');
    await this.page.waitForTimeout(100);
    // If input worked → exit
    // const entered = await meta.input.inputValue();
    // if (entered?.trim()) return;
  } catch (e) {
    logger.warn(`FORM INPUT failed → ${fieldName}`);
  }
  // ✅ STEP 2: TRY DROPDOWN
  // try {
  //   if (meta.isDropdown) {
  //     logger.info(`FORM DROPDOWN → ${fieldName}`);
  //     await meta.input.fill(value);
  //     await meta.input.press('Enter');
  //     return;
  //   }
  // } catch (e) {
  //   logger.warn(`FORM DROPDOWN failed → ${fieldName}`);
  // }
  // // ✅ STEP 3: VALUE HELP (LAST)
  // if (await meta.valueHelp.isVisible().catch(() => false)) {
  //   logger.info(`FORM VALUE HELP → ${fieldName}`);
  //   await meta.valueHelp.click();
  //   await this.selectFromValueHelpDialog(value);
  //   return;
  // }
  // throw new Error(`Unable to set form field: ${fieldName}`);
}

/**
 * Retrieves the current value of a form field.
 *
 * Steps:
 * 1. Retrieve metadata for the form field (input element and related info).
 * 2. Read the current value from the input element.
 * 3. Trim whitespace from the retrieved value.
 * 4. Return the cleaned value.
 *
 * @param fieldName The label/name of the form field.
 *
 * @returns Promise<string> The current value of the field.
 *
 * Example:
 * const value = await page.getFormFieldValue('Customer Name');
 */
async getFormFieldValue(fieldName: string): Promise<string> {

  const meta = await this.getFormFieldMeta(fieldName);
  const value = await meta.input.inputValue();
  return value.trim();
}

/**
 * Executes dynamic data entry for a FORM view based on key-value field mapping.
 *
 * Steps:
 * 1. Log the start of FORM data execution.
 * 2. Iterate through each field-value pair in the provided data object.
 * 3. Skip fields with empty or falsy values.
 * 4. Attempt to set each field value using form field handler.
 * 5. If a field update fails, log the error and continue processing remaining fields.
 *
 * Note:
 * - This method does not stop execution on failure of individual fields.
 * - It is designed for resilient bulk form data entry.
 *
 * @param data Object containing field names as keys and values to be entered.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.executeDynamicFormData({
 *   "Customer Name": "ABC Corp",
 *   "Country": "India"
 * });
 */
async executeDynamicFormData(data: Record<string, string>) {

  logger.info(`Executing dynamic FORM data`);
  for (const [field, value] of Object.entries(data)) {
    if (!value) continue;
    try {
      await this.setFormFieldValue(field, value);
    } catch (err) {
      logger.error(`Failed field ${field}: ${err}`);
    }
  }
}

/**
 * Validates form field values against expected data.
 *
 * Steps:
 * 1. Log the start of form validation.
 * 2. Iterate through each field-value pair in the expected data.
 * 3. Retrieve the actual value from the form field.
 * 4. Compare actual value with expected value using strict equality.
 * 5. Throw assertion error if values do not match.
 * 6. Log successful validation for each field.
 *
 * @param expectedData Object containing field names as keys and expected values.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.validateFormData({
 *   "Customer Name": "ABC Corp",
 *   "Country": "India"
 * });
 */
async validateFormData(expectedData: Record<string, string>) {

  logger.info(`Validating FORM data`);
  for (const [field, expected] of Object.entries(expectedData)) {
    const actual = await this.getFormFieldValue(field);
    expect(actual,`Field "${field}" mismatch`).toBe(expected);
    logger.info(`Validated ${field} = ${actual}`);
  }
}






}