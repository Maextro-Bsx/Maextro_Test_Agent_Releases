import { test, expect } from '@playwright/test';
import { LoginPage } from '@pages/Login_Page';
import { HomePage } from '@pages/Home_Page';
import { ChooseTemplatePage } from '@pages/ChooseTemplate_Page';
import { EnterRequestDetailsPage } from '@pages/EnterRequestDetails_Page';
import { RequestDetailsFieldsPage } from '@pages/RequestDetailsFields_Page';
import { env } from '@utils/env';
import { MyTasklistPage } from '@pages/MyTasklist_Page';

test('Business Partner Request Creation', async ({ page }) => {

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
  await chooseTemplatePage.searchAndSelectTemplate('Automation testing BP');

  // ----------------------
  // Step 4: Enter Request Details
  // ----------------------
  const enterRequestDetailsPage = new EnterRequestDetailsPage(page);

  await enterRequestDetailsPage.enterRequestDetails(
    'Test BP Default Rule',        // CR Description
    'New customer',                // Reason Code
    'BSX RDS Division',           // Org Division
    'Low',                        // Priority
  );

  // ----------------------
  // Step 5: Confirm Request
  // ----------------------
  await enterRequestDetailsPage.clickConfirm();

  // ----------------------
  // Step 6: Enter Material Table Data
  // ----------------------
  const requestDetailsFields = new RequestDetailsFieldsPage(page);
  // ----------------------
  // Step 7: Validate mandatory Fields
  // ----------------------
  await requestDetailsFields.validateMandatoryFields(['BP Name']);

  // ----------------------
  // Step 8: Validate error for Mandatory fields
  // ----------------------
  const noOfRecordsCount = await requestDetailsFields.getRecordsCount();
  console.log('Number of Records',noOfRecordsCount)
  await requestDetailsFields.clickStatusComplete();
  await requestDetailsFields.validateErrorCount(2);
  await requestDetailsFields.validateMandatoryFieldErrorMessage(noOfRecordsCount,['BP Name']);

  // ----------------------
  // Step 9: Validate fields are in read only state
  // ----------------------
  await requestDetailsFields.validateFieldsReadOnly(noOfRecordsCount,['BP No','Account Group']);

  // ----------------------
  // Step 10: Validate values in the fields are auto populated 
  // ----------------------
  const bpRowsData = await requestDetailsFields.getRowsData(noOfRecordsCount, ['BP No', 'Account Group']);
  console.log('BP No 1:', bpRowsData[0]['BP No']);
  console.log('BP No 2:', bpRowsData[1]['BP No']);
  console.log('Account Group 1:', bpRowsData[0]['Account Group']);
  console.log('Account Group 2:', bpRowsData[1]['Account Group']);
  const bpExpectedData = [
    { 'BP No': '$1', 'Account Group': 'CUST' },
    { 'BP No': '$2', 'Account Group': 'CUST' },
  ];
  await requestDetailsFields.validateRowsData(bpRowsData, bpExpectedData);

  //Fetch Account group and map it with BP No and save
  const bpAccountGroupMap = await requestDetailsFields.captureFieldMapWithValues('BP No','Account Group');
  console.log('Map:',bpAccountGroupMap)
  // ----------------------
  // Step 10: Enter Values in fields
  // ----------------------
  // Data for 2 rows
  const bPRowInputData = [
    { 'BP Name': 'BP Test1' },
    { 'BP Name': 'BP Test2' },
  ];
  await requestDetailsFields.enterRowsData(noOfRecordsCount, bPRowInputData);

  // ----------------------
  // Step 10: Validate Role
  // ----------------------
  for (let i = 0; i < noOfRecordsCount; i++) {
    const bpNo = bpRowsData[i]['BP No'];
    const bpName = bPRowInputData[i]['BP Name']; 

    await requestDetailsFields.selectRowByBPAndClickAddRoles(bpNo);

    await requestDetailsFields.validateAddRolesDialogRows([
      { rowIndex: 0, values: { 'BP Role': 'FLCU00', 'BP No': bpNo, 'Name': bpName } },
      { rowIndex: 1, values: { 'BP Role': 'FLCU01', 'BP No': bpNo, 'Name': bpName } },
    ]);
  }

  // ----------------------
  // Step 10: Validate Readonly fields and mandatory fields in Customer company code
  // ----------------------
  await requestDetailsFields.clickStatusComplete();
  await page.waitForTimeout(5000);
  await requestDetailsFields.validateFieldsReadOnly(noOfRecordsCount,['Customer Number','Customer Acct. Grp','Name']);
  await requestDetailsFields.validateMandatoryFields(['Company Code']);
  await requestDetailsFields.clickStatusComplete();
  await requestDetailsFields.validateErrorCount(2);
  await requestDetailsFields.validateMandatoryFieldErrorMessage(noOfRecordsCount,['Company Code']);
  
  // ----------------------
  // Step 10: Validate values in the fields are auto populated 
  // ----------------------
  const ccRowsData = await requestDetailsFields.getRowsData(noOfRecordsCount, ['Customer Number','Customer Acct. Grp','Name']);
  const ccExpectedData = [
    {'Customer Number':'$1','Customer Acct. Grp': 'CUST','Name':'BP Test1'},
    {'Customer Number':'$2','Customer Acct. Grp': 'CUST','Name':'BP Test2'}
  ];
  await requestDetailsFields.validateRowsData(ccRowsData, ccExpectedData);

  // ----------------------
  // Step 10: Enter Values in fields
  // ----------------------
  // Data for 2 rows
  const ccRowInputData = [
    {'Company Code': '1000'},
    {'Company Code': '2000'},
  ];
  await requestDetailsFields.enterRowsData(noOfRecordsCount, ccRowInputData);

  // ----------------------
  // Step 10: Validate Readonly fields and mandatory fields in Customer Sales
  // ----------------------
  await requestDetailsFields.clickStatusComplete();
  await page.waitForTimeout(5000);
  await requestDetailsFields.validateFieldsReadOnly(noOfRecordsCount,['Customer Number','Acct group','Name']);
  await requestDetailsFields.validateMandatoryFields(['Sales Organization','Distribution Channel','Division']);
  await requestDetailsFields.clickStatusComplete();
  await requestDetailsFields.validateErrorCount(6);
  await requestDetailsFields.validateMandatoryFieldErrorMessage(noOfRecordsCount,['Sales Organization','Distribution Channel','Division']);
  // ----------------------
  // Step 10: Validate values in the fields are auto populated 
  // ----------------------
  const csRowsData = await requestDetailsFields.getRowsData(noOfRecordsCount, ['Customer Number','Acct group','Name']);
  const csExpectedData = [
    {'Customer Number':'$1','Acct group': 'CUST','Name':'BP Test1'},
    {'Customer Number':'$2','Acct group': 'CUST','Name':'BP Test2'}
  ];
  await requestDetailsFields.validateRowsData(csRowsData, csExpectedData);

  // ----------------------
  // Step 10: Enter Values in fields
  // ----------------------
  //Data for 2 rows
  const csRowInputData = [
      {'Sales Organization': '1000','Distribution Channel':'01','Division':'04'},
      {'Sales Organization': '2000','Distribution Channel':'10','Division':'05'},
    ];
    await requestDetailsFields.enterRowsData(noOfRecordsCount, csRowInputData);

  // ----------------------
  // Step 11: Status Complete → Submit Task → Save → Confirm and Capture Request Number
  // ----------------------
  const requestNumber = await requestDetailsFields.submitCreateRequestAndCaptureNumber();
  
// const requestNumber = '37972'

  // ----------------------
  // Step 12: Navigate to My Task List and search with request
  // ----------------------
  await homePage.navigateTo('myTaskList');
  const myTasklistPage = new MyTasklistPage(page);
  await myTasklistPage.searchTask(requestNumber);

  // ----------------------
  // Step 13: Validate Step and Status 
  // ----------------------
  await myTasklistPage.validateStepAndStatus('Step 100','Ready to process');

  // ----------------------
  // Step 14: Open Task 100
  // ----------------------
  await myTasklistPage.clickTaskByRequestNumber(requestNumber);

  // ----------------------
  // Step 9: Validate fields are in read only state
  // ----------------------
  await requestDetailsFields.validateFieldsReadOnly(noOfRecordsCount,['BP No','Account Group','BP Name']);

  // ----------------------
  // Step 10: Validate values in the fields are auto populated 
  // ----------------------
  const bpRowsDataTask100 = await requestDetailsFields.getRowsData(noOfRecordsCount, ['BP No','Account Group','BP Name']);
  const bpExpectedDataTask100 = [
    {'BP No':'$1','Account Group': 'CUST','BP Name':'BP Test1'},
    {'BP No':'$2','Account Group': 'CUST','BP Name':'BP Test2'}
  ];
  await requestDetailsFields.validateRowsData(bpRowsDataTask100, bpExpectedDataTask100);

  // ----------------------
  // Step 9: Status complete
  // ----------------------
  await requestDetailsFields.clickStatusComplete();
  console.log("clicked on status complete")
  await page.waitForTimeout(3000);
  await page.waitForLoadState;

  // ----------------------
  // Step 9: Validate fields are in read only state
  // ----------------------
  await requestDetailsFields.validateFieldsReadOnly(noOfRecordsCount,['BP No','Name1','Country Key','Region']);
  console.log("validated read only ['BP No','Name1','Country Key','Region']")

  // ----------------------
  // Step 10: Validate values in the fields are auto populated 
  // ----------------------
  const addressRowsDataTask100 = await requestDetailsFields.getRowsData(noOfRecordsCount, ['BP No','Name1','Country Key','Region','Customer Account Grp']);
  const addressExpectedDataTask100 = [
    {'BP No':'$1','Name1': 'BP Test1','Country Key': '','Region':'','Customer Account Grp':''},
    {'BP No':'$2','Name1': 'BP Test2','Country Key': 'GB','Region':'SHR','Customer Account Grp':'CUST'}
  ];
  await requestDetailsFields.validateRowsData(addressRowsDataTask100, addressExpectedDataTask100);
  // await requestDetailsFields.validateConditionalFieldRule(addressRowsDataTask100,'Region','SHR','Country Key','GB');
  // Validate Customer account group got value from Account group for the BP No
  // await requestDetailsFields.validateCustomerAccGroupWithName(bpAccountGroupMap,'Name1','BP Test2','BP No','Customer Account Grp');

  // ----------------------
  // Step 10: Enter Values in fields
  // ----------------------
  // Data for 2 rows
  const addressRowInputData = [
      {'Title':'Mr','Name 2':'John Smith','Search Term 1':'Smith','Search Term 2':'Engineering','Street':'High Street','House Number':'15',
        'Post Code':'SY1 1AA','City':'Shrewsbury','Telephone Number':'01743 123456','Mobile Number':'07700 900123','Fax Number':'01743 654321',
        'E-Mail Address':'john.smith@testshropshire.co.uk','Customer Account Grp':'CUST'},
      {'Title':'Ms','Name 2':'Emma Davies','Search Term 1':'Davies','Search Term 2':'Logistics','Street':'Church Street','House Number':'28',
        'Post Code':'TF3 4BX','City':'Telford','Telephone Number':'01952 234567','Mobile Number':'07700 900456','Fax Number':'01952 765432',
        'E-Mail Address':'emma.davies@testshropshire.co.uk','Customer Account Grp':'CUST'},
    ];
  await requestDetailsFields.enterRowsData(noOfRecordsCount, addressRowInputData);

  // ----------------------
  // Step 11: Complete the Step 100
  // ----------------------
  await requestDetailsFields.completeStep100Task();

  // ----------------------
  // Step 16: Validate No Data 
  // ----------------------
  // await myTasklistPage.validateNoData()












});