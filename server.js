const express = require('express');
const bodyParser = require('body-parser');
const { spawn, exec } = require('child_process');

const ENV_URLS = {
  DEV: 'https://maextro-tdd.launchpad.cfapps.eu10.hana.ondemand.com/site/Maextro?sap-ushell-config=headerless#Maextro-Display?sap-ui-app-id-hint=saas_approuter_bsxc.maextrohubui&/Dashboard',
  TEST: 'https://test-url...',
  SHS: 'https://shs-url...'
};
const app = express();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const upload = multer({
  dest: 'uploads/' // temp storage
});

app.use(bodyParser.json());
app.use(express.static('ui'));
app.use('/reports', express.static(path.join(__dirname, 'reports')));
const PORT = 3000;
let isRunning = false;

// UPDATE BUTTON
app.post('/update', (req, res) => {
  exec('git pull && npm install', (err, stdout, stderr) => {
    if (err) return res.send(stderr || err.message);
    res.send(stdout);
  });
});


app.get('/templates/:env', (req, res) => {
  const { env } = req.params;

  const folderPath = path.join(__dirname, 'test-data', 'Templates', env);

  console.log('Env:', env);
  console.log('Path:', folderPath);

  if (!fs.existsSync(folderPath)) {
    return res.status(404).send(`Folder not found: ${env}`);
  }

  try {
    const files = fs.readdirSync(folderPath);

    const templates = files
      .filter(file => file.endsWith('.xlsx'))
      .map(file => file.replace('.xlsx', ''));

    res.json(templates);

  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to read templates');
  }
});

// RUN BUTTON (🔥 LIVE LOG STREAMING FIXED)
app.post('/run', (req, res) => {
  const { templateId, username, password , environment } = req.body;

  if (!templateId || !username || !password || !environment) {
    return res.status(400).send('Missing required fields');
  }

  if (isRunning) {
    return res.status(400).send('A test is already running. Please wait.');
  }

  isRunning = true;

  console.log(`Running test for template: ${templateId}`);

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

  // 🔥 CRITICAL FOR LIVE STREAM
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.flushHeaders?.();

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  function stripAnsi(text) {
    return text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
  }
  child.stdout.on('data', (data) => {
    res.write(stripAnsi(data));
  });
  child.stderr.on('data', (data) => {
    res.write(stripAnsi(data));
  });

  child.on('close', (code) => {
    isRunning = false;
    res.write(`\n\nProcess finished with code ${code}\n`);
    res.end();
  });
});


// app.get('/report', (req, res) => {
//   const reportPath = path.join(__dirname, 'playwright-report', 'index.html');

//   res.sendFile(reportPath);
// });

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
    // const reportPath = path.join(reportsDir, latestReport, 'index.html');
    // res.sendFile(reportPath);
  } catch (err) {
    res.status(500).send('Error loading report');
  }
});

app.get('/download-template/:env/:templateId', (req, res) => {
  const { env, templateId } = req.params;
  const filePath = path.join(__dirname, 'test-data', 'Templates', env, `${templateId}.xlsx`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Template not found');
  }
  res.download(filePath);
});

app.post('/upload', upload.single('file'), (req, res) => {
  const { templateId, environment } = req.body;
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }
  if (!templateId || !environment) {
    return res.status(400).send('Missing templateId or environment');
  }
  // ✅ Create env-specific upload folder
  const uploadDir = path.join(__dirname, 'uploads', environment);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  // ✅ Save file as templateId.xlsx
  const targetPath = path.join(uploadDir, `${templateId}.xlsx`);
  fs.renameSync(req.file.path, targetPath);
  res.send('File uploaded successfully');
});



app.listen(PORT, () => {
  console.log(`UI running at http://localhost:${PORT}`);
});