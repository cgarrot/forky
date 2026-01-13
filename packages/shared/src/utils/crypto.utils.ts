export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const generateNodeId = (): string => {
  return `node-${generateId()}`;
};

export const generateEdgeId = (): string => {
  return `edge-${generateId()}`;
};

export const generateProjectId = (): string => {
  return `proj-${generateId()}`;
};

export const generateUserId = (): string => {
  return `user-${generateId()}`;
};

export const generateMediaId = (): string => {
  return `media-${generateId()}`;
};

export const generateToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateHash = async (data: string): Promise<string> => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto is not available in this environment');
  }

  const encoder = new TextEncoder();
  const hashBuffer = await subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};
