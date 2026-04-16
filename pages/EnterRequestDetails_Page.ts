import { Page, Locator } from '@playwright/test';
import BasePage from './Base_Page';
import { enterRequestDetailsLocators } from '@locators/EnterRequestDetails_locators';

export class EnterRequestDetailsPage extends BasePage {

  private locators;

   /**
   * Initializes page and locators.
   * 
   * @param page - Playwright Page instance
   */
  constructor(page: Page) {
    super(page);
    this.locators = enterRequestDetailsLocators(page);
  }

  /**
   * Generic reusable dropdown selector.
   * 
   * Steps:
   * 1. Waits for dropdown to be visible
   * 2. Clicks dropdown to open options
   * 3. Waits for specific option to appear
   * 4. Clicks desired option
   * 
   * @param dropdown - Locator for dropdown field
   * @param optionText - Visible text of option to select
   */
  private async selectFromDropdown(dropdown: Locator,optionText: string): Promise<void> {
    await this.waitForVisible(dropdown);
    await this.click(dropdown);
    const option = this.locators.dropdownOption(optionText);
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  /**
   * Enters request details into the SAP form fields.
   *
   * Steps:
   * 1. Wait for the CR Description field to be visible.
   * 2. Clear any existing value in the CR Description field.
   * 3. Fill in the CR Description using the provided data.
   * 4. Select the appropriate option from the Reason Code dropdown.
   * 5. Select the appropriate option from the Org. Division dropdown.
   * 6. Select the appropriate option from the Priority dropdown.
   * 7. Click on the Expected Completion Date field (date input interaction placeholder).
   *
   * @param data Key-value pairs containing request details:
   *  - 'CR Description': Description text for the request.
   *  - 'Reason Code': Dropdown value for reason code.
   *  - 'Org. Division': Dropdown value for organizational division.
   *  - 'Priority': Dropdown value for priority level.
   *
   * @returns Promise<void>
   *
   * Example:
   * await page.enterRequestDetails({
   *   'CR Description': 'System enhancement',
   *   'Reason Code': 'Business Requirement',
   *   'Org. Division': 'IT',
   *   'Priority': 'High'
   * });
   */
  async enterRequestDetails(data: Record<string, string>): Promise<void> {

    /* ---- CR Description ---- */
    await this.waitForVisible(this.locators.crDescription);
    await this.clearField(this.locators.crDescription);
    await this.fill(this.locators.crDescription, data['CR Description']);

    await this.selectFromDropdown(this.locators.reasonCodeDropdown,data['Reason Code']);
    await this.selectFromDropdown(this.locators.orgDivisionDropdown,data['Org. Division']);
    await this.selectFromDropdown(this.locators.priorityDropdown,data['Priority']);

    /* ---- Expected Completion Date ---- */
    // await this.clearField(this.locators.expectedCompletionDate);
    // await this.fill(this.locators.expectedCompletionDate, data['Expected Completion Date']);
    // await this.pressKey(this.locators.expectedCompletionDate, 'Enter');
     await this.click(this.locators.expectedCompletionDate);
  }
 
  /**
   * Clicks the "Previous" button.
   * 
   * Used for navigating back to the previous step in the workflow.
   */
  async clickPrevious(): Promise<void> {
    await this.waitForVisible(this.locators.previousButton);
    await this.click(this.locators.previousButton);
  }

  /**
   * Clicks the "Next" button.
   * 
   * Used to proceed to the next step in the workflow.
   */
  async clickNext(): Promise<void> {
    await this.waitForVisible(this.locators.nextButton);
    await this.click(this.locators.nextButton);
  }

   /**
   * Clicks the "Confirm" button.
   * 
   * Typically used to finalize or submit the request.
   */
  async clickConfirm(): Promise<void> {
    await this.page.waitForTimeout(1000)
    await this.waitForVisible(this.locators.confirmButton);
    await this.click(this.locators.confirmButton);
    await this.page.waitForTimeout(5000);
    await this.waitForPageLoad();
  }

  /**
   * Enters request details into the UI using Excel row data and field configuration.
   *
   * Steps:
   * 1. Extracts readonly fields and action mappings from fieldConfig
   * 2. Retrieves locator mappings for all fields
   * 3. Iterates through each field in the row data
   * 4. Skips fields that are empty or marked as readonly
   * 5. Resolves the corresponding locator and action for each field
   * 6. Logs a warning if no locator is found
   * 7. Performs action based on field type:
   *    - input: fills text or handles special fields (e.g., date picker)
   *    - dropdown: selects value from dropdown
   * 8. Adds small wait after each interaction for UI stability
   * 9. Logs warning for unknown actions
   *
   * @param rowData - Object containing field-value pairs from Excel
   * @param fieldConfig - Configuration object with readonlyFields and actionMap
   * @returns Promise<void>
   *
   * Example:
   * await enterRequestDetailsFromExcel(rowData, fieldConfig);
   */
  async enterRequestDetailsFromExcel(rowData: Record<string, string>,fieldConfig: any): Promise<void> {

    const { readonlyFields = [], actionMap = {} } = fieldConfig;
    const locatorsMap = this.locators.getLocatorsMap();
    for (const field in rowData) {
      const value = rowData[field];
      if (!value || readonlyFields.includes(field)) continue;
      const locator = locatorsMap[field];
      const action = actionMap[field];
      if (!locator) {
        console.warn(`No locator for field: ${field}`);
        continue;
      }

      switch (action) {
        case 'input':
          if (field === 'Expected Completion Date') {
            // await this.page.waitForTimeout(2000)
            // const dateValue = value || this.getFutureDate(2);
            // await this.fill(locator, dateValue);
            await this.click(this.locators.expectedCompletionDate);
          } else {
            await this.fill(locator, value);
            // await this.page.waitForTimeout(1000)
          }
          break;

        case 'dropdown':
          await this.selectFromDropdown(locator, value);
          // await this.page.waitForTimeout(1000)
          break;

        default:
          console.warn(`Unknown action for field: ${field}`);
      }
    }
  }






  
}