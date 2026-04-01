import { Page } from '@playwright/test';

export const loginLocators = (page: Page) => ({
 username: page.locator("#j_username"),
 password: page.locator('#j_password'),
 continue: page.locator('#logOnFormSubmit'),
 errorMessage: page.locator('.fn-message-strip__text'),

});