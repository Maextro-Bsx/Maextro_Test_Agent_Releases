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
  const loader = this.page.locator(
    '.sapUiLocalBusyIndicator, [aria-busy="true"]'
  );

  try {
    await loader.waitFor({ state: 'hidden', timeout: 20000 });
  } catch {
    // Ignore if loader does not exist
  }
}

async waitForSAPPageReady() {
  await this.page.waitForLoadState('networkidle');
  await this.page.locator('.sapUiLocalBusyIndicator').waitFor({ state: 'hidden' });
}

async waitForSAPLoader() {
  const loader = this.page.locator('#sap-ui-static img');
  await loader.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
}

async waitForFioriViewReady(options?: {
  waitForStep?: boolean;
  waitForTable?: boolean;
  timeout?: number;
}): Promise<void> {

  const timeout = options?.timeout ?? 20000;

  // 1️⃣ Wait for loader to disappear
  await this.waitForLoaderToDisappear();

  // 2️⃣ Wait for UI to stabilize
  await this.page.waitForLoadState('domcontentloaded');

  // 3️⃣ Optional: wait for Step label (used in task navigation)
  if (options?.waitForStep) {
    const step = this.page.locator('div.sapMLabelInner bdi').filter({ hasText: /Step\s*\d+/i }).first();
    await step.waitFor({ state: 'visible', timeout });
  }

  // 4️⃣ Optional: wait for table/grid (used in data validations)
  if (options?.waitForTable) {
    const table = this.page.locator('[role="grid"]');
    await table.waitFor({ state: 'visible', timeout });

    const header = table.locator('td[role="columnheader"] bdi');
    await header.first().waitFor({ state: 'visible', timeout });
  }

  // 5️⃣ Small stabilization delay (NOT arbitrary — post-render)
  await this.page.waitForTimeout(300);
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

async selectSAPFioriDropdown(dropdown: Locator, optionText: string) {

  const frame = this.page.frameLocator('.sapUShellApplicationContainer');

  await dropdown.scrollIntoViewIfNeeded();
  await dropdown.click({ force: true });

  // Wait for visible listbox (important!)
  const listbox = frame.locator('ul[role="listbox"]:visible').last();
  await listbox.waitFor({ state: 'visible', timeout: 10000 });

  const option = listbox
    .locator('li[role="option"]')
    .filter({ hasText: optionText })
    .first();

  await option.waitFor({ state: 'visible', timeout: 10000 });
  await option.scrollIntoViewIfNeeded();
  await option.click({ force: true });

  await this.page.waitForTimeout(500);
}


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