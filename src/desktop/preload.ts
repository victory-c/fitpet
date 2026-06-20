// The secure bridge between renderer and main. With contextIsolation on, the renderer can
// only reach what we explicitly expose here:
//   getState() — one-shot fetch for the first paint
//   onState(cb) — subscribe to live pushes whenever state.json changes; returns an unsubscribe

import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("fitpet", {
  getState: () => ipcRenderer.invoke("fitpet:getState"),
  onState: (cb: (snap: unknown) => void) => {
    const listener = (_e: IpcRendererEvent, snap: unknown) => cb(snap);
    ipcRenderer.on("fitpet:state", listener);
    return () => ipcRenderer.removeListener("fitpet:state", listener);
  },
});
