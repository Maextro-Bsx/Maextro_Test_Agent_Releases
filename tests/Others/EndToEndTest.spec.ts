import { test } from '@playwright/test';
import { LoginPage } from '@pages/Login_Page';
import { HomePage } from '@pages/Home_Page';
import { ChooseTemplatePage } from '@pages/ChooseTemplate_Page';
import { EnterRequestDetailsPage } from '@pages/EnterRequestDetails_Page';
import { RequestDetailsFieldsPage } from '@pages/RequestDetailsFields_Page';
import { env } from '@utils/env';
import { MyTasklistPage } from '@pages/MyTasklist_Page';

test('End-to-End Request Creation and Material Entry', async ({ page }) => {

  // ----------------------
  // Step 1: Login to Application
  // ----------------------
  const loginPage = new LoginPage(page);
  await loginPage.goto(env.baseURL);
  await loginPage.login(env.username, env.password);

  // ----------------------
  // Step 2: Navigate to Create Request
  // ----------------------
  const homePage = new HomePage(page);
//   await homePage.navigateTo('createRequest');

//   // ----------------------
//   // Step 3: Choose Template
//   // ----------------------
//   const chooseTemplatePage = new ChooseTemplatePage(page);
//   await chooseTemplatePage.searchAndSelectTemplate('AT Testing');

//   // ----------------------
//   // Step 4: Enter Request Details
//   // ----------------------
//   const enterRequestDetailsPage = new EnterRequestDetailsPage(page);
// //   const today = new Date();
// //   const formattedDate = today.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });

//   await enterRequestDetailsPage.enterRequestDetails(
//     'Test CR Description',        // CR Description
//     'Create New Material',        // Reason Code
//     'BSX RDS Division',           // Org Division
//     'Low',                        // Priority
//     //formattedDate                 // Expected Completion Date
//   );

//   // ----------------------
//   // Step 5: Confirm Request
//   // ----------------------
//   await enterRequestDetailsPage.clickConfirm();

//   // ----------------------
//   // Step 6: Enter Material Table Data
//   // ----------------------
  const requestDetailsFields = new RequestDetailsFieldsPage(page);

//   // Data for a single row
//   const materialRowData = {
//     'Material': 'TEST12',
//     'Industry sector': 'F',
//     'Material Description': 'Test',
//     'Lab/Office': '001',
//     'Net Weight': '1',
//     'Weight Unit': 'KG',
//     'Gross Weight': '1'
//   };


//   // Enter values in all fields dynamically
//   await requestDetailsFields.enterRowData(0, materialRowData);

//   // ----------------------
//   // Step 7: Get values from non-editable fields
//   // ----------------------
//   const fieldsToGet = ['Material Type', 'UOM'];
//   const resultData = await requestDetailsFields.getRowData(0, fieldsToGet);

//   console.log('Material Type:', resultData['Material Type']);
//   console.log('UOM:', resultData['UOM']);


// // ----------------------
// // Step 8: Status Complete → Submit Task → Save → Confirm and Capture Request Number
// // ----------------------
// const requestNumber = await requestDetailsFields.submitCreateRequestAndCaptureNumber();
const requestNumber ='37254' ;
// ----------------------
// Step 9: Navigate to My Task List and search with request
// ----------------------
await homePage.navigateTo('myTaskList');
const myTasklistPage = new MyTasklistPage(page);
await myTasklistPage.searchTask(requestNumber);

// // ----------------------
// // Step 10: Validate Step and Status 
// // ----------------------
// await myTasklistPage.validateStepAndStatus('Step 100','Ready to process');

// // ----------------------
// // Step 11: Open Task and complete the Step 100
// // ----------------------
// await myTasklistPage.clickTaskByRequestNumber(requestNumber);
// await requestDetailsFields.completeStep100Task();

// ----------------------
// Step 12: Validate Step and Status 
// ----------------------
// await myTasklistPage.validateStepAndStatus('Step 200','Ready to process');

// // ----------------------
// // Step 13: Open Task and Reject the Step 200
// // ----------------------
// await myTasklistPage.clickTaskByRequestNumber(requestNumber);
// await requestDetailsFields.rejectStep200Task(requestNumber,'0000000100','Incorrect data','Material data Selection - Material data Selection','Please review the data');

// // ----------------------
// // Step 14: Validate Step and Status 
// // ----------------------
// await myTasklistPage.validateStepAndStatus('Step 100','Ready to process');

// ----------------------
// Step 15: Open Task and complete the Step 100
// // ----------------------
// await myTasklistPage.clickTaskByRequestNumber(requestNumber);
// await requestDetailsFields.completeStep100Task();

// // ----------------------
// // Step 16: Validate Step and Status 
// // ----------------------
// await myTasklistPage.validateStepAndStatus('Step 200','Ready to process');

// ----------------------
// Step 17: Open Task and approve the Step 200
// // ----------------------
// await myTasklistPage.clickTaskByRequestNumber(requestNumber);
// await requestDetailsFields.approveStep200Task();

// ----------------------
// Step 16: Validate No Data 
// ----------------------
await myTasklistPage.validateNoData()




});