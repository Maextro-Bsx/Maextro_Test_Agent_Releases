import { Page, Locator } from '@playwright/test';

/**
 * BasePage
 * 
 * Core reusable wrapper for Playwright actions.
 * 
 * Provides:
 * - Navigation helpers
 * - Smart waits
 * - Element interaction wrappers
 * - Dropdown handling
 * - Checkbox & radio utilities
 * - Basic validation helpers
 * - Table handling
 * - Alert handling
 * - Scrolling utilities
 * - File upload support
 * 
 * All page objects should extend this class.
 */
export default class BasePage {
  protected page: Page;

  /**
   * Initializes BasePage with Playwright page instance.
   *
   * @param page - Playwright Page object
   */
  constructor(page: Page) {
    this.page = page;
  }

  /* =====================================================
     Navigation and Wait Helpers
  ===================================================== */

  /** Navigates to a specific URL. */
  async navigate(url: string) {
    await this.page.goto(url);
  }

  /** Reloads the current page. */
  async reloadPage() {
    await this.page.reload();
  }

  /**
   * Waits until page reaches 'networkidle' state.
   * Useful for SPAs and SAP Fiori apps.
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Waits until URL contains given value.
   *
   * @param urlPart - Partial URL text
   */
  async waitForURL(urlPart: string) {
    await this.page.waitForURL(`**${urlPart}**`);
  }

  /**
   * Waits for locator to become visible.
   */
  async waitForVisible(locator: Locator) {
    await locator.waitFor({ state: 'visible' });
  }

  /**
   * Waits for locator to become hidden.
   */
  async waitForHidden(locator: Locator) {
    await locator.waitFor({ state: 'hidden' });
  }

  /**
   * Waits until current URL contains specified text.
   */
  async waitForURLContains(text: string) {
    await this.page.waitForURL(`**${text}**`);
  }

  /**
   * Waits for the loader to disappear (i.e., become hidden).
   *
   * Steps:
   * 1. Locate the loader element using its CSS classes and attributes.
   * 2. Wait for the loader to become hidden with a timeout of 20 seconds.
   * 3. If the loader does not exist or does not disappear within the timeout, the error is ignored.
   *
   * @returns Promise<void>
   *
   * Example:
   * await page.waitForLoaderToDisappear();
  */
  async waitForLoaderToDisappear(): Promise<void> {
    const loader = this.page.locator('.sapUiLocalBusyIndicator, [aria-busy="true"]');
    try {
      await loader.waitFor({ state: 'hidden', timeout: 20000 });
    } catch {
      // Ignore if loader does not exist
    }
  }

  /**
   * Waits for the SAP UI5 page to be fully ready for interaction.
   *
   * Steps:
   * 1. Wait for the DOM content to be fully loaded.
   * 2. Locate the SAP UI5 busy indicator element.
   * 3. Check if the busy indicator exists on the page.
   * 4. If present, wait for the busy indicator to become hidden.
   * 5. Add a short delay to allow UI rendering to stabilize.
   *
   * @returns Promise<void>
   *
   * Example:
   * await page.waitForSAPPageReady();
   */
  async waitForSAPPageReady() {
    await this.page.waitForLoadState('domcontentloaded');
    const busyIndicator = this.page.locator('.sapUiLocalBusyIndicator');
    if (await busyIndicator.count() > 0) {
      await busyIndicator.first().waitFor({ state: 'hidden' });
    }
    await this.page.waitForTimeout(300);
  }

  /**
   * Waits for the SAP global loader to disappear (i.e., become hidden).
   */
  async waitForSAPLoader() {
    const loader = this.page.locator('#sap-ui-static img');
    await loader.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
  }

