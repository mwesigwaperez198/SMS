const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const LIVE_PORTAL_URL = process.env.NOVAADMIN_DESKTOP_URL || "https://novaadmin.kesug.com";
const LOCAL_INDEX = path.join(__dirname, "../dist/index.html");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    title: "NovaAdmin Desktop",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerArg = process.argv.find((arg) => arg.startsWith("--dev-server="));
  const devServerUrl = devServerArg ? devServerArg.split("=")[1] : process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    win.loadURL(devServerUrl);
    return;
  }

  if (fs.existsSync(LOCAL_INDEX)) {
    win.loadFile(LOCAL_INDEX).catch(() => {
      win.loadURL(LIVE_PORTAL_URL);
    });
  } else {
    win.loadURL(LIVE_PORTAL_URL);
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
