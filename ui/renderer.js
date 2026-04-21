function setLoading(isLoading) {
  const loader = document.getElementById('loader');
  const runBtn = document.getElementById('runBtn');
  const updateBtn = document.getElementById('updateBtn');

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
    showError('username', 'Username is required');
    isValid = false;
  }
  if (!password) {
    showError('password', 'Password is required');
    isValid = false;
  }
  if (!environment) {
    showError('environment', 'Environment is required');
    isValid = false;
  }
  if (!templateId) {
    showError('templateId', 'Template is required');
    isValid = false;
  }
  return isValid;
}

function checkFormValidity() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const environment = document.getElementById('environment').value.trim();
  const templateId = document.getElementById('templateId').value.trim();

  const runBtn = document.getElementById('runBtn');

  runBtn.disabled = !(username && password && environment && templateId);
}

let isCheckingUpdate = false;
async function update() {
  if (isCheckingUpdate) return; // 🔥 prevent double click
  isCheckingUpdate = true;
  setLoading(true);
  try {
    window.electronAPI.checkForUpdates();
  } catch (err) {
    log('Update failed: ' + err.message + '\n', 'error');
    setLoading(false);
    isCheckingUpdate = false;
  }
}

async function runTest() {
  const templateId = document.getElementById('templateId').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const environment = document.getElementById('environment').value.trim();
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

  if (fileName !== expectedFileName) {
    showFileError(`Wrong file selected. Expected: ${expectedFileName}`);
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

document.getElementById('environment').addEventListener('change', async function () {
  const env = this.value;
  const dropdown = document.getElementById('templateId');

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

  } catch (err) {
  log('Failed to load templates: ' + err.message + '\n', 'error');
  }
});

function openReport() {
  window.open('/report', '_blank');
}

function downloadTemplate() {
  const templateId = document.getElementById('templateId').value;
  const environment = document.getElementById('environment').value;
  const msgEl = document.getElementById('downloadMsg');
  const openBtn = document.getElementById('openDownloadsBtn');
  
  if (!templateId || !environment) {
    msgEl.innerText = 'Select environment and template';
    msgEl.style.color = 'red';
    msgEl.style.display = 'block';
    openBtn.style.display = 'none';
    return;
  }
  msgEl.style.display = 'none';
  openBtn.style.display = 'none';
  const url = `/download-template/${environment}/${templateId}`;

  // Create hidden link (no new window)
  const a = document.createElement('a');
  a.href = url;
  a.download = `${templateId}.xlsx`; 
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Show message
  msgEl.innerText = `Template ${templateId}.xlsx downloaded successfully`;
  msgEl.style.color = 'green';
  msgEl.style.display = 'block';
  openBtn.style.display = 'block';

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
    } else {
      fileNameDiv.innerText = '';
    }
  });
  const fields = ['username', 'password', 'environment', 'templateId'];

  fields.forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', checkFormValidity);
      el.addEventListener('change', checkFormValidity);
      el.addEventListener('blur', () => {
        if (!el.value.trim()) {
          showError(id, `${id.charAt(0).toUpperCase() + id.slice(1)} is required`);
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
  ['environment', 'templateId'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      downloadMsg.style.display = 'none';
      openBtn.style.display = 'none';
    });
  });

  document.getElementById('aboutModal').addEventListener('click', (e) => {
    if (e.target.id === 'aboutModal') {
      closeAbout();
    }
  });

  document.getElementById('openDownloadsBtn').addEventListener('click', () => {
    window.electronAPI.openDownloads();
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
