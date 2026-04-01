import { test } from '@playwright/test';
import { LoginPage } from '@pages/Login_Page';
import { HomePage } from '@pages/Home_Page';
import { ChooseTemplatePage } from '@pages/ChooseTemplate_Page';
import { EnterRequestDetailsPage } from '@pages/EnterRequestDetails_Page';
import { RequestDetailsFieldsPage } from '@pages/RequestDetailsFields_Page';
import { MyTasklistPage } from '@pages/MyTasklist_Page';
import { ExcelParser } from '@utils/excelParser';
import { FieldConfigProcessor } from '@utils/fieldConfigProcessor';
import { filterRowData } from '@utils/dataFilter';
import { TaskTransformer,Task } from '@utils/taskTransformer';
import { env } from '@utils/env';
import { executeWorkflowStep} from '@utils/workflowExecutor';
import { step } from '@utils/step';


test('Business Partner Request Creation - Excel Driven', async ({ page }) => {

  const excelPath = 'test-data/testData.xlsx';
  const { validationRows } = ExcelParser.parseSheet(excelPath, "Request");
  const tasks: Task[] = TaskTransformer.buildTaskMatrix(validationRows);
  let resolvedAction: string = '';
  const stepExecutionCount: Record<string, number> = {};
  const requestDetailsFields = new RequestDetailsFieldsPage(page);
  const myTasklistPage = new MyTasklistPage(page);
  myTasklistPage.allTasks = [...tasks];
  const loginPage = new LoginPage(page);
  const homePage = new HomePage(page);
  const chooseTemplatePage = new ChooseTemplatePage(page);
  
  /** Login **/
  await step('Login to Application', page, async () => {
    await loginPage.goto(env.baseURL);
    await loginPage.login(env.username, env.password);
  });

  /** Navigate to Create request page **/
  await step('Navigate to Create Request Page', page, async () => {
    await homePage.navigateTo('createRequest');
  });

  /** Select Template **/
  await step('Select Template', page, async () => {
    await chooseTemplatePage.searchAndSelectTemplate('Automation testing BP');
  });

  /** Enter Request details from Excel and confirm **/
  const enterRequestDetailsPage = new EnterRequestDetailsPage(page);
  const crSheet = ExcelParser.parseSheet(excelPath, 'Request');
  const crConfig = FieldConfigProcessor.process(crSheet.fieldConfig);
  console.log(crConfig);
  const crRows = filterRowData(crSheet.rowsData, crSheet.fieldConfig);
  console.log(crRows)
  await step('Enter Request Details', page, async () => {
    await enterRequestDetailsPage.enterRequestDetailsFromExcel(crRows[0],crConfig);
    await enterRequestDetailsPage.clickConfirm();
  });

  /** Validate Mandatory and Readonly Fields in BP view **/
  await requestDetailsFields.waitForSAPPageReady();
  await page.waitForLoadState('networkidle');
  const bpSheet = ExcelParser.parseSheet(excelPath, 'BOR1');
  const bpConfig = FieldConfigProcessor.process(bpSheet.fieldConfig);
  const bpRowsData = filterRowData(bpSheet.rowsData, bpSheet.fieldConfig);
  const noOfRecords = bpRowsData.length;
  await step('Validate Mandatory and Readonly fields in BP view', page, async () => {
    await requestDetailsFields.validateFieldsReadOnly(noOfRecords, bpConfig.readonlyFields);
    await requestDetailsFields.validateMandatoryFields(bpConfig.mandatoryFields);
    await requestDetailsFields.validateMandatoryFieldErrorMessage(noOfRecords,bpConfig.mandatoryFields);
  });

  /** Validate BP fields are auto-populated **/
  const bpexpectedFields = Object.keys(bpSheet.fieldConfig);
  const bpRowsDataFromUI = await requestDetailsFields.getRowsData(noOfRecords, bpexpectedFields);
  await step('Validate BP fields are auto-populated', page, async () => {
    await requestDetailsFields.validateRowsData(bpRowsDataFromUI, bpSheet.validationRows);
  });
  const bpAccountGroupMap = await requestDetailsFields.captureFieldMapWithValues('BP No','Account Group');

  /** Enter data in BP fields and validate Add roles child view with Multi line input config and Status complete **/
  await step('Enter data in BP fields, validate Add roles child view and Status complete', page, async () => {
    await requestDetailsFields.executeDynamicData(bpRowsData, bpConfig.actionMap);
    const addRolesSheet = ExcelParser.parseSheet(excelPath, 'BP00');
    await requestDetailsFields.validateAddRolesFromExcel(noOfRecords,bpRowsDataFromUI,bpRowsData,addRolesSheet.validationRows);
    await requestDetailsFields.clickStatusComplete();
    await page.waitForTimeout(3000);
  });

  /**Validate Mandatory and Readonly fields in Customer company code view **/
  const ccSheet = ExcelParser.parseSheet(excelPath, 'KOR1');
  const ccConfig = FieldConfigProcessor.process(ccSheet.fieldConfig);
  const ccRowsData = filterRowData(ccSheet.rowsData, ccSheet.fieldConfig);
  await step('Validate Mandatory and Readonly fields in Customer company code view', page, async () => {
    await requestDetailsFields.validateMandatoryFields(ccConfig.mandatoryFields);
    await requestDetailsFields.validateFieldsReadOnly(noOfRecords, ccConfig.readonlyFields);
    await requestDetailsFields.validateMandatoryFieldErrorMessage(noOfRecords,ccConfig.mandatoryFields);
  });

  /**Validate Customer company code fields are auto-populated **/
  await step('Validate Customer company code fields are auto-populated', page, async () => {
    const ccexpectedFields = Object.keys(ccSheet.fieldConfig);
    const ccRowsDataFromUI = await requestDetailsFields.getRowsData(noOfRecords, ccexpectedFields);
    await requestDetailsFields.validateRowsData(ccRowsDataFromUI, ccSheet.validationRows);
  });

  /**Enter data in Customer company code fields and Status complete **/
  await step('Enter data in Customer company code fields and Status complete', page, async () => {
    await requestDetailsFields.executeDynamicData(ccRowsData, ccConfig.actionMap);
    await requestDetailsFields.clickStatusComplete();
    await page.waitForTimeout(3000);
  });

  /**Validate Mandatory and Readonly fields in Customer sales view **/
  const csSheet = ExcelParser.parseSheet(excelPath, 'KOR2');
  const csConfig = FieldConfigProcessor.process(csSheet.fieldConfig);
  const csRowsData = filterRowData(csSheet.rowsData, csSheet.fieldConfig);
  await step('Validate Mandatory and Readonly fields in Customer sales view', page, async () => {
    await requestDetailsFields.validateMandatoryFields(csConfig.mandatoryFields);
    await requestDetailsFields.validateFieldsReadOnly(noOfRecords, csConfig.readonlyFields);
    await requestDetailsFields.validateMandatoryFieldErrorMessage(noOfRecords,csConfig.mandatoryFields);
  });

  /**Validate Customer sales fields are auto-populated **/
  const csexpectedFields = Object.keys(csSheet.fieldConfig);
  await step('Validate Customer sales fields are auto-populated', page, async () => {
    const csRowsDataFromUI = await requestDetailsFields.getRowsData(noOfRecords, csexpectedFields);
    await requestDetailsFields.validateRowsData(csRowsDataFromUI, csSheet.validationRows);
  });

  /**Enter data in Customer sales fields and Submit request **/
  await step('Enter data in Customer sales fields and Submit request', page, async () => {
    await requestDetailsFields.executeDynamicData(csRowsData, csConfig.actionMap);
  });
  const requestNumber = await requestDetailsFields.submitCreateRequestAndCaptureNumber();

  /**temporary input */
  // const requestNumber ='38621';
  // const noOfRecords=2
  // const bpAccountGroupMap = { '$1': 'CUST', '$2': 'CUST' }
  // const bpSheet = ExcelParser.parseSheet(excelPath, 'BOR1');
  // const bpConfig = FieldConfigProcessor.process(bpSheet.fieldConfig);
  // console.log(bpConfig);

  /**Naviagete to My Tasklist and search for the created request Task**/
  await step('Navigate to My Tasklist and search for the created request Task', page, async () => { 
    await homePage.navigateTo('myTaskList');
    await myTasklistPage.searchTask(requestNumber);
  });
  while (tasks.length > 0) {

    /**Get next executable task based on dependency and click (refresh task list and click with request number and task name)**/
    let task : Task | null = await myTasklistPage.getAndClickNextTask(requestNumber,tasks);
    if (!task) {
      console.log('No more tasks → workflow complete');
      break;
    }

    /**Check task Step and execute corresponding validations and actions in request details page**/
    if (task.step === 'Step 100') {
      /**Status complete BOR1 view**/
      await step('Status complete BOR1 view', page, async () => {
        await requestDetailsFields.clickStatusComplete();
        await page.waitForTimeout(5000);
      });

      /**Validate Mandatory and Readonly fields in Address view**/
      const addressSheet = ExcelParser.parseSheet(excelPath, 'BP01');
      const addressConfig = FieldConfigProcessor.process(addressSheet.fieldConfig);
      const addressRowsData = filterRowData(addressSheet.rowsData, addressSheet.fieldConfig);
      await step('Validate Mandatory and Readonly fields in Address view', page, async () => {
        await requestDetailsFields.validateMandatoryFields(addressConfig.mandatoryFields);
        await requestDetailsFields.validateFieldsReadOnly(noOfRecords, addressConfig.readonlyFields);
        await requestDetailsFields.validateMandatoryFieldErrorMessage(noOfRecords,addressConfig.mandatoryFields);
      });

      /**Validate Address fields are auto-populated and validate conditional rule and cross view field rule**/
      const addressExpectedFields = Object.keys(addressSheet.fieldConfig);
      await step('Validate Address fields are auto-populated and validate conditional rule and cross view field rule', page, async () => {
        const addressRowsDataFromUITask100 = await requestDetailsFields.getRowsData(noOfRecords, addressExpectedFields);
        await requestDetailsFields.validateRowsData(addressRowsDataFromUITask100, addressSheet.validationRows);
        await requestDetailsFields.validateConditionalFieldRule(addressRowsDataFromUITask100,{ 'Region': 'SHR' },{ 'Country Key': 'GB' });
        await requestDetailsFields.validateCrossViewFieldWithCondition(bpAccountGroupMap,{ 'Name1': 'BP Test2' },'BP No','Customer Account Grp');
      });
      /**Enter data in Address fields and Complete Task 100**/
      await step('Enter data in Address fields and Complete Task 100', page, async () => {
        await requestDetailsFields.executeDynamicData(addressRowsData, addressConfig.actionMap);
      });
    }
    else if(task.step === 'Step 200') {
      /**Status complete Address View**/
      await step('Status complete Address View', page, async () => {
        await requestDetailsFields.clickStatusComplete();
        await page.waitForTimeout(5000);
      });

      /**Validate Mandatory and Readonly fields in Identification data**/
      const identificationSheet = ExcelParser.parseSheet(excelPath, 'BP10');
      const identificationConfig = FieldConfigProcessor.process(identificationSheet.fieldConfig);
      const identificationRowsData = filterRowData(identificationSheet.rowsData, identificationSheet.fieldConfig);
      await step('Validate Mandatory and Readonly fields in Identification data', page, async () => {
        await requestDetailsFields.validateMandatoryFields(identificationConfig.mandatoryFields);
        await requestDetailsFields.validateFieldsReadOnly(noOfRecords, identificationConfig.readonlyFields);
        await requestDetailsFields.validateMandatoryFieldErrorMessage(noOfRecords,identificationConfig.mandatoryFields);
      });

      /**Validate Identification data fields are auto-populated**/
      await step('Validate Identification data fields are auto-populated', page, async () => {
        const identificationExpectedFields = Object.keys(identificationSheet.fieldConfig);
        const identificationRowsDataFromUITask200 = await requestDetailsFields.getRowsData(noOfRecords, identificationExpectedFields);
        await requestDetailsFields.validateRowsData(identificationRowsDataFromUITask200, identificationSheet.validationRows);
      });

      /**Enter data in Identification data fields and Status complete**/
      await step('Enter data in Identification data fields and Status complete', page, async () => {
        await requestDetailsFields.executeDynamicData(identificationRowsData, identificationConfig.actionMap);
        await requestDetailsFields.clickStatusComplete();
        await page.waitForTimeout(5000);
      });

      /**Validate Mandatory and Readonly fields in Tax Number data**/
      const taxNumberSheet = ExcelParser.parseSheet(excelPath, 'BP11');
      const taxNumberConfig = FieldConfigProcessor.process(taxNumberSheet.fieldConfig);
      const taxNumberRowsData = filterRowData(taxNumberSheet.rowsData, taxNumberSheet.fieldConfig);
      await step('Validate Mandatory and Readonly fields in Tax Number data', page, async () => {
        await requestDetailsFields.validateMandatoryFields(taxNumberConfig.mandatoryFields);
        await requestDetailsFields.validateFieldsReadOnly(noOfRecords, taxNumberConfig.readonlyFields);
        await requestDetailsFields.validateMandatoryFieldErrorMessage(noOfRecords,taxNumberConfig.mandatoryFields);
      });

      /**Validate Tax Number data fields are auto-populated**/
      await step('Validate Tax Number data fields are auto-populated', page, async () => {
        const taxNumberExpectedFields = Object.keys(taxNumberSheet.fieldConfig);
        const taxNumberRowsDataFromUITask200 = await requestDetailsFields.getRowsData(noOfRecords, taxNumberExpectedFields);
        await requestDetailsFields.validateRowsData(taxNumberRowsDataFromUITask200, taxNumberSheet.validationRows);
      });

      /**Enter data in Tax Number data fields and Status complete**/
      await step('Enter data in Tax Number data fields and Status complete', page, async () => {
        await requestDetailsFields.executeDynamicData(taxNumberRowsData, taxNumberConfig.actionMap);
      });
    }
    else if(task.step === 'Step 300') {
      /**Validate Mandatory and Readonly fields in Bank details view**/
      const bankDetailsSheet = ExcelParser.parseSheet(excelPath, 'BP07');
      const bankDetailsConfig = FieldConfigProcessor.process(bankDetailsSheet.fieldConfig);
      const bankDetailsRowsData = filterRowData(bankDetailsSheet.rowsData, bankDetailsSheet.fieldConfig);
      await page.waitForTimeout(3000);
      await step('Validate Mandatory and Readonly fields in Bank details view', page, async () => { 
        await requestDetailsFields.validateMandatoryFields(bankDetailsConfig.mandatoryFields);
        await requestDetailsFields.validateFieldsReadOnly(noOfRecords, bankDetailsConfig.readonlyFields);
        await requestDetailsFields.validateMandatoryFieldErrorMessage(noOfRecords,bankDetailsConfig.mandatoryFields);
      });

      /**Validate Bank details fields are auto-populated**/
      await step('Validate Bank details fields are auto-populated', page, async () => {
        const bankDetailsExpectedFields = Object.keys(bankDetailsSheet.fieldConfig);
        const bankDetailsRowsDataFromUITask100 = await requestDetailsFields.getRowsData(noOfRecords, bankDetailsExpectedFields);
        await requestDetailsFields.validateRowsData(bankDetailsRowsDataFromUITask100, bankDetailsSheet.validationRows);
      });

      /**Enter data in Bank details fields and Complete Task 300**/
      await step('Enter data in Bank details fields and Complete Task 300', page, async () => {
        await requestDetailsFields.executeDynamicData(bankDetailsRowsData, bankDetailsConfig.actionMap);
      });
    }

    /**Execute Task */
    await step(`Execute Task: ${task.step} - ${task.action}`, page, async () => {
      resolvedAction = (await executeWorkflowStep(requestDetailsFields,myTasklistPage,requestNumber,task,tasks,stepExecutionCount)).resolvedAction;
    });

    /**Finalize Task to remove from task list and validate in history**/
    await step(`Finalize Task: ${task.step} - ${task.action}`, page, async () => {
      await myTasklistPage.finalizeTask(requestNumber,task,tasks,resolvedAction);
    });  
  
    } 
  /** Validate All Tasks Completed **/
  await step('Validate All Tasks Completed', page, async () => {
    await myTasklistPage.validateAllTasksCompleted();
  });
  
});