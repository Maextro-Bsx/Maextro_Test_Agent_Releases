import { Page, Locator , expect} from '@playwright/test';
import BasePage from './Base_Page';
import { requestDetailsFieldsLocators } from '@locators/RequestDetailsFields_locators';
import { Task } from '@utils/taskTransformer';
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
 * Enters a value into a single editable cell (textbox or combobox)
 * identified by row index and column name.
 *
 * Steps:
 * 1. Get the cell using `getCell`
 * 2. Scroll into view and click to activate edit mode
 * 3. Check whether the cell contains a textbox or combobox
 * 4. Fill in the value and press Enter
 *
 * @param rowIndex - Zero-based index of the row
 * @param fieldName - Column header name
 * @param value - Value to enter into the cell
 *
 * Example:
 * await MaterialDetailsPage.enterValueInCell(0, 'Industry sector', 'Manufacturing');
 */
private async enterValueInCell(rowIndex: number, fieldName: string, value: string) {
  const cell = await this.getCell(rowIndex, fieldName);
  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick();
  const input = cell.locator('input.sapMInputBaseInner').first();
  await input.fill(value);
}

/**
 * Enters multiple field values for a single row identified by row index.
 *
 * Steps:
 * 1. Iterate over all fieldName/value pairs in `rowData`
 * 2. Call `enterValueInCell` for each field in the specified row
 *
 * @param rowIndex - Zero-based index of the row
 * @param rowData - Object containing fieldName: value pairs
 *
 * Example:
 * await MaterialDetailsPage.enterRowData(0, {
 *   Material: 'MAT-1001',
 *   'Industry sector': 'Manufacturing',
 *   'Lab/Office': 'Main Lab',
 *   UOM: 'KG'
 * });
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
 * Get data for multiple rows at once
 *
 * @param rowCount - Number of rows to fetch (starting from row 0)
 * @param fieldNames - Array of field names to fetch
 * @returns Array of row data objects
 *
 * Example:
 * const rowsData = await requestDetailsFields.getRowsData(2, ['BP No', 'Account Group']);
 * console.log(rowsData[0]['BP No']); // Row 1 BP No
 * console.log(rowsData[1]['BP No']); // Row 2 BP No
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
 * Validates that the actual rows match the expected rows.
 *
 * @param rowsData - Array of actual row objects from the table
 * @param expectedData - Array of expected row objects
 *
 * Example usage:
 * await validateRowsData(rowsData, [
 *   { 'BP No': '$1', 'Account Group': 'CUST' },
 *   { 'BP No': '$2', 'Account Group': 'CUST' }
 * ]);
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

async clickStatusComplete(): Promise<void> {
  const statusBtn = this.locators.statusCompleteButton;
  const editBtn = this.locators.editViewButton;

  logger.info('Clicking Status Complete...');
  await statusBtn.click(); 
  await Promise.race([
    editBtn.waitFor({ state: 'visible', timeout: 15000 }),
    statusBtn.waitFor({ state: 'visible', timeout: 15000 })
  ]);
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
 * Extracts the request number from the success message and removes leading zeros.
 *
 * Steps:
 * 1. Read success message textContent()
 * 2. Match request number using regex
 * 3. Remove leading zeros
 * 4. Return trimmed request number
 *
 * @returns Request number without leading zeros or null
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
 * Validates that:
 * 1. Edit View button is enabled
 * 2. Status progress is 100% complete
 *
 * Steps:
 * - Wait for Edit View button
 * - Verify it is enabled
 * - Wait for progress bar
 * - Validate aria-valuenow equals 100
 *
 * Returns:
 * - true if both validations pass
 * - Throws error if validation fails
 *
 * Example:
 * await materialDetailsPage.validateEditViewAndStatusProgressBar();
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
 * Validates that:
 * 1. All provided column names are marked as mandatory
 *
 * Steps:
 * - Iterate through each column name
 * - Locate the mandatory column header indicator
 * - Verify the column is marked as mandatory
 * - Collect any non-mandatory fields
 * - Throw error if any field is not mandatory
 *
 * @param fieldNames - Array of column names expected to be mandatory
 *
 * Returns:
 * - true if all fields are mandatory
 * - Throws error if one or more fields are not mandatory
 *
 * Example:
 * await materialDetailsPage.validateMandatoryFields([
 *   'Material Name',
 *   'Material Type',
 *   'Status'
 * ]);
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
 * Validates that:
 * 1. All specified fields in a given row are auto-populated (not empty)
 *
 * Steps:
 * - Iterate through each provided field name
 * - Locate the corresponding cell using row index and field name
 * - Check if the cell contains an input element
 * - If input exists, retrieve and trim its value
 * - Otherwise, retrieve and trim the cell text content
 * - Collect any fields that have empty values
 * - Throw error if any field is not populated
 *
 * @param rowIndex - Zero-based index of the row to validate
 * @param fieldNames - Array of field names expected to be auto-populated
 *
 * Returns:
 * - An object containing field names and their populated values
 * - Throws error if one or more fields are empty
 *
 * Example:
 * await materialDetailsPage.validateFieldsAutoPopulated(0, [
 *   'Material Name',
 *   'Material Type',
 *   'Status'
 * ]);
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
 * Retrieves the index of the column header that contains the specified field name.
 *
 * Steps:
 * - Retrieve the list of column headers
 * - Loop through each header and check if it contains the specified field name
 * - Return the index of the header that matches the field name
 * - Throw an error if the field name is not found in any column header
 *
 * @param fieldName - The field name to search for in the table header
 *
 * Returns:
 * - The index of the column header that contains the specified field name
 * - Throws an error if the field name is not found
 *
 * Example:
 * const columnIndex = await tablePage.getColumnIndexForHelperOption('Material Name');
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
 * Validates that the Value Help dialog for a specific field in a given row contains the expected values.
 *
 * Steps:
 * - Dynamically retrieve the column index for the field name
 * - Click the Value Help icon for the corresponding row and column
 * - Wait for the Value Help dialog to become visible
 * - Wait for the page to settle and network activity to idle
 * - Capture and clean up the values from the dialog rows
 * - Validate that each expected value is present in the dialog values
 * - Close the Value Help dialog
 *
 * @param rowIndex - Zero-based index of the row containing the field
 * @param fieldName - Name of the field for which the Value Help is triggered
 * @param expectedValues - Array of expected values that should be present in the Value Help dialog
 *
 * Returns:
 * - void if validation passes
 * - Throws error if any expected value is not found in the dialog
 *
 * Example:
 * await materialDetailsPage.validateFieldValueHelp(
 *   0,
 *   'Material Type',
 *   ['Raw Material', 'Finished Product', 'Semi-Finished']
 * );
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
 * Completes the full request creation workflow
 * and returns the generated request number.
 *
 * Steps:
 * 1. Click Status Complete
 * 2. Validate Edit View and Progress bar
 * 3. Click Submit Task
 * 4. Click Save
 * 5. Validate confirmation dialog
 * 6. Click Submit Confirm
 * 7. Validate submission success screen
 * 8. Extract request number
 * 9. Exit workflow
 *
 * @returns Request number (without leading zeros)
 *
 * Example:
 * const requestNumber = await requestDetailsFields.submitCreateRequestAndCaptureNumber();
 */
