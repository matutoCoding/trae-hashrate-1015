declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      readStore: (storeName: string) => Promise<any>;
      writeStore: (storeName: string, data: any) => Promise<boolean>;
      deleteStore: (storeName: string) => Promise<boolean>;
      selectVideoFile: () => Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }>;
      openFileLocation: (filePath: string) => Promise<boolean>;
      getAppInfo: () => Promise<{ version: string; name: string; userDataPath: string; isDev: boolean }>;
    };
  }
}

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export const electronStore = {
  async read(storeName: string): Promise<any> {
    if (!isElectron) return null;
    try {
      return await window.electronAPI!.readStore(storeName);
    } catch (e) {
      console.error('Failed to read from electron store:', e);
      return null;
    }
  },

  async write(storeName: string, data: any): Promise<boolean> {
    if (!isElectron) return false;
    try {
      return await window.electronAPI!.writeStore(storeName, data);
    } catch (e) {
      console.error('Failed to write to electron store:', e);
      return false;
    }
  },

  async delete(storeName: string): Promise<boolean> {
    if (!isElectron) return false;
    try {
      return await window.electronAPI!.deleteStore(storeName);
    } catch (e) {
      console.error('Failed to delete electron store:', e);
      return false;
    }
  },

  async selectVideoFile(): Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }> {
    if (!isElectron) return { success: false, error: 'Not in electron environment' };
    try {
      return await window.electronAPI!.selectVideoFile();
    } catch (e) {
      console.error('Failed to select video:', e);
      return { success: false, error: String(e) };
    }
  },

  async openFileLocation(filePath: string): Promise<boolean> {
    if (!isElectron) return false;
    try {
      return await window.electronAPI!.openFileLocation(filePath);
    } catch (e) {
      console.error('Failed to open file location:', e);
      return false;
    }
  },

  async getAppInfo(): Promise<{ version: string; name: string; userDataPath: string; isDev: boolean } | null> {
    if (!isElectron) return null;
    try {
      return await window.electronAPI!.getAppInfo();
    } catch (e) {
      console.error('Failed to get app info:', e);
      return null;
    }
  },
};

export const createElectronPersistMiddleware = (storeName: string) => {
  return (config: any) => {
    const persistConfig = config.persist;
    
    if (isElectron) {
      electronStore.read(storeName).then((savedData) => {
        if (savedData && savedData.state) {
          config.setState(savedData.state);
        }
      });
    }

    return {
      ...config,
      setState: (partial: any, replace: any) => {
        config.setState(partial, replace);
        
        if (isElectron) {
          const state = config.getState();
          electronStore.write(storeName, { state, version: 0 });
        }
      },
    };
  };
};
