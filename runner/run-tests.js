const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ✅ FIXED node path
const nodePath = process.execPath;

// INPUTS
const templateId = process.argv[3];
const username = process.argv[4];
const password = process.argv[5];
const environment = process.argv[6];
const uploadsPath = process.argv[7];
const baseUrl = process.argv[8];

// BASE PATH
const basePath = path.join(__dirname, '..');

// PATHS
const playwrightCli = path.join(
  basePath,
  'node_modules',
  '@playwright',
  'test',
  'cli.js'
);

const testPath = path.join(
  basePath,
  'tests',
  'Workflow',
  'TC_WorkflowExecution.spec.ts'
);

const configPath = path.join(basePath, 'playwright.config.ts');

// DEBUG
console.log('RUNNER STARTED');
console.log('BasePath:', basePath);
console.log('CLI exists:', fs.existsSync(playwrightCli));
console.log('Test exists:', fs.existsSync(testPath));

// ============================
// INSTALL BROWSERS IF NEEDED
// ============================

const browsersPath = path.join(
  os.homedir(),
  'Library',
  'Caches',
  'ms-playwright'
);

if (!fs.existsSync(browsersPath)) {
  console.log('Installing browsers...');
  const install = spawnSync(
    nodePath,
    [playwrightCli, 'install', 'chromium'],
    {
      stdio: 'inherit',
      cwd: basePath,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1"
      }
    }
  );

  if (install.status !== 0) {
    console.error('Browser install failed ❌');
    process.exit(1);
  }
}

// ============================
// RUN TEST
// ============================

const child = spawn(
  nodePath,
  [playwrightCli, 'test', testPath, `--config=${configPath}`],
  {
    cwd: basePath,
    env: {
      ...process.env,
      USER_DATA_PATH: uploadsPath,
      TEMPLATE_ID: templateId,
      USERNAME: username,
      PASSWORD: password,
      ENVIRONMENT: environment,
      BASE_URL: baseUrl,
      ELECTRON_RUN_AS_NODE: "1"
    },
    stdio: 'inherit'
  }
);

child.on('close', code => process.exit(code));
