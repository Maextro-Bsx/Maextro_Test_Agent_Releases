// import { Task } from './taskTransformer';
import { RequestDetailsFieldsPage } from '@pages/RequestDetailsFields_Page';
import { MyTasklistPage } from '@pages/MyTasklist_Page';
import { Task } from '@utils/New/taskBuilder';
import { logger } from './logger';

/**
 * Resolves the workflow action based on execution count.
 *
 * This utility is used to determine the correct action to execute
 * when a task has multiple sequential actions defined (e.g., retry flows).
 *
 * Supported formats:
 * - "save → approve → complete"
 * - "save->approve->reject"
 *
 * Steps:
 * 1. Split the action string using "→" or "->" as delimiters.
 * 2. Trim whitespace from each extracted action.
 * 3. Select the action based on execution count (1-based index).
 * 4. If execution count exceeds available actions, return the last action.
 *
 * @param action String containing one or more sequential actions.
 * @param executionCount Current execution attempt number (1-based index).
 *
 * @returns The resolved action string for the given execution cycle.
 *
 * Example:
 * resolveAction("save → approve → complete", 2); // returns "approve"
 */
export function resolveAction(action: string, executionCount: number): string {

  const actions = action.split(/→|->/).map(a => a.trim());
  return actions[executionCount - 1] || actions[actions.length - 1];
}

/**
 * Executes a workflow step:
 * - Tracks execution count
 * - Resolves action dynamically
 * - Executes UI action
 * - Handles reject flow
 */
// export async function executeWorkflowStep(
//   requestDetailsFields: RequestDetailsFieldsPage,
//   myTasklistPage: MyTasklistPage,
//   requestNumber: string,
//   task: Task,
//   tasks: Task[],
//   stepExecutionCount: Record<string, number>
// ): Promise<{resolvedAction:string}> {

//   // Track execution count
//   stepExecutionCount[task.step] = (stepExecutionCount[task.step] || 0) + 1;

//   const executionCount = stepExecutionCount[task.step];

//   // Resolve action dynamically
//   const resolvedAction = resolveAction(task.action, executionCount);

//   console.log(`🚀 Step: ${task.step} | Execution: ${executionCount} | Action: ${resolvedAction}`);

//   // Clone task with resolved action
//   const taskToExecute: Task = {...task,action: resolvedAction};

//   // Execute workflow action (UI)
//   const rejectedToStep = await requestDetailsFields.executeWorkflowAction(taskToExecute);

//   // Handle reject flow
//   if (rejectedToStep) {

//     console.log(`Rejected → ${rejectedToStep}`);

//     // Reset execution state
//     myTasklistPage.resetExecutionFromStep(rejectedToStep);

//     // Re-add rejected step into task queue
//     myTasklistPage.reAddTask(tasks, rejectedToStep);

//     // Validate UI shows the rejected step
//     await myTasklistPage.validateTaskPresentByStep(requestNumber, rejectedToStep);
//   }
//   return {resolvedAction};
// }

// export async function executeWorkflowStep(
//   requestDetailsFields: RequestDetailsFieldsPage,
//   myTasklistPage: MyTasklistPage,
//   requestNumber: string,
//   task: Task,
//   tasks: Task[],
//   stepExecutionCount: Record<string, number>
// ): Promise<{ resolvedAction: string }> {

//   stepExecutionCount[task.step] = (stepExecutionCount[task.step] || 0) + 1;

//   const executionCount = stepExecutionCount[task.step];
//   const resolvedAction = resolveAction(task.action, executionCount);

//   console.log(`Step: ${task.step} | Execution: ${executionCount} | Action: ${resolvedAction}`);

//   const taskToExecute: Task = {
//     ...task,
//     action: resolvedAction
//   };

//   // 🔹 Execute workflow action (UI)
//   const rejectedToStep = await requestDetailsFields.executeWorkflowAction(taskToExecute);

//   // HANDLE REJECT FLOW (UPDATED)
//   if (rejectedToStep) {

