import { test, expect } from '@playwright/test';
import { LoginPage } from '@pages/Login_Page';
import { HomePage } from '@pages/Home_Page';
import { ChooseTemplatePage } from '@pages/ChooseTemplate_Page';
import { EnterRequestDetailsPage } from '@pages/EnterRequestDetails_Page';
import { RequestDetailsFieldsPage } from '@pages/RequestDetailsFields_Page';
import { env } from '@utils/env';
import { MyTasklistPage } from '@pages/MyTasklist_Page';
import { ExcelParser } from '@utils/excelParser';
import { FieldConfigProcessor } from '@utils/fieldConfigProcessor';
import { filterRowData } from '@utils/dataFilter';
import { TaskTransformer,Task } from '@utils/taskTransformer';

test('End-to-End Request Creation and Material Entry', async ({ page }) => {


  const excelPath = 'test-data/testData.xlsx';
  const { validationRows } = ExcelParser.parseSheet(excelPath, "Request");
  const tasks: Task[] = TaskTransformer.buildTaskMatrix(validationRows);

    // ----------------------
  // Login
  // ----------------------
  const loginPage = new LoginPage(page);
  await loginPage.goto(env.baseURL);
  await loginPage.login(env.username, env.password);

  // ----------------------
  // Navigate to Create request page
  // ----------------------
  const homePage = new HomePage(page);
  await homePage.navigateTo('createRequest');

  // // ----------------------
  // // Select Template
  // // ----------------------
  // const chooseTemplatePage = new ChooseTemplatePage(page);
  // await chooseTemplatePage.searchAndSelectTemplate('Automation testing BP');

  // // ----------------------
  // // Enter Request details from Excel and confirm
  // // ----------------------
  // const enterRequestDetailsPage = new EnterRequestDetailsPage(page);
  // const crSheet = ExcelParser.parseSheet(excelPath, 'Request');
  // const crConfig = FieldConfigProcessor.process(crSheet.fieldConfig);
  // console.log(crConfig);
  // const crRows = filterRowData(crSheet.rowsData, crSheet.fieldConfig);
  // console.log(crRows)
  // await enterRequestDetailsPage.enterRequestDetailsFromExcel(crRows[0],crConfig);
  // await enterRequestDetailsPage.clickConfirm();



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
  await homePage.navigateTo('createRequest');

  // ----------------------
  // Step 3: Choose Template
  // ----------------------
  const chooseTemplatePage = new ChooseTemplatePage(page);
  await chooseTemplatePage.searchAndSelectTemplate('AT Testing');

  // ----------------------
  // Step 4: Enter Request Details
  // ----------------------
  const enterRequestDetailsPage = new EnterRequestDetailsPage(page);
  const crSheet = ExcelParser.parseSheet(excelPath, 'Request');
  const crConfig = FieldConfigProcessor.process(crSheet.fieldConfig);
  console.log(crConfig);
  const crRows = filterRowData(crSheet.rowsData, crSheet.fieldConfig);
  console.log(crRows)
  await enterRequestDetailsPage.enterRequestDetailsFromExcel(crRows[0],crConfig);
  await enterRequestDetailsPage.clickConfirm();





  await enterRequestDetailsPage.enterRequestDetails(
    'Test CR Description',        // CR Description
    'Create New Material',        // Reason Code
    'BSX RDS Division',           // Org Division
    'Low',                        // Priority
    //formattedDate                 // Expected Completion Date
  );

  // ----------------------
  // Step 5: Confirm Request
  // ----------------------
  await enterRequestDetailsPage.clickConfirm();

  // ----------------------
  // Step 6: Enter Material Table Data
  // ----------------------
  const requestDetailsFields = new RequestDetailsFieldsPage(page);

  // Data for a single row
  const materialRowData = {
    'Material': 'TEST12',
    'Industry sector': 'F',
    'Material Description': 'Test',
    'Lab/Office': '001',
    'Net Weight': '1',
    'Weight Unit': 'KG',
    'Gross Weight': '1'
  };


  // Enter values in all fields dynamically
  await requestDetailsFields.enterRowData(0, materialRowData);

  // ----------------------
  // Step 7: Get values from default fields and validate
  // ----------------------
  const fieldsToGet = ['Material Type', 'UOM'];
  const resultData = await requestDetailsFields.getRowData(0, fieldsToGet);
  console.log('Material Type:', resultData['Material Type']);
  console.log('UOM:', resultData['UOM']);
  expect(resultData).toMatchObject({'Material Type': 'FERT','UOM': 'EA',});

// ----------------------
// Step 8: Status Complete → Submit Task → Save → Confirm and Capture Request Number
// ----------------------
const requestNumber = await requestDetailsFields.submitCreateRequestAndCaptureNumber();

// ----------------------
// Step 9: Navigate to My Task List and search with request
// ----------------------
await homePage.navigateTo('myTaskList');
const myTasklistPage = new MyTasklistPage(page);
await myTasklistPage.searchTask(requestNumber);

// ----------------------
// Step 10: Validate Step and Status 
// ----------------------
await myTasklistPage.validateStepAndStatus('Step 100','Ready to process');

// ----------------------
// Step 11: Open Task and complete the Step 100
// ----------------------
await myTasklistPage.clickTaskByRequestNumber(requestNumber);
await requestDetailsFields.completeStep100Task();

//----------------------
//Step 12: Validate Step and Status 
//----------------------
await myTasklistPage.validateStepAndStatus('Step 200','Ready to process');

//----------------------
//Step 17: Open Task and approve the Step 200
// ----------------------
await myTasklistPage.clickTaskByRequestNumber(requestNumber);
await requestDetailsFields.approveStep200Task();

// ----------------------
// Step 16: Validate No Data 
// ----------------------
await myTasklistPage.validateNoData()




});