  /**
   * Waits for a SAP Fiori view to be fully ready for interaction.
   *
   * Steps:
   * 1. Wait for any global loader to disappear.
   * 2. Wait for the DOM content to be fully loaded.
   * 3. If `waitForStep` is enabled:
   *    a. Locate the step indicator element containing text like "Step X".
   *    b. Wait for the step indicator to become visible.
   * 4. If `waitForTable` is enabled:
   *    a. Locate the table element with role="grid".
   *    b. Wait for the table to become visible.
   *    c. Locate the table header cells and wait for the first header to be visible.
   * 5. Apply a short delay to allow UI rendering to stabilize.
   *
   * @param options Optional configuration object:
   *  - waitForStep?: Waits for a step indicator (e.g., "Step 1") to appear.
   *  - waitForTable?: Waits for a table and its headers to be visible.
   *  - timeout?: Custom timeout for waits (default: 20000 ms).
   *
   * @returns Promise<void>
   *
   * Example:
   * await page.waitForFioriViewReady({ waitForStep: true, waitForTable: true });
   */
  async waitForFioriViewReady(options?: {waitForStep?: boolean; waitForTable?: boolean;timeout?: number;}): Promise<void> {
    const timeout = options?.timeout ?? 20000;
    await this.waitForLoaderToDisappear();
    await this.page.waitForLoadState('domcontentloaded');
    if (options?.waitForStep) {
      const step = this.page.locator('div.sapMLabelInner bdi').filter({ hasText: /Step\s*\d+/i }).first();
      await step.waitFor({ state: 'visible', timeout });
    }
    if (options?.waitForTable) {
      const table = this.page.locator('[role="grid"]');
      await table.waitFor({ state: 'visible', timeout });
      const header = table.locator('td[role="columnheader"] bdi');
      await header.first().waitFor({ state: 'visible', timeout });
    }
    await this.page.waitForTimeout(300);
  }

  /**
   * Safely waits for a locator to become visible with a fallback retry strategy.
   *
   * Steps:
   * 1. Attempt to wait for the locator to become visible within the given timeout.
   * 2. If the first attempt fails:
   *    a. Wait for the page network activity to become idle.
   *    b. Retry waiting for the locator to become visible.
   * 3. Ensures improved stability for dynamic or slow-loading SAP UI elements.
   *
   * @param locator The Playwright locator to wait for.
   * @param timeout Maximum time to wait for the locator in milliseconds (default: 30000ms).
   *
   * @returns Promise<void>
   *
   * Example:
   * await page.waitForLocatorSafe(page.locator('#submitButton'));
   */
  async waitForLocatorSafe(locator: Locator, timeout = 30000): Promise<void> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
    } catch {
      await this.page.waitForLoadState('networkidle');
      await locator.waitFor({ state: 'visible', timeout });
    }
  }



  /* =====================================================
     Element Interaction Helpers
  ===================================================== */

  /** Clicks on an element. */
  async click(locator: Locator) {
    await locator.click();
  }

  /** Fills input field with value. */
  async fill(locator: Locator, value: string) {
    await locator.fill(value);
  }

  /** Types into input field (character by character). */
  async type(locator: Locator, value: string) {
    await locator.type(value);
  }

  /**
   * Retrieves text content from an element.
   *
   * @returns Element text or null
   */
  async getText(locator: Locator): Promise<string | null> {
    return await locator.textContent();
  }

  /** Double-clicks an element. */
  async doubleClick(locator: Locator) {
    await locator.dblclick();
  }

  /** Performs right-click on an element. */
  async rightClick(locator: Locator) {
    await locator.click({ button: 'right' });
  }

  /** Hovers over an element. */
  async hover(locator: Locator) {
    await locator.hover();
  }

  /**
   * Presses keyboard key on element.
   *
   * @param key - Key name (e.g., 'Enter', 'Tab')
   */
  async pressKey(locator: Locator, key: string) {
    await locator.press(key);
  }

  /** Clears input field value. */
  async clearField(locator: Locator) {
    await locator.fill('');
  }

  /* =====================================================
     Dropdown Handling
  ===================================================== */

  /**
   * Selects dropdown option by value attribute.
   */
  async selectDropdownByValue(locator: Locator, value: string) {
    await locator.selectOption({ value });
  }

  /**
   * Selects dropdown option by visible label.
   */
  async selectDropdownByLabel(locator: Locator, label: string) {
    await locator.selectOption({ label });
  }

  /* =====================================================
     Checkbox and Radio Handling
  ===================================================== */

  /** Checks a checkbox element. */
  async check(locator: Locator) {
    await locator.check();
  }

  /** Unchecks a checkbox element. */
  async uncheck(locator: Locator) {
    await locator.uncheck();
  }

  /** Selects a radio button. */
  async selectRadio(locator: Locator) {
    await locator.check();
  }

  /* =====================================================
     Assertion Helpers
  ===================================================== */

  /**
   * Verifies element contains expected text.
   * Throws error if validation fails.
   */
  async verifyTextContains(locator: Locator, expectedText: string) {
    const text = await locator.textContent();

    if (!text?.includes(expectedText)) {
      throw new Error(`Expected text "${expectedText}" not found`);
    }
  }

  /**
   * Verifies element is visible.
   * Throws error if not visible.
   */
  async verifyElementVisible(locator: Locator) {
    const visible = await locator.isVisible();

    if (!visible) {
      throw new Error(`Element is not visible`);
    }
  }

  /**
   * Returns visibility status of element.
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  /* =====================================================
     Table Handling
  ===================================================== */

  /**
   * Returns number of rows matching locator.
   */
  async getTableRowCount(locator: Locator) {
    return await locator.count();
  }

  /**
   * Clicks table row that contains specific text.
   */
  async clickTableRowByText(locator: Locator, text: string) {
    await locator.filter({ hasText: text }).click();
  }

  /* =====================================================
     Alert Handling
  ===================================================== */

  /** Automatically accepts browser alert dialog. */
  async acceptAlert() {
    this.page.on('dialog', async dialog => {
      await dialog.accept();
    });
  }

  /** Automatically dismisses browser alert dialog. */
  async dismissAlert() {
    this.page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
  }

  /* =====================================================
     Scroll Handling
  ===================================================== */

  /** Scrolls element into view if needed. */
  async scrollToElement(locator: Locator) {
    await locator.scrollIntoViewIfNeeded();
  }

  /** Scrolls to bottom of page. */
  async scrollToBottom() {
    await this.page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight)
    );
  }

  /* =====================================================
     File Upload
  ===================================================== */

  /**
   * Uploads file to input[type="file"] element.
   *
   * @param filePath - Absolute or relative file path
   */
  async uploadFile(locator: Locator, filePath: string) {
    await locator.setInputFiles(filePath);
  }

  /**
   * Selects an option from a SAP Fiori dropdown (ComboBox/List) within an iframe.
   *
   * Steps:
   * 1. Locate the SAP Fiori application iframe container.
   * 2. Scroll the dropdown element into view if needed.
   * 3. Click the dropdown to open the options list.
   * 4. Locate the currently visible listbox (ensuring the correct dropdown is targeted).
   * 5. Wait for the listbox to become visible.
   * 6. Find the option matching the provided text.
   * 7. Wait for the option to be visible and scroll it into view.
   * 8. Click the desired option.
   * 9. Add a short delay to allow UI updates after selection.
   *
   * @param dropdown The Playwright Locator representing the dropdown element.
   * @param optionText The visible text of the option to select.
   *
   * @returns Promise<void>
   *
   * Example:
   * await page.selectSAPFioriDropdown(page.locator('#myDropdown'), 'Option 1');
   */
  async selectSAPFioriDropdown(dropdown: Locator, optionText: string) {

    const frame = this.page.frameLocator('.sapUShellApplicationContainer');
    await dropdown.scrollIntoViewIfNeeded();
    await dropdown.click({ force: true });
    const listbox = frame.locator('ul[role="listbox"]:visible').last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const option = listbox.locator('li[role="option"]').filter({ hasText: optionText }).first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.scrollIntoViewIfNeeded();
    await option.click({ force: true });
    await this.page.waitForTimeout(500);
  }


