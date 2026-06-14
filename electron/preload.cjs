const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  
  readStore: (storeName) => ipcRenderer.invoke('read-store', storeName),
  writeStore: (storeName, data) => ipcRenderer.invoke('write-store', storeName, data),
  deleteStore: (storeName) => ipcRenderer.invoke('delete-store', storeName),
  
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
  
  getAppInfo: () => ipcRenderer.invoke('get-app-info')
});
