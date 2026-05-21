const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),

  onUpdateMessage: (callback) =>
    ipcRenderer.on('update-message', (_, data) => callback(data)),

  onUpdateDownloaded: (callback) =>
    ipcRenderer.on('update-downloaded', callback),

  showErrorDialog: (title, message) => 
  ipcRenderer.invoke('show-error-dialog',title,message),
  
  getVersion: () => ipcRenderer.invoke('get-app-version'),

  saveRecordedTemplate: (fileName) =>
  ipcRenderer.invoke('save-recorded-template', fileName),

  openDownloads: () => ipcRenderer.send('open-downloads-folder'),

  openSavedTemplateFolder: (filePath) =>
  ipcRenderer.send('open-saved-template-folder', filePath),

  downloadTemplateWithDialog: (data) =>
  ipcRenderer.invoke('download-template-with-dialog', data),

  checkTemplateOverwrite: (filePath) =>
  ipcRenderer.invoke('check-template-overwrite', filePath),

  openSavedReportFolder: (filePath) =>
  ipcRenderer.send('open-saved-template-folder', filePath),


});