// async selectSAPFioriDropdown(dropdown: Locator, optionText: string) {

//   const frame = this.page.frameLocator('.sapUShellApplicationContainer');

//   await dropdown.scrollIntoViewIfNeeded();
//   await dropdown.click({ force: true });

//   const listbox = frame.locator('ul[role="listbox"]:visible').last();
//   await listbox.waitFor({ state: 'visible', timeout: 10000 });

//   const options = listbox.locator('li[role="option"]');
//   const count = await options.count();

//   let found = false;

//   for (let i = 0; i < count; i++) {
//     const option = options.nth(i);
//     const text = (await option.innerText()).trim();

//     // ✅ PRIMARY: exact match
//     if (text === optionText) {
//       await option.click({ force: true });
//       found = true;
//       break;
//     }

//     // ✅ SECONDARY: starts with step number (best for your case)
//     if (text.startsWith(optionText)) {
//       await option.click({ force: true });
//       found = true;
//       break;
//     }
//   }

//   if (!found) {
//     throw new Error(`Dropdown option not found: ${optionText}`);
//   }

//   await this.page.waitForTimeout(500);
// }

  /**
   * Generates a future date string based on the current date.
   *
   * Steps:
   * 1. Create a new Date object representing the current date.
   * 2. Add the specified number of days to the current date.
   * 3. Format the updated date into a human-readable string (Month Day, Year).
   * 4. Return the formatted date string.
   *
   * @param daysToAdd Number of days to add to the current date.
   *
   * @returns string Formatted future date (e.g., "January 01, 2026").
   *
   * Example:
   * const date = page.getFutureDate(5);
   */
  getFutureDate(daysToAdd: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric'
    });
  }




































}