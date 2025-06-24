const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Load the app - either from development server or from built files
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // Open DevTools if in development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.setMenu(null);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Maximize the window by default
  mainWindow.maximize();
}

// Register pdf-worker protocol handler
function registerProtocolHandlers() {
  if (!isDev) {
    protocol.registerFileProtocol('file', (request, callback) => {
      const url = request.url.replace('file:///', '');
      try {
        return callback(decodeURIComponent(url));
      } catch (error) {
        console.error('ERROR: registerFileProtocol:', error);
        return callback({ error });
      }
    });
  }
}

app.whenReady().then(() => {
  registerProtocolHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
}); 