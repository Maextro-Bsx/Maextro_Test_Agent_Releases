import { Page } from '@playwright/test';
import { homeLocators } from '@locators/Home_locators';
import BasePage from './Base_Page';


export class HomePage extends BasePage {

  private locators;

  /**
   * Initializes page and locators.
   * 
   * @param page - Playwright Page instance
   */
  constructor(page: Page) {
    super(page);
    this.locators = homeLocators(page);
  }


/**
 * Dynamically navigates to a specified menu item by reloading the page and clicking the menu.
 *
 * Steps:
 * 1. Reload the page to ensure it's in a clean state.
 * 2. Wait for the page to reach a 'networkidle' state (i.e., all network activity has stopped).
 * 3. Retrieve the locator for the specified menu item.
 * 4. Click on the menu item.
 *
 * @param menu - The key of the menu item defined in homeLocators.
 *               Must match one of the locator property names
 *               (e.g., 'dashboard', 'createRequest', 'myTaskList').
 * @returns Promise<void>
 *
 * Example:
 * await page.navigateTo('myTaskList');
 */
async navigateTo(menu: keyof ReturnType<typeof homeLocators>): Promise<void> { 
  await this.page.waitForTimeout(5000)
  await this.page.reload();
  await this.waitForSAPLoader();
  // await this.page.waitForTimeout(5000)
  await this.page.locator('.sapUiBody').first().waitFor({ state: 'visible', timeout: 60000 });
  await this.locators[menu].click();
  await this.page.waitForTimeout(2000);
}



}