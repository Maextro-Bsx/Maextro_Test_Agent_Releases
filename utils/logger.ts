import * as fs from 'fs';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'test.log');

// Ensure logs folder exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const getTime = () => new Date().toISOString().replace('T', ' ').split('.')[0];

/**
 * Appends a log message to a log file.
 *
 * This function is responsible for persisting log output to disk.
 * It writes each message as a new line in the configured log file.
 *
 * Steps:
 * 1. Receives a formatted log message string.
 * 2. Appends the message to the log file synchronously.
 * 3. Adds a newline character after each entry for readability.
 *
 * Note:
 * - Uses synchronous file writing (appendFileSync), which ensures logs
 *   are written immediately but may block the event loop briefly.
 * - Suitable for test automation logging and small-to-medium log volume.
 *
 * @param message The formatted log message to be written to file.
 *
 * @returns void
 *
 * Example:
 * writeToFile('[2026-04-16 10:00:00] [INFO] Test started');
 */
function writeToFile(message: string) {
  fs.appendFileSync(logFile, message + '\n');
}

/**
 * Simple custom logger utility for console and file logging.
 *
 * This logger provides three log levels:
 * - INFO: General application flow logs
 * - WARN: Warning-level logs for non-critical issues
 * - ERROR: Error-level logs for failures and exceptions
 *
 * Each log entry:
 * 1. Prepends a timestamp using getTime().
 * 2. Adds a log level tag (INFO / WARN / ERROR).
 * 3. Prints the formatted message to the console.
 * 4. Persists the log entry into a file using writeToFile().
 *
 * Note:
 * - Console methods differ per level (console.log / warn / error).
 * - File logging is shared across all levels.
 *
 * @returns Logger object with info, warn, and error methods.
 *
 * Example:
 * logger.info('Execution started');
 * logger.warn('Optional field missing');
 * logger.error('Test failed due to timeout');
 */
export const logger = {
  info: (msg: string) => {
    const message = `[${getTime()}] [INFO] ${msg}`;
    console.log(message);
    writeToFile(message);
  },
  
  warn: (msg: string) => {
    const message = `[${getTime()}] [WARN] ${msg}`;
    console.warn(message);
    writeToFile(message);
  },

  error: (msg: string) => {
    const message = `[${getTime()}] [ERROR] ${msg}`;
    console.error(message);
    writeToFile(message);
  }
};