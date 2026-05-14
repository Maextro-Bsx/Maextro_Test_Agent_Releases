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

  // Step 1 — Run Template Recorder Test
  const recorderTest = path.join(
    projectRoot,
    'tests',
    'Recorder',
    'TC_TemplateRecorder.spec.ts'
  );

  // Step 2 — Run Excel Generator Test
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
        'npx',
        ['playwright', 'test', testFile],
        {
          cwd: projectRoot,
          shell: true,
          stdio: 'inherit',
          env: {
            ...process.env,
            RECORD_USERNAME: username,
            RECORD_PASSWORD: password,
            RECORD_ENVIRONMENT: environment,
            RECORD_URL: targetUrl
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

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  try {
    // Run recorder flow
    await runPlaywrightTest(recorderTest);

    console.log(`
====================================
 RECORDING COMPLETED
Generating Excel...
====================================
`);

    // Generate Excel from JSON
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