const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 🔥 INPUTS
const nodePath = process.argv[2];
const templateId = process.argv[3];
const username = process.argv[4];
const password = process.argv[5];
const environment = process.argv[6];
const uploadsPath = process.argv[7];
const baseUrl = process.argv[8];

// 🔥 BASE PATH (works for packaged app)
const basePath = path.join(__dirname, '..');

// 🔥 PATHS
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

// 🔥 DEBUG LOGS
console.log('RUNNER STARTED');
console.log('BasePath:', basePath);
console.log('CLI:', playwrightCli);
console.log('CLI exists:', fs.existsSync(playwrightCli));
console.log('Test:', testPath);
console.log('Test exists:', fs.existsSync(testPath));

// =======================================================
// ✅ STEP 1: Install browsers ONLY if missing
// =======================================================

const browsersPath = path.join(
  os.homedir(),
  'Library',
  'Caches',
  'ms-playwright'
);

const browserExists = fs.existsSync(browsersPath);

if (!browserExists) {
  console.log('First time setup: Installing Playwright browsers...');

  const install = spawnSync(
    nodePath,
    [playwrightCli, 'install', 'chromium'], // only chromium
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
  } else {
    console.log('Browsers installed successfully ✅');
  }
} else {
  console.log('Browsers already available ✅');
}

// =======================================================
// ✅ STEP 2: Run Playwright Test
// =======================================================

const child = spawn(
  nodePath,
  [playwrightCli, 'test', testPath, '--config=playwright.config.ts'],
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