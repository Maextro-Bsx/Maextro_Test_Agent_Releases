const { app, BrowserWindow, ipcMain } = require('electron');
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
  // 🔥 Logging (very useful)
  autoUpdater.logger = require("electron-log");
  autoUpdater.logger.transports.file.level = "info";

  // 🔥 IMPORTANT: DO NOT auto-trigger (avoid double check)
  // autoUpdater.checkForUpdatesAndNotify();
});


// ===============================
// 🔥 UPDATE BUTTON TRIGGER ONLY
// ===============================
ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates();
});


// ===============================
// 🔥 UPDATE EVENTS
// ===============================

autoUpdater.on('checking-for-update', () => {
  mainWindow.webContents.send('update-message', 'Checking for updates...');
});

autoUpdater.on('update-available', () => {
  const { shell } = require('electron');

  mainWindow.webContents.send(
    'update-message',
    'Update available. Opening download page...'
  );

  const url = 'https://github.com/Tejavathi96/Maextro_Automation_Releases/releases/latest';

  shell.openExternal(url);
});

autoUpdater.on('update-not-available', () => {
  mainWindow.webContents.send('update-message', 'You are already using latest version.');
});

autoUpdater.on('error', (err) => {
  mainWindow.webContents.send('update-message', 'Update error: ' + err.message);
});




