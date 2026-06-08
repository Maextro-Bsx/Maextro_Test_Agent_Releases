module.exports = function (mainWindow) {
const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const { app: electronApp } = require('electron');
const UPDATE_SECRET = "maextro-secure-123";
const ENV_URLS = {
  DEV: 'https://maextro-tdd.launchpad.cfapps.eu10.hana.ondemand.com/site/Maextro?sap-ushell-config=headerless#Maextro-Display?sap-ui-app-id-hint=saas_approuter_bsxc.maextrohubui&/Dashboard',
  TEST: 'https://maextro-cloud-test.launchpad.cfapps.eu10.hana.ondemand.com/site/Maextro?sap-ushell-config=headerless#Maextro-Display?sap-ui-app-id-hint=saas_approuter_bsxc.maextrohubui&/Dashboard',
  SHS: 'https://shs-dev-x8j4td6e.launchpad.cfapps.eu10.hana.ondemand.com/site/Dev?sap-ushell-config=headerless#Maextro-Display?sap-ui-app-id-hint=saas_approuter_bsxc.maextrohubui&/Dashboard',
  McBride_Dev: 'https://mcbride-central-services-development-o7ue3478.launchpad.cfapps.eu10.hana.ondemand.com/site/Dev#Maextro-Display?sap-ui-app-id-hint=saas_approuter_bsxc.maextrohubui&/Dashboard',
  Glanbia:'https://glanbia-dev-nrenwr1j.launchpad.cfapps.eu10.hana.ondemand.com/site/Dev?sap-ushell-config=headerless#Maextro-Display?sap-ui-app-id-hint=saas_approuter_bsxc.maextrohubui&/Dashboard',
  Waterwipes_QA : 'https://waterwipes-quality-7al3en4g.launchpad.cfapps.eu10.hana.ondemand.com/site/UAT#Shell-home?sap-ui-app-id-hint=saas_approuter_bsxc.maextrohubui&/Dashboard',
};
const app = express();
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

// 🔥 fetch fix (works with node-fetch ESM)
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const multer = require('multer');

const isElectron = !!process.versions.electron;

let uploadsBasePath;
let baseAppPath;
const isPackaged = electronApp.isPackaged;

if (isPackaged) {
  baseAppPath = process.resourcesPath;
} else {
  baseAppPath = __dirname;
}
console.log('Base App Path:', baseAppPath);
const appRoot = isPackaged
  ? path.join(baseAppPath, 'app')
  : baseAppPath;
if (isElectron) {
  const { app } = require('electron');
  // ⚠️ Ensure app is ready before using getPath
  uploadsBasePath = app.getPath('userData');
  uploadsBasePath = path.join(uploadsBasePath, 'uploads');
} else {
  uploadsBasePath = path.join(__dirname, 'uploads');
}

// Ensure base uploads folder exists
if (!fs.existsSync(uploadsBasePath)) {
  fs.mkdirSync(uploadsBasePath, { recursive: true });
}

const upload = multer({ dest: uploadsBasePath });

app.use(bodyParser.json());
const uiPath = path.join(appRoot, 'ui');
app.use(express.static(uiPath));
app.get('/', (req, res) => {
  res.sendFile(path.join(uiPath, 'index.html'));
});
const reportsBasePath = path.join(uploadsBasePath, 'reports');

if (!fs.existsSync(reportsBasePath)) {
  fs.mkdirSync(reportsBasePath, { recursive: true });
}

app.use('/reports', express.static(reportsBasePath));

const PORT = 3000;
let isRunning = false;

app.get('/report', (req, res) => {
  const reportsDir = reportsBasePath;

  try {
    const folders = fs.readdirSync(reportsDir)
      .filter(name => name.startsWith('report-'))
      .sort((a, b) => b.localeCompare(a)); // latest first

    if (!folders.length) {
      return res.status(404).send('No reports found');
    }

    const latestReport = folders[0];

    res.redirect(`/reports/${latestReport}/index.html`);

  } catch (err) {
    res.status(500).send('Error loading report');
  }
});

app.get('/download-template/:env/:templateId', (req, res) => { 
  const { env, templateId } = req.params; 
  const filePath = path.join(appRoot, 'test-data', 'Templates', env, `${templateId}.xlsx`); 
  if (!fs.existsSync(filePath)) 
    { return res.status(404).send('Template not found'); } 
  res.download(filePath); 
});

app.get('/templates/:env', (req, res) => {
  const env = req.params.env;

  // Default system templates
  const systemTemplatePath = path.join(
    appRoot,
    'test-data',
    'Templates',
    env
  );

  // User recorded templates
  const userTemplatePath = path.join(
    electronApp.getPath('userData'),
    'user-templates',
    env
  );

  let systemTemplates = [];
  let userTemplates = [];

  if (fs.existsSync(systemTemplatePath)) {
    systemTemplates = fs.readdirSync(systemTemplatePath)
      .filter(f => f.endsWith('.xlsx'))
      .map(f => f.replace('.xlsx', ''));
  }

  if (fs.existsSync(userTemplatePath)) {
    userTemplates = fs.readdirSync(userTemplatePath)
      .filter(f => f.endsWith('.xlsx'))
      .map(f => f.replace('.xlsx', ''));
  }

  // Merge + remove duplicates
  const templates = [...new Set([
    ...systemTemplates,
    ...userTemplates
  ])].sort();

  res.json({
    templates,
    systemPath: systemTemplatePath,
    userPath: userTemplatePath
  });
});

app.post('/upload', upload.single('file'), (req, res) => {
  const { templateId, environment } = req.body;

  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  if (!templateId || !environment) {
    return res.status(400).send('Missing templateId or environment');
  }

  const uploadDir = path.join(uploadsBasePath, environment);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const targetPath = path.join(uploadDir, `${templateId}.xlsx`);

  fs.renameSync(req.file.path, targetPath);

  res.send('File uploaded successfully');
});

app.post('/record', (req, res) => {
  const { username, password, environment } = req.body;

  if (!username || !password || !environment) {
    return res.status(400).send('Missing required fields');
  }

  const targetUrl = ENV_URLS[environment];

  if (!targetUrl) {
    return res.status(400).send('Invalid environment selected');
  }

  const nodePath = process.execPath;
  const recorderScript = path.join(appRoot, 'runner', 'record-tests.js');

  console.log('Recorder Script:', recorderScript);

  const child = spawn(
    nodePath,
    [
      recorderScript,
      username,
      password,
      environment,
      targetUrl
    ],
    {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1"
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  function stripAnsi(text) {
    return text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
  }

  child.stdout.on('data', (data) => {
    const message = stripAnsi(data.toString());
    console.log(message);
    res.write(message);
  });

  child.stderr.on('data', (data) => {
    const message = stripAnsi(data.toString());
    console.error(message);
    res.write(message);
  });

  child.on('close', async (code) => {
    if (code !== 0) {
      res.write(`\nRecording failed with exit code ${code}\n`);
      res.end();
      return;
    }

    try {
      const tempFolderPath = path.join(appRoot, 'temp');

      if (!fs.existsSync(tempFolderPath)) {
        res.write('\nTemp folder not found\n');
        res.end();
        return;
      }

      const jsonPath = path.join(
        appRoot,
        'test-data',
        'recorded-template.json'
      );
      console.log('Looking for JSON at:', jsonPath);
      console.log('Exists:', fs.existsSync(jsonPath));
      if (!fs.existsSync(jsonPath)) {
        res.write('\nrecorded-template.json not found\n');
        res.end();
        return;
      }

      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const parsed = JSON.parse(raw);

      const rawTemplateName =
        parsed.headerData?.templateId || 'generated-template';

      const safeTemplateName = rawTemplateName
        .replace(/[\\/:*?"<>|]/g, '')
        .trim();

      const generatedFile =
        `${safeTemplateName}.xlsx`;

      const sourcePath = path.join(
        tempFolderPath,
        generatedFile
      );

      const finalFolderPath = path.join(
        electronApp.getPath('userData'),
        'user-templates',
        environment
      );

      if (!fs.existsSync(finalFolderPath)) {
        fs.mkdirSync(finalFolderPath, {
          recursive: true
        });
      }

      const finalPath = path.join(
        finalFolderPath,
        generatedFile
      );

      let shouldReplace = true;

      if (fs.existsSync(finalPath)) {
        console.log('Template already exists, asking user for confirmation to replace');
        const { dialog } = require('electron');

        const result = await dialog.showMessageBox(mainWindow, {
          type: 'warning',
          buttons: ['Replace', 'Cancel'],
          defaultId: 0,
          cancelId: 1,
          title: 'Template Already Exists',
          message: 'Template already exists.',
          detail: `Do you want to replace ${generatedFile}?`
        });

        shouldReplace = result.response === 0;
      }

      if (!shouldReplace) {
        res.write('\nTemplate save cancelled by user\n');
        res.end();
        return;
      }

      fs.copyFileSync(sourcePath, finalPath);
      console.log('✅ Sending ASK_SAVE_TEMPLATE event');
      res.write(`__ASK_SAVE_TEMPLATE__${sourcePath}::${finalPath}\n`);
      if (fs.existsSync(sourcePath)) {
        fs.unlinkSync(sourcePath);
      }
      res.write(`\nTemplate saved successfully → ${generatedFile}\n`);
      res.write('\nRecording completed successfully\n');

      res.end();

    } catch (err) {
      res.write(`\nFinal save failed: ${err.message}\n`);
      res.end();
    }
  });

  child.on('error', (err) => {
    res.write(`\nRecorder error: ${err.message}\n`);
    res.end();
  });
});

app.post('/run', (req, res) => {
  const { templateId, username, password, environment } = req.body;

  if (!templateId || !username || !password || !environment) {
    return res.status(400).send('Missing required fields');
  }

  if (isRunning) {
    return res.status(400).send('A test is already running.');
  }

  isRunning = true;

  const nodePath = process.execPath;
  const runnerScript = path.join(appRoot, 'runner', 'run-tests.js');
  console.log('Runner Script:', runnerScript);
  console.log('Runner exists:', fs.existsSync(runnerScript));

  const child = spawn(
    nodePath,
    [
      runnerScript,
      nodePath,
      templateId,
      username,
      password,
      environment,
      uploadsBasePath,
      ENV_URLS[environment]
    ],
    {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1"   // 🔥 THIS IS THE KEY FIX
    },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  console.log('Node Path:', nodePath);
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  function stripAnsi(text) {
    return text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
  }

  child.stdout.on('data', data => {
    res.write(stripAnsi(data.toString()));
  });

  child.stderr.on('data', data => {
    res.write(stripAnsi(data.toString()));
  });

  child.on('close', async (code) => {
    isRunning = false;

    if (code !== 0 && code !== 1) {
      res.write(`\nProcess finished with code ${code}\n`);
      res.end();
      return;
    }

    if (code === 1) {
      res.write(
        '\nExecution completed with test failures. Report is available.\n'
      );
    }

    try {
      const reportsDir = reportsBasePath;

      const reportFolders = fs.readdirSync(reportsDir)
        .filter(name => name.startsWith('report-'))
        .sort((a, b) => b.localeCompare(a));

      if (!reportFolders.length) {
        res.write('\nNo report folder found\n');
        res.end();
        return;
      }

      const latestReportFolder = reportFolders[0];
      const sourceReportPath = path.join(
        reportsDir,
        latestReportFolder
      );

      const { dialog } = require('electron');

      const saveCopyResult = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Save Copy', 'Skip'],
        defaultId: 0,
        cancelId: 1,
        title: 'Save Report Copy',
        message: 'Test execution completed successfully.',
        detail: 'Would you like to save a copy of this report?'
      });

      if (saveCopyResult.response === 0) {
        const folderDialog = await dialog.showOpenDialog({
          title: 'Select Folder to Save Report',
          properties: ['openDirectory', 'createDirectory']
        });

        if (!folderDialog.canceled && folderDialog.filePaths.length > 0) {
          const selectedFolder = folderDialog.filePaths[0];

          const finalReportPath = path.join(
            selectedFolder,
            latestReportFolder
          );

          fs.cpSync(
            sourceReportPath,
            finalReportPath,
            { recursive: true }
          );

          res.write(
            `\nReport copy saved → ${finalReportPath}\n`
          );
          res.write(`__SAVE_REPORT__${finalReportPath}\n`);
        }
      }

      res.write(`\nProcess finished successfully\n`);
      res.end();

    } catch (err) {
      res.write(`\nReport save failed: ${err.message}\n`);
      res.end();
    }
  });

  child.on('error', err => {
    isRunning = false;
    res.write(`\nSpawn error: ${err.message}\n`);
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`UI running at http://localhost:${PORT}`);
});


}