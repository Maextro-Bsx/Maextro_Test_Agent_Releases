import { Page, Locator,expect } from '@playwright/test';
import BasePage from './Base_Page';
import { myTasklistLocators } from '@locators/MyTasklist_locators';
// import { Task } from '@utils/taskTransformer';
import { logger } from '@utils/logger';
import { Task } from '@utils/New/taskBuilder';

export class MyTasklistPage extends BasePage {

  private locators;
  private executionState = {completedSteps: new Set<string>(),isCRCreated: false};
  public allTasks: Task[] = [];

  constructor(page: Page) {
    super(page);
    this.locators = myTasklistLocators(page);
  }

/**
 * Determines whether a task can be executed based on its dependency.
 *
 * Steps:
 * 1. Retrieves the dependency value from the task
 * 2. Allows execution if no dependency is defined
 * 3. Checks special dependency:
 *    - 'CR': verifies if CR (Change Request) is created
 * 4. For other dependencies:
 *    - Checks if the dependent step exists in completedSteps
 * 5. Returns execution eligibility as boolean
 *
 * @param task - Task object containing dependency information
 * @returns true if the task can be executed, otherwise false
 *
 * Example:
 * const canRun = canExecuteTask(task);
 */ 
// canExecuteTask(task : Task): boolean {

//   const dependency = task.dependency;
//   if (!dependency || dependency.trim() === '') {
//     return true;
//   }
//   if (dependency === 'CR') {
//     return this.executionState.isCRCreated;
//   }
//   return this.executionState.completedSteps.has(dependency);
// }

/**
 * Checks whether a specific task is present in the UI.
 */
async isTaskPresentInUI(requestNumber: string, taskName: string): Promise<boolean> {

  const locator = this.locators.taskSearchResult(requestNumber, taskName);
  return await locator.count() > 0;
}

/**
 * Finds the next executable task for a given request based on UI availability.
 *
 * Steps:
 * 1. Retry up to 3 times to handle UI delays or data refresh timing issues.
 * 2. Sort tasks in ascending order based on their step number.
 * 3. Iterate through the sorted tasks:
 *    a. Check if each task is present in the UI using request number and step.
 *    b. Log each check for debugging purposes.
 *    c. If a task is found in the UI, return it as the next executable task.
 * 4. If no task is found in the current attempt:
 *    a. Refresh the task list.
 *    b. Wait for the UI to update before retrying.
 * 5. After all retries, log a warning and return null if no task is found.
 *
 * @param requestNumber The unique identifier of the request.
 * @param tasks Array of tasks to evaluate (each task must contain a step field).
 *
 * @returns Promise<Task | null> The next executable task if found, otherwise null.
 *
 * Example:
 * const task = await page.getNextExecutableTask('REQ12345', tasks);
 */ 
async getNextExecutableTask(requestNumber: string,tasks: Task[]): Promise<Task | null> {

  for (let attempt = 0; attempt < 3; attempt++) {
  logger.info(`Attempt ${attempt + 1}: Finding executable task`);
  
  const sortedTasks = [...tasks].sort((a, b) => {
        const aNum = parseInt(a.step.replace(/\D/g, ''));
        const bNum = parseInt(b.step.replace(/\D/g, ''));
    return aNum - bNum;
  });
  
  for (const task of sortedTasks) {
      const isPresent = await this.isTaskPresentInUI(requestNumber, task.step);
      logger.info(`Checking ${task.step} | UI Present: ${isPresent}`);
      if (isPresent) {
        logger.info(`Next executable task found: ${task.step}`);
        return task; 
      }
  }
  logger.info('Refreshing task list...');
  await this.refreshTaskList(requestNumber);
  await this.page.waitForTimeout(2000);
  }
  logger.warn('No executable task found');
  return null;
}

/**
 * Searches for a task in the SAP UI based on the provided request number.
 *
 * Steps:
 * 1. Log the request number being searched.
 * 2. Wait for any SAP global loader to disappear.
 * 3. Wait for the request search input box to become visible.
 * 4. Clear any existing text in the search box.
 * 5. Enter the request number into the search box.
 * 6. Trigger the search using the Enter key.
 * 7. Wait briefly for the search results to load.
 * 8. Wait for either:
 *    a. The task search result header to appear, or
 *    b. The "no data" message to appear.
 * 9. If the "no data" message is visible, return false.
 * 10. Otherwise, confirm that task search results are loaded and return true.
 *
 * @param requestNumber The unique identifier of the request to search for.
 *
 * @returns Promise<boolean> True if results are found, false if no data is returned.
 *
 * Example:
 * const found = await page.searchTask('REQ12345');
 */
async searchTask(requestNumber: string): Promise<boolean> {
  
  logger.info(`Searching task for request: ${requestNumber}`);
  await this.waitForSAPLoader();
  await this.locators.requestSearchBox.waitFor({ state: 'visible', timeout: 15000 });
  const searchBox = this.locators.requestSearchBox;
  await searchBox.fill('');
  await searchBox.fill(requestNumber);
  await searchBox.press('Enter');
  logger.info('Search triggered');
  await this.page.waitForTimeout(3000); 
  await this.locators.taskSearchResultHeader(requestNumber).waitFor({ state: 'visible', timeout: 5000 });
  const header = this.locators.taskSearchResultHeader(requestNumber);
  const noData = this.locators.noDataMessage;

  await Promise.race([
    header.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
    noData.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  ]);

  if (await noData.isVisible()) {
    logger.warn('No data found in search');
    return false; 
  }
  logger.info('Task search results loaded');
  return true;
}

/**
 * Clicks a specific task in the SAP UI based on request number and task name.
 *
 * Steps:
 * 1. Log the task and request being accessed.
 * 2. Locate the task item using request number and task name.
 * 3. Wait until the task item is visible (up to 60 seconds).
 * 4. Wait for any SAP global loader to disappear before interaction.
 * 5. Click the identified task item.
 * 6. Log that the task has been clicked.
 * 7. Wait for the Fiori view to be fully ready for interaction.
 * 8. Apply a short delay to ensure UI stabilization.
 *
 * @param requestNumber The unique identifier of the request.
 * @param taskName The name of the task to be clicked.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.clickTaskByRequestNumber('REQ12345', 'Approval Task');
 */
async clickTaskByRequestNumber(requestNumber: string, taskName: string) {
  logger.info(`Clicking task: ${taskName} for request: ${requestNumber}`);
  const taskItem = this.locators.taskSearchResultByStep(requestNumber, taskName);
  await expect(taskItem).toBeVisible({ timeout: 60000 });
  await this.waitForSAPLoader();
  await taskItem.click();
  logger.info('Task clicked, waiting for view to load');
  await this.waitForFioriViewReady();
  await this.page.waitForTimeout(3000)
}

/**
 * Refreshes the task list in the SAP UI for a given request number.
 *
 * Steps:
 * 1. Log that the task list refresh has started.
 * 2. Click the refresh button to reload the task list.
 * 3. Wait for the page DOM content to be fully loaded.
 * 4. Wait for the SAP loader to disappear.
 * 5. Wait for either:
 *    a. The task search result header to become visible, or
 *    b. The "no data" message to appear.
 * 6. Check whether the "no data" message is present.
 * 7. Log a warning if no data is found.
 * 8. Otherwise, confirm that the task list has been refreshed successfully.
 *
 * @param requestNumber The unique identifier of the request whose task list is being refreshed.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.refreshTaskList('REQ12345');
 */
async refreshTaskList(requestNumber: string): Promise<void> {
  logger.info('Refreshing task list...');
  await this.locators.refreshButton.click();
  await this.page.waitForLoadState('domcontentloaded');
  await this.waitForLoaderToDisappear();
  const header = this.locators.taskSearchResultHeader(requestNumber);
  const noData = this.locators.noDataMessage;
  await Promise.race([
    header.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    noData.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
  ]);
  const isNoDataVisible = await noData.count().then(c => c > 0);
  if (isNoDataVisible) {
    logger.warn('No data found in task list');
  } else {
    logger.info(`Task list refreshed for request: ${requestNumber}`);
  }
}

/**
 * Gets the current step text.
 *
 * Steps:
 * 1. Read step textContent()
 * 2. Trim whitespace
 * 3. Return step text
 *
 * @returns Current step text
 *
 * Example:
 * const step = await page.getStepText();
 */
async getStepText() {
  return (await this.locators.stepText.textContent())?.trim() || '';
}

/**
 * Gets the current status text.
 *
 * Steps:
 * 1. Read status textContent()
 * 2. Trim whitespace
 * 3. Return status text
 *
 * @returns Current status text
 *
 * Example:
 * const status = await page.getStatusText();
 */
async getStatusText() {
  return (await this.locators.statusText.textContent())?.trim() || '';
}

/**
 * Marks a given step as completed in the execution state.
 *
 * Steps:
 * 1. Log the step being marked as completed.
 * 2. Add the step to the internal set of completed steps in execution state.
 *
 * @param step The step identifier to mark as completed.
 *
 * @returns void
 *
 * Example:
 * page.markStepCompleted('Step 1');
 */
markStepCompleted(step: string) {
  logger.info(`Marking completed: ${step}`);
  this.executionState.completedSteps.add(step);
}

/**
 * Validates the current step and status displayed in the UI against expected values.
 *
 * Steps:
 * 1. Retrieve the actual step text from the UI.
 * 2. Retrieve the actual status text from the UI.
 * 3. Log the actual step and status values for debugging.
 * 4. Compare the actual step with the expected step.
 * 5. Compare the actual status with the expected status.
 *
 * @param expectedStep The expected step value to validate against the UI.
 * @param expectedStatus The expected status value to validate against the UI.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.validateStepAndStatus('Step 1', 'Completed');
 */
async validateStepAndStatus(expectedStep: string,expectedStatus: string): Promise<void> {

  const actualStep = await this.getStepText();
  const actualStatus = await this.getStatusText();
  logger.info(`Validating Step: ${actualStep}, Status: ${actualStatus}`);
  expect(actualStep.trim()).toContain(expectedStep);
  expect(actualStatus.trim()).toContain(expectedStatus);
}

/**
 * Validates that all tasks are completed by verifying the "No Data" message in the UI.
 *
 * Steps:
 * 1. Locate the "No Data" message element in the UI.
 * 2. Assert that the "No Data" message is visible.
 * 3. Retrieve the text content of the message.
 * 4. Validate that the message contains the text "no data" (case-insensitive).
 * 5. Log confirmation that all tasks are completed successfully.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.validateAllTasksCompleted();
 */
async validateAllTasksCompleted() : Promise<void> {
  const noData = this.locators.noDataMessage;
  await expect(noData).toBeVisible();
  const text = await noData.textContent();
  expect(text?.toLowerCase()).toContain('no data');
  logger.info('All tasks completed - No data message verified');
}

/**
 * Retrieves the next executable task and clicks it in the SAP UI.
 *
 * Steps:
 * 1. Find the next executable task for the given request.
 * 2. If no task is found, log completion and return null.
 * 3. If the task action is "skip":
 *    a. Log that the task is being skipped.
 *    b. Remove the task from the list.
 *    c. Recursively search for the next executable task.
 * 4. If the task is executable:
 *    a. Log the task being executed.
 *    b. Click the task in the UI using request number and step.
 * 5. Return the executed task.
 *
 * @param requestNumber The unique identifier of the request.
 * @param tasks Array of tasks to evaluate and execute.
 *
 * @returns Promise<Task | null> The executed task, or null if no tasks remain.
 *
 * Example:
 * const task = await page.getAndClickNextTask('REQ12345', tasks);
 */
async getAndClickNextTask(requestNumber: string, tasks :Task[]): Promise<Task | null> {

  const task = await this.getNextExecutableTask(requestNumber, tasks);
  if (!task) {
    logger.info(' No task found → assuming workflow complete');
    return null;
  }
  if (task.action.toLowerCase() === 'skip') {
    logger.info(`Skipping task: ${task.step}`);
    const index = tasks.indexOf(task);
    if (index > -1) tasks.splice(index, 1);
    return await this.getAndClickNextTask(requestNumber, tasks);
  }
  logger.info(`Executing task: ${task.step} - ${task.taskName}`);
  // const actualStep = await this.getCurrentStepFromUI();
  // logger.info(`UI Step: ${actualStep}`);
  // await this.validateStepAndStatus(task.step, 'Ready to process');
  await this.clickTaskByRequestNumber(requestNumber,task.step);
  return task;
}

/**
 * Finalizes the execution state of a task after processing.
 *
 * Steps:
 * 1. Log the task being finalized.
 * 2. Refresh the task list for the given request number.
 * 3. Check if the "No Data" message is visible:
 *    a. If visible, mark workflow as complete.
 *    b. Clear all remaining tasks.
 *    c. Exit the function.
 * 4. Verify whether the task still exists in the UI:
 *    a. Locate the task in the UI using request number and step.
 *    b. Compare returned text values with the expected step.
 *    c. Throw an error if the task is still present.
 * 5. Mark the step as completed in the execution state.
 * 6. Determine whether the resolved action is a reject flow.
 * 7. If it is NOT a reject flow:
 *    a. Remove the task from the task list.
 * 8. If it IS a reject flow:
 *    a. Log a warning and keep the task in the list as it may reappear.
 *
 * @param requestNumber The unique identifier of the request.
 * @param task The task being finalized.
 * @param tasks Array of remaining tasks in the workflow.
 * @param resolvedAction The action result (used to determine reject/approve flow).
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.finalizeTask('REQ12345', task, tasks, 'Approve');
 */
async finalizeTask(requestNumber: string, task: Task, tasks: Task[],resolvedAction: string) {

  logger.info(`Finalizing task: ${task.step}`);
  await this.refreshTaskList(requestNumber);
  const noData = this.locators.noDataMessage;
  if (await noData.isVisible()) {
    logger.info('All tasks completed → No data visible');
    tasks.length = 0; 
    return;
  }
  const taskLocator = this.locators.taskSearchResultByStep(requestNumber,task.step);
  const texts = await taskLocator.allTextContents();
  const stillExists = texts.some(t => t.trim() === task.step);
  if (stillExists) {
    throw new Error(`${task.step} still present in UI`);
  }
  this.markStepCompleted(task.step);
  const isRejectFlow = resolvedAction.toLowerCase().includes('reject'); 
  if (!isRejectFlow) {
    const index = tasks.indexOf(task);
    if (index > -1) {
      tasks.splice(index, 1);
    }
  } else {
    logger.warn(` Not removing ${task.step} → Reject flow (step will reappear)`);
  }
}

/**
 * Validates that a specific task is present in the SAP My Task List by step name.
 *
 * Steps:
 * 1. Log the task step being validated.
 * 2. Refresh the task list for the given request number.
 * 3. Locate the task in the UI using request number and step.
 * 4. Assert that the task is visible in the My Task List.
 * 5. Log successful validation if the task is found.
 *
 * @param requestNumber The unique identifier of the request.
 * @param step The step name of the task to validate.
 *
 * @returns Promise<void>
 *
 * Example:
 * await page.validateTaskPresentByStep('REQ12345', 'Step 1');
 */
async validateTaskPresentByStep(requestNumber: string, step: string): Promise<void> {
  logger.info(`Validating presence of task: ${step}`);
  await this.refreshTaskList(requestNumber);
  const taskLocator = this.locators.taskSearchResultByStep(requestNumber, step);
  await expect(taskLocator, `Expected task ${step} not found in MyTasklist`).toBeVisible();
  logger.info(`Task ${step} is present in MyTasklist`);
}

/**
 * Resets the execution state by removing all completed steps from a given step onwards.
 *
 * Steps:
 * 1. Log the step from which execution reset is being performed.
 * 2. Convert completed steps into an array and filter them.
 * 3. Extract numeric values from step identifiers for comparison.
 * 4. Keep only steps that are less than the provided target step.
 * 5. Update the execution state with the filtered set of completed steps.
 * 6. Log the updated list of completed steps.
 *
 * @param step The step identifier from which execution should be reset.
 *
 * @returns void
 *
 * Example:
 * page.resetExecutionFromStep('Step 3');
 */
resetExecutionFromStep(step: string) {

  logger.info(`Resetting execution from ${step}`);
  const updatedSteps = [...this.executionState.completedSteps]
    .filter(s => {
      const current = Number(s.replace(/\D/g, ''));
      const target = Number(step.replace(/\D/g, ''));
      return current < target;
    });
  this.executionState.completedSteps = new Set(updatedSteps);
  logger.info(`Updated completed steps: ${[...this.executionState.completedSteps].join(', ')}`);
}

/**
 * Re-adds a previously removed task back into the active task list.
 *
 * Steps:
 * 1. Check if the task already exists in the current task list.
 * 2. If it exists, log a warning and exit without making changes.
 * 3. Find the original task definition from the master task list.
 * 4. If the original task is not found, log an error and throw an exception.
 * 5. Add the original task back to the beginning of the task list.
 * 6. Log that the task has been successfully re-added.
 *
 * @param tasks The current list of active tasks.
 * @param step The step identifier of the task to re-add.
 *
 * @returns void
 *
 * Example:
 * page.reAddTask(tasks, 'Step 2');
 */
reAddTask(tasks: Task[], step: string): void {

  const exists = tasks.some(t => t.step === step);
  if (exists) {
    logger.warn(`Step ${step} already exists in tasks`);
    return;
  }
  const originalTask = this.allTasks.find(t => t.step === step);
  if (!originalTask) {
    logger.error(`Original task not found for step: ${step}`);
    throw new Error(`Original task not found for step: ${step}`);
  }
  tasks.unshift(originalTask); 
  logger.info(`Re-added ${step} to task list`);
}




}