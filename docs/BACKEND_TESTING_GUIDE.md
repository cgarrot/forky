# Guide de Testing Backend NonLinear

> **Guide complet de testing pour le backend NestJS : Unit, Integration, E2E et Performance**

---

## 📋 Table des Matières

1. [Introduction](#1-introduction)
2. [Configuration Jest](#2-configuration-jest)
3. [Tests Unitaires](#3-tests-unitaires)
4. [Tests d'Intégration](#4-tests-dintégration)
5. [Tests E2E](#5-tests-e2e)
6. [WebSocket Testing](#6-websocket-testing)
7. [Fixtures & Mocks](#7-fixtures--mocks)
8. [Coverage & Benchmarks](#8-coverage--benchmarks)

---

## 1. Introduction

### Stack de Testing

```
Framework       : Jest 29+
HTTP Client    : Supertest
Database        : Prisma + Test Database (PostgreSQL)
Websockets      : Socket.io Client
Mocks           : jest.mock, @nestjs/testing
Coverage       : istanbul/nyc
Assertions      : jest-extended
```

### Principes de Testing

1. **AAA Pattern** : Arrange, Act, Assert
2. **Test Isolation** : Chaque test indépendant
3. **Descriptive Names** : Les noms de tests doivent être explicites
4. **Fast Feedback** : Tests rapides (< 1s par test)
5. **High Coverage** : Min 80% de couverture
6. **Test Everything** : Controllers, Services, Repositories, Guards, Pipes
7. **Realistic Data** : Fixtures proches de la production

### Types de Tests

```
├── Tests Unitaires           # Test des fonctions/classes isolées
│   ├── Services
│   ├── Repositories
│   ├── Helpers/Utils
│   └── Pipes/Filters
│
├── Tests d'Intégration     # Test de plusieurs composants ensemble
│   ├── Controllers + Services
│   ├── Services + Repositories
│   ├── Guards + Services
│   └── WebSocket + Services
│
├── Tests E2E                # Test de l'API complète
│   ├── HTTP Endpoints
│   ├── Workflows complets
│   └── Scenarios utilisateurs
│
└── Tests Performance         # Benchmarking et tests de charge
    ├── Database queries
    ├── API response times
    └── Throughput
```

---

## 2. Configuration Jest

### 2.1 Configuration Principale

```typescript
// apps/api/jest.config.ts
export default {
  // Configuration de base
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/main.ts',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Test Environment
  testEnvironment: 'node',
  
  // Module Resolution
  moduleNameMapper: {
    '^@nonlinear/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@nonlinear/contracts/(.*)$': '<rootDir>/../../packages/contracts/src/$1',
    '^@nonlinear/database/(.*)$': '<rootDir>/../../packages/database/src/$1',
    '^@nonlinear/config/(.*)$': '<rootDir>/../../packages/config/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  
  // Setup Files
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  
  // Global Options
  verbose: true,
  bail: false, // Arrêter au premier échec (false en dev)
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
```

### 2.2 Setup File Global

```typescript
// apps/api/test/setup.ts
import { PrismaService } from '@nonlinear/database';
import { PrismaClient } from '@prisma/client';

// Prisma Client pour les tests
const prismaTestClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_TEST_URL || 'postgresql://test:test@localhost:5432/test_db',
    },
  },
});

let prismaService: PrismaService;

beforeAll(async () => {
  // Initialiser Prisma Service
  prismaService = new PrismaService();
  await prismaService.$connect();
});

afterAll(async () => {
  // Nettoyer la base de test
  await prismaTestClient.user.deleteMany();
  await prismaTestClient.project.deleteMany();
  await prismaTestClient.node.deleteMany();
  await prismaTestClient.edge.deleteMany();
  await prismaTestClient.userSession.deleteMany();
  
  // Déconnecter
  await prismaTestClient.$disconnect();
  await prismaService.$disconnect();
});

beforeEach(async () => {
  // Nettoyer entre chaque test
  await prismaTestClient.userSession.deleteMany();
  await prismaTestClient.edge.deleteMany();
  await prismaTestClient.node.deleteMany();
  await prismaTestClient.project.deleteMany();
  await prismaTestClient.user.deleteMany();
});

// Exporter pour les tests
global.prismaTestClient = prismaTestClient;
global.prismaService = prismaService;
```

### 2.3 Scripts Package.json

```json
{
  "name": "@nonlinear/api",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e",
    "test:debug": "node --inspect-brk --run-band -- jest --runInBand",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

---

## 3. Tests Unitaires

### 3.1 Tester un Service

```typescript
// apps/api/src/modules/projects/projects.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { ProjectsRepository } from './repositories/projects.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repository: ProjectsRepository;
  
  // Mock Repository
  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneByUser: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    hasAccess: jest.fn(),
  };

  beforeEach(async () => {
    // Initialiser le module de test
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: ProjectsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repository = module.get<ProjectsRepository>(ProjectsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all projects for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1', ownerId: userId },
        { id: 'proj-2', name: 'Project 2', ownerId: userId },
      ];
      mockRepository.findAllByUser.mockResolvedValue(mockProjects);

      // Act
      const result = await service.findAll(userId);

      // Assert
      expect(result).toEqual(mockProjects);
      expect(mockRepository.findAllByUser).toHaveBeenCalledWith(userId);
    });

    it('should return empty array if user has no projects', async () => {
      // Arrange
      const userId = 'user-123';
      mockRepository.findAllByUser.mockResolvedValue([]);

      // Act
      const result = await service.findAll(userId);

      // Assert
      expect(result).toEqual([]);
      expect(mockRepository.findAllByUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('create', () => {
    const createProjectDto: CreateProjectDto = {
      name: 'Test Project',
      description: 'A test project',
      ownerId: 'user-123',
    };

    it('should create a project successfully', async () => {
      // Arrange
      const mockProject = {
        id: 'proj-123',
        ...createProjectDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.create.mockResolvedValue(mockProject);

      // Act
      const result = await service.create(createProjectDto);

      // Assert
      expect(result).toEqual(mockProject);
      expect(mockRepository.create).toHaveBeenCalledWith(createProjectDto);
    });

    it('should throw ConflictException if project name already exists', async () => {
      // Arrange
      mockRepository.create.mockRejectedValue(
        new ConflictException('Project name already exists')
      );

      // Act & Assert
      await expect(service.create(createProjectDto)).rejects.toThrow(
        ConflictException,
        'Project name already exists'
      );
      expect(mockRepository.create).toHaveBeenCalledWith(createProjectDto);
    });
  });

  describe('update', () => {
    const projectId = 'proj-123';
    const userId = 'user-123';
    
    const updateProjectDto: UpdateProjectDto = {
      name: 'Updated Project',
    };

    it('should update a project successfully', async () => {
      // Arrange
      const existingProject = {
        id: projectId,
        name: 'Old Project',
        ownerId: userId,
      };
      mockRepository.findOne.mockResolvedValue(existingProject);
      mockRepository.hasAccess.mockResolvedValue(true);
      
      const updatedProject = {
        ...existingProject,
        ...updateProjectDto,
        updatedAt: new Date(),
      };
      mockRepository.update.mockResolvedValue(updatedProject);

      // Act
      const result = await service.update(projectId, userId, updateProjectDto);

      // Assert
      expect(result).toEqual(updatedProject);
      expect(mockRepository.findOne).toHaveBeenCalledWith(projectId);
      expect(mockRepository.hasAccess).toHaveBeenCalledWith(projectId, userId);
      expect(mockRepository.update).toHaveBeenCalledWith(
        projectId,
        updateProjectDto
      );
    });

    it('should throw NotFoundException if project not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(projectId, userId, updateProjectDto)
      ).rejects.toThrow(NotFoundException, 'Project not found');
      expect(mockRepository.findOne).toHaveBeenCalledWith(projectId);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user has no access', async () => {
      // Arrange
      const existingProject = {
        id: projectId,
        name: 'Old Project',
        ownerId: 'other-user-456',
      };
      mockRepository.findOne.mockResolvedValue(existingProject);
      mockRepository.hasAccess.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.update(projectId, userId, updateProjectDto)
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepository.hasAccess).toHaveBeenCalledWith(projectId, userId);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a project successfully', async () => {
      // Arrange
      const projectId = 'proj-123';
      const userId = 'user-123';
      
      mockRepository.findOne.mockResolvedValue({
        id: projectId,
        ownerId: userId,
      });
      mockRepository.hasAccess.mockResolvedValue(true);
      mockRepository.remove.mockResolvedValue(undefined);

      // Act
      await service.remove(projectId, userId);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith(projectId);
      expect(mockRepository.hasAccess).toHaveBeenCalledWith(projectId, userId);
      expect(mockRepository.remove).toHaveBeenCalledWith(projectId);
    });
  });
});
```

### 3.2 Tester un Repository

```typescript
// apps/api/src/modules/projects/repositories/projects.repository.spec.ts
import { ProjectsRepository } from './projects.repository';
import { PrismaService } from '@nonlinear/database';

describe('ProjectsRepository', () => {
  let repository: ProjectsRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Utiliser Prisma global de setup.ts
    prisma = global.prismaService;
    repository = new ProjectsRepository(prisma);
  });

  describe('create', () => {
    it('should create a project and return it', async () => {
      // Arrange
      const createProjectDto = {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-123',
      };

      // Act
      const result = await repository.create(createProjectDto);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(createProjectDto.name);
      expect(result.description).toBe(createProjectDto.description);
      expect(result.ownerId).toBe(createProjectDto.ownerId);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should throw PrismaClientKnownRequestError if data is invalid', async () => {
      // Arrange
      const invalidDto = {
        name: '', // Empty name violates @IsString() @MinLength(1)
      ownerId: 'user-123',
      };

      // Act & Assert
      await expect(repository.create(invalidDto)).rejects.toThrow();
    });
  });

  describe('findAllByUser', () => {
    it('should return all projects for a user', async () => {
      // Arrange
      const user = await global.prismaTestClient.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
        },
      });

      const projects = await Promise.all([
        global.prismaTestClient.project.create({
          data: {
            name: 'Project 1',
            ownerId: user.id,
          },
        }),
        global.prismaTestClient.project.create({
          data: {
            name: 'Project 2',
            ownerId: user.id,
          },
        }),
        global.prismaTestClient.project.create({
          data: {
            name: 'Other Project',
            ownerId: 'other-user',
          },
        }),
      ]);

      // Act
      const result = await repository.findAllByUser(user.id);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project 1');
      expect(result[1].name).toBe('Project 2');
      expect(result.every(p => p.ownerId === user.id)).toBe(true);
    });
  });

  describe('hasAccess', () => {
    it('should return true if user is owner', async () => {
      // Arrange
      const user = await global.prismaTestClient.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
        },
      });

      const project = await global.prismaTestClient.project.create({
        data: {
          name: 'Test Project',
          ownerId: user.id,
        },
      });

      // Act
      const result = await repository.hasAccess(project.id, user.id);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true if user is member with EDIT role', async () => {
      // Arrange
      const user = await global.prismaTestClient.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
        },
      });

      const project = await global.prismaTestClient.project.create({
        data: {
          name: 'Test Project',
          ownerId: 'other-user',
        },
      });

      await global.prismaTestClient.projectMember.create({
        data: {
          projectId: project.id,
          userId: user.id,
          role: 'EDITOR',
        },
      });

      // Act
      const result = await repository.hasAccess(project.id, user.id, ['EDITOR']);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if user is not a member', async () => {
      // Arrange
      const user = await global.prismaTestClient.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
        },
      });

      const project = await global.prismaTestClient.project.create({
        data: {
          name: 'Test Project',
          ownerId: 'other-user',
        },
      });

      // Act
      const result = await repository.hasAccess(project.id, user.id);

      // Assert
      expect(result).toBe(false);
    });
  });
});
```

### 3.3 Tester un Guard

```typescript
// apps/api/src/common/guards/ownership.guard.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from '../../modules/projects/projects.service';
import { ProjectOwnershipGuard } from './ownership.guard';

