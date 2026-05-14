import { test } from "@playwright/test";
import { BrowserRecorder } from "../../pages/Recorder/BrowserRecorder";
import { LoginPage } from "../../pages/Login_Page";

test("TC_TemplateRecorder", async ({page,context}) => {
  
  
  const targetUrl = process.env.RECORD_URL || "";
  const username = process.env.RECORD_USERNAME || "";
  const password = process.env.RECORD_PASSWORD || "";

  if (!targetUrl) {
    throw new Error("RECORD_URL is missing");
  }

 if (!username || !password) {
    throw new Error("Recorder username/password missing");
  }

  const loginPage = new LoginPage(page);

  console.log(`
    ====================================
    TEMPLATE RECORDER MODE STARTED
    ====================================
    Environment URL: ${targetUrl}
    ====================================
    `);

  /**
   * STEP 1 — Login automatically
   */
  await loginPage.goto(targetUrl);
  await loginPage.login(username, password);

  // await page.goto("https://shs-dev-x8j4td6e.launchpad.cfapps.eu10.hana.ondemand.com/site/Dev?sap-ushell-config=headerless#Maextro-Display?sap-ui-app-id-hint=saas_approuter_bsxc.maextrohubui&/Dashboard");
  await page.waitForSelector(".sapUShellApplicationContainer", {timeout: 60000})
  const appFrame = page.frameLocator(".sapUShellApplicationContainer");

  // ✅ wait until SAP UI content actually renders
  await appFrame.locator("body").waitFor({ state: "visible", timeout: 60000 });

  // ✅ give SAP UI5 time to stabilize
  await page.waitForTimeout(3000);
  await BrowserRecorder.start(page);
  console.log(`
    ====================================
    TEMPLATE RECORDER MODE STARTED
    ====================================
    Please:
    1. Logged in already → Now perform the workflow you want to record as a template
    2. Open template workflow
    3. Perform all actions manually
    4. Fill fields normally
    5. Click Status Complete normally
    When finished: Just CLOSE THE BROWSER WINDOW
    JSON will save automatically and generates Excel template
    ====================================
    `);

  /**
   * IMPORTANT:
   * Wait for full browser context close
   * instead of page close
   */
  await page.waitForEvent("close").catch(() => {});

  BrowserRecorder.save();

  console.log(`
====================================
 TEMPLATE RECORDER SAVED
====================================
`);
});