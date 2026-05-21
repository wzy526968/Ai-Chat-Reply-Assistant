/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronShell", {
  isElectron: true,
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  setPinned: (pinned) => ipcRenderer.invoke("window:set-always-on-top", pinned),
});
