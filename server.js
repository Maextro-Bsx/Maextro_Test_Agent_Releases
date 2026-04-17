const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const APP_VERSION = "1.0.0"; // 🔥 bump this on every release
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
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());
app.use(express.static('ui'));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

const PORT = 3000;
let isRunning = false;


app.get('/report', (req, res) => {
  const reportsDir = path.join(__dirname, 'reports');

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

app.get('/download/maextro.zip', (req, res) => {
  const key = req.query.key;
  console.log('Download request received');
  if (key !== UPDATE_SECRET) {
    console.log('Unauthorized access');
    return res.status(403).send('Unauthorized');
  }
  const filePath = path.join(__dirname, 'updates', 'maextro.zip');
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return res.status(404).send('File not found');
  }
  console.log('Sending file...');
  return res.download(filePath);
});

app.get('/version', (req, res) => {
  res.json({
    version: "1.0.1", // 🔥 keep in sync with APP_VERSION
    url: "http://192.168.50.10:3000/download/maextro.zip?key=maextro-secure-123"
  });
});

// 🔥 AUTO UPDATE
app.post('/update', async (req, res) => {
  try {
    res.write('Checking for updates...\n');

    const versionRes = await fetch('http://192.168.128.188:3000/version');
    const data = await versionRes.json();

    const latestVersion = data.version;
    const zipUrl = data.url;

    res.write(`Current version: ${APP_VERSION}\n`);
    res.write(`Latest version: ${latestVersion}\n`);

    if (APP_VERSION === latestVersion) {
      res.write('Already up to date ✅\n');
      return res.end();
    }

    res.write('Update available 🚀\n');

    // 🔥 DOWNLOAD
    res.write('Downloading update...\n');
    const zipPath = path.join(__dirname, 'update.zip');

    const response = await fetch(zipUrl);
    if (!response.ok) throw new Error('Download failed');

    const fileStream = fs.createWriteStream(zipPath);

    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', reject);
      fileStream.on('finish', resolve);
    });

    res.write('Download complete ✅\n');

    // 🔥 EXTRACT
    res.write('Extracting update...\n');
    const tempDir = path.join(__dirname, 'temp-update');

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    fs.mkdirSync(tempDir);

    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: tempDir }))
      .promise();

    res.write('Extraction complete ✅\n');

    // 🔥 APPLY UPDATE
    res.write('Applying update...\n');

    function copyRecursive(src, dest) {
      const entries = fs.readdirSync(src, { withFileTypes: true });

      for (let entry of entries) {
        // 🔥 skip dangerous files
        if (
          entry.name === 'node_modules' ||
          entry.name === 'update.zip' ||
          entry.name === 'temp-update' ||
          entry.name === '__MACOSX' 
        ) continue;

        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath);
          }
          copyRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }

    copyRecursive(tempDir, __dirname);

    res.write('Update applied successfully ✅\n');

    // 🔥 CLEANUP
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });

    res.write('Restarting application...\n');
    res.write('UPDATE_COMPLETE\n');
    res.end();
    // 🔥 AUTO RESTART
    spawn('node', ['server.js'], {
      cwd: __dirname,
      detached: true,
      stdio: 'inherit'
    });

    process.exit(0);

  } catch (err) {
    res.write('Update failed: ' + err.message + '\n');
    res.end();
  }
});

app.get('/templates/:env', (req, res) => {
  const folderPath = path.join(__dirname, 'test-data', 'Templates', req.params.env);

  if (!fs.existsSync(folderPath)) {
    return res.status(404).send(`Folder not found`);
  }

  const files = fs.readdirSync(folderPath);

  const templates = files
    .filter(f => f.endsWith('.xlsx'))
    .map(f => f.replace('.xlsx', ''));

  res.json(templates);
});

app.post('/upload', upload.single('file'), (req, res) => {
  const { templateId, environment } = req.body;

  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  if (!templateId || !environment) {
    return res.status(400).send('Missing templateId or environment');
  }

  const uploadDir = path.join(__dirname, 'uploads', environment);

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

  const child = spawn('npx', [
    'playwright',
    'test',
    'tests/Workflow/TC_Workflow.spec.ts'
  ], {
    env: {
      ...process.env,
      TEMPLATE_ID: templateId,
      USERNAME: username,
      PASSWORD: password,
      ENVIRONMENT: environment,
      BASE_URL: ENV_URLS[environment]
    },
    shell: true
  });

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  function stripAnsi(text) {
    return text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
  }

  child.stdout.on('data', data => res.write(stripAnsi(data.toString())));
  child.stderr.on('data', data => res.write(stripAnsi(data.toString())));

  child.on('close', code => {
    isRunning = false;
    res.write(`\nProcess finished with code ${code}\n`);
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`UI running at http://localhost:${PORT}`);
});