const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),

  onUpdateMessage: (callback) =>
    ipcRenderer.on('update-message', (_, data) => callback(data)),

  onUpdateDownloaded: (callback) =>
    ipcRenderer.on('update-downloaded', callback),

  getVersion: () => ipcRenderer.invoke('get-app-version')
});