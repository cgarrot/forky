export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidPosition = (x: number, y: number): boolean => {
  return !isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y);
};

export const isValidZoom = (zoom: number): boolean => {
  return !isNaN(zoom) && isFinite(zoom) && zoom > 0;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const sanitizeString = (str: string, maxLength: number = 1000): string => {
  return str.trim().substring(0, maxLength);
};

export const sanitizeId = (id: string): string => {
  return id.replace(/[^a-zA-Z0-9-_]/g, '');
};
