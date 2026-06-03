let lastSavedTemplatePath = '';
let lastSavedReportPath = '';

function setLoading(isLoading, message = "⏳ Processing...") {
  const loader = document.getElementById('loader');
  const runBtn = document.getElementById('runBtn');
  const updateBtn = document.getElementById('updateBtn');

  loader.innerText = message;
  loader.style.display = isLoading ? 'block' : 'none';

  runBtn.disabled = isLoading;
  updateBtn.disabled = isLoading;
}

function log(message, type = 'normal') {
  const output = document.getElementById('output');

  const prefix = {
    normal: '',
    success: '✅ ',
    error: '❌ ',
    info: 'ℹ️ '
  };

  output.innerText += prefix[type] + message;
  output.scrollTop = output.scrollHeight;
}

function showError(id, message) {
  const input = document.getElementById(id);
  const error = document.getElementById(id + 'Error');

  input.style.border = '1px solid red';
  error.innerText = message;
  error.style.display = 'block';
}

function clearError(id) {
  const input = document.getElementById(id);
  const error = document.getElementById(id + 'Error');

  input.style.border = '1px solid #ccc';
  error.style.display = 'none';
}

function showFileError(message) {
  const el = document.getElementById('fileError');
  el.innerText = message;
  el.style.display = 'block';
}

function clearFileError() {
  const el = document.getElementById('fileError');
  el.innerText = '';
  el.style.display = 'none';
}


function validateInputs(templateId, username, password, environment) {
  let isValid = true;
  if (!username) {
    showError('runUsername', 'Username is required');
    isValid = false;
  }
  if (!password) {
    showError('runPassword', 'Password is required');
    isValid = false;
  }
  if (!environment) {
    showError('runEnvironment', 'Environment is required');
    isValid = false;
  }
  if (!templateId) {
    showError('runTemplateId', 'Template is required');
    isValid = false;
  }
  return isValid;
}

function checkFormValidity() {
  const username = document.getElementById('runUsername').value.trim();
  const password = document.getElementById('runPassword').value.trim();
  const environment = document.getElementById('runEnvironment').value.trim();
  const templateId = document.getElementById('runTemplateId').value.trim();
  const fileInput = document.getElementById('excelFile');
  const hasFile = fileInput.files && fileInput.files.length > 0;
  const runBtn = document.getElementById('runBtn');
  const recordBtn = document.getElementById('recordBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const recordUsername = document.getElementById('recordUsername').value.trim();
  const recordPassword = document.getElementById('recordPassword').value.trim();
  const recordEnvironment = document.getElementById('recordEnvironment').value.trim();
  runBtn.disabled = !(
    username &&
    password &&
    environment &&
    templateId &&
    hasFile
  );

  recordBtn.disabled = !(
    recordUsername &&
    recordPassword &&
    recordEnvironment
  );

  downloadBtn.disabled = !(
    environment &&
    templateId
  );

}

let isCheckingUpdate = false;
async function update() {
  if (isCheckingUpdate) return; // 🔥 prevent double click
  const output = document.getElementById('output');
  output.innerText = '';
  isCheckingUpdate = true;
  setLoading(true, "🔄 Checking for updates...");
  try {
    window.electronAPI.checkForUpdates();
    setTimeout(() => {
          setLoading(false);
          isCheckingUpdate = false;
        }, 3000)

  } catch (err) {
    log('Update failed: ' + err.message + '\n', 'error');
    setLoading(false);
    isCheckingUpdate = false;
  }
}

async function runTest() {
  const templateId = document.getElementById('runTemplateId').value.trim();
  const username = document.getElementById('runUsername').value.trim();
  const password = document.getElementById('runPassword').value.trim();
  const environment = document.getElementById('runEnvironment').value.trim();
  const fileInput = document.getElementById('excelFile');
  const output = document.getElementById('output');

  output.innerText = '';

  // ✅ Validate inputs
  if (!validateInputs(templateId, username, password, environment)) return;

  // ✅ Validate file
  if (!fileInput.files.length) {
    showFileError('Please upload Excel file');
    return;
  }

  const fileName = fileInput.files[0].name;
  const expectedFileName = `${templateId}.xlsx`;
  
  const fileNameLower = fileName.toLowerCase();
  const templateLower = templateId.toLowerCase();

  if (!fileNameLower.includes(templateLower)) {
    showFileError(
      `Invalid file. File name must contain template name: ${templateId}`
    );
    return;
  }

  clearFileError();

  document.getElementById('reportBtn').disabled = true;
  setLoading(true);

  log('Starting test execution...\n', 'info');
  log(`Template: ${templateId}\n`);
  log(`Environment: ${environment}\n`);
  log(`Uploading file: ${fileInput.files[0].name}\n`, 'info');

  try {
    // 🔥 STEP 1 — Upload Excel first
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('templateId', templateId);
    formData.append('environment', environment);

    const uploadRes = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    const uploadText = await uploadRes.text();

    if (!uploadRes.ok) {
      throw new Error(uploadText);
    }

    log('File uploaded successfully\n', 'success');

    // 🔥 STEP 2 — Run test
    const res = await fetch('/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, username, password, environment })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        log(line + '\n');
        // existing login failure logic
        if (line.includes('RECORDER_LOGIN_FAILED:')) {
          const cleanMessage = line
            .replace('RECORDER_LOGIN_FAILED:', '')
            .trim();

          await window.electronAPI.showErrorDialog(
            'Login Failed',
            'Invalid username or password.\n\n' + cleanMessage
          );

          throw new Error(cleanMessage);
        }

        if (line.startsWith('__SAVE_REPORT__')) {
          const savedPath = line.replace('__SAVE_REPORT__', '').trim();
          lastSavedReportPath = savedPath;
          document.getElementById('openReportFolderBtn').style.display = 'block';
        }
      }
    }

    log('\nExecution completed\n', 'success');
    document.getElementById('reportBtn').disabled = false;

  } catch (err) {
    log('\nExecution failed: ' + err.message + '\n', 'error');
    document.getElementById('reportBtn').disabled = false;
  }

  setLoading(false);
}

