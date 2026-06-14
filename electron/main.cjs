const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;

const getUserDataPath = () => {
  return app.getPath('userData');
};

const getStorePath = (storeName) => {
  const userDataPath = getUserDataPath();
  const storesDir = path.join(userDataPath, 'stores');
  if (!fs.existsSync(storesDir)) {
    fs.mkdirSync(storesDir, { recursive: true });
  }
  return path.join(storesDir, `${storeName}.json`);
};

ipcMain.handle('read-store', async (event, storeName) => {
  try {
    const storePath = getStorePath(storeName);
    if (fs.existsSync(storePath)) {
      const content = fs.readFileSync(storePath, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  } catch (error) {
    console.error('Error reading store:', error);
    return null;
  }
});

ipcMain.handle('write-store', async (event, storeName, data) => {
  try {
    const storePath = getStorePath(storeName);
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing store:', error);
    return false;
  }
});

ipcMain.handle('delete-store', async (event, storeName) => {
  try {
    const storePath = getStorePath(storeName);
    if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath);
    }
    return true;
  } catch (error) {
    console.error('Error deleting store:', error);
    return false;
  }
});

ipcMain.handle('select-video-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择现场视频文件',
      filters: [
        { name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'wmv'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      const destDir = path.join(getUserDataPath(), 'videos');
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      const destPath = path.join(destDir, Date.now() + '_' + fileName);
      fs.copyFileSync(filePath, destPath);
      return { success: true, filePath: destPath, fileName };
    }
    return { success: false };
  } catch (error) {
    console.error('Error selecting video:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-file-location', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error opening file location:', error);
    return false;
  }
});

ipcMain.handle('get-app-info', async () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    userDataPath: getUserDataPath(),
    isDev
  };
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0a1628',
    title: '烟花燃放设计系统',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev
    },
    icon: path.join(__dirname, '../public/favicon.svg')
  });

  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
