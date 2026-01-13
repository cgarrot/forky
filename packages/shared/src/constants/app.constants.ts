export const APP_NAME = 'Forky';
export const APP_VERSION = '0.1.0';
export const APP_DESCRIPTION = 'AI-powered canvas for collaborative idea generation';

export const DEFAULT_VIEWPORT = {
  x: 0,
  y: 0,
  zoom: 1,
} as const;

export const MAX_NODES_PER_PROJECT = 1000;
export const MAX_EDGES_PER_NODE = 50;
export const MAX_PROJECTS = 100;

export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
export const DEBOUNCE_DELAY = 500; // milliseconds
