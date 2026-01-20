export const StorageKeys = {
  PROJECTS: 'forky_projects',
  CURRENT_PROJECT: 'forky_current_project',
  VIEWPORT: 'forky_viewport',
  USER_PREFERENCES: 'forky_preferences',
  RECENT_PROJECTS: 'forky_recent_projects',
};

const getLocalStorage = (): Storage | null => {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }
  return null;
};

const getConsole = (): Console | null => {
  if (typeof console !== 'undefined') {
    return console;
  }
  return null;
};

export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    const localStorage = getLocalStorage();
    if (!localStorage) return defaultValue ?? null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch (error) {
      const console = getConsole();
      console?.error(`Error reading from localStorage [${key}]:`, error);
      return defaultValue ?? null;
    }
  },

  set: <T>(key: string, value: T): void => {
    const localStorage = getLocalStorage();
    if (!localStorage) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      const console = getConsole();
      console?.error(`Error writing to localStorage [${key}]:`, error);
    }
  },

  remove: (key: string): void => {
    const localStorage = getLocalStorage();
    if (!localStorage) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      const console = getConsole();
      console?.error(`Error removing from localStorage [${key}]:`, error);
    }
  },

  clear: (): void => {
    const localStorage = getLocalStorage();
    if (!localStorage) return;
    try {
      localStorage.clear();
    } catch (error) {
      const console = getConsole();
      console?.error('Error clearing localStorage:', error);
    }
  },
};

export const addRecentProject = (projectId: string, projectName: string): void => {
  const recent = storage.get<{ id: string; name: string; accessedAt: string }[]>(
    StorageKeys.RECENT_PROJECTS,
    []
  );

  const filtered = recent ? recent.filter((item) => item.id !== projectId) : [];
  filtered.unshift({
    id: projectId,
    name: projectName,
    accessedAt: new Date().toISOString(),
  });

  storage.set(StorageKeys.RECENT_PROJECTS, filtered.slice(0, 10));
};
