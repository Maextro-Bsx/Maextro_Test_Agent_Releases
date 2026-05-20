import { Page } from '@playwright/test';
import { loginLocators } from '@locators/Login_locators';
import BasePage from './Base_Page';


export class LoginPage extends BasePage {

  private locators;

  /**
   * Initializes page and locators.
   * 
   * @param page - Playwright Page instance
   */
  constructor(page: Page) {
    super(page);
    this.locators = loginLocators(page);
  }

  /**
   * Navigates to the given login URL
   * and waits until the page fully loads.
   * 
   * @param url - Application base URL or login URL
   */
  async goto(url: string) {
    await this.navigate(url);
    await this.waitForPageLoad();
  }

  /**
   * Performs login using provided credentials.
   * 
   * Steps:
   * - Enters username
   * - Enters password
   * - Clicks Continue / Login button
   * 
   * @param username - Valid or invalid username
   * @param password - Corresponding password
   */
  async login(username: string, password: string) {

    await this.fill(this.locators.username, username);
    await this.fill(this.locators.password, password);
    await this.click(this.locators.continue);
    // ✅ Check for login failure
    const isErrorVisible = await this.locators.errorMessage
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (isErrorVisible) {
      const errorMessage =
        await this.getErrorMessage();
      throw new Error(
        `Login failed: ${errorMessage}`
      );
    }
  }

  /**
   * Retrieves login error message text.
   * 
   * Waits for error message to appear before fetching text.
   * 
   * @returns Error message string if visible, otherwise null
   */
  async getErrorMessage(): Promise<string | null> {
    await this.waitForVisible(this.locators.errorMessage);
    return await this.getText(this.locators.errorMessage);
  }
}