import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
        invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
        on: (channel: string, listener: (...args: unknown[]) => void) => {
          ipcRenderer.on(channel, (_event, ...args) => listener(...args))
          return () => {
            ipcRenderer.removeListener(channel, listener)
          }
        }
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
}
