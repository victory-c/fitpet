// Electron MAIN process = the "brain side" of the window. It REUSES the shared engine
// (loadState/tierOf/reactionIsLive) — no game logic is duplicated here — serves a read-only
// snapshot to the renderer, watches the state file so the window reflects feeds/reactions
// within ~1s, and remembers where you put the window.

import { app, BrowserWindow, ipcMain, screen } from "electron";
import { fileURLToPath } from "node:url";

import { createSnapshotReader } from "./snapshot.ts";
import { loadBounds, saveBounds, type Bounds } from "./window-store.ts";

const WIDTH = 300;
const HEIGHT = 380;

let win: BrowserWindow | null = null;
let lastJson = "";
let pollTimer: ReturnType<typeof setInterval> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const nextSnapshot = createSnapshotReader();

function pushIfChanged(): void {
  if (!win || win.isDestroyed()) return;
  const snap = nextSnapshot();
  const json = JSON.stringify(snap);
  if (json === lastJson) return;
  lastJson = json;
  win.webContents.send("fitpet:state", snap);
}

// Is the top-left corner inside (or near) any current display? Guards against a saved
// position from a monitor that's no longer attached.
function onScreen(b: Bounds): boolean {
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return b.x >= a.x - WIDTH + 40 && b.x <= a.x + a.width - 40 && b.y >= a.y - 20 && b.y <= a.y + a.height - 40;
  });
}

function startPosition(): { x: number; y: number } {
  const saved = loadBounds();
  if (saved && onScreen(saved)) return { x: saved.x, y: saved.y };
  const a = screen.getPrimaryDisplay().workArea; // default: top-right, out of the way
  return { x: a.x + a.width - WIDTH - 24, y: a.y + 24 };
}

function isLocalRendererUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (url.protocol === "http:" || url.protocol === "https:") && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

function createWindow(): void {
  const pos = startPosition();
  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    webPreferences: {
      preload: fileURLToPath(new URL("../preload/index.cjs", import.meta.url)),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.on("closed", () => {
    win = null;
  });

  // Remember the position (debounced so we write once after a drag settles).
  win.on("move", () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (win && !win.isDestroyed()) saveBounds(win.getBounds());
    }, 400);
  });

  win.webContents.on("did-finish-load", () => {
    lastJson = "";
    pushIfChanged();
  });

  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devUrl) {
    if (!isLocalRendererUrl(devUrl)) throw new Error("Refusing to load a non-local renderer URL.");
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(fileURLToPath(new URL("../renderer/index.html", import.meta.url)));
  }
}

ipcMain.handle("fitpet:getState", () => nextSnapshot());

void app.whenReady().then(() => {
  createWindow();
  pollTimer = setInterval(pushIfChanged, 750);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  if (pollTimer) clearInterval(pollTimer);
  if (saveTimer) clearTimeout(saveTimer);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