describe('ProjectOwnershipGuard', () => {
  let guard: ProjectOwnershipGuard;
  let projectsService: ProjectsService;
  let mockContext: ExecutionContext;

  const mockProjectsService = {
    hasAccess: jest.fn(),
  };

  beforeEach(() => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectOwnershipGuard,
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    guard = module.get<ProjectOwnershipGuard>(ProjectOwnershipGuard);
    projectsService = module.get<ProjectsService>(ProjectsService);

    // Créer un mock du contexte
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          params: { id: 'project-123' },
          user: { id: 'user-123' },
        }),
      }),
    } as unknown as ExecutionContext;
  });

  it('should allow access if user is owner', async () => {
    // Arrange
    mockProjectsService.hasAccess.mockResolvedValue(true);

    // Act
    const result = await guard.canActivate(mockContext);

    // Assert
    expect(result).toBe(true);
    expect(mockProjectsService.hasAccess).toHaveBeenCalledWith(
      'project-123',
      'user-123',
      ['OWNER']
    );
  });

  it('should throw ForbiddenException if user has no access', async () => {
    // Arrange
    mockProjectsService.hasAccess.mockResolvedValue(false);

    // Act & Assert
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException
    );
  });

  it('should return false if project not found', async () => {
    // Arrange
    mockProjectsService.hasAccess.mockRejectedValue(
      new NotFoundException()
    );

    // Act
    const result = await guard.canActivate(mockContext);

    // Assert
    expect(result).toBe(false);
  });
});
```

---

## 4. Tests d'Intégration

### 4.1 Tester Controller + Service

```typescript
// apps/api/src/modules/projects/projects.controller.spec.ts (integration)
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '@nonlinear/database';