//     console.log(`🔁 Rejected → ${rejectedToStep}`);

//     // ✅ Reset execution count for that step
//     stepExecutionCount[rejectedToStep] = 0;

//     // ✅ Ensure rejected step exists in tasks list
//     const exists = tasks.find(t => t.step === rejectedToStep);

//     // if (!exists) {
//     //   console.warn(`Re-adding missing step: ${rejectedToStep}`);

//     //   tasks.push({
//     //     step: rejectedToStep,
//     //     // taskName: rejectedToStep, // fallback
//     //     taskName: `Step ${rejectedToStep}`,
//     //     action: 'approve' // default fallback
//     //   });
//     // }
//     if (!exists) {
//       console.warn(`Re-adding missing step: ${rejectedToStep}`);
//       const originalTask = myTasklistPage.allTasks.find(
//         t => t.step === rejectedToStep
//       );
//       if (!originalTask) {
//         throw new Error(`Original config not found for ${rejectedToStep}`);
//       }
//       tasks.push({ ...originalTask });
//     }



//     // ✅ Validate UI shows the rejected step
//     await myTasklistPage.validateTaskPresentByStep(requestNumber, rejectedToStep);
//   }

//   return { resolvedAction };
// }

// export async function executeWorkflowStep(
//   requestDetailsFields: RequestDetailsFieldsPage,
//   myTasklistPage: MyTasklistPage,
//   requestNumber: string,
//   task: Task,
//   tasks: Task[],
//   stepExecutionCount: Record<string, number>
// ): Promise<{ resolvedAction: string }> {

//   // Track execution count
//   stepExecutionCount[task.step] = (stepExecutionCount[task.step] || 0) + 1;

//   const executionCount = stepExecutionCount[task.step];

//   // Resolve action dynamically (Reject → Approve etc.)
//   const resolvedAction = resolveAction(task.action, executionCount);
//   console.log(`Step: ${task.step} | Execution: ${executionCount} | Action: ${resolvedAction}`);
//   const taskToExecute: Task = {...task,action: resolvedAction};

//   // Execute workflow action (UI)
//   const rejectedToStep = await requestDetailsFields.executeWorkflowAction(taskToExecute);

//   // HANDLE REJECT FLOW (FINAL FIX)
//   if (rejectedToStep) {
//     console.log(`🔁 Rejected → ${rejectedToStep}`);

//     // Find rejected step index in original flow
//     const rejectedIndex = myTasklistPage.allTasks.findIndex(t => t.step === rejectedToStep);
//     if (rejectedIndex === -1) {
//       throw new Error(`Rejected step not found in original flow: ${rejectedToStep}`);
//     }

//     //  CLEAR CURRENT TASK LIST
//     tasks.length = 0;

//     // REBUILD FULL FLOW FROM REJECTED STEP
//     const rebuiltFlow = myTasklistPage.allTasks.slice(rejectedIndex);
//     console.log(`Rebuilding workflow from ${rejectedToStep}:`,rebuiltFlow.map(t => t.step));
//     tasks.push(...rebuiltFlow);

//     // RESET execution counts for rebuilt steps
//     for (const t of rebuiltFlow) {
//       if (t.step !== task.step) {
//       stepExecutionCount[t.step] = 0;
//       }
//     }

//     // Validate UI shows rejected step
//     await myTasklistPage.validateTaskPresentByStep(requestNumber, rejectedToStep);
//   }

//   return { resolvedAction };
// }

// export async function executeWorkflowStep(
//   requestDetailsFields: RequestDetailsFieldsPage,
//   myTasklistPage: MyTasklistPage,
//   requestNumber: string,
//   task: Task,
//   tasks: Task[],
//   stepExecutionCount: Record<string, number>,
//   steps: any[]
// ): Promise<{ resolvedAction: string }> {

//   // Track execution count
//   stepExecutionCount[task.step] = (stepExecutionCount[task.step] || 0) + 1;

