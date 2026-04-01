import { Page } from '@playwright/test';
import { chooseTemplateLocators } from '@locators/ChooseTemplate_locators';
import BasePage from './Base_Page';


export class ChooseTemplatePage extends BasePage {

    private locators;
    
   /**
   * Initializes page and locators.
   * 
   * @param page - Playwright Page instance
   */
      constructor(page: Page) {
        super(page);
        this.locators = chooseTemplateLocators(page);
      }

/**
 * Searches for a template and selects it from the results.
 *
 * Steps:
 * 1. Enters search text
 * 2. Presses Enter
 * 3. Waits for results to appear
 * 4. Clicks the matching template
 *
 * @param templateName - Name of the template to search and select
 *
 * Example:
 * await chooseTemplate.searchAndSelectTemplate('AT Testing');
 */
async searchAndSelectTemplate(templateName: string): Promise<void> {

  /* ---- Clear and enter search text ----*/
  await this.waitForVisible(this.locators.searchInput);
  await this.clearField(this.locators.searchInput);
  await this.fill(this.locators.searchInput, templateName);

  /* ---- Press Enter ---- */ 
  await this.pressKey(this.locators.searchInput, 'Enter');

  /* ---- Wait for result template to appear ----*/
  const template = this.locators.templateByName(templateName);
  await this.waitForVisible(template);

  /* ---- Click template ----*/
  await this.click(template);
}
}