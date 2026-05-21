/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("node:path");

const DEFAULT_URL = "http://localhost:3000/?shell=electron";

let mainWindow;

function getWindowPosition(width) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width: screenWidth } = primaryDisplay.workArea;

  return {
    x: x + screenWidth - width - 24,
    y: y + 24,
  };
}

function loadFallbackPage(targetUrl) {
  if (!mainWindow) {
    return;
  }

  const html = `
    <html>
      <body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7efe4;color:#201a16;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="max-width:320px;padding:28px;border-radius:24px;background:#fffaf2;box-shadow:0 20px 60px rgba(84,54,30,.12);">
          <h2 style="margin:0 0 12px;font-size:20px;">悬浮窗还没连上网页端</h2>
          <p style="margin:0 0 12px;line-height:1.7;color:#6c6157;">先在项目目录运行 <code>npm run dev</code>，然后再重新打开 Electron 窗口。</p>
          <p style="margin:0;line-height:1.7;color:#6c6157;">当前尝试连接：<code>${targetUrl}</code></p>
        </div>
      </body>
    </html>
  `;

  mainWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
}

function createWindow() {
  const width = 460;
  const height = 780;
  const position = getWindowPosition(width);

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 390,
    minHeight: 620,
    x: position.x,
    y: position.y,
    alwaysOnTop: true,
    backgroundColor: "#fffaf2",
    autoHideMenuBar: true,
    title: "AI Reply Assistant",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || DEFAULT_URL;

  mainWindow.setAlwaysOnTop(true, "floating");
  if (process.platform === "darwin") {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  mainWindow.webContents.on("did-fail-load", () => {
    loadFallbackPage(startUrl);
  });

  mainWindow.loadURL(startUrl).catch(() => {
    loadFallbackPage(startUrl);
  });
}

app.whenReady().then(() => {
  ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
  });

  ipcMain.handle("window:close", () => {
    mainWindow?.close();
  });

  ipcMain.handle("window:set-always-on-top", (_, pinned) => {
    const nextPinned = Boolean(pinned);
    mainWindow?.setAlwaysOnTop(nextPinned, "floating");
    return nextPinned;
  });

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
