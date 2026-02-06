/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  HEADY SYSTEMS                                                 ║
 * ║  ━━━━━━━━━━━━━━                                                ║
 * ║  ∞ Sacred Geometry Architecture ∞                              ║
 * ║                                                                ║
 * ║  main.js - Electron main process for HeadyBuddy overlay        ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  ipcMain,
  shell,
  screen,
} = require("electron");
const path = require("path");
const Store = require("electron-store");

const store = new Store({
  defaults: {
    position: { x: -1, y: -1 },
    collapsed: true,
    quietMode: false,
    theme: "dark",
  },
});

const IS_DEV = !app.isPackaged;
const WIDGET_URL = IS_DEV
  ? "http://localhost:3400"
  : `file://${path.join(__dirname, "..", "widget", "index.html")}`;

const PILL_WIDTH = 320;
const PILL_HEIGHT = 120;
const EXPANDED_WIDTH = 400;
const EXPANDED_HEIGHT = 600;
const HOTKEY = "CommandOrControl+Shift+H";

let mainWindow = null;
let tray = null;
let isCollapsed = true;

// ─── Window Creation ──────────────────────────────────────────────
function createWindow() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const saved = store.get("position");
  const startX = saved.x >= 0 ? saved.x : screenW - PILL_WIDTH - 24;
  const startY = saved.y >= 0 ? saved.y : screenH - PILL_HEIGHT - 24;

  mainWindow = new BrowserWindow({
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    x: startX,
    y: startY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadURL(WIDGET_URL);

  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("moved", () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      store.set("position", { x, y });
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── Tray ─────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, "icons", "tray-icon.png");
  try {
    tray = new Tray(iconPath);
  } catch {
    // If icon missing, skip tray gracefully
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: "Show / Hide", click: toggleWidget },
    { type: "separator" },
    {
      label: "Quiet Mode",
      type: "checkbox",
      checked: store.get("quietMode"),
      click: (item) => store.set("quietMode", item.checked),
    },
    { type: "separator" },
    { label: "Quit HeadyBuddy", click: () => app.quit() },
  ]);

  tray.setToolTip("HeadyBuddy — Perfect Day Companion");
  tray.setContextMenu(contextMenu);
  tray.on("click", toggleWidget);
}

// ─── Toggle / Resize ──────────────────────────────────────────────
function toggleWidget() {
  if (!mainWindow) return;

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function setCollapsed(collapsed) {
  if (!mainWindow) return;
  isCollapsed = collapsed;

  const [x, y] = mainWindow.getPosition();
  if (collapsed) {
    mainWindow.setSize(PILL_WIDTH, PILL_HEIGHT);
  } else {
    // Expand upward from current bottom-right anchor
    const newY = Math.max(0, y - (EXPANDED_HEIGHT - PILL_HEIGHT));
    mainWindow.setBounds({
      x,
      y: newY,
      width: EXPANDED_WIDTH,
      height: EXPANDED_HEIGHT,
    });
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────
ipcMain.on("widget:collapse", () => {
  setCollapsed(true);
  mainWindow?.webContents.send("widget:toggle");
});

ipcMain.on("widget:expand", () => {
  setCollapsed(false);
});

ipcMain.handle("widget:getPosition", () => {
  if (!mainWindow) return { x: 0, y: 0 };
  const [x, y] = mainWindow.getPosition();
  return { x, y };
});

ipcMain.on("widget:setPosition", (_e, x, y) => {
  mainWindow?.setPosition(Math.round(x), Math.round(y));
});

ipcMain.handle("settings:get", () => store.store);

ipcMain.on("settings:set", (_e, key, value) => {
  store.set(key, value);
});

ipcMain.on("shell:openExternal", (_e, url) => {
  shell.openExternal(url);
});

ipcMain.on("shell:openFile", (_e, filePath) => {
  shell.openPath(filePath);
});

ipcMain.on("app:quit", () => app.quit());

// ─── App Lifecycle ────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Register global hotkey
  const registered = globalShortcut.register(HOTKEY, () => {
    toggleWidget();
    mainWindow?.webContents.send("widget:toggle");
  });

  if (!registered) {
    console.warn(`[HeadyBuddy] Failed to register hotkey: ${HOTKEY}`);
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  // Keep app running in tray on all platforms
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