async function loadTemplates(env) {
  const dropdown = document.getElementById('runTemplateId');

  // Reset dropdown
  dropdown.innerHTML = '<option value="">-- Select Template --</option>';

  if (!env) return;

  try {
    const res = await fetch(`/templates/${env}`);
    const data = await res.json();

    console.log('Templates API:', data);

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    const templates = data.templates;

    templates.forEach(t => {
      const option = document.createElement('option');
      option.value = t;
      option.textContent = t;
      dropdown.appendChild(option);
    });
    checkFormValidity();
  } catch (err) {
    log('Failed to load templates: ' + err.message + '\n', 'error');
  }
}

document.getElementById('runEnvironment').addEventListener('change', function () {
  const env = this.value;
  loadTemplates(env);
  checkFormValidity();
});

function openReport() {
  setLoading(true, "📊 Preparing report...");
  window.open('/report', '_blank');
  setTimeout(() => setLoading(false), 1000)
}

function downloadTemplate() {
  const templateId = document.getElementById('runTemplateId').value;
  const environment = document.getElementById('runEnvironment').value;

  const msgEl = document.getElementById('downloadMsg');
  const openBtn = document.getElementById('openDownloadsBtn');

  if (!templateId || !environment) {
    msgEl.innerText = 'Select environment and template';
    msgEl.style.color = 'red';
    msgEl.style.display = 'block';
    openBtn.style.display = 'none';
    return;
  }
  setLoading(true, "⬇ Downloading template...");

  msgEl.style.display = 'none';
  openBtn.style.display = 'none';

  window.electronAPI
    .downloadTemplateWithDialog({
      env: environment,
      templateId: templateId
    })
    .then((result) => {
      setLoading(false);
      if (result.success) {
        msgEl.innerText =
          `Template saved successfully:\n${result.savedPath}`;
        msgEl.style.color = 'green';
        msgEl.style.display = 'block';

        lastSavedTemplatePath = result.savedPath;
        openBtn.style.display = 'block';
      } else {
        msgEl.innerText = result.error;
        msgEl.style.color = 'red';
        msgEl.style.display = 'block';
      }
    })
    .catch((err) => {
      setLoading(false);
      msgEl.innerText =
        `Download failed: ${err.message}`;
      msgEl.style.color = 'red';
      msgEl.style.display = 'block';
    });
}

document.addEventListener('DOMContentLoaded', async () => {
  const version = await window.electronAPI.getVersion();
  log(`APP VERSION: ${version}\n`, 'info');
  // File name display
  document.getElementById('excelFile').addEventListener('change', function () {
    const fileNameDiv = document.getElementById('fileName');
    if (this.files.length > 0) {
      fileNameDiv.innerText = `Selected: ${this.files[0].name}`;
      clearFileError(); 
      checkFormValidity();
    } else {
      fileNameDiv.innerText = '';
      checkFormValidity();
    }
  });
  const fields = [
    'runUsername',
    'runPassword',
    'runEnvironment',
    'runTemplateId',
    'recordUsername',
    'recordPassword',
    'recordEnvironment'
  ];

  fields.forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', checkFormValidity);
      el.addEventListener('change', checkFormValidity);
      el.addEventListener('blur', () => {
        if (!el.value.trim()) {
          showError(id, document.getElementById(id + 'Error').innerText);
        }
      });
      el.addEventListener('input', () => {
        if (el.value.trim()) {
          clearError(id);
        }
      });
    });
  checkFormValidity();

  const downloadMsg = document.getElementById('downloadMsg');
  const openBtn = document.getElementById('openDownloadsBtn');
  ['runEnvironment', 'runTemplateId'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      downloadMsg.style.display = 'none';
      openBtn.style.display = 'none';
    });
  });

  document.getElementById('runTemplateId')
  .addEventListener('change', checkFormValidity);

  document.getElementById('aboutModal').addEventListener('click', (e) => {
    if (e.target.id === 'aboutModal') {
      closeAbout();
    }
  });

});

