import { test, expect } from '@playwright/test';
import { LoginPage } from '@pages/Login_Page';
import { env } from '@utils/env';
import { HomePage } from '@pages/Home_Page';

test.describe('Maextro Login Tests', () => {
  let loginPage: LoginPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);
    await loginPage.goto(env.baseURL);
  });

  test('Valid login', async ({page}) => {
    await loginPage.login(env.username, env.password);
    
    await homePage.navigateTo('createRequest');
    
     
  });

});

