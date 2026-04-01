import * as fs from 'fs';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'test.log');

// Ensure logs folder exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const getTime = () =>
  new Date().toISOString().replace('T', ' ').split('.')[0];

function writeToFile(message: string) {
  fs.appendFileSync(logFile, message + '\n');
}

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