const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 700,
    backgroundColor: "#0f1216",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