describe('ProjectsController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    // Initialiser le module complet (pas de mocks)
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Créer un utilisateur de test
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
      },
    });
    userId = user.id;

    // Login pour obtenir le token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password',
      });

    authToken = loginResponse.body.data.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Créer un projet pour chaque test
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        ownerId: userId,
      },
    });
    projectId = project.id;
  });

  afterEach(async () => {
    // Nettoyer après chaque test
    await prisma.project.deleteMany({ where: { ownerId: userId } });
  });

  describe('GET /api/projects', () => {
    it('should return array of projects', () => {
      return request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data[0]).toHaveProperty('id');
          expect(res.body.data[0]).toHaveProperty('name');
        });
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .get('/api/projects')
        .expect(401);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return a single project', () => {
      return request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(projectId);
          expect(res.body.data.name).toBe('Test Project');
        });
    });

    it('should return 404 for non-existent project', () => {
      return request(app.getHttpServer())
        .get('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
        });
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', () => {
      const createProjectDto = {
        name: 'New Project',
        description: 'A new project',
      };

      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createProjectDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBeDefined();
          expect(res.body.data.name).toBe(createProjectDto.name);
          expect(res.body.data.description).toBe(createProjectDto.description);
        });
    });

    it('should return 400 for invalid data', () => {
      const invalidDto = {
        name: '', // Empty name
      };

      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update a project', () => {
      const updateProjectDto = {
        name: 'Updated Project',
      };

      return request(app.getHttpServer())
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateProjectDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe(updateProjectDto.name);
        });
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete a project', () => {
      return request(app.getHttpServer())
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 when deleting non-existent project', () => {
      return request(app.getHttpServer())
        .delete('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
```

### 4.2 Tester WebSocket Gateway

```typescript
// apps/api/src/modules/collaboration/collaboration.gateway.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server } from 'socket.io';
import { AppModule } from '../../app.module';
import { JwtService } from '@nestjs/jwt';
import { CollaborationGateway } from './collaboration.gateway';

describe('CollaborationGateway (integration)', () => {
  let app: INestApplication;
  let io: Server;
  let jwtService: JwtService;
  let gateway: CollaborationGateway;
  let clientSocket: any;
  let authToken: string;
  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    io = app.get<Server>(Server);
    jwtService = app.get<JwtService>(JwtService);
    gateway = app.get<CollaborationGateway>(CollaborationGateway);

    // Créer un utilisateur et générer un token
    userId = 'user-123';
    authToken = jwtService.sign({ userId, email: 'test@example.com' });
    projectId = 'project-123';
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    await app.close();
  });

  it('should connect to WebSocket with valid token', (done) => {
    clientSocket = ioClient('http://localhost:3001', {
      path: '/socket.io/',
      query: { projectId },
      auth: { token: authToken },
    });

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      clientSocket.disconnect();
      done();
    });

    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });

  it('should disconnect with invalid token', (done) => {
    clientSocket = ioClient('http://localhost:3001', {
      path: '/socket.io/',
      query: { projectId },
      auth: { token: 'invalid-token' },
    });

    clientSocket.on('connect_error', () => {
      expect(clientSocket.connected).toBe(false);
      clientSocket.disconnect();
      done();
    });
  });

  it('should receive user:joined event when another user joins', (done) => {
    const clientSocket1 = ioClient('http://localhost:3001', {
      path: '/socket.io/',
      query: { projectId },
      auth: { token: jwtService.sign({ userId: 'user-456', email: 'test2@example.com' }) },
    });

    clientSocket.on('connect', () => {
      clientSocket1.disconnect();
    });

    clientSocket.on('user:joined', (data) => {
      expect(data.userId).toBe('user-456');
      expect(data.username).toBe('test2');
      clientSocket.disconnect();
      done();
    });
  });

  it('should broadcast cursor:move event', (done) => {
    clientSocket.on('connect', () => {
      // Simuler un autre utilisateur
      const clientSocket2 = ioClient('http://localhost:3001', {
        path: '/socket.io/',
        query: { projectId },
        auth: { token: jwtService.sign({ userId: 'user-456', email: 'test2@example.com' }) },
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('cursor:move', { x: 100, y: 200 });
      });

      clientSocket.on('cursor:moved', (data) => {
        expect(data.userId).toBe('user-456');
        expect(data.cursor).toEqual({ x: 100, y: 200 });
        clientSocket.disconnect();
        clientSocket2.disconnect();
        done();
      });
    });
  });

  it('should broadcast node:created event', (done) => {
    clientSocket.on('connect', () => {
      clientSocket.emit('node:create', {
        prompt: 'Test node',
        position: { x: 0, y: 0 },
      });
    });

    clientSocket.on('node:created', (data) => {
      expect(data.node.prompt).toBe('Test node');
      clientSocket.disconnect();
      done();
    });
  });
});
```

---

## 5. Tests E2E

### 5.1 Workflow Utilisateur Complet

```typescript
// apps/api/test/e2e/user-workflow.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@nonlinear/database';

