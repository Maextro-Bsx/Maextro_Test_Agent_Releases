import { test } from '@playwright/test';
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
  //   const today = new Date();
  //   const formattedDate = today.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });

  await enterRequestDetailsPage.enterRequestDetails(
    'Test BP CR Description',        // CR Description
    'New customer',        // Reason Code
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

  // ----------------------
  // Step 7: Validate error for Mandatory fields
  // ----------------------
  const expectedErrorsSection1 = [
  "Field ACCT_GROUP ( Account Group ) required for view ( BOR1 ) | Row1 - Account Group",
  "Field ACCT_GROUP ( Account Group ) required for view ( BOR1 ) | Row2 - Account Group",
  "Field BU_RLTYP ( BP Role ) required for view ( BOR1 ) | Row1 - BP Role",
  "Field BU_RLTYP ( BP Role ) required for view ( BOR1 ) | Row2 - BP Role",
  "Field NAME1 ( BP Name ) required for view ( BOR1 ) | Row1 - BP Name",
  "Field NAME1 ( BP Name ) required for view ( BOR1 ) | Row2 - BP Name"
  ];
  await requestDetailsFields.clickStatusComplete();
  await requestDetailsFields.validateErrorCount(6);
  await requestDetailsFields.validateMandatoryErrors(expectedErrorsSection1);
  
  // Data for a single row
  const materialRowData0 = {
    'BP Role': 'FLCU00',
    'Account Group': 'CUST',
    'BP Name': 'BP Test1',
  };
  const materialRowData1 = {
    'BP Role': 'FLCU01',
    'Account Group': 'CUST',
    'BP Name': 'BP Test2',
  };
  // Enter values in all fields dynamically for 2 rows 
  await requestDetailsFields.enterRowData(0, materialRowData0);
  await requestDetailsFields.enterRowData(1, materialRowData1);

  // ----------------------
  // Step 7: Validate values in the fields are auto populated 
  // ----------------------
  const resultData0 = await requestDetailsFields.getRowData(0, ['BP No']);
  const resultData1 = await requestDetailsFields.getRowData(1, ['BP No']);
  console.log('BP No 1:', resultData0['BP No']);
  console.log('BP No 2:', resultData1['BP No']);
  
  // ----------------------
  // Step 8: Validate mandatory Fields
  // ----------------------
  await requestDetailsFields.validateMandatoryFields([
    'BP Role',
    'Account Group',
    'BP No',
    'BP Name'
  ]);

  // ----------------------
  // Step 8: Validate Field dropdown values
  // ----------------------
  await requestDetailsFields.validateFieldValueHelp(0,'BP Role',['FLCU00 - Customer', 'FLCU01 - Customer Finance']);
  await requestDetailsFields.validateFieldValueHelp(0,'Account Group',['CUST - Customer']);
  await page.pause();

  const expectedErrorsSection2 = [
    "Field SORT1 ( Search Term 1 ) required for view ( BP01 ) | Row1 - Search Term 1",
    "Field SORT2 ( Search Term 2 ) required for view ( BP01 ) | Row1 - Search Term 2",
    "Field SORT1 ( Search Term 1 ) required for view ( BP01 ) | Row2 - Search Term 1",
    "Field SORT2 ( Search Term 2 ) required for view ( BP01 ) | Row2 - Search Term 2"
  ];
  await requestDetailsFields.clickStatusComplete();
  await requestDetailsFields.validateErrorCount(4);
  await requestDetailsFields.validateMandatoryErrors(expectedErrorsSection2);

 // Data for a single row
const materialRowDataSection2Row1 = {
  'BP Role': 'FLCU00',
  'Account Group': 'CUST',
  'BP Name': 'BP Test1',

  'BP No': '',
  'Name1': 'BP Test1',
  'Title': '',
  'Search Term 1': 'SEARCH1',
  'Search Term 2': '',
  'Name 2': '',
  'Street': 'Street 1',
  'House Number': '10',
  'Post Code': '500001',
  'City': 'Hyderabad',
  'Country Key': 'IN',
  'Region': '',
  'Telephone Number': '1234567890',
  'Fax Number': '',
  'E-Mail Address': 'test1@email.com',
  'Comments': '',
  'Street 2': '',
  'Street 3': '',
  'Street 4': '',
  'Street 5': '',
  'Time Zone': '',
  'Transportation Zone': '',
  'PO Box': '',
  'Post Code (PO box)': '',
  'Language': 'EN',
  'Telephone Extension': '',
  'Mobile Number': '9999999999',
  'Preferred Phone Type': '',
  'Fax Extension': '',
  'Std. Comm. Method': '',
  'Person': '',
  'Address Id': ''
};

const materialRowDataSection2Row2 = {
  'BP Role': 'FLCU01',
  'Account Group': 'CUST',
  'BP Name': 'BP Test2',

  'BP No': '',
  'Name1': 'BP Test2',
  'Title': '',
  'Search Term 1': 'SEARCH2',
  'Search Term 2': '',
  'Name 2': '',
  'Street': 'Street 2',
  'House Number': '20',
  'Post Code': '500002',
  'City': 'Hyderabad',
  'Country Key': 'IN',
  'Region': '',
  'Telephone Number': '1234567891',
  'Fax Number': '',
  'E-Mail Address': 'test2@email.com',
  'Comments': '',
  'Street 2': '',
  'Street 3': '',
  'Street 4': '',
  'Street 5': '',
  'Time Zone': '',
  'Transportation Zone': '',
  'PO Box': '',
  'Post Code (PO box)': '',
  'Language': 'EN',
  'Telephone Extension': '',
  'Mobile Number': '8888888888',
  'Preferred Phone Type': '',
  'Fax Extension': '',
  'Std. Comm. Method': '',
  'Person': '',
  'Address Id': ''
};






  // Enter values in all fields dynamically for 2 rows 
  await requestDetailsFields.enterRowData(0, materialRowDataSection2Row1);
  await requestDetailsFields.enterRowData(1, materialRowDataSection2Row2);





// // ----------------------
// // Step 8: Status Complete → Submit Task → Save → Confirm
// // ----------------------
// await requestDetailsFields.clickStatusComplete();
// await requestDetailsFields.validateEditViewAndStatusProgressBar();
// await requestDetailsFields.clickSubmitTask();
// await requestDetailsFields.clickSaveMenuItem();
// await requestDetailsFields.validateConfirmationMessage();
// await requestDetailsFields.clickSubmitConfirm();


// // ----------------------
// // Step 9: Capture Request Number
// // ----------------------
// const confirmationMessageStatus = await requestDetailsFields.validateSubmissionSuccess();
// const requestNumber = await requestDetailsFields.getRequestNumber();
// console.log('Request Number:', requestNumber);

// // Exit workflow
// await requestDetailsFields.clickExit();

// // ----------------------
// // Step 10: Navigate to My Task List and search with request
// // ----------------------
// await homePage.navigateTo('myTaskList');
// const myTasklistPage = new MyTasklistPage(page);
// await myTasklistPage.searchTask(requestNumber);


// // ----------------------
// // Step 11: Validate Step and Status and open Task
// // ----------------------

// const step = await myTasklistPage.getStepText();
// const status = await myTasklistPage.getStatusText();

// console.log('Step:', step);
// console.log('Status:', status);
// await myTasklistPage.clickTaskByRequestNumber(requestNumber);


});