window.electronAPI.onUpdateMessage((msg) => {
  log(msg + '\n', 'info');

  if (
    msg.includes('latest version') ||
    msg.includes('Update downloaded') ||
    msg.includes('error')
  ) {
    setLoading(false);
    isCheckingUpdate = false;
  }
});


// ===============================
// 🔥 ABOUT MODAL (SAFE ADD)
// ===============================

async function openAbout() {
  try {
    const version = await window.electronAPI.getVersion();
    document.getElementById('aboutVersion').innerText = `Version: ${version}`;
  } catch (e) {
    document.getElementById('aboutVersion').innerText = 'Version: unknown';
  }

  document.getElementById('aboutModal').style.display = 'flex';
}

function closeAbout() {
  document.getElementById('aboutModal').style.display = 'none';
}

function showReadme() {
  document.getElementById('aboutContent').style.display = 'none';
  document.getElementById('readmeContent').style.display = 'block';
}

function backToAbout() {
  document.getElementById('aboutContent').style.display = 'block';
  document.getElementById('readmeContent').style.display = 'none';
}

async function startRecording() {
  const username = document.getElementById('recordUsername').value.trim();
  const password = document.getElementById('recordPassword').value.trim();
  const environment = document.getElementById('recordEnvironment').value.trim();
  const output = document.getElementById('output');

  output.innerText = '';

  let isValid = true;

  if (!username) {
    showError('recordUsername', 'Username is required');
    isValid = false;
  }

  if (!password) {
    showError('recordPassword', 'Password is required');
    isValid = false;
  }

  if (!environment) {
    showError('recordEnvironment', 'Environment is required');
    isValid = false;
  }

  if (!isValid) return;

  setLoading(true, "⏺ Recording workflow...");

  log('Starting recording session...\n', 'info');
  log(`Environment: ${environment}\n`);
  log('Launching browser and starting recorder...\n', 'info');

  try {
    const res = await fetch('/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password,
        environment
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        log(line + '\n');
        if (line.startsWith('__ASK_SAVE_TEMPLATE__')) {
          const data = line.replace('__ASK_SAVE_TEMPLATE__', '').trim();
          const [sourcePath, finalPath] = data.split('::');
          // ✅ Step 1: Ask user
          const shouldSave = await window.electronAPI.askSaveCopy();
          let selectedPath = finalPath;
          if (shouldSave) {
            // ✅ Step 2: Save dialog
            const result = await window.electronAPI.saveRecordedTemplate(finalPath);
            if (result && result.success && result.savedPath) {
              selectedPath = result.savedPath;
            }
          }
          // ✅ Step 3: store path
          lastSavedTemplatePath = selectedPath;
          // ✅ Step 4: show button
          const openBtn = document.getElementById('openDownloadsBtn');
          if (openBtn) {
            openBtn.style.display = 'block';
          }
        }
        if (line.includes('RECORDER_LOGIN_FAILED:')) {
          const cleanMessage = line
            .replace('RECORDER_LOGIN_FAILED:', '')
            .trim();
          await window.electronAPI.showErrorDialog(
            'Login Failed',
            'Invalid username or password.\n\n' +
            cleanMessage
          );
          throw new Error(cleanMessage);
        }
      }
    }
    log('\nRecording completed successfully\n', 'success');
    const selectedEnv =
      document.getElementById('recordEnvironment').value;
    setTimeout(async () => {
      await loadTemplates(selectedEnv);
    }, 1000); 
  } catch (err) {
    const message =
    err instanceof Error
      ? err.message
      : String(err);
    log(`Recording failed: ${message}\n`, 'error');
  }

  setLoading(false);
}

function openSavedTemplateFolder() {
  console.log('Clicked Open Saved Template Folder');
  console.log('Saved path:', lastSavedTemplatePath);

  if (!lastSavedTemplatePath) {
    console.log('No saved path found');
    return;
  }
  setLoading(true, "📂 Opening folder...");
  window.electronAPI.openSavedTemplateFolder(
    lastSavedTemplatePath
  );
  setTimeout(() => setLoading(false), 800);
}

function openSavedReportFolder() {
  console.log('Clicked Open Saved Report Folder');
  console.log('Saved report path:', lastSavedReportPath);

  if (!lastSavedReportPath) {
    console.log('No saved report path found');
    return;
  }

  setLoading(true, "📂 Opening report folder...");
  window.electronAPI.openSavedReportFolder(
    lastSavedReportPath
  );
  setTimeout(() => setLoading(false), 800);
}

function switchTab(tab) {
  const recordTab = document.getElementById("recordTab");
  const runTab = document.getElementById("runTab");

  const recordBtn = document.getElementById("recordTabBtn");
  const runBtn = document.getElementById("runTabBtn");

  // Remove active state
  recordTab.classList.remove("active");
  runTab.classList.remove("active");
  recordBtn.classList.remove("active");
  runBtn.classList.remove("active");

  // Add active state
  if (tab === "record") {
    recordTab.classList.add("active");
    recordBtn.classList.add("active");
  } else {
    runTab.classList.add("active");
    runBtn.classList.add("active");
  }
}



