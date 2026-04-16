import { logger } from "@utils/logger";

export type Task = {
  step: string;
  taskName: string;
  action: string;
  rejectingTo?: string;

};

export class TaskBuilder {

  /**
   * Builds a list of Task objects from parsed header step data.
   *
   * This function converts raw step metadata (usually parsed from Excel)
   * into a normalized Task structure used for workflow execution.
   *
   * Steps:
   * 1. Validate that step data exists.
   * 2. Initialize an empty Task list.
   * 3. Iterate through each step entry.
   * 4. Skip Step "0" as it is handled separately in the workflow.
   * 5. Validate required fields (stepNo and taskType).
   * 6. Ignore invalid or incomplete step definitions.
   * 7. Map each valid step into a Task object:
   *    - step: formatted as "Step X"
   *    - taskName: trimmed task type
   *    - action: trimmed action or default "save"
   *    - rejectingTo: optional rejection target step
   * 8. Return the constructed Task array.
   *
   * @param steps Array of raw step objects parsed from header data.
   *
   * @returns Array of normalized Task objects for workflow execution.
   *
   * @throws Error If no steps are provided.
   *
   * Example:
   * const tasks = HeaderParser.buildFromHeader(parsedSteps);
   */
  static buildFromHeader(steps: any[]): Task[] {

    if (!steps || steps.length === 0) {
      throw new Error('No steps found in header');
    }
    const tasks: Task[] = [];
    for (const step of steps) {
      if (step.stepNo === '0') continue;
      if (!step.stepNo || !step.taskType) {
        logger.warn(`Skipping invalid step: ${JSON.stringify(step)}`);
        continue;
      }
      tasks.push({
        step: `Step ${step.stepNo}`,
        taskName: step.taskType.trim(),
        action: step.action?.trim() || 'save' ,
        rejectingTo: step.rejectingTo?.toString().trim()
      });
    }
    return tasks;
  }

  /**
   * Debug helper
   */
  static logTasks(tasks: Task[]): void {
    logger.info('---------- GENERATED TASKS ----------');
    tasks.forEach(task => {
      console.log(`Step: ${task.step} | Task: ${task.taskName} | Action: ${task.action}`);
    });
    logger.info('-----------------------------------');
  }
}