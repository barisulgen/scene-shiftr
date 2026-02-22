interface ElectronIpcRenderer {
  send: (channel: string, ...args: unknown[]) => void
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  on: (channel: string, listener: (...args: unknown[]) => void) => () => void
}

declare global {
  interface Window {
    electron: {
      ipcRenderer: ElectronIpcRenderer
    }
    api: unknown
  }
}

export {}
