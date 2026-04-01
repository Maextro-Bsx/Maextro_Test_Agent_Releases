import { Page, Locator,expect } from '@playwright/test';
import BasePage from './Base_Page';
import { myTasklistLocators } from '@locators/MyTasklist_locators';
import { Task } from '@utils/taskTransformer';
import { logger } from '@utils/logger';

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
canExecuteTask(task : Task): boolean {

  const dependency = task.dependency;
  if (!dependency || dependency.trim() === '') {
    return true;
  }
  if (dependency === 'CR') {
    return this.executionState.isCRCreated;
  }
  return this.executionState.completedSteps.has(dependency);
}


async isTaskPresentInUI(requestNumber: string, taskName: string): Promise<boolean> {

  const locator = this.locators.taskSearchResult(requestNumber, taskName);
  return await locator.count() > 0;
}

 /**
 * գտs the next executable task based on dependency conditions.
 *
 * Steps:
 * 1. Iterates through the list of tasks in order
 * 2. Checks if each task can be executed using dependency logic
 * 3. Logs evaluation details for debugging (step, dependency, status)
 * 4. Returns the first executable task found
 * 5. Returns null if no executable task is available
 *
 * @param tasks - Array of Task objects
 * @returns The next executable Task or null if none are ready
 *
 * Example:
 * const nextTask = getNextExecutableTask(tasks);
 */ 
async getNextExecutableTask(requestNumber: string,tasks: Task[]): Promise<Task | null> {

  for (let attempt = 0; attempt < 3; attempt++) {
  logger.info(`Attempt ${attempt + 1}: Finding executable task`);
    for (const task of tasks) {
      const isPresent = await this.isTaskPresentInUI(requestNumber, task.taskName);
      logger.info(`Checking ${task.step} | UI Present: ${isPresent}`);
      if (isPresent) {
        logger.info(`Next executable task found: ${task.step}`);
        return task; 
      }
  }
  logger.info('Refreshing task list...');
  await this.refreshTaskList(requestNumber);
  }
  logger.warn('No executable task found');
  return null;
}

/**
 * Searches for a task using the request number
 * and waits for the result to appear.
 *
 * Steps:
 * 1. Clear the search box
 * 2. Fill the search box with request number
 * 3. Wait for matching row to be visible
 *
 * @param requestNumber - Request number to search
 *
 * Example:
 * await page.searchTask('36663');
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
 * Clicks a task row in the table grid using request number.
 *
 * Steps:
 * 1. Locate table rows
 * 2. Filter row containing request number
 * 3. Click the matched row
 *
 * @param requestNumber - Request number to identify row
 * @returns Promise<void>
 *
 * Example:
 * await page.clickTaskByRequestNumber('12345');
 */
async clickTaskByRequestNumber(requestNumber: string, taskName: string) {
  logger.info(`Clicking task: ${taskName} for request: ${requestNumber}`);
  const taskItem = this.locators.taskSearchResult(requestNumber, taskName);
  await expect(taskItem).toBeVisible({ timeout: 60000 });
  await this.waitForSAPLoader();
  await taskItem.click();
  logger.info('Task clicked, waiting for view to load');
  await this.waitForFioriViewReady();
}

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

markStepCompleted(step: string) {
  logger.info(`Marking completed: ${step}`);
  this.executionState.completedSteps.add(step);
}

/**
 * Validates the Step and Status values displayed on the page.
 *
 * Steps:
 * 1. Retrieve the Step text from the UI
 * 2. Retrieve the Status text from the UI
 * 3. Compare them with expected values passed from the test
 *
 * @param expectedStep - Expected Step value
 * @param expectedStatus - Expected Status value
 *
 * Example:
 * await myTasklistPage.validateStepAndStatus(
 *   '0000000100',
 *   'Ready'
 * );
 */
async validateStepAndStatus(expectedStep: string,expectedStatus: string): Promise<void> {

  const actualStep = await this.getStepText();
  const actualStatus = await this.getStatusText();
  logger.info(`Validating Step: ${actualStep}, Status: ${actualStatus}`);
  expect(actualStep.trim()).toContain(expectedStep);
  expect(actualStatus.trim()).toContain(expectedStatus);
}

/**
 * Validates that the Task List displays the "No data" message.
 *
 * Steps:
 * 1. Wait for the "No data" message to be visible
 * 2. Capture the message text
 * 3. Verify the message text equals "No data"
 *
 * Example:
 * await myTasklistPage.validateNoData();
 */
async validateAllTasksCompleted() : Promise<void> {
  const noData = this.locators.noDataMessage;
  await expect(noData).toBeVisible();
  const text = await noData.textContent();
  expect(text?.toLowerCase()).toContain('no data');
  logger.info('All tasks completed - No data message verified');
}

/**
 * Finds and executes the next available task for a given request.
 *
 * Steps:
 * 1. Initializes execution state (marks CR as created if not already set)
 * 2. Searches for tasks using the request number
 * 3. Determines the next executable task based on dependencies
 * 4. Throws an error if no executable task is found
 * 5. Logs the selected task details
 * 6. Validates the task step and ensures status is "Ready to process"
 * 7. Clicks the task using request number and task name
 * 8. Returns the selected task
 *
 * @param requestNumber - Unique identifier for the request
 * @param tasks - Array of Task objects
 * @returns The executed Task
 *
 * Example:
 * const task = await getAndClickNextTask('REQ-123', tasks);
 */
async getAndClickNextTask(requestNumber: string, tasks :Task[]) {

  // Initialize state ONLY first time
  if (!this.executionState.isCRCreated) {
    this.executionState.isCRCreated = true;
  }
  const task = await this.getNextExecutableTask(requestNumber, tasks);
  if (!task) {
  logger.info(' No task found → assuming workflow complete');
  return null;
}
  logger.info(`Executing task: ${task.step} - ${task.taskName}`);
  await this.validateStepAndStatus(task.step, 'Ready to process');
  await this.clickTaskByRequestNumber(requestNumber,task.taskName);
  return task;
}

/**
 * Finalizes a task after execution by verifying completion and updating state.
 *
 * Steps:
 * 1. Searches for the task using the request number
 * 2. Verifies the task is no longer present in search results (count = 0)
 * 3. Marks the task step as completed in execution state
 * 4. Removes the completed task from the task list
 *
 * @param requestNumber - Unique identifier for the request
 * @param task - Task object that was executed
 * @param tasks - Array of remaining Task objects
 * @returns Promise<void>
 *
 * Example:
 * await finalizeTask('REQ-123', task, tasks);
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
  const taskLocator = this.locators.taskSearchResult(requestNumber,task.taskName);
  await expect(taskLocator).toHaveCount(0);
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

async validateTaskPresentByStep(requestNumber: string, step: string): Promise<void> {
  logger.info(`Validating presence of task: ${step}`);
  await this.refreshTaskList(requestNumber);
  const taskLocator = this.locators.taskSearchResultByStep(requestNumber, step);
  await expect(taskLocator, `Expected task ${step} not found in MyTasklist`).toBeVisible();
  logger.info(`Task ${step} is present in MyTasklist`);
}

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