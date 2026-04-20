const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const { app: electronApp } = require('electron');
const UPDATE_SECRET = "maextro-secure-123";
const ENV_URLS = {
  DEV: 'https://maextro-tdd.launchpad.cfapps.eu10.hana.ondemand.com/site/Maextro?sap-ushell-config=headerless#Maextro-Display?sap-ui-app-id-hint=saas_approuter_bsxc.maextrohubui&/Dashboard',
  TEST: 'https://test-url...',
  SHS: 'https://shs-url...'
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
const isPackaged = !process.defaultApp;

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
  const folderPath = path.join(appRoot, 'test-data', 'Templates', req.params.env);
  console.log('Templates folder path:', folderPath);
  if (!fs.existsSync(folderPath)) {
    // return res.status(404).send(`Folder not found`);
    return res.status(404).json({
    error: 'Folder not found',
    path: folderPath,
    exists: fs.existsSync(folderPath)
    });
  }

  const files = fs.readdirSync(folderPath);

  const templates = files
    .filter(f => f.endsWith('.xlsx'))
    .map(f => f.replace('.xlsx', ''));

  // res.json(templates);
  res.json({
  templates,
  path: folderPath,
  exists: true
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

  child.on('close', code => {
    isRunning = false;
    res.write(`\nProcess finished with code ${code}\n`);
    res.end();
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