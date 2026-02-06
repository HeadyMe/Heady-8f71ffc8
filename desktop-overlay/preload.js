/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  HEADY SYSTEMS                                                 ║
 * ║  ━━━━━━━━━━━━━━                                                ║
 * ║  ∞ Sacred Geometry Architecture ∞                              ║
 * ║                                                                ║
 * ║  preload.js - Secure bridge between Electron and widget        ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("heady", {
  // Window controls
  collapse: () => ipcRenderer.send("widget:collapse"),
  expand: () => ipcRenderer.send("widget:expand"),
  quit: () => ipcRenderer.send("app:quit"),

  // Position persistence
  getPosition: () => ipcRenderer.invoke("widget:getPosition"),
  setPosition: (x, y) => ipcRenderer.send("widget:setPosition", x, y),

  // Settings
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSetting: (key, value) => ipcRenderer.send("settings:set", key, value),

  // OS integration
  openExternal: (url) => ipcRenderer.send("shell:openExternal", url),
  openFile: (path) => ipcRenderer.send("shell:openFile", path),

  // Listen for hotkey toggle
  onToggle: (callback) => {
    ipcRenderer.on("widget:toggle", () => callback());
    return () => ipcRenderer.removeAllListeners("widget:toggle");
  },

  // Platform info
  platform: process.platform,
});