describe('User Workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let projectIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Complete User Lifecycle', () => {
    it('should register, login, create project, create nodes, and logout', async () => {
      // Step 1: Register
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'e2e@example.com',
          username: 'e2euser',
          password: 'SecurePass123!',
          firstName: 'E2E',
          lastName: 'User',
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user).toHaveProperty('id');
      expect(registerResponse.body.data.access_token).toBeDefined();
      authToken = registerResponse.body.data.access_token;
      userId = registerResponse.body.data.user.id;

      // Step 2: Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'e2e@example.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      authToken = loginResponse.body.data.access_token;

      // Step 3: Create Project
      const createProjectResponse = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Test Project',
          description: 'A project for E2E testing',
        })
        .expect(201);

      expect(createProjectResponse.body.success).toBe(true);
      const projectId = createProjectResponse.body.data.id;
      projectIds.push(projectId);

      // Step 4: Create Nodes
      const node1Response = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/nodes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'What is E2E testing?',
          position: { x: 0, y: 0 },
        })
        .expect(201);

      expect(node1Response.body.success).toBe(true);
      const nodeId1 = node1Response.body.data.id;

      const node2Response = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/nodes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Why E2E testing?',
          position: { x: 300, y: 0 },
        })
        .expect(201);

      expect(node2Response.body.success).toBe(true);
      const nodeId2 = node2Response.body.data.id;

      // Step 5: Create Edge
      const createEdgeResponse = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/edges`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceId: nodeId1,
          targetId: nodeId2,
        })
        .expect(201);

      expect(createEdgeResponse.body.success).toBe(true);
      expect(createEdgeResponse.body.data.sourceId).toBe(nodeId1);
      expect(createEdgeResponse.body.data.targetId).toBe(nodeId2);

      // Step 6: Get Project
      const getProjectResponse = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getProjectResponse.body.success).toBe(true);
      expect(getProjectResponse.body.data.nodeCount).toBe(2);
      expect(getProjectResponse.body.data.nodes).toHaveLength(2);
      expect(getProjectResponse.body.data.edges).toHaveLength(1);

      // Step 7: Logout
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Step 8: Try to access with old token (should fail)
      await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
    });
  });

  describe('Multi-Project Management', () => {
    beforeAll(async () => {
      // Register and login
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'multi@example.com',
          username: 'multiuser',
          password: 'SecurePass123!',
        })
        .expect(201);

      authToken = registerResponse.body.data.access_token;
      userId = registerResponse.body.data.user.id;
    });

    afterAll(async () => {
      // Nettoyer tous les projets créés
      for (const projectId of projectIds) {
        await request(app.getHttpServer())
          .delete(`/api/projects/${projectId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);
      }
    });

    it('should manage multiple projects', async () => {
      // Create multiple projects
      const projects = await Promise.all([
        request(app.getHttpServer())
          .post('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Project 1' })
          .expect(201),
        request(app.getHttpServer())
          .post('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Project 2' })
          .expect(201),
        request(app.getHttpServer())
          .post('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Project 3' })
          .expect(201),
      ]);

      projectIds = projects.map(p => p.body.data.id);

      // List projects
      const listResponse = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data).toHaveLength(3);
      expect(listResponse.body.meta.total).toBe(3);

      // Delete one project
      await request(app.getHttpServer())
        .delete(`/api/projects/${projectIds[0]}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify deletion
      const listAfterDelete = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listAfterDelete.body.data).toHaveLength(2);
      expect(listAfterDelete.body.meta.total).toBe(2);
    });
  });
});
```

### 5.2 Scenarios de Collaborer (E2E WebSocket)

```typescript
// apps/api/test/e2e/collaboration-workflow.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ioClient } from 'socket.io-client';
import { AppModule } from '../src/app.module';

describe('Collaboration Workflow (e2e)', () => {
  let app: INestApplication;
  let clientSockets: any[] = [];
  let authToken: string;
  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Créer utilisateur et projet
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'collab@example.com',
        username: 'collabuser',
        password: 'SecurePass123!',
      })
      .expect(201);

    authToken = registerResponse.body.data.access_token;
    userId = registerResponse.body.data.user.id;

    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Collaboration Test Project',
      })
      .expect(201);

    projectId = projectResponse.body.data.id;
  });

  afterAll(async () => {
    // Déconnecter tous les sockets
    clientSockets.forEach(socket => {
      if (socket.connected) socket.disconnect();
    });
    await app.close();
  });

  describe('Multi-User Canvas Interaction', () => {
    it('should handle multiple users with cursor movements and node creation', (done) => {
      let completedUsers = 0;
      const expectedEvents = 4; // 2 joins, 2 cursors

      // User 1
      const user1Socket = ioClient('http://localhost:3001', {
        path: '/socket.io/',
        query: { projectId },
        auth: { token: authToken },
      });

      user1Socket.on('connect', () => {
        // User 2 connect
        const user2Socket = ioClient('http://localhost:3001', {
          path: '/socket.io/',
          query: { projectId },
          auth: { token: authToken },
        });

        user2Socket.on('connect', () => {
          clientSockets.push(user1Socket, user2Socket);

          // User 1 moves cursor
          user1Socket.emit('cursor:move', { x: 100, y: 200 });

          // User 2 moves cursor
          setTimeout(() => {
            user2Socket.emit('cursor:move', { x: 300, y: 400 });
          }, 100);
        });

        user1Socket.on('user:joined', (data) => {
          expect(data.userId).toBe('user-456'); // User 2
          completedUsers++;
        });

        user2Socket.on('user:joined', (data) => {
          expect(data.userId).toBe(userId); // User 1
          completedUsers++;
        });

        user1Socket.on('cursor:moved', (data) => {
          if (data.userId !== userId) {
            expect(data.userId).toBe('user-456');
            expect(data.cursor).toEqual({ x: 300, y: 400 });
            completedUsers++;
          }
        });

        user2Socket.on('cursor:moved', (data) => {
          if (data.userId !== 'user-456') {
            expect(data.userId).toBe(userId);
            expect(data.cursor).toEqual({ x: 100, y: 200 });
            completedUsers++;
          }
        });

        // Vérifier que tous les événements ont été reçus
        setTimeout(() => {
          expect(completedUsers).toBe(expectedEvents);
          
          user1Socket.disconnect();
          user2Socket.disconnect();
          done();
        }, 1000);
      });

      user1Socket.on('connect_error', (error) => {
        user1Socket.disconnect();
        done(error);
      });
    });
  });

  describe('Node Synchronization', () => {
    it('should broadcast node creation to all users', (done) => {
      let nodeCreatedCount = 0;

      const user1Socket = ioClient('http://localhost:3001', {
        path: '/socket.io/',
        query: { projectId },
        auth: { token: authToken },
      });

      const user2Socket = ioClient('http://localhost:3001', {
        path: '/socket.io/',
        query: { projectId },
        auth: { token: authToken },
      });

      user1Socket.on('connect', () => {
        user2Socket.on('connect', () => {
          // User 1 crée un nœud
          user1Socket.emit('node:create', {
            prompt: 'Collaboration test node',
            position: { x: 0, y: 0 },
          });
        });
      });

      user1Socket.on('node:created', (data) => {
        expect(data.node.prompt).toBe('Collaboration test node');
        nodeCreatedCount++;
      });

      user2Socket.on('node:created', (data) => {
        expect(data.node.prompt).toBe('Collaboration test node');
        nodeCreatedCount++;
      });

      setTimeout(() => {
        expect(nodeCreatedCount).toBe(2);
        
        user1Socket.disconnect();
        user2Socket.disconnect();
        done();
      }, 1000);
    });
  });
});
```

---

## 6. WebSocket Testing

### 6.1 Test Helpers pour WebSocket

```typescript
// apps/api/test/helpers/websocket.helper.ts
import { ioClient } from 'socket.io-client';
import { Server } from 'socket.io';

export class WebSocketTestHelper {
  private readonly server: Server;
  private readonly clients: any[] = [];

  constructor(server: Server) {
    this.server = server;
  }

  async createClient(
    projectId: string,
    token: string,
    options: any = {},
  ): Promise<any> {
    const client = ioClient('http://localhost:3001', {
      path: '/socket.io/',
      query: { projectId },
      auth: { token },
      ...options,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.disconnect();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      client.on('connect', () => {
        clearTimeout(timeout);
        this.clients.push(client);
        resolve(client);
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        client.disconnect();
        reject(error);
      });
    });
  }

  async waitForEvent(
    client: any,
    eventName: string,
    timeout = 5000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        client.off(eventName);
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      client.once(eventName, (data) => {
        clearTimeout(timeoutId);
        resolve(data);
      });
    });
  }

  disconnectAll() {
    this.clients.forEach(client => {
      if (client.connected) client.disconnect();
    });
    this.clients = [];
  }
}
```

### 6.2 Tester avec Helper

```typescript
// apps/api/test/integration/collaboration.gateway.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { CollaborationGateway } from '../../src/modules/collaboration/collaboration.gateway';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WebSocketTestHelper } from '../helpers/websocket.helper';

describe('CollaborationGateway (integration with helper)', () => {
  let app: TestingModule;
  let gateway: CollaborationGateway;
  let server: Server;
  let helper: WebSocketTestHelper;
  let authToken: string;
  let projectId: string;
  let userId: string;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    gateway = app.get<CollaborationGateway>(CollaborationGateway);
    server = app.get<Server>(Server);
    helper = new WebSocketTestHelper(server);

    // Créer utilisateur et token
    const jwtService = app.get<JwtService>(JwtService);
    userId = 'user-123';
    authToken = jwtService.sign({ userId, email: 'test@example.com' });
    projectId = 'project-123';
  });

  afterAll(async () => {
    helper.disconnectAll();
    await app.close();
  });

  it('should handle multiple users with cursors and node updates', async () => {
    // Créer 3 clients
    const client1 = await helper.createClient(projectId, authToken);
    const client2 = await helper.createClient(projectId, authToken);
    const client3 = await helper.createClient(projectId, authToken);

    // Simuler les 3 utilisateurs se déplaçant
    client1.emit('cursor:move', { x: 100, y: 200 });
    client2.emit('cursor:move', { x: 300, y: 400 });
    client3.emit('cursor:move', { x: 500, y: 600 });

    // Vérifier que chaque client reçoit les curseurs des autres
    const cursors1 = await Promise.all([
      helper.waitForEvent(client1, 'cursor:moved'),
      helper.waitForEvent(client1, 'cursor:moved'),
    ]);

    const cursors2 = await Promise.all([
      helper.waitForEvent(client2, 'cursor:moved'),
      helper.waitForEvent(client2, 'cursor:moved'),
    ]);

    const cursors3 = await Promise.all([
      helper.waitForEvent(client3, 'cursor:moved'),
      helper.waitForEvent(client3, 'cursor:moved'),
    ]);

    expect(cursors1.length).toBe(2);
    expect(cursors2.length).toBe(2);
    expect(cursors3.length).toBe(2);

    // Créer un nœud depuis client1
    client1.emit('node:create', {
      prompt: 'Test node',
      position: { x: 0, y: 0 },
    });

    // Vérifier que tous les clients reçoivent le nœud créé
    const node1 = await helper.waitForEvent(client1, 'node:created');
    const node2 = await helper.waitForEvent(client2, 'node:created');
    const node3 = await helper.waitForEvent(client3, 'node:created');

    expect(node1.node.prompt).toBe('Test node');
    expect(node2.node.prompt).toBe('Test node');
    expect(node3.node.prompt).toBe('Test node');

    helper.disconnectAll();
  });
});
```

---

## 7. Fixtures & Mocks

### 7.1 Test Data Fixtures

```typescript
// apps/api/test/fixtures/user.fixture.ts
export const createTestUser = async (
  prisma: PrismaService,
  overrides: Partial<any> = {},
) => {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      username: `testuser${Date.now()}`,
      passwordHash: 'hash', // Utiliser bcrypt en prod
      firstName: 'Test',
      lastName: 'User',
      preferences: {
        theme: 'dark',
        notifications: true,
      },
      ...overrides,
    },
  });
};

export const createAuthenticatedUser = async (
  prisma: PrismaService,
  jwtService: JwtService,
  overrides: Partial<any> = {},
) => {
  const user = await createTestUser(prisma, overrides);
  const payload = { userId: user.id, email: user.email };
  const token = jwtService.sign(payload);

  return { user, token: token };
};
```

```typescript
// apps/api/test/fixtures/project.fixture.ts
import { createTestUser } from './user.fixture';

export const createTestProject = async (
  prisma: PrismaService,
  userId?: string,
  overrides: Partial<any> = {},
) => {
  if (!userId) {
    const user = await createTestUser(prisma);
    userId = user.id;
  }

  return prisma.project.create({
    data: {
      name: 'Test Project',
      description: 'A test project',
      ownerId: userId,
      systemPrompt: 'Test system prompt',
      viewport: { x: 0, y: 0, zoom: 1 },
      ...overrides,
    },
  });
};

export const createProjectWithNodes = async (
  prisma: PrismaService,
  userId?: string,
  nodeCount: number = 3,
) => {
  const project = await createTestProject(prisma, userId);
  const nodes = [];

  for (let i = 0; i < nodeCount; i++) {
    const node = await prisma.node.create({
      data: {
        projectId: project.id,
        prompt: `Test node ${i + 1}`,
        response: `Test response ${i + 1}`,
        status: 'COMPLETED',
        position: { x: i * 300, y: 0 },
        llmModel: 'gpt-4o',
        llmTokens: 100 + i,
      },
    });
    nodes.push(node);
  }

  // Créer edges séquentiels
  for (let i = 0; i < nodes.length - 1; i++) {
    await prisma.edge.create({
      data: {
        sourceId: nodes[i].id,
        targetId: nodes[i + 1].id,
        projectId: project.id,
      },
    });
  }

  return { project, nodes };
};
```

### 7.2 Mock Services

```typescript
// apps/api/test/mocks/llm.service.mock.ts
import { MockProvider, mockStream } from '@ai-sdk/openai/core/test';

export class MockLLMService {
  private mockProvider = new MockProvider();

  get streamText() {
    return mockStream({
      model: 'gpt-4o',
      messages: [],
    });
  }

  get provider() {
    return this.mockProvider;
  }

  // Mock de génération de texte
  mockGenerateResponse(response: string) {
    this.mockProvider.result = {
      text: response,
      usage: { promptTokens: 10, completionTokens: 20 },
    };
  }

  // Mock de stream
  mockStreamChunks(chunks: string[]) {
    let index = 0;
    this.mockProvider.result = {
      text: chunks.join(''),
      chunks: chunks.map((chunk, i) => ({
        delta: { text: chunk },
        index: i,
      })),
    };
  }

  reset() {
    this.mockProvider = new MockProvider();
  }
}
```

```typescript
// apps/api/test/mocks/redis.service.mock.ts
export class MockRedisService {
  private store: Map<string, any> = new Map();
  private ttlStore: Map<string, Date> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;

    // Vérifier TTL
    const ttl = this.ttlStore.get(key);
    if (ttl && new Date() > ttl) {
      this.store.delete(key);
      this.ttlStore.delete(key);
      return null;
    }

    return JSON.parse(item) as T;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    this.store.set(key, JSON.stringify(value));
    this.ttlStore.set(key, new Date(Date.now() + ttl * 1000));
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.ttlStore.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return Array.from(this.store.keys()).filter(key =>
      pattern.includes('*') || key.includes(pattern)
    );
  }

  reset() {
    this.store.clear();
    this.ttlStore.clear();
  }
}
```

---

## 8. Coverage & Benchmarks

### 8.1 Configuration Coverage

```json
// apps/api/package.json
{
  "scripts": {
    "test:cov": "jest --coverage",
    "test:cov:watch": "jest --coverage --watch",
    "test:cov:html": "jest --coverage --coverageReporters=html"
  }
}
```

### 8.2 Thresholds

```typescript
// apps/api/jest.config.ts
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  // Thresholds spécifiques par module
  './src/modules/auth/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  './src/modules/projects/': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
  './src/modules/nodes/': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
}
```

### 8.3 Performance Benchmarking

```typescript
// apps/api/test/performance/api.benchmark.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';

describe('API Performance Benchmarks', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Créer un compte et se logger
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'perf@example.com',
        password: 'TestPass123!',
      })
      .expect(201);

    authToken = registerResponse.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/projects Performance', () => {
    it('should handle 100 requests with < 1s average response time', async () => {
      // Créer 100 projets
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Project ${i}`,
            })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(10000); // < 10s pour 100 requêtes
      responses.forEach(res => {
        expect(res.status).toBe(201);
      });
    });
  });

  describe('GET /api/projects/:id Performance', () => {
    it('should respond in < 50ms for single project', async () => {
      // Créer un projet
      const createResponse = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Benchmark Project',
        })
        .expect(201);

      const projectId = createResponse.body.data.id;

      // Mesurer le temps de réponse
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(50);
    });
  });

  describe('Database Query Performance', () => {
    it('should query 1000 nodes in < 500ms', async () => {
      // Créer un projet avec 1000 nœuds
      const createProjectResponse = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Performance Test Project',
        })
        .expect(201);

      const projectId = createProjectResponse.body.data.id;

      // Créer 1000 nœuds
      const batchSize = 100;
      for (let i = 0; i < 10; i++) {
        const nodes = Array.from({ length: batchSize }, (_, index) => ({
          prompt: `Node ${i * batchSize + index + 1}`,
          position: { x: index * 300, y: 0 },
        }));

        const response = await request(app.getHttpServer())
          .post(`/api/projects/${projectId}/nodes/batch`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ nodes })
          .expect(201);

        expect(response.body.data).toHaveLength(batchSize);
      }

      // Mesurer le temps de requête pour récupérer tous les nœuds
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/nodes?limit=1000`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(500);
      expect(response.body.data).toHaveLength(1000);
    });
  });
});
```

---

## 📚 Documentation Connexe

- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) - Architecture backend complète
- [BACKEND_API_DOCUMENTATION.md](./BACKEND_API_DOCUMENTATION.md) - Documentation API
- [BACKEND_DATABASE_SCHEMA.md](./BACKEND_DATABASE_SCHEMA.md) - Schéma database
- [BACKEND_COLLABORATION_GUIDE.md](./BACKEND_COLLABORATION_GUIDE.md) - Guide WebSocket

---

**Guide de testing créé pour le projet NonLinear v1.0**
**Dernière mise à jour : 2026-01-03**
