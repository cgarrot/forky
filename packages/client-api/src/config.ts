import axios, { type AxiosInstance } from 'axios';
import { Configuration } from './generated';
import { AppApi } from './generated/api/app-api';
import { AuthApi } from './generated/api/auth-api';
import { EdgesApi } from './generated/api/edges-api';
import { EdgesRootApi } from './generated/api/edges-root-api';
import { GenerateTitleApi } from './generated/api/generate-title-api';
import { GuestApi } from './generated/api/guest-api';
import { NodesApi } from './generated/api/nodes-api';
import { NodesRootApi } from './generated/api/nodes-root-api';
import { ProjectsApi } from './generated/api/projects-api';
import { UsersApi } from './generated/api/users-api';

export type ApiClient = {
  app: AppApi;
  auth: AuthApi;
  edges: EdgesApi;
  edgesRoot: EdgesRootApi;
  generateTitle: GenerateTitleApi;
  guest: GuestApi;
  nodes: NodesApi;
  nodesRoot: NodesRootApi;
  projects: ProjectsApi;
  users: UsersApi;
};

export const getApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const normalized = apiUrl.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

const createAxiosInstance = (token?: string): AxiosInstance => {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return axios.create({
    baseURL: getApiBaseUrl(),
    headers,
    withCredentials: true,
  });
};

const buildClient = (config: Configuration, axiosInstance: AxiosInstance): ApiClient => ({
  app: new AppApi(config, getApiBaseUrl(), axiosInstance),
  auth: new AuthApi(config, getApiBaseUrl(), axiosInstance),
  edges: new EdgesApi(config, getApiBaseUrl(), axiosInstance),
  edgesRoot: new EdgesRootApi(config, getApiBaseUrl(), axiosInstance),
  generateTitle: new GenerateTitleApi(config, getApiBaseUrl(), axiosInstance),
  guest: new GuestApi(config, getApiBaseUrl(), axiosInstance),
  nodes: new NodesApi(config, getApiBaseUrl(), axiosInstance),
  nodesRoot: new NodesRootApi(config, getApiBaseUrl(), axiosInstance),
  projects: new ProjectsApi(config, getApiBaseUrl(), axiosInstance),
  users: new UsersApi(config, getApiBaseUrl(), axiosInstance),
});

export const createApi = (): ApiClient => {
  const axiosInstance = createAxiosInstance();
  const config = new Configuration({ basePath: getApiBaseUrl() });
  return buildClient(config, axiosInstance);
};

export const createApiHttpClient = (token?: string): AxiosInstance => createAxiosInstance(token);

export const createAuthenticatedApi = (token: string): ApiClient => {
  const axiosInstance = createAxiosInstance(token);
  const config = new Configuration({ basePath: getApiBaseUrl() });
  return buildClient(config, axiosInstance);
};
