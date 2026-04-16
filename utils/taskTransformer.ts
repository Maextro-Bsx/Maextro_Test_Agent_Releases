import { logger } from "./logger";

export type Task = {
  step: string;
  taskName: string;
  dependency: string | null ,
  action: string;
};

export class TaskTransformer {

  /**
   * Builds a Task matrix from validation rows typically parsed from an Excel sheet.
   *
   * This function transforms a row-based validation structure into a structured
   * list of Task objects aligned by step columns (e.g., Step 100, Step 200).
   *
   * Expected input format:
   * - Each row represents a category such as:
   *   - "Task Name"
   *   - "Dependency"
   *   - "Workflow action"
   * - Each column (except "Expected Task") represents a step.
   *
   * Steps:
   * 1. Validate that validation rows exist.
   * 2. Locate required rows:
   *    - Task Name row
   *    - Dependency row (optional)
   *    - Workflow action row
   * 3. Extract all step columns dynamically (excluding "Expected Task").
   * 4. Iterate through each step column.
   * 5. For each step:
   *    - Extract task name, dependency, and action values.
   *    - Apply defaults where needed (e.g., action defaults to "save").
   *    - Skip entries with empty task names.
   * 6. Construct and return a list of Task objects.
   *
   * @param validationRows Array of row objects representing validation matrix data.
   *
   * @returns Array of Task objects containing:
   *          - step: Step identifier (e.g., "Step 100")
   *          - taskName: Name of the task
   *          - dependency: Optional dependency step
   *          - action: Workflow action (default: "save")
   *
   * @throws Error If validation section or required rows are missing.
   *
   * Example:
   * const tasks = TaskBuilder.buildTaskMatrix(validationRows);
   */
  static buildTaskMatrix(validationRows: Record<string, string>[]): Task[] {

    if (!validationRows || validationRows.length === 0) {
      throw new Error('Validation section is empty');
    }
    // Find required rows
    const taskRow = validationRows.find( r => r["Expected Task"]?.trim() === "Task Name");
    const dependencyRow = validationRows.find(r => r["Expected Task"]?.trim() === "Dependency");
    const actionRow = validationRows.find(r => r["Expected Task"]?.trim() === "Workflow action");
    if (!taskRow) {
      throw new Error('Task Name row not found in validation section');
    }
    if (!actionRow) {
    throw new Error('Workflow action row not found in validation section');
    }
    // Extract dynamic steps (Step 100, Step 200, etc.)
    const steps = Object.keys(taskRow).filter(key => key !== "Expected Task");
    const tasks: Task[] = [];
    for (const step of steps) {
      const rawTaskName = taskRow[step];
      const rawDependency = dependencyRow?.[step];
      const rawAction = actionRow?.[step];
      const taskName = rawTaskName ? rawTaskName.trim() : '';
      const dependency = rawDependency ? rawDependency.trim() : null;
      const action = rawAction ? rawAction.trim() : 'save';
      // Skip empty task cells (important for flexible Excel)
      if (!taskName) continue;
      tasks.push({step: step.trim(),taskName,dependency,action});
    }
    return tasks;
  }

  /**
   * Logs a formatted representation of a Task matrix for debugging and traceability.
   *
   * This utility prints task execution details in a readable structure,
   * helping to verify parsed workflow data before execution.
   *
   * Steps:
   * 1. Log a header separator for clarity.
   * 2. Iterate through each task in the provided array.
   * 3. Print task details in a structured format:
   *    - Step
   *    - Task name
   *    - Dependency
   *    - Action
   * 4. Log a closing separator line.
   *
   * Note:
   * - Uses console.log for row-level output for better readability.
   * - Uses logger.info for section-level grouping.
   *
   * @param tasks Array of Task objects to be logged.
   *
   * @returns void
   *
   * Example:
   * TaskUtils.logTasks(tasks);
   */
  static logTasks(tasks: Task[]): void {
    logger.info('---------- TASK MATRIX ----------');
    tasks.forEach(task => {
      console.log(
        `Step: ${task.step} | Task: ${task.taskName} | Dependency: ${task.dependency} | Action: ${task.action}`
      );
    });
    logger.info('--------------------------------');
  }
}