//   const executionCount = stepExecutionCount[task.step];

//   // Resolve action dynamically (Reject → Approve etc.)
//   const resolvedAction = resolveAction(task.action, executionCount);
//   console.log(`Step: ${task.step} | Execution: ${executionCount} | Action: ${resolvedAction}`);

//   const taskToExecute: Task = { ...task, action: resolvedAction };

//   // Execute workflow action (UI)
//   const rejectedToStep = await requestDetailsFields.executeWorkflowAction(taskToExecute);

//   // 🔥 HANDLE REJECT FLOW (UPDATED)
//   if (rejectedToStep) {

//     console.log(`🔁 Rejected → ${rejectedToStep}`);

//     // 🟡 STEP 1 SPECIAL HANDLING (NEW)
//     if (rejectedToStep === 'Step 1' || rejectedToStep === '1') {

//       console.log('👤 Reject to Request Creator → Mapping Step 1 to Step 0');

//       // const step0 = myTasklistPage.allTasks.find(t => t.step === 'Step 0');
//       const step0 = steps.find(s => s.stepNo === '0');
//       if (!step0) {
//         throw new Error('Step 0 config not found for Step 1 handling');
//       }

//       // Clear current tasks
//       tasks.length = 0;

//       // 👉 Inject Step 1 first
//       tasks.push({
//         step: 'Step 1',
//         taskName: step0.taskName,
//         action: 'Save' 
//       });

//       // 👉 Then continue full flow from beginning
//       tasks.push(...myTasklistPage.allTasks);

//       // Reset execution counts
//       stepExecutionCount['Step 1'] = 0;
//       for (const t of myTasklistPage.allTasks) {
//         stepExecutionCount[t.step] = 0;
//       }

//       await myTasklistPage.validateTaskPresentByStep(requestNumber, 'Step 1');

//       return { resolvedAction };
//     }

//     // 🟢 NORMAL REJECT FLOW (EXISTING LOGIC - SLIGHT FIX)

//     const rejectedIndex = myTasklistPage.allTasks.findIndex(
//       t => t.step === rejectedToStep
//     );

//     if (rejectedIndex === -1) {
//       throw new Error(`Rejected step not found in original flow: ${rejectedToStep}`);
//     }

//     // Clear current task list
//     tasks.length = 0;

//     // Rebuild flow from rejected step
//     const rebuiltFlow = myTasklistPage.allTasks.slice(rejectedIndex);

//     console.log(
//       `Rebuilding workflow from ${rejectedToStep}:`,
//       rebuiltFlow.map(t => t.step)
//     );

//     tasks.push(...rebuiltFlow);

//     // Reset execution counts
//     for (const t of rebuiltFlow) {
//       stepExecutionCount[t.step] = 0;
//     }

//     // Validate UI shows rejected step
//     await myTasklistPage.validateTaskPresentByStep(requestNumber, rejectedToStep);
//   }

//   return { resolvedAction };
// }

/**
 * Executes a single workflow step in a dynamic multi-step task execution engine.
 *
 * This function handles:
 * - Step execution sequencing
 * - Dynamic action resolution (save / approve / reject / multi-action flows)
 * - Retry-based action progression per step
 * - Reject-flow branching and task list restructuring
 * - Step execution state tracking
 *
 * Key behaviors:
 *
 * 1. Step 1 (Request Creator):
 *    - Always executed as "save"
 *    - Initializes workflow creation step
 *
 * 2. Normal Steps:
 *    - Tracks execution count per step
 *    - Resolves action dynamically using `resolveAction`
 *    - Executes workflow action
 *
 * 3. Reject Flow Handling:
 *    - If a step results in rejection:
 *      - Normalizes rejected step format (e.g., "1" → "Step 1")
 *      - Handles special case when rejection goes back to Step 1:
 *          - Resets task list to include full flow again
 *          - Resets execution counters
 *      - Handles general rejection:
 *          - Rebuilds task list starting from rejected step
 *          - Resets execution counters for remaining steps
 *      - Validates that rejected step exists in workflow
 *
 * 4. State Management:
 *    - Maintains `stepExecutionCount` for retry-aware execution
 *    - Mutates `tasks` array dynamically based on workflow changes
 *
 * @param requestDetailsFields Page object responsible for workflow actions.
 * @param myTasklistPage Page object representing task list operations.
 * @param requestNumber Unique request identifier.
 * @param task Current task being executed.
 * @param tasks Mutable list of remaining tasks in workflow.
 * @param stepExecutionCount Map tracking execution attempts per step.
 * @param steps Parsed step metadata from configuration (not directly used here).
 *
 * @returns Object containing:
 *          - resolvedAction: final resolved action executed for the step
 *
 * @throws Error If rejected step is not found in original workflow definition.
 *
 * Example:
 * const result = await executeWorkflowStep(...);
 */
