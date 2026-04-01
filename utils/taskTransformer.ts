export type Task = {
  step: string;
  taskName: string;
  dependency: string | null ,
  action: string;
};

export class TaskTransformer {

/**
 * Builds a structured task matrix from validation rows.
 *
 * Steps:
 * 1. Validates input data is not empty
 * 2. Finds required rows (Task Name, Dependency, Workflow action)
 * 3. Extracts dynamic step columns (e.g., Step 100, Step 200)
 * 4. Iterates through each step and reads corresponding values
 * 5. Trims and normalizes task data
 * 6. Skips empty task անուն cells
 * 7. Constructs and returns a list of Task objects
 *
 * @param validationRows - Array of validation row objects from input (e.g., Excel)
 * @returns Array of structured Task objects
 *
 * Example:
 * const tasks = buildTaskMatrix(validationRows);
 */
  static buildTaskMatrix(validationRows: Record<string, string>[]): Task[] {

    if (!validationRows || validationRows.length === 0) {
      throw new Error('Validation section is empty');
    }

    // 🔍 Find required rows
    const taskRow = validationRows.find( r => r["Expected Task"]?.trim() === "Task Name");
    const dependencyRow = validationRows.find(r => r["Expected Task"]?.trim() === "Dependency");
    const actionRow = validationRows.find(r => r["Expected Task"]?.trim() === "Workflow action");
    if (!taskRow) {
      throw new Error('Task Name row not found in validation section');
    }
    if (!actionRow) {
    throw new Error('Workflow action row not found in validation section');
    }
    // 🔹 Extract dynamic steps (Step 100, Step 200, etc.)
    const steps = Object.keys(taskRow).filter(key => key !== "Expected Task");
    const tasks: Task[] = [];

    for (const step of steps) {

      const rawTaskName = taskRow[step];
      const rawDependency = dependencyRow?.[step];
      const rawAction = actionRow?.[step];

      const taskName = rawTaskName ? rawTaskName.trim() : '';
      const dependency = rawDependency ? rawDependency.trim() : null;
      const action = rawAction ? rawAction.trim() : 'save';

      // ✅ Skip empty task cells (important for flexible Excel)
      if (!taskName) continue;

      tasks.push({step: step.trim(),taskName,dependency,action});
    }
    return tasks;
  }

 /**
 * Logs the task matrix in a readable format.
 *
 * Steps:
 * 1. Prints header separator
 * 2. Iterates through each task
 * 3. Logs step, task name, dependency, and action
 * 4. Prints footer separator
 *
 * @param tasks - Array of Task objects to be logged
 *
 * Example:
 * logTasks(tasks);
 */
  static logTasks(tasks: Task[]): void {
    console.log('---------- TASK MATRIX ----------');

    tasks.forEach(task => {
      console.log(
        `Step: ${task.step} | Task: ${task.taskName} | Dependency: ${task.dependency} | Action: ${task.action}`
      );
    });

    console.log('--------------------------------');
  }
}
