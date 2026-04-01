import { Task } from './taskTransformer';
import { RequestDetailsFieldsPage } from '@pages/RequestDetailsFields_Page';
import { MyTasklistPage } from '@pages/MyTasklist_Page';

/**
 * Resolves action dynamically based on execution count.
 * Supports multi-action flow using "→"
 *
 * Example:
 * "Reject → Approve"
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
export async function executeWorkflowStep(
  requestDetailsFields: RequestDetailsFieldsPage,
  myTasklistPage: MyTasklistPage,
  requestNumber: string,
  task: Task,
  tasks: Task[],
  stepExecutionCount: Record<string, number>
): Promise<{resolvedAction:string}> {

  // 🔹 Track execution count
  stepExecutionCount[task.step] = (stepExecutionCount[task.step] || 0) + 1;

  const executionCount = stepExecutionCount[task.step];

  // 🔹 Resolve action dynamically
  const resolvedAction = resolveAction(task.action, executionCount);

  console.log(`🚀 Step: ${task.step} | Execution: ${executionCount} | Action: ${resolvedAction}`);

  // 🔹 Clone task with resolved action
  const taskToExecute: Task = {
    ...task,
    action: resolvedAction
  };

  // 🔹 Execute workflow action (UI)
  const rejectedToStep = await requestDetailsFields.executeWorkflowAction(taskToExecute);

  // 🔥 Handle reject flow
  if (rejectedToStep) {

    console.log(`🔁 Rejected → ${rejectedToStep}`);

    // Reset execution state
    myTasklistPage.resetExecutionFromStep(rejectedToStep);

    // Re-add rejected step into task queue
    myTasklistPage.reAddTask(tasks, rejectedToStep);

    // Validate UI shows the rejected step
    await myTasklistPage.validateTaskPresentByStep(requestNumber, rejectedToStep);
  }
  return {resolvedAction};
}