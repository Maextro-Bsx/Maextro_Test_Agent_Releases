import { test } from '@playwright/test';
import { LoginPage } from '@pages/Login_Page';
import { HomePage } from '@pages/Home_Page';
import { ChooseTemplatePage } from '@pages/ChooseTemplate_Page';
import { EnterRequestDetailsPage } from '@pages/EnterRequestDetails_Page';
import { RequestDetailsFieldsPage } from '@pages/RequestDetailsFields_Page';
import { MyTasklistPage } from '@pages/MyTasklist_Page';
import { env } from '@utils/env';
import { executeWorkflowStep} from '@utils/workflowExecutor';
import { step } from '@utils/step';
import { HeaderParser } from '@utils/New/headerParser';
import { StepParser } from '@utils/New/stepParser';
import { logger } from '@utils/logger';
import { TaskBuilder , Task } from '@utils/New/taskBuilder';
import fs from 'fs';
import path from 'path';
import { executeView } from '@utils/New/viewExecutor';

test('TC_WorkflowExecution', async ({ page }) => {


  const templateId = process.env.TEMPLATE_ID || env.TEMPLATE_ID;;
  if (!templateId) {
    throw new Error('TEMPLATE_ID not provided. Example: TEMPLATE_ID=ATBP');
  }
  const excelPath = `test-data/Templates/SHS/M1 - Create Material type HAWA (GB Agency).xlsx`;
  
  // const basePath = process.env.USER_DATA_PATH ?? process.cwd();
  // const environment = process.env.ENVIRONMENT ?? '';

  // if (!environment) {
  //   throw new Error('ENVIRONMENT is not defined');
  // }
  // const excelPath = path.join(basePath,environment,`${templateId}.xlsx`);
  
  logger.info(`Using Template: ${templateId}`);
  logger.info(`Excel Path: ${excelPath}`);

  if (!fs.existsSync(excelPath)) {
  throw new Error(`Excel file not found: ${excelPath}`);
  }

  const { requestDetails, steps } = HeaderParser.parse(excelPath, 'MXT_HDR');
  
  if (requestDetails['Template ID'] !== templateId) {
  throw new Error(
    `Template mismatch: File ${templateId}.xlsx contains Template ID ${requestDetails['Template ID']}`
  );
  }
  
  const loginPage = new LoginPage(page);
  const homePage = new HomePage(page);
  const chooseTemplatePage = new ChooseTemplatePage(page);
  const enterRequestDetailsPage = new EnterRequestDetailsPage(page);
  const requestDetailsFields = new RequestDetailsFieldsPage(page);
  const myTasklistPage = new MyTasklistPage(page);
  const tasks: Task[] = TaskBuilder.buildFromHeader(steps);

  TaskBuilder.logTasks(tasks);
  let resolvedAction: string = '';
  let requestNumber = '';
  const stepExecutionCount: Record<string, number> = {};
  myTasklistPage.allTasks = [...tasks];

  /** Login **/
  await step('Login to Application', page, async () => {
    await loginPage.goto(env.baseURL);
    await loginPage.login(env.username, env.password);
  });

  const step0 = steps.find(s => s.stepNo === '0');
  if (!step0) throw new Error('Step 0 not found');
  
  if (step0.action.toLowerCase().includes('skip')) {

    console.log('Step 0 skipped → Using existing request');
    const existingRequestNumber = requestDetails['Request Number'];
    if (!existingRequestNumber) {
      throw new Error('Request Number required when Step 0 is skipped');
    }
    requestNumber = existingRequestNumber;
  } else {
    /** Navigate to Create request page **/
    await step('Navigate to Create Request Page', page, async () => {
      await homePage.navigateTo('createRequest');
    });

    /** Select Template **/
    await step('Select Template', page, async () => {
      await chooseTemplatePage.searchAndSelectTemplate(requestDetails['Template ID'],requestDetails['Object']);
    });

    /**Enter Request details and confirm **/
    await step('Enter Request Details and confirm', page, async () => { 
      await enterRequestDetailsPage.enterRequestDetails(requestDetails);
      await enterRequestDetailsPage.clickConfirm();
      await requestDetailsFields.waitForSAPPageReady();
    }); 
  
    // STEP 0 EXECUTION
    const step0Views = StepParser.parse(excelPath, 'Step 0', step0.views);
    for (const view of step0Views) {
      console.log(`/=============================== Step 0 ==========================/`);
      await executeView(requestDetailsFields, view);
    }
    // Submit request
    requestNumber = await requestDetailsFields.submitCreateRequestAndCaptureNumber();
    console.log(`Created Request Number: ${requestNumber}`);

  }

  await step('Navigate to My Tasklist', page, async () => {
    await homePage.navigateTo('myTaskList');
    await myTasklistPage.searchTask(requestNumber);
  });

  // CHECK: Are all remaining steps SKIP?
  const remainingSteps = steps.filter(s => s.stepNo !== '0');
  const allSkipped = remainingSteps.every(s => s.action?.toLowerCase() === 'skip');
  if (allSkipped) {
    console.log('All workflow steps are SKIP → Ending test after Step 0');
    return; 
  }
  const skipSteps = steps.filter(s => s.action?.toLowerCase() === 'skip').map(s => `Step ${s.stepNo}`).filter(step => step !== 'Step 1');
  console.log('Skip Steps:', skipSteps);

  while (tasks.length > 0) {

      const task: Task | null = await myTasklistPage.getAndClickNextTask(requestNumber, tasks);

      if (!task) {
        console.log('No more tasks → workflow complete');
        break;
      }
      console.log(`Picked Task: ${task.step}`);
      /** STEP CONFIG */
      const isStep1 = task.step === 'Step 1';
      const stepNo = task.step.replace('Step ', '');
      const stepConfig = isStep1
        ? steps.find(s => s.stepNo === '0')
        : steps.find(s => s.stepNo === stepNo);
      if (!stepConfig) {
        throw new Error(`Step config not found for ${task.step}`);
      }
      const effectiveStepNo = isStep1 ? '0' : stepNo;

      /** STEP 6 — EXECUTE VIEWS */
      await step(`Execute Task: ${task.step}`, page, async () => {

        // const views = StepParser.parse(excelPath,`Step ${stepNo}`,stepConfig.views);
        await requestDetailsFields.ensureViewReadyForExecution();
        const effectiveStepNo = task.step === 'Step 1' ? '0' : stepNo;
        const effectiveStepConfig =task.step === 'Step 1'? steps.find(s => s.stepNo === '0'): stepConfig;
        if (!effectiveStepConfig) {
          throw new Error(`Config not found for ${task.step}`);
        }
        const views = StepParser.parse(excelPath,`Step ${effectiveStepNo}`,stepConfig.views);
        
        for (const view of views) {
          console.log(`Step ${stepNo} → View: ${view.viewName}`);
          await executeView(requestDetailsFields, view);
        }
      });

      /** STEP 7 — KEEP YOUR EXISTING ENGINE (IMPORTANT) */
      const { resolvedAction } = await executeWorkflowStep(requestDetailsFields,myTasklistPage,requestNumber,task,tasks,stepExecutionCount,steps);

      /** STEP 8 — FINALIZE TASK */
      await myTasklistPage.finalizeTask(requestNumber,task,tasks,resolvedAction);

  }

});