async submitCreateRequestAndCaptureNumber(): Promise<string> {

  logger.info('Submitting request and capturing request number...');
  await this.clickStatusComplete();
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
 * Waits for a locator to become visible with retry logic.
 *
 * Steps:
 * 1. Wait for locator to be visible within timeout
 * 2. If timeout occurs, wait for network to become idle
 * 3. Retry waiting for locator visibility
 *
 * @param locator - Playwright locator to wait for
 * @param timeout - Maximum wait time in milliseconds (default: 30000)
 *
 * Example:
 * await requestDetailsFields.waitForLocatorSafe(page.locator('#submitButton'));
 */
async waitForLocatorSafe(locator: Locator, timeout = 30000): Promise<void> {
  try {
    await locator.waitFor({ state: 'visible', timeout });
  } catch {
    await this.page.waitForLoadState('networkidle');
    await locator.waitFor({ state: 'visible', timeout });
  }
}


/**
 * Completes Step 100 task workflow.
 *
 * Steps:
 * 1. Click Status Complete
 * 2. Validate Edit View and Progress bar
 * 3. Click Save button
 * 4. Validate task closure confirmation dialog
 * 5. Confirm task closure
 * 6. Validate task closed success message
 * 7. Navigate back to Task List
 *
 * Example:
 * await requestDetailsFields.completeStep100Task();
 */
async completeTask(): Promise<void> {

  logger.info('Completing task Save workflow');
  await this.clickSaveButton();
  await this.waitForLoaderToDisappear();
  await this.waitForLocatorSafe(this.locators.taskCloseConfirmMessage);
  await this.locators.confirmYesButton.click();
  await this.waitForLocatorSafe(this.locators.successTitle);
  await this.waitForLocatorSafe(this.locators.saveSuccessMessage);
  await this.waitForLocatorSafe(this.locators.taskClosedMessage);
  await this.locators.backToTaskListButton.click();
  await this.waitForLoaderToDisappear();
  logger.info('Task completed and navigated back to Task List');
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
async approveTask(): Promise<void> {
  logger.info('Approving task');
  await this.clickSubmitTask();
  const approve = this.locators.approveMenuItem;
  await this.waitForLocatorSafe(approve);
  await approve.click();
  logger.info('Clicked Approve');
  await this.waitForLocatorSafe(this.locators.successTitle);
  await this.waitForLocatorSafe(this.locators.approvalSuccessMessage);
  await this.locators.backToTaskListButton.click();
  await this.waitForLoaderToDisappear();
  logger.info('Task approved and navigated back to Task List');
}

/**
 * Performs a task rejection flow using parameters from Excel input.
 *
 * Steps:
 * 1. Logs incoming parameters for debugging
 * 2. Initializes default values (reason, step, comment)
 * 3. Parses parameters array (key=value format) and overrides defaults
 * 4. Initiates task completion flow
 * 5. Opens reject action from menu
 * 6. Selects rejection reason from dropdown
 * 7. Selects step to reject back to
 * 8. Enters rejection comment
 * 9. Submits the rejection
 * 10. Waits for success confirmation
 * 11. Exits the task screen and waits for loader to disappear
 *
 * @param params - Array of key=value strings (e.g., ["reason=Incorrect Data", "step=Step 200"])
 * @returns Promise<void>
 *
 * Example:
 * await RejectTask([
 *   'reason=Incorrect Data',
 *   'step=Step 200',
 *   'comment=Validation failed'
 * ]);
 */
async RejectTask(params: string[]): Promise<string | null> {

  logger.info(`Performing REJECT action: ${JSON.stringify(params)}`);
  let reason = 'Inaccurate Customer Data';
  let step = 'Tax Data collection - BC_APPDATA';
  let comment = 'Rejected via automation';

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
 * Retrieves all error messages displayed in the error panel.
 *
 * Steps:
 * 1. Wait for the first error item to appear
 * 2. Count the total number of error items
 * 3. Loop through each error item
 * 4. Extract the title and description
 * 5. Format and store them in an array
 * 6. Return the formatted error messages
 *
 * @returns Array of formatted error messages ("Title | Description")
 *
 * Example:
 * const errors = await requestDetailsFields.getAllErrorMessages();
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
 * Validates mandatory field error messages against UI and expected data.
 *
 * Steps:
 * 1. Waits for error messages to be visible on the UI
 * 2. Retrieves all actual error messages from the UI
 * 3. Extracts row data from the UI based on provided row count and fields
 * 4. Builds expected error keywords for fields that are empty
 * 5. Logs actual UI data and expected errors for debugging
 * 6. Validates that each expected error exists in the actual error messages
 * 7. Ensures the number of actual errors matches expected errors
 * 8. Throws an error if there is a mismatch
 * 9. Closes the error dialog
 *
 * @param rowCount - Number of rows to validate from the UI
 * @param fields - List of field names to check for mandatory validation
 * @returns Promise<void>
 *
 * Example:
 * await validateMandatoryFieldErrorMessage(3, ['Name', 'Email']);
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
  // DECISION POINT
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
 * Validates the total number of errors displayed.
 *
 * Steps:
 * 1. Wait for the first error item to be visible
 * 2. Count the number of error items
 * 3. Assert that the count matches the expected value
 *
 * @param expectedCount - Expected number of error messages
 *
 * Example:
 * await requestDetailsFields.validateErrorCount(3);
 */
async validateErrorCount(expectedCount: number) {

  await this.locators.errorItems.first().waitFor({ state: 'visible' });
  const count = await this.locators.errorItems.count();
  expect(count).toBe(expectedCount);
}

/**
 * Validates that specified fields are read-only in the UI.
 *
 * Steps:
 * 1. Waits for SAP UI to apply readonly rules using DOM inspection
 * 2. Waits for table rows to become visible
 * 3. Iterates through each row up to the given row count
 * 4. For each specified field:
 *    - Determines the column index dynamically
 *    - Locates the field wrapper in the table
 *    - Waits for the element to be visible and stable
 * 5. Checks readonly conditions using:
 *    - CSS class indicators
 *    - readonly attribute
 *    - disabled attribute
 * 6. Asserts that the field is read-only
 * 7. Logs validation details for debugging
 *
 * @param rowCount - Number of rows to validate
 * @param fieldNames - List of field names expected to be read-only
 * @returns Promise<void>
 *
 * Example:
 * await validateFieldsReadOnly(3, ['Name', 'Status']);
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
 * Captures a mapping between two table fields.
 *
 * Steps:
 * 1. Get total number of rows in the table
 * 2. Throw an error if no rows are found
 * 3. Loop through each row
 * 4. Extract keyField and valueField data using getRowData()
 * 5. Validate that both values exist
 * 6. Store the mapping (key → value) in an object
 * 7. Log the captured mapping for debugging
 * 8. Return the completed field map
 *
 * @param keyField - Column name used as the key
 * @param valueField - Column name used as the mapped value
 *
 * @returns Object containing key-value mappings from the table
 *
 * Example:
 * const requestTypeMap =
 *   await requestDetailsFields.captureFieldMapWithValues('BP No', 'Account Group');
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
 * Validates that a target field value matches the previously captured mapping.
 *
 * Steps:
 * 1. Get total number of rows in the table
 * 2. Throw an error if no rows are found
 * 3. Loop through each row
 * 4. Extract keyField and targetField values using getRowData()
 * 5. Retrieve expected value from the provided fieldMap
 * 6. Validate that key exists and mapping is available
 * 7. Compare actual value with expected mapped value
 * 8. Log the validated mapping for debugging
 *
 * @param fieldMap - Mapping object containing expected key-value pairs
 * @param keyField - Column name used to retrieve the key
 * @param targetField - Column name whose value should match the mapped value
 *
 * Example:
 * await requestDetailsFields.validateMappedField(
 *   bpAccountGroupMap,
 *   'BP No',
 *   'Customer Account Grp'
 * );
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
 * Selects the checkbox of the row matching the provided BP Number
 * and clicks the "BP : Add Roles" button.
 *
 * Steps:
 * 1. Get total row count
 * 2. Loop through each row
 * 3. Read BP No field value
 * 4. When match is found:
 *    - Click the row selection checkbox
 *    - Click "BP : Add Roles"
 *
 * @param bpNumber BP number used to identify the row
 *
 * Example:
 * await requestDetailsPage.selectRowByBPAndClickAddRoles('10002345');
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
 * Validates row data inside the "Add Roles" dialog table against expected values.
 *
 * Steps:
 * 1. Waits for the Add Roles dialog to be visible
 * 2. Extracts all table headers and builds a header-to-column index map
 * 3. Logs detected headers for debugging
 * 4. Iterates through each expected row:
 *    - Locates the corresponding row in the table
 *    - Waits for the row to be visible
 * 5. For each field in the row:
 *    - Maps the field name to the correct column index
 *    - Locates the corresponding cell
 *    - Extracts value from input field or cell text
 *    - Compares actual value with expected value
 *    - Throws an error if values do not match
 * 6. Logs validation success for each field
 * 7. Clicks the confirm button to finalize the dialog
 * 8. Waits briefly for UI stabilization
 *
 * @param expectedRows - Array of expected row objects containing:
 *   - rowIndex: index of the row in the table
 *   - values: key-value pairs of field names and expected values
 * @returns Promise<void>
 * 
 * Example usage:
 * await page.validateAddRolesRows([
 *   { rowIndex: 0, values: { 'BP Role': 'FLCU00', 'BP No': '10002345', 'BP Name': 'John Doe' } },
 *   { rowIndex: 1, values: { 'BP Role': 'FLCU01', 'BP No': '10002345', 'BP Name': 'John Doe' } }
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
      const actualValue =
        (await input.count()) > 0
          ? (await input.inputValue()).trim()
          : (await cellLocator.textContent())?.trim() || '';

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
 * 1. Locates the SAP application iframe using frameLocator
 * 2. Targets table rows excluding hidden rows using CSS selectors
 * 3. Counts all visible data rows in the table
 * 4. Logs the total row count for debugging
 * 5. Returns the row count
 *
 * @returns Number of visible data rows in the SAP table
 *
 * Example:
 * const rowCount = await getTableDataRowCount();
 */
async getTableDataRowCount(): Promise<number> {
  const frame = this.page.frameLocator('.sapUShellApplicationContainer iframe');
  const rows = frame.locator(
    'table[id^="__table"] tr.sapUiTableRow.sapUiTableContentRow:not(.sapUiTableRowHidden)'
  );

  const count = await rows.count();
  console.log(`SAP Data Rows: ${count}`);

  return count;
}

/**
 * Counts the number of visible data records in the SAP table.
 *
 * Steps:
 * 1. Locates the SAP application frame
 * 2. Waits for at least one table row to be visible
 * 3. Retrieves all row elements matching the SAP row selector
 * 4. Iterates through each row and checks its CSS class
 * 5. Excludes rows marked as hidden (sapUiTableRowHidden)
 * 6. Counts only visible data rows
 * 7. Returns the final count
 *
 * @returns Number of visible records in the table
 *
 * Example:
 * const recordCount = await getRecordsCount();
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
 * Validates a field across rows based on dynamic conditions and a reference mapping.
 *
 * Steps:
 * 1. Retrieves the total number of rows from the table
 * 2. Extracts relevant row data including:
 *    - key field
 *    - target field
 *    - all condition fields
 * 3. Iterates through each row:
 *    - Checks if the row satisfies all given conditions
 * 4. For matching rows:
 *    - Retrieves the key field value (e.g., BP number)
 *    - Looks up the expected value from the captured map
 *    - Compares actual target field value with expected value
 * 5. Logs successful validations
 * 6. Throws an error if no rows match the provided conditions
 *
 * @param capturedMap - Mapping of keyField values to expected targetField values
 * @param conditions - Key-value pairs that define filtering conditions for rows
 * @param keyField - Field used as the lookup key (e.g., "BP No")
 * @param targetField - Field whose value needs to be validated
 * @returns Promise<void>
 *
 * Example:
 * await validateCrossViewFieldWithCondition(
 *   bpAccountGroupMap,
 *   { 'Name1': 'BP Test2' },
 *   'BP No',
 *   'Customer Account Grp'
 * );
 */
async validateCrossViewFieldWithCondition(capturedMap: Record<string, string>,conditions: Record<string, string>,
  keyField: string,targetField: string): Promise<void> {

  logger.info(`Validating field "${targetField}" with conditions ${JSON.stringify(conditions)} using mapping on key "${keyField}"`);  
  const rowCount = await this.locators.tableRows.count();
  const rowsData = await this.getRowsData(rowCount, [keyField, targetField, ...Object.keys(conditions)]);

  let matched = false;

  rowsData.forEach((row, index) => {

    // Check condition(s)
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
 * Validates conditional field rules across row data.
 *
 * Steps:
 * 1. Iterates through each row in the provided dataset
 * 2. Checks if all specified conditions match the row
 * 3. Skips rows that do not satisfy the conditions
 * 4. For matching rows:
 *    - Iterates through expected fields
 *    - Compares actual values against expected values
 *    - Treats "No Value" as an empty string
 * 5. Asserts that each expected field matches the actual value
 * 6. Logs successful validations for each rule
 *
 * @param rowsData - Array of row objects containing field-value pairs
 * @param conditions - Key-value pairs that define when the rule applies
 * @param expectedFields - Key-value pairs of fields and their expected values
 * @returns Promise<void>
 *
 * Example:
 * await validateConditionalFieldRule(
 *   addressRowsDataFromUITask100,
 * { 'Region': 'SHR' },
 * { 'Country Key': 'GB' });
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

//After Excel changes

/**
 * Selects a value from a dropdown field within a specific table row.
 *
 * Steps:
 * 1. Locates the target cell using row index and field name
 * 2. Scrolls the cell into view if needed
 * 3. Clicks the cell to activate the dropdown/input
 * 4. Locates the dropdown input inside the cell
 * 5. Fills the input with the provided value
 * 6. Presses Enter to confirm selection (SAP Fiori behavior)
 *
 * @param rowIndex - Index of the row in the table (0-based)
 * @param fieldName - Name of the field/column
 * @param value - Value to select from the dropdown
 * @returns Promise<void>
 *
 * Example:
 * await selectDropdownByField(0, 'Country', 'Germany');
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
 * Selects a value using the SAP Value Help (F4) dialog for a specific table field.
 *
 * Steps:
 * 1. Determines the column index for the given field name
 * 2. Locates and clicks the value help (F4) icon in the target cell
 * 3. Waits for the value help dialog to appear
 * 4. Enters the search value into the dialog's search box
 * 5. Waits briefly for search results to update
 * 6. Selects the matching row from the dialog
 * 7. Closes the dialog
 *
 * @param rowIndex - Index of the row in the table (0-based)
 * @param fieldName - Name of the field/column
 * @param value - Value to search and select from the value help dialog
 * @returns Promise<void>
 *
 * Example:
 * await selectViaValueHelp(0, 'Customer', 'ABC Corp');
 */
async selectViaValueHelp(rowIndex: number, fieldName: string, value: string) {

  const colIndex = await this.getColumnIndex(fieldName);
  const icon = this.locators.getValueHelpIcon(rowIndex, colIndex);
  await icon.waitFor({ state: 'visible' });
  await icon.click();
  await this.locators.valueHelpDialog.waitFor({ state: 'visible' });
  // Search inside dialog
  const searchBox = this.page.getByRole('searchbox');
  await searchBox.fill(value);
  await this.page.waitForTimeout(500);
  // Select row
  const row = this.locators.valueHelpDialogRows.filter({ hasText: value }).first();
  await row.click();
  // Close dialog if needed
  await this.locators.closeDialogButton.click();
}

/**
 * Executes data entry dynamically based on row data and action mapping.
 *
 * Steps:
 * 1. Iterates through each row in the provided dataset
 * 2. For each field in the row:
 *    - Retrieves the value
 *    - Determines the action type from actionMap (defaults to 'input')
 * 3. Skips empty values
 * 4. Executes field actions based on type:
 *    - input: enters text into the field
 *    - dropdown: selects value from dropdown
 *    - search/valuehelp: selects value using Value Help dialog
 * 5. Falls back to input if action is unknown
 * 6. Wraps each field action in try-catch to prevent one failure from stopping execution
 * 7. Logs warnings for skipped fields or unknown actions
 *
 * @param rowsData - Array of row objects containing field-value pairs
 * @param actionMap - Mapping of field names to action types (input, dropdown, valuehelp, etc.)
 * @returns Promise<void>
 *
 * Example:
 * await executeDynamicData(rowsData, {
 *   Country: 'dropdown',
 *   Customer: 'valuehelp',
 *   Name: 'input'
 * });
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


////////Add loggers form here
/**
 * Validates Add Roles dialog data against expected validation rows derived from Excel.
 *
 * Steps:
 * 1. Logs incoming validation rows for debugging
 * 2. Groups expected validation rows by BP identifier (e.g., $1, $2)
 * 3. Iterates through each record in the UI:
 *    - Retrieves BP No and BP Name from UI data
 *    - Validates BP No is present
 * 4. Selects the corresponding row and opens the Add Roles dialog
 * 5. Matches expected validation data using a placeholder key (e.g., "$1")
 * 6. Throws an error if no expected data is found for the BP
 * 7. Transforms expected rows into the format required by dialog validation
 * 8. Validates the Add Roles dialog using validateAddRolesDialogRows
 *
 * @param rowCount - Number of BP records to validate
 * @param bpRowsData - Data extracted from UI containing BP numbers
 * @param bPRowInputData - Input dataset containing BP names
 * @param validationRows - Expected validation rows from Excel
 * @returns Promise<void>
 *
 * Example:
 * await validateAddRolesFromExcel(
 *   2,
 *   bpRowsData,
 *   bPRowInputData,
 *   validationRows
 * );
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

  if (text.toLowerCase().includes('creator')) {
    return 'CR';
  }

  return null;
}


/**
 * Executes a workflow action based on the task configuration.
 *
 * Steps:
 * 1. Extracts the raw action string from the task
 * 2. Splits the action into:
 *    - action type
 *    - optional parameters
 * 3. Normalizes the action to lowercase for consistent handling
 * 4. Logs the action being executed
 * 5. Routes execution based on action type:
 *    - save → completes the task
 *    - approve → approves the task
 *    - reject → executes rejection flow with parameters
 *    - review → executes review flow
 * 6. Throws an error for unknown or unsupported actions
 *
 * @param task - Task object containing the workflow action definition
 * @returns Promise<void>
 *
 * Example:
 * await executeWorkflowAction({
 *   action: 'reject|reason=Incorrect Data|step=Step 200'
 * });
 */
async executeWorkflowAction(task: Task): Promise<string | null> {

  const actionRaw = task.action;
  const [action, ...params] = actionRaw.split('|');

  const normalizedAction = action.toLowerCase();

  console.log(`Executing action: ${actionRaw}`);

  await this.clickStatusComplete();
  await this.page.waitForTimeout(2000);
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
      return await this.RejectTask(params);
      break;

    case 'review':
      await this.ReviewTask(); // or custom if needed
      return null;
      break;

    default:
      throw new Error(`Unknown workflow action: ${actionRaw}`);
  }
}


async  handleWorkflowAction(myTasklistPage: MyTasklistPage,requestNumber: string,task: Task,tasks: Task[]): Promise<void> {

  const rejectedToStep = await this.executeWorkflowAction(task);

  // Only for reject
  if (rejectedToStep) {
    console.log(`Validating rejected step: ${rejectedToStep}`);
    myTasklistPage.resetExecutionFromStep(rejectedToStep);
    myTasklistPage.reAddTask(tasks, rejectedToStep);
    await myTasklistPage.validateTaskPresentByStep(requestNumber, rejectedToStep);
  }
}

}