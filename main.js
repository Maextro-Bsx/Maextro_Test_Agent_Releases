const { app, BrowserWindow, ipcMain , dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { shell } = require('electron');
const os = require('os');
// 🔥 Start Express server
require('./server');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL('http://localhost:3000');
}

app.whenReady().then(() => {
  createWindow();

  autoUpdater.autoInstallOnAppQuit = false;
});


// ===============================
// 🔥 UPDATE BUTTON TRIGGER ONLY
// ===============================
ipcMain.on('check-for-updates', () => {

  if (!app.isPackaged) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['OK'],
      title: 'Info',
      message: 'Update check works only in installed application.'
    });
    return;
  }

  mainWindow.webContents.send(
    'update-message',
    '🔄 Checking for updates...'
  );

  autoUpdater.checkForUpdates();
});


// ===============================
// 🔥 UPDATE EVENTS
// ===============================

autoUpdater.on('checking-for-update', () => {
  mainWindow.webContents.send('update-message', 'Checking for updates...');
});

autoUpdater.on('update-available', async () => {

  const url = 'https://github.com/Tejavathi96/Maextro_Automation_Releases/releases/latest';

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    buttons: ['Download', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    title: 'Update Available',
    message: 'A new version is available.',
    detail: 'The app will be downloaded from GitHub. Please install it manually.'
  });

  if (result.response === 0) {
    shell.openExternal(url);
  }
});


autoUpdater.on('update-not-available', async () => {
  await dialog.showMessageBox(mainWindow, {
    type: 'info',
    buttons: ['OK'],
    title: 'Up to Date',
    message: 'You are already using the latest version.'
  });
});

autoUpdater.on('error', async (err) => {
  await dialog.showMessageBox(mainWindow, {
    type: 'error',
    buttons: ['OK'],
    title: 'Update Error',
    message: 'Failed to check for updates',
    detail: err.message
  });
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.on('open-downloads-folder', () => {
  const downloadsPath = app.getPath('downloads');
  console.log('Opening:', downloadsPath); 
  shell.openPath(downloadsPath);
});

ipcMain.on('open-saved-template-folder', (_, filePath) => {
  const path = require('path');
  console.log('Received filePath:', filePath);
  if (!filePath) return;

  const folderPath = path.dirname(filePath);

  console.log('Opening saved folder:', folderPath);

  shell.openPath(folderPath);
});

ipcMain.handle('save-recorded-template', async (_, fileName) => {
  const fs = require('fs');
  const path = require('path');

  const sourcePath = path.join(
    __dirname,
    'test-data',
    fileName
  );

  if (!fs.existsSync(sourcePath)) {
    return {
      success: false,
      error: 'Generated Excel file not found'
    };
  }

  const result = await dialog.showSaveDialog({
    title: 'Save Recorded Template',
    defaultPath: fileName,
    filters: [
      {
        name: 'Excel Files',
        extensions: ['xlsx']
      }
    ]
  });

  if (result.canceled || !result.filePath) {
    return {
      success: false,
      error: 'Save cancelled by user'
    };
  }

  fs.copyFileSync(sourcePath, result.filePath);

  return {
    success: true,
    savedPath: result.filePath
  };
});


ipcMain.handle('check-template-overwrite', async (_, filePath) => {
  const fs = require('fs');

  if (!fs.existsSync(filePath)) {
    return {
      exists: false
    };
  }

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Replace', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    title: 'Template Already Exists',
    message: 'Template already exists.',
    detail: 'Do you want to replace the existing template file?'
  });

  return {
    exists: true,
    shouldReplace: result.response === 0
  };
});


ipcMain.handle('download-template-with-dialog', async (_, data) => {
  const fs = require('fs');
  const path = require('path');

  const { env, templateId } = data;

  // First check system templates
  let sourcePath = path.join(
    __dirname,
    'test-data',
    'Templates',
    env,
    `${templateId}.xlsx`
  );

  // If not found, check user templates
  if (!fs.existsSync(sourcePath)) {
    sourcePath = path.join(
      process.cwd(),
      'user-templates',
      env,
      `${templateId}.xlsx`
    );
  }

  if (!fs.existsSync(sourcePath)) {
    return {
      success: false,
      error: 'Template file not found'
    };
  }

  const result = await dialog.showSaveDialog({
    title: 'Save Template',
    defaultPath: `${templateId}.xlsx`,
    filters: [
      {
        name: 'Excel Files',
        extensions: ['xlsx']
      }
    ]
  });

  if (result.canceled || !result.filePath) {
    return {
      success: false,
      error: 'Save cancelled by user'
    };
  }

  fs.copyFileSync(sourcePath, result.filePath);

  return {
    success: true,
    savedPath: result.filePath
  };
});

ipcMain.handle('show-error-dialog',async (_, title, message) => {
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title,
      message,
      buttons: ['OK']
    });
  }
);
