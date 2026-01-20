import type { AxiosInstance } from 'axios';
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
export declare const getApiBaseUrl: () => string;
export declare const createApi: () => ApiClient;
export declare const createApiHttpClient: (token?: string) => AxiosInstance;
export declare const createAuthenticatedApi: (token: string) => ApiClient;
//# sourceMappingURL=config.d.ts.map