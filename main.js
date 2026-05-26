const { app, BrowserWindow, Notification, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let tray;

const dataPath = path.join(app.getPath('userData'), 'pomodoro-data.json');

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
  } catch (_) {}
  return { history: {} };
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function createWindow() {
  win = new BrowserWindow({
    width: 360,
    height: 520,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile('index.html');

  ipcMain.on('close-window', () => {
    win.close();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

// --- Data ---
ipcMain.handle('load-data', () => loadData());
ipcMain.handle('save-data', (_e, data) => saveData(data));

// --- Notifications ---
ipcMain.on('notify', (_e, { title, body }) => {
  new Notification({ title, body }).show();
});