export async function executeWorkflowStep(
  requestDetailsFields: RequestDetailsFieldsPage,
  myTasklistPage: MyTasklistPage,
  requestNumber: string,
  task: Task,
  tasks: Task[],
  stepExecutionCount: Record<string, number>,
  steps: any[]
): Promise<{ resolvedAction: string }> {

  // STEP 1 → ALWAYS SAVE
  if (task.step === 'Step 1') {
    logger.info('Executing Step 1 (Request Creator)');
    stepExecutionCount['Step 1'] = (stepExecutionCount['Step 1'] || 0) + 1;
    await requestDetailsFields.executeWorkflowAction({...task,action: 'save'});
    return { resolvedAction: 'save' };
  }
  // Normal execution tracking
  stepExecutionCount[task.step] = (stepExecutionCount[task.step] || 0) + 1;
  const executionCount = stepExecutionCount[task.step];
  const resolvedAction = resolveAction(task.action, executionCount);
  logger.info(`Step: ${task.step} | Execution: ${executionCount} | Action: ${resolvedAction}`);
  const taskToExecute: Task = { ...task, action: resolvedAction };
  const rejectedToStep = await requestDetailsFields.executeWorkflowAction(taskToExecute);
  if (rejectedToStep) {
    const normalizedRejectedStep = rejectedToStep.startsWith('Step')
    ? rejectedToStep
    : `Step ${rejectedToStep}`;
    logger.info(`Rejected → ${rejectedToStep}`);
    logger.info(`Normalized Reject Step → ${normalizedRejectedStep}`);
    // STEP 1 FLOW
    if (normalizedRejectedStep === 'Step 1' || normalizedRejectedStep === '1') {
      logger.info('Reject to Request Creator → Injecting Step 1');
      const alreadyExists = tasks.find(t => t.step === 'Step 1');
      if (!alreadyExists) {
        tasks.length = 0;
        tasks.push({step: 'Step 1',taskName: 'Request Creator',action: 'save'});
        tasks.push(...myTasklistPage.allTasks);
      }
      // FIXED COUNTS
      stepExecutionCount['Step 1'] = 0;
      for (const t of myTasklistPage.allTasks) {
        stepExecutionCount[t.step] = 1;
      }
      await myTasklistPage.validateTaskPresentByStep(requestNumber, 'Step 1');
      return { resolvedAction };
    }
    // NORMAL REJECT FLOW
    const rejectedIndex = myTasklistPage.allTasks.findIndex(t => t.step === normalizedRejectedStep);
    if (rejectedIndex === -1) {
      throw new Error(`Rejected step not found in original flow: ${normalizedRejectedStep}`);
    }
    tasks.length = 0;
    const rebuiltFlow = myTasklistPage.allTasks.slice(rejectedIndex);
    tasks.push(...rebuiltFlow);
    // FIXED COUNTS
    for (const t of rebuiltFlow) {
      stepExecutionCount[t.step] = 1; 
    }
    await myTasklistPage.validateTaskPresentByStep(requestNumber, normalizedRejectedStep);
  }
  return { resolvedAction };
}