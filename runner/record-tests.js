const { spawn } = require('child_process');
const path = require('path');

(async () => {

  const username = process.argv[2];
  const password = process.argv[3];
  const environment = process.argv[4];
  const targetUrl = process.argv[5];

  console.log(`
====================================
 TEMPLATE RECORDER STARTED
====================================
Environment: ${environment}
URL: ${targetUrl}
====================================
`);

  const projectRoot = path.resolve(__dirname, '..');

  // ✅ FIXED: use actual Node binary
  const nodePath = process.execPath;

  // ✅ Playwright CLI path
  const playwrightCli = path.join(
    projectRoot,
    'node_modules',
    '@playwright',
    'test',
    'cli.js'
  );

  // ✅ Test paths
  const recorderTest = path.join(
    projectRoot,
    'tests',
    'Recorder',
    'TC_TemplateRecorder.spec.ts'
  );

  const excelGeneratorTest = path.join(
    projectRoot,
    'tests',
    'Recorder',
    'TC_GenerateExcel.spec.ts'
  );

  function runPlaywrightTest(testFile) {
    return new Promise((resolve, reject) => {
      console.log(`Running: ${testFile}`);

      const child = spawn(
        nodePath, // ✅ FIXED (no npx)
        [playwrightCli, 'test', testFile],
        {
          cwd: projectRoot,
          stdio: 'inherit',
          env: {
            ...process.env,
            RECORD_USERNAME: username,
            RECORD_PASSWORD: password,
            RECORD_ENVIRONMENT: environment,
            RECORD_URL: targetUrl,
            ELECTRON_RUN_AS_NODE: "1" // ✅ IMPORTANT
          }
        }
      );

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`Success: ${testFile}`);
          resolve();
        } else {
          reject(
            new Error(
              `Playwright test failed: ${testFile} (code ${code})`
            )
          );
        }
      });

      child.on('error', reject);
    });
  }

  try {
    // ✅ recorder
    await runPlaywrightTest(recorderTest);

    console.log(`
====================================
 RECORDING COMPLETED
Generating Excel...
====================================
`);

    // ✅ excel generation
    await runPlaywrightTest(excelGeneratorTest);

    console.log(`
====================================
 EXCEL GENERATED SUCCESSFULLY
====================================
`);

    process.exit(0);

  } catch (err) {
    console.error(`
====================================
 RECORDING FAILED
====================================
${err.message}
====================================
`);
    process.exit(1);
  }

})();