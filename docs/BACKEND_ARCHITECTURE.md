# Architecture Backend NonLinear

> **Architecture complète du backend NestJS pour NonLinear - Feature-based avec Clean Architecture**

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Principes d'Architecture](#2-principes-darchitecture)
3. [Structure du Monorepo](#3-structure-du-monorepo)
4. [Architecture des Modules](#4-architecture-des-modules)
5. [Communication Front ↔ Back](#5-communication-front--back)
6. [Sécurité](#6-sécurité)
7. [Performance & Scalabilité](#7-performance--scalabilité)

---

## 1. Vue d'Ensemble

### Stack Technique

```
Framework : NestJS 11+ (Node.js 20+)
Base de données : PostgreSQL 16
ORM : Prisma 6
Cache : Redis 7
Message Queue : RabbitMQ / Bull
WebSocket : Socket.io
Authentication : JWT + OAuth 2.0
Testing : Jest + Supertest
Documentation : Swagger/OpenAPI
Validation : class-validator + class-transformer
Type-safe : Zod (schemas partagés avec frontend)
```

### Pourquoi NestJS ?

✅ **Architecture modulaire** - Modules cohésifs et découplés
✅ **TypeScript natif** - Type safety stricte
✅ **Dependency Injection** - Code testable et maintenable
✅ **Support WebSocket** - Collaboration temps réel
✅ **Écosystème riche** - Guards, Pipes, Interceptors, Decorators
✅ **Excellent pour APIs REST et GraphQL** - Flexible et extensible
✅ **Community active** - Beaucoup de modules et plugins

---

## 2. Principes d'Architecture

### 2.1 Feature-Based Modules (cohérence avec frontend)

Chaque fonctionnalité majeure = module autonome dans `apps/api/src/modules/`

```
modules/
├── auth/              # Authentification & autorisation
├── users/             # Gestion utilisateurs
├── projects/          # Gestion projets
├── nodes/             # Gestion nœuds (core business)
├── collaboration/     # Multi-user temps réel
├── llm/              # Génération LLM
└── agents/            # Agents IA (futur)
```

### 2.2 Clean Architecture Légère (Hexagonal simplifiée)

Pour chaque module complexe :

```
module/
├── domain/              # 🧠 Logique métier pure
│   ├── entities/        # Entités du domaine
│   ├── services/        # Services métier
│   ├── ports/           # Interfaces (abstractions)
│   └── events/         # Domain events
│
├── application/        # 📋 Cas d'utilisation
│   ├── dto/            # Data Transfer Objects
│   ├── services/        # Application services (orchestration)
│   └── use-cases/      # Use cases spécifiques
│
└── infrastructure/     # 🔧 Infrastructure
    ├── database/       # Prisma entities & repositories
    ├── repositories/   # Implémentation des ports
    └── providers/     # Services externes (LLM, WebSocket, etc.)
```

### 2.3 DDD Concepts Adaptés (Domain-Driven Design)

#### Aggregates
```
Project Aggregate:
  - Project
  - Nodes (collection)
  - Edges (collection)
  - ProjectMembers (collection)

Responsabilité: Garantir la cohérence des projets
```

#### Domain Events
```typescript
// Event émis quand un nœud change
class NodeUpdatedEvent {
  constructor(
    public readonly nodeId: string,
    public readonly projectId: string,
    public readonly changes: Partial<Node>,
    public readonly timestamp: Date = new Date(),
  ) {}
}
```

#### Repositories Pattern
```typescript
// Interface dans domain/ports/
interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByUser(userId: string): Promise<Project[]>;
  create(data: CreateProjectDto): Promise<Project>;
  update(id: string, data: UpdateProjectDto): Promise<Project>;
  delete(id: string): Promise<void>;
}

// Implémentation dans infrastructure/repositories/
class PrismaProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  // ... autres méthodes
}
```

---

## 3. Structure du Monorepo

### Arborescence Complète

```
next-gen-chat/
├── apps/
│   ├── web/                          # Frontend Next.js
│   │   ├── src/
│   │   │   ├── features/            # Feature modules React
│   │   │   ├── app/                 # Next.js App Router
│   │   │   └── config/
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   └── api/                          # Backend NestJS
│       ├── src/
│       │   ├── main.ts               # Entry point
│       │   ├── app.module.ts         # Root module
│       │   │
│       │   ├── modules/              # 🎯 Feature modules
│       │   │   ├── auth/
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── dto/
│       │   │   │   ├── strategies/
│       │   │   │   └── guards/
│       │   │   │
│       │   │   ├── users/
│       │   │   │   ├── users.controller.ts
│       │   │   │   ├── users.service.ts
│       │   │   │   ├── users.module.ts
│       │   │   │   ├── entities/
│       │   │   │   ├── dto/
│       │   │   │   └── repositories/
│       │   │   │
│       │   │   ├── projects/
│       │   │   │   ├── projects.controller.ts
│       │   │   │   ├── projects.service.ts
│       │   │   │   ├── projects.module.ts
│       │   │   │   ├── entities/
│       │   │   │   ├── dto/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── services/
│       │   │   │   │   └── ports/
│       │   │   │   └── repositories/
│       │   │   │
│       │   │   ├── nodes/
│       │   │   │   ├── nodes.controller.ts
│       │   │   │   ├── nodes.service.ts
│       │   │   │   ├── nodes.module.ts
│       │   │   │   ├── entities/
│       │   │   │   ├── dto/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── services/
│       │   │   │   │   ├── ports/
│       │   │   │   │   └── events/
│       │   │   │   ├── services/
│       │   │   │   │   ├── llm-generation.service.ts
│       │   │   │   │   ├── cascade.service.ts
│       │   │   │   │   └── graph.service.ts
│       │   │   │   └── repositories/
│       │   │   │
│       │   │   ├── collaboration/
│       │   │   │   ├── collaboration.module.ts
│       │   │   │   ├── collaboration.gateway.ts
│       │   │   │   ├── collaboration.service.ts
│       │   │   │   ├── dto/
│       │   │   │   └── events/
│       │   │   │
│       │   │   ├── llm/
│       │   │   │   ├── llm.module.ts
│       │   │   │   ├── llm.service.ts
│       │   │   │   ├── clients/
│       │   │   │   │   ├── openai.client.ts
│       │   │   │   │   ├── anthropic.client.ts
│       │   │   │   │   └── glm.client.ts
│       │   │   │   ├── dto/
│       │   │   │   └── services/
│       │   │   │
│       │   │   └── agents/              # Futur
│       │   │
│       │   └── common/               # 🔄 Shared backend code
│       │       ├── config/
│       │       │   ├── app.config.ts
│       │       │   ├── database.config.ts
│       │       │   └── jwt.config.ts
│       │       ├── database/
│       │       │   └── prisma.service.ts
│       │       ├── decorators/
│       │       │   ├── roles.decorator.ts
│       │       │   ├── user.decorator.ts
│       │       │   └── cache.decorator.ts
│       │       ├── filters/
│       │       │   ├── http-exception.filter.ts
│       │       │   └── global-exception.filter.ts
│       │       ├── guards/
│       │       │   ├── jwt-auth.guard.ts
│       │       │   ├── roles.guard.ts
│       │       │   └── ownership.guard.ts
│       │       ├── interceptors/
│       │       │   ├── logging.interceptor.ts
│       │       │   ├── cache.interceptor.ts
│       │       │   └── transform.interceptor.ts
│       │       ├── middlewares/
│       │       │   ├── logger.middleware.ts
│       │       │   └── cors.middleware.ts
│       │       ├── pipes/
│       │       │   ├── validation.pipe.ts
│       │       │   └── parse-int.pipe.ts
│       │       └── utils/
│       │           ├── date.utils.ts
│       │           └── crypto.utils.ts
│       │
│       ├── test/
│       │   ├── jest.config.ts
│       │   ├── unit/
│       │   ├── e2e/
│       │   └── test-utils.ts
│       │
│       ├── prisma/                 # Database schema
│       │   ├── schema.prisma
│       │   ├── seed.ts
│       │   └── migrations/
│       │
│       ├── package.json
│       │   ├── tsconfig.json
│       │   ├── tsconfig.build.json
│       │   ├── nest-cli.json
│       │   └── .env.example
│       │
├── packages/                       # 🎨 Shared packages
│   ├── ui/                         # Design system (Atomic)
│   │   ├── src/
│   │   │   ├── atoms/
│   │   │   ├── molecules/
│   │   │   ├── organisms/
│   │   │   └── templates/
│   │   └── package.json
│   │
│   ├── shared/                      # Code partagé (Front + Back)
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   ├── validators/
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── config/                      # Configuration partagée
│   │   ├── src/
│   │   │   ├── env.ts
│   │   │   └── llm.ts
│   │   └── package.json
│   │
│   └── contracts/                   # Contrats partagés
│       ├── src/
│       │   ├── dto/
│       │   ├── events/
│       │   └── interfaces/
│       └── package.json
│
├── pnpm-workspace.yaml              # Workspace configuration
├── package.json (root)             # Scripts monorepo
├── turbo.json (optionnel)         # Turborepo config
├── tsconfig.base.json              # TypeScript base config
├── docker-compose.yml              # Local dev services
├── .github/
│   └── workflows/
│       └── ci.yml                 # CI/CD pipeline
│
└── README.md
```

---

## 4. Architecture des Modules

### 4.1 Auth Module

**Responsabilité** : Authentification et autorisation

```
modules/auth/
├── auth.controller.ts           # Endpoints: login, register, refresh
├── auth.service.ts             # Logique d'auth
├── auth.module.ts              # Module config
├── dto/
│   ├── register.dto.ts
│   ├── login.dto.ts
│   └── refresh-token.dto.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── local.strategy.ts        # Email/password
└── guards/
    └── jwt-auth.guard.ts
```

**API Endpoints** :
```
POST   /api/auth/register      # Créer compte
POST   /api/auth/login         # Login
POST   /api/auth/refresh       # Refresh JWT token
POST   /api/auth/logout        # Logout (révocation)
```

### 4.2 Users Module

**Responsabilité** : Gestion des utilisateurs

```
modules/users/
├── users.controller.ts
├── users.service.ts
├── users.module.ts
├── entities/
│   └── user.entity.ts
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── user-response.dto.ts
└── repositories/
    └── users.repository.ts
```

**API Endpoints** :
```
GET    /api/users/me              # Profil utilisateur
PUT    /api/users/me              # Mettre à jour profil
PATCH  /api/users/me/password     # Changer mot de passe
DELETE /api/users/me              # Supprimer compte
```

### 4.3 Projects Module

**Responsabilité** : Gestion des projets

**Architecture Clean** :
```
modules/projects/
├── projects.controller.ts
├── projects.service.ts             # Application service
├── projects.module.ts
├── entities/
│   └── project.entity.ts
├── dto/
│   ├── create-project.dto.ts
│   ├── update-project.dto.ts
│   └── project-response.dto.ts
├── domain/
│   ├── services/
│   │   └── project-domain.service.ts    # Logique métier
│   └── ports/
│       └── project.repository.interface.ts
└── repositories/
    └── projects.repository.ts
```

**API Endpoints** :
```
GET    /api/projects              # Liste projets (paginé)
POST   /api/projects              # Créer projet
GET    /api/projects/:id          # Détails projet
PUT    /api/projects/:id          # Update projet
DELETE /api/projects/:id          # Supprimer projet
GET    /api/projects/:id/members  # Membres projet
POST   /api/projects/:id/members  # Inviter membre
DELETE /api/projects/:id/members/:userId  # Supprimer membre
```

**Exemple de Controller** :
```typescript
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiTags('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les projets' })
  @ApiResponse({ status: 200, type: [ProjectResponseDto] })
  async findAll(
    @Req() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ProjectResponseDto[]> {
    return this.projectsService.findAll(req.user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un projet par ID' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  async findOne(
    @Param('id') id: string,
    @Req() req,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau projet' })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  async create(
    @Req() req,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(req.user.id, createProjectDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour un projet' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  async update(
    @Param('id') id: string,
    @Req() req,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, req.user.id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un projet' })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req,
  ): Promise<void> {
    await this.projectsService.remove(id, req.user.id);
  }
}
```

### 4.4 Nodes Module (Core Business)

**Responsabilité** : Gestion des nœuds, génération LLM, cascade updates

```
modules/nodes/
├── nodes.controller.ts
├── nodes.service.ts             # Application service
├── nodes.module.ts
├── entities/
│   ├── node.entity.ts
│   └── edge.entity.ts
├── dto/
│   ├── create-node.dto.ts
│   ├── update-node.dto.ts
│   ├── node-response.dto.ts
│   └── generate-node.dto.ts
├── domain/
│   ├── services/
│   │   └── node-domain.service.ts
│   ├── ports/
│   │   ├── node.repository.interface.ts
│   │   └── llm-provider.interface.ts
│   └── events/
│       ├── node-updated.event.ts
│       └── node-generated.event.ts
├── services/
│   ├── llm-generation.service.ts     # Appel LLM
│   ├── cascade.service.ts              # Cascade updates
│   └── graph.service.ts               # Algorithmes graphe
└── repositories/
    ├── nodes.repository.ts
    └── edges.repository.ts
```

**API Endpoints** :
```
GET    /api/projects/:projectId/nodes    # Liste nœuds projet
POST   /api/projects/:projectId/nodes    # Créer nœud
GET    /api/nodes/:id                   # Détails nœud
PUT    /api/nodes/:id                   # Update nœud
DELETE /api/nodes/:id                   # Supprimer nœud
POST   /api/nodes/:id/generate          # Déclencher génération LLM
GET    /api/nodes/:id/generate/:streamId # Stream LLM (SSE)
```

### 4.5 Collaboration Module (Temps Réel)

**Responsabilité** : Multi-user temps réel, curseurs, présence

```
modules/collaboration/
├── collaboration.module.ts
├── collaboration.gateway.ts            # WebSocket Gateway
├── collaboration.service.ts
├── dto/
│   ├── cursor-move.dto.ts
│   ├── user-join.dto.ts
│   └── user-leave.dto.ts
├── events/
│   ├── node-created.event.ts
│   ├── node-updated.event.ts
│   ├── node-deleted.event.ts
│   └── user-joined.event.ts
└── services/
    ├── presence.service.ts             # Gestion présence
    └── cursor-sync.service.ts         # Sync curseurs
```

**WebSocket Channels** :
```
ws://api/projects/:projectId

Events émis par serveur:
  - user:joined
  - user:left
  - cursor:moved
  - node:created
  - node:updated
  - node:deleted
  - node:streaming    # Pour génération LLM en temps réel

Events reçus par serveur:
  - cursor:move
  - node:create
  - node:update
  - node:delete
```

### 4.6 LLM Module

**Responsabilité** : Génération LLM partagée

```
modules/llm/
├── llm.module.ts
├── llm.service.ts                    # Orchestration
├── clients/
│   ├── openai.client.ts
│   ├── anthropic.client.ts
│   └── glm.client.ts
├── dto/
│   ├── generation-request.dto.ts
│   └── generation-response.dto.ts
├── services/
│   ├── streaming.service.ts           # SSE streaming
│   └── context-builder.service.ts     # Build context from graph
└── interfaces/
    └── llm-provider.interface.ts
```

### 4.7 Agents Module (Futur)

**Responsabilité** : Agents IA autonomes

```
modules/agents/
├── agents.module.ts
├── agents.controller.ts
├── agents.service.ts
├── entities/
│   ├── agent.entity.ts
│   └── agent-task.entity.ts
├── dto/
│   ├── create-agent.dto.ts
│   ├── execute-agent.dto.ts
│   └── agent-status.dto.ts
├── services/
│   ├── orchestrator.service.ts        # Orchestration agents
│   └── task-executor.service.ts
└── handlers/
    └── cursor-agent.handler.ts
```

---

## 5. Communication Front ↔ Back

### 5.1 REST API

#### Format des réponses

```typescript
// Success Response
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Error Response
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}
```

#### Pagination

```typescript
// Query params
GET /api/projects?page=1&limit=20

// Response
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 5.2 WebSocket

#### Connection

```typescript
// Frontend
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:3001', {
  path: '/socket.io/',
  query: {
    projectId: 'project-123',
  },
  auth: {
    token: localStorage.getItem('access_token'),
  },
});

socket.on('connect', () => {
  console.log('Connected to collaboration server');
});

socket.on('user:joined', (data) => {
  console.log('User joined:', data);
});

// Events
socket.emit('cursor:move', { x: 100, y: 200, nodeId: 'node-456' });
```

### 5.3 Server-Sent Events (SSE) pour LLM

```typescript
// Endpoint LLM streaming
GET /api/nodes/:id/generate/:streamId

// Backend (NestJS)
@Sse('stream')
async *generateLLM(
  @Param('id') nodeId: string,
  @Param('streamId') streamId: string,
  @Req() req,
) {
  const stream = await this.llmService.generate(nodeId, streamId);

  for await (const chunk of stream) {
    yield { data: chunk };
  }
}

// Frontend
const eventSource = new EventSource(
  `/api/nodes/${nodeId}/generate/${streamId}`,
);

eventSource.onmessage = (event) => {
  const chunk = event.data;
  // Update UI with chunk
};
```

---

## 6. Sécurité

### 6.1 Authentication Flow

```
1. Register
   POST /api/auth/register
   → Créer user avec password hashé (bcrypt)
   → Générer access_token (15 min)
   → Générer refresh_token (7 jours)

2. Login
   POST /api/auth/login
   → Vérifier credentials
   → Générer tokens
   → Retourner tokens

3. Access API
   Authorization: Bearer <access_token>
   → JwtAuthGuard vérifie token
   → Attache user object à request

4. Refresh Token
   POST /api/auth/refresh
   → Vérifier refresh_token
   → Générer nouveau access_token
   → Retourner nouveau access_token
```

### 6.2 Authorization

#### Roles

```typescript
enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

// Route protégée par rôle
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  // ...
}
```

#### Project Roles

```typescript
enum ProjectRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}
```

#### Permissions Matrix

| Action      | Owner | Admin | Editor | Member | Viewer |
|-------------|-------|-------|--------|--------|--------|
| View        | ✅    | ✅    | ✅     | ✅     | ✅     |
| Edit        | ✅    | ✅    | ✅     | ❌     | ❌     |
| Add Node    | ✅    | ✅    | ✅     | ❌     | ❌     |
| Delete Node | ✅    | ✅    | ✅     | ❌     | ❌     |
| Invite      | ✅    | ✅    | ❌     | ❌     | ❌     |
| Delete      | ✅    | ❌    | ❌     | ❌     | ❌     |

### 6.3 Guards

#### JwtAuthGuard

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload; // Attach user to request
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

#### RolesGuard

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

#### OwnershipGuard (Projects)

```typescript
@Injectable()
export class ProjectOwnershipGuard implements CanActivate {
  constructor(private projectsService: ProjectsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const projectId = request.params.id;
    const userId = request.user.id;

    const hasAccess = await this.projectsService.hasAccess(
      projectId,
      userId,
      [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.EDITOR],
    );

    if (!hasAccess) {
      throw new ForbiddenException('No access to this project');
    }

    return true;
  }
}
```

---

## 7. Performance & Scalabilité

### 7.1 Caching Strategy

#### Redis Cache

```typescript
@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

// Cache Interceptor
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private redisService: RedisService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = `cache:${request.url}:${JSON.stringify(request.query)}`;

    return from(this.redisService.get(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached) return of(cached);

        return next.handle().pipe(
          tap((response) => {
            this.redisService.set(cacheKey, response, 300); // Cache 5 min
          }),
        );
      }),
    );
  }
}
```

### 7.2 Database Indexing

```prisma
// Optimized indexes for performance
model Node {
  id        String    @id @default(cuid())
  projectId String
  // ...
  
  @@index([projectId])
  @@index([projectId, deletedAt])  // Filter projects without deleted
  @@index([status])               // Query by status
}
```

### 7.3 Connection Pooling

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Connection pool config
  connection_limit = 20
  pool_timeout = 10
}
```

### 7.4 Rate Limiting

```typescript
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    const endpoint = request.route.path;

    const key = `ratelimit:${userId}:${endpoint}`;
    const count = await this.redisService.get(key) || 0;

    if (count >= 100) { // 100 requests per minute
      throw new ThrottlerException('Too many requests');
    }

    await this.redisService.set(key, count + 1, 60);
    return true;
  }
}
```

---

## 📚 Documentation Connexe

- [BACKEND_API_DOCUMENTATION.md](./BACKEND_API_DOCUMENTATION.md) - API complète avec exemples
- [BACKEND_DATABASE_SCHEMA.md](./BACKEND_DATABASE_SCHEMA.md) - Schéma database détaillé
- [BACKEND_TESTING_GUIDE.md](./BACKEND_TESTING_GUIDE.md) - Guide de testing
- [BACKEND_COLLABORATION_GUIDE.md](./BACKEND_COLLABORATION_GUIDE.md) - Guide WebSocket temps réel
- [FRONTEND_ARCHITECTURE_HYBRID.md](./ARCHITECTURE_HYBRID.md) - Architecture frontend

---

**Document créé pour le projet NonLinear v1.0**
**Dernière mise à jour : 2026-01-03**
