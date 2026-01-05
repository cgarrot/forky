# Documentation API NonLinear

> **Documentation complète de l'API REST et WebSocket pour NonLinear**

---

## 📋 Table des Matières

1. [Introduction](#1-introduction)
2. [Authentication](#2-authentication)
3. [Users](#3-users)
4. [Projects](#4-projects)
5. [Nodes](#5-nodes)
6. [WebSocket](#6-websocket-collaboration)
7. [LLM Generation](#7-llm-generation)
8. [Errors](#8-erreurs)

---

## 1. Introduction

### Base URL

```
Development : http://localhost:3001/api
Production  : https://api.nonlinear.app/api
```

### Format des Réponses

#### Success Response

```json
{
  "success": true,
  "data": {
    // Données spécifiques au endpoint
  },
  "message": "Opération réussie"
}
```

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Le champ email est requis",
    "details": {
      "field": "email",
      "constraint": "required"
    }
  },
  "timestamp": "2026-01-03T10:30:00.000Z",
  "path": "/api/projects"
}
```

### Pagination

#### Request

```http
GET /api/projects?page=1&limit=20
```

#### Response

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Authentication

Les endpoints protégés nécessitent un header Authorization :

```http
Authorization: Bearer <access_token>
```

---

## 2. Authentication

### 2.1 Register

Créer un nouveau compte utilisateur.

#### Request

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### DTO

```typescript
export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;

  @ApiProperty({ required: false })
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsString()
  lastName?: string;
}
```

#### Response 201

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx123abc",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": null,
      "createdAt": "2026-01-03T10:00:00.000Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Compte créé avec succès"
}
```

#### Errors

| Code | HTTP | Message |
|------|------|---------|
| EMAIL_ALREADY_EXISTS | 409 | Cet email est déjà utilisé |
| USERNAME_ALREADY_EXISTS | 409 | Ce nom d'utilisateur est déjà utilisé |
| WEAK_PASSWORD | 400 | Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre |

---

### 2.2 Login

Se connecter avec email/password.

#### Request

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### DTO

```typescript
export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx123abc",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900
  },
  "message": "Connexion réussie"
}
```

#### Errors

| Code | HTTP | Message |
|------|------|---------|
| INVALID_CREDENTIALS | 401 | Email ou mot de passe incorrect |
| ACCOUNT_LOCKED | 403 | Compte verrouillé (trop de tentatives) |

---

### 2.3 Refresh Token

Rafraîchir le token d'accès.

#### Request

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### DTO

```typescript
export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refresh_token: string;
}
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900
  },
  "message": "Token rafraîchi"
}
```

#### Errors

| Code | HTTP | Message |
|------|------|---------|
| INVALID_REFRESH_TOKEN | 401 | Token de rafraîchissement invalide ou expiré |
| REFRESH_TOKEN_REVOKED | 401 | Token révoqué |

---

### 2.4 Logout

Déconnecter l'utilisateur et révoquer les tokens.

#### Request

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

#### Response 204

Pas de body de réponse.

---

## 3. Users

### 3.1 Get Current User

Récupérer le profil de l'utilisateur connecté.

#### Request

```http
GET /api/users/me
Authorization: Bearer <access_token>
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "id": "clx123abc",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "preferences": {
      "theme": "dark",
      "notifications": true
    },
    "createdAt": "2026-01-03T10:00:00.000Z",
    "updatedAt": "2026-01-03T10:00:00.000Z"
  }
}
```

---

### 3.2 Update Current User

Mettre à jour le profil.

#### Request

```http
PUT /api/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

#### DTO

```typescript
export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({ required: false })
  @IsUrl()
  avatar?: string;
}
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "id": "clx123abc",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "Jane",
    "lastName": "Smith",
    "avatar": "https://example.com/new-avatar.jpg",
    "preferences": {
      "theme": "dark",
      "notifications": true
    },
    "createdAt": "2026-01-03T10:00:00.000Z",
    "updatedAt": "2026-01-03T12:30:00.000Z"
  }
}
```

---

### 3.3 Change Password

Changer le mot de passe.

#### Request

```http
PATCH /api/users/me/password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

#### DTO

```typescript
export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  newPassword: string;
}
```

#### Response 204

Pas de body de réponse.

#### Errors

| Code | HTTP | Message |
|------|------|---------|
| INVALID_CURRENT_PASSWORD | 400 | Mot de passe actuel incorrect |
| WEAK_PASSWORD | 400 | Le nouveau mot de passe est trop faible |

---

### 3.4 Delete Account

Supprimer le compte de l'utilisateur.

#### Request

```http
DELETE /api/users/me
Authorization: Bearer <access_token>
```

#### Response 204

Pas de body de réponse.

---

## 4. Projects

### 4.1 List Projects

Lister tous les projets de l'utilisateur (paginé).

#### Request

```http
GET /api/projects?page=1&limit=20&search=my+project&sort=updatedAt&order=desc
Authorization: Bearer <access_token>
```

#### Query Parameters

| Param | Type | Description | Default |
|-------|------|-------------|---------|
| page | number | Numéro de page | 1 |
| limit | number | Éléments par page | 20 |
| search | string | Recherche par nom/description | - |
| sort | string | Champ de tri | createdAt |
| order | string | Ordre de tri (asc/desc) | desc |

#### Response 200

```json
{
  "success": true,
  "data": [
    {
      "id": "clxproj123",
      "name": "Mon Projet",
      "description": "Un projet de test",
      "systemPrompt": "Tu es un assistant utile.",
      "ownerId": "clx123abc",
      "owner": {
        "id": "clx123abc",
        "email": "user@example.com",
        "username": "johndoe",
        "avatar": null
      },
      "nodeCount": 15,
      "memberCount": 3,
      "isPublic": false,
      "viewport": {
        "x": 0,
        "y": 0,
        "zoom": 1
      },
      "createdAt": "2026-01-03T10:00:00.000Z",
      "updatedAt": "2026-01-03T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

---

### 4.2 Create Project

Créer un nouveau projet.

#### Request

```http
POST /api/projects
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Mon Nouveau Projet",
  "description": "Un projet pour tester NonLinear",
  "systemPrompt": "Tu es un expert en architecture logicielle.",
  "isPublic": false
}
```

#### DTO

```typescript
export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  isPublic?: boolean;
}
```

#### Response 201

```json
{
  "success": true,
  "data": {
    "id": "clxnewproj456",
    "name": "Mon Nouveau Projet",
    "description": "Un projet pour tester NonLinear",
    "systemPrompt": "Tu es un expert en architecture logicielle.",
    "ownerId": "clx123abc",
    "owner": {
      "id": "clx123abc",
      "email": "user@example.com",
      "username": "johndoe",
      "avatar": null
    },
    "nodeCount": 0,
    "memberCount": 1,
    "isPublic": false,
    "viewport": {
      "x": 0,
      "y": 0,
      "zoom": 1
    },
    "createdAt": "2026-01-03T14:00:00.000Z",
    "updatedAt": "2026-01-03T14:00:00.000Z"
  },
  "message": "Projet créé avec succès"
}
```

---

### 4.3 Get Project

Récupérer les détails d'un projet.

#### Request

```http
GET /api/projects/clxnewproj456
Authorization: Bearer <access_token>
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "id": "clxnewproj456",
    "name": "Mon Nouveau Projet",
    "description": "Un projet pour tester NonLinear",
    "systemPrompt": "Tu es un expert en architecture logicielle.",
    "ownerId": "clx123abc",
    "owner": {
      "id": "clx123abc",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": null
    },
    "members": [
      {
        "id": "clxmember789",
        "userId": "clx123abc",
        "user": {
          "id": "clx123abc",
          "email": "user@example.com",
          "username": "johndoe",
          "avatar": null
        },
        "role": "OWNER",
        "joinedAt": "2026-01-03T14:00:00.000Z"
      }
    ],
    "nodeCount": 0,
    "memberCount": 1,
    "isPublic": false,
    "viewport": {
      "x": 0,
      "y": 0,
      "zoom": 1
    },
    "createdAt": "2026-01-03T14:00:00.000Z",
    "updatedAt": "2026-01-03T14:00:00.000Z"
  }
}
```

#### Errors

| Code | HTTP | Message |
|------|------|---------|
| PROJECT_NOT_FOUND | 404 | Projet non trouvé |
| ACCESS_DENIED | 403 | Vous n'avez pas accès à ce projet |

---

### 4.4 Update Project

Mettre à jour un projet.

#### Request

```http
PUT /api/projects/clxnewproj456
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Projet Mis à Jour",
  "description": "Description modifiée",
  "systemPrompt": "Nouveau prompt système",
  "viewport": {
    "x": 100,
    "y": 200,
    "zoom": 1.5
  }
}
```

#### DTO

```typescript
export class UpdateProjectDto {
  @ApiProperty({ required: false })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ required: false })
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "id": "clxnewproj456",
    "name": "Projet Mis à Jour",
    "description": "Description modifiée",
    "systemPrompt": "Nouveau prompt système",
    "ownerId": "clx123abc",
    "nodeCount": 0,
    "memberCount": 1,
    "isPublic": false,
    "viewport": {
      "x": 100,
      "y": 200,
      "zoom": 1.5
    },
    "createdAt": "2026-01-03T14:00:00.000Z",
    "updatedAt": "2026-01-03T15:30:00.000Z"
  },
  "message": "Projet mis à jour"
}
```

#### Errors

| Code | HTTP | Message |
|------|------|---------|
| PROJECT_NOT_FOUND | 404 | Projet non trouvé |
| ACCESS_DENIED | 403 | Vous n'avez pas la permission de modifier ce projet |

---

### 4.5 Delete Project

Supprimer un projet et tous ses nœuds/edges.

#### Request

```http
DELETE /api/projects/clxnewproj456
Authorization: Bearer <access_token>
```

#### Response 204

Pas de body de réponse.

#### Errors

| Code | HTTP | Message |
|------|------|---------|
| PROJECT_NOT_FOUND | 404 | Projet non trouvé |
| ACCESS_DENIED | 403 | Vous n'avez pas la permission de supprimer ce projet |

---

### 4.6 Invite Member

Inviter un utilisateur à rejoindre un projet.

#### Request

```http
POST /api/projects/clxnewproj456/members
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "invitee@example.com",
  "role": "EDITOR"
}
```

#### DTO

```typescript
export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['ADMIN', 'EDITOR', 'MEMBER', 'VIEWER'] })
  @IsEnum(['ADMIN', 'EDITOR', 'MEMBER', 'VIEWER'])
  role: 'ADMIN' | 'EDITOR' | 'MEMBER' | 'VIEWER';
}
```

#### Response 201

```json
{
  "success": true,
  "data": {
    "id": "clxmember789",
    "userId": "clxinvite456",
    "user": {
      "id": "clxinvite456",
      "email": "invitee@example.com",
      "username": "newuser",
      "avatar": null
    },
    "role": "EDITOR",
    "joinedAt": "2026-01-03T16:00:00.000Z"
  },
  "message": "Utilisateur invité avec succès"
}
```

#### Errors

| Code | HTTP | Message |
|------|------|---------|
| PROJECT_NOT_FOUND | 404 | Projet non trouvé |
| ACCESS_DENIED | 403 | Vous n'avez pas la permission d'inviter |
| USER_ALREADY_MEMBER | 409 | L'utilisateur est déjà membre du projet |
| USER_NOT_FOUND | 404 | Utilisateur non trouvé |

---

### 4.7 Remove Member

Retirer un membre du projet.

#### Request

```http
DELETE /api/projects/clxnewproj456/members/clxmember789
Authorization: Bearer <access_token>
```

#### Response 204

Pas de body de réponse.

#### Errors

| Code | HTTP | Message |
|------|------|---------|
| PROJECT_NOT_FOUND | 404 | Projet non trouvé |
| MEMBER_NOT_FOUND | 404 | Membre non trouvé |
| ACCESS_DENIED | 403 | Vous n'avez pas la permission de supprimer ce membre |

---

### 4.8 Update Member Role

Mettre à jour le rôle d'un membre.

#### Request

```http
PATCH /api/projects/clxnewproj456/members/clxmember789
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role": "ADMIN"
}
```

#### DTO

```typescript
export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['ADMIN', 'EDITOR', 'MEMBER', 'VIEWER'] })
  @IsEnum(['ADMIN', 'EDITOR', 'MEMBER', 'VIEWER'])
  role: 'ADMIN' | 'EDITOR' | 'MEMBER' | 'VIEWER';
}
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "id": "clxmember789",
    "userId": "clxinvite456",
    "role": "ADMIN",
    "joinedAt": "2026-01-03T16:00:00.000Z"
  },
  "message": "Rôle mis à jour"
}
```

---

## 5. Nodes

### 5.1 List Nodes

Lister tous les nœuds d'un projet (paginé).

#### Request

```http
GET /api/projects/clxproj123/nodes?page=1&limit=50&status=COMPLETED
Authorization: Bearer <access_token>
```

#### Query Parameters

| Param | Type | Description | Default |
|-------|------|-------------|---------|
| page | number | Numéro de page | 1 |
| limit | number | Éléments par page (max 100) | 50 |
| status | string | Filtrer par statut (IDLE, GENERATING, COMPLETED, ERROR, STALE) | - |
| search | string | Recherche dans prompt/response | - |

#### Response 200

```json
{
  "success": true,
  "data": [
    {
      "id": "clxnode123",
      "projectId": "clxproj123",
      "prompt": "Qu'est-ce que React ?",
      "response": "React est une bibliothèque JavaScript...",
      "summary": "React: bibliothèque JavaScript",
      "status": "COMPLETED",
      "position": { "x": 100, "y": 200 },
      "llmModel": "gpt-4o",
      "llmTokens": 234,
      "parentIds": [],
      "metadata": {},
      "createdAt": "2026-01-03T10:00:00.000Z",
      "updatedAt": "2026-01-03T10:05:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "totalPages": 1
  }
}
```

---

### 5.2 Get Node

Récupérer les détails d'un nœud.

#### Request

```http
GET /api/nodes/clxnode123
Authorization: Bearer <access_token>
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "id": "clxnode123",
    "projectId": "clxproj123",
    "prompt": "Qu'est-ce que React ?",
    "response": "React est une bibliothèque JavaScript pour construire des interfaces utilisateur...",
    "summary": "React: bibliothèque JavaScript",
    "status": "COMPLETED",
    "position": { "x": 100, "y": 200 },
    "llmModel": "gpt-4o",
    "llmTokens": 234,
    "parentIds": [],
    "metadata": {
      "model": "gpt-4o",
      "temperature": 0.7
    },
    "createdAt": "2026-01-03T10:00:00.000Z",
    "updatedAt": "2026-01-03T10:05:00.000Z",
    "edges": {
      "incoming": [],
      "outgoing": []
    }
  }
}
```

---

### 5.3 Create Node

Créer un nouveau nœud dans un projet.

#### Request

```http
POST /api/projects/clxproj123/nodes
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "prompt": "Qu'est-ce que NestJS ?",
  "position": { "x": 300, "y": 400 },
  "parentIds": ["clxnode123"]
}
```

#### DTO

```typescript
export class CreateNodeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt: string;

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => PositionDto)
  position: {
    x: number;
    y: number;
  };

  @ApiProperty({ required: false })
  @IsArray()
  @IsString({ each: true })
  parentIds?: string[];
}
```

#### Response 201

```json
{
  "success": true,
  "data": {
    "id": "clxnewnode456",
    "projectId": "clxproj123",
    "prompt": "Qu'est-ce que NestJS ?",
    "response": null,
    "summary": null,
    "status": "IDLE",
    "position": { "x": 300, "y": 400 },
    "llmModel": null,
    "llmTokens": null,
    "parentIds": ["clxnode123"],
    "metadata": {},
    "createdAt": "2026-01-03T17:00:00.000Z",
    "updatedAt": "2026-01-03T17:00:00.000Z"
  },
  "message": "Nœud créé avec succès"
}
```

---

### 5.4 Update Node

Mettre à jour un nœud.

#### Request

```http
PUT /api/nodes/clxnode123
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "prompt": "Qu'est-ce que React Hook ?",
  "position": { "x": 150, "y": 250 }
}
```

#### DTO

```typescript
export class UpdateNodeDto {
  @ApiProperty({ required: false })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(10000)
  response?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(200)
  summary?: string;

  @ApiProperty({ required: false })
  @IsEnum(['IDLE', 'GENERATING', 'COMPLETED', 'ERROR', 'STALE'])
  status?: 'IDLE' | 'GENERATING' | 'COMPLETED' | 'ERROR' | 'STALE';

  @ApiProperty({ required: false })
  @IsObject()
  position?: { x: number; y: number };

  @ApiProperty({ required: false })
  @IsArray()
  @IsString({ each: true })
  parentIds?: string[];

  @ApiProperty({ required: false })
  @IsObject()
  metadata?: Record<string, any>;
}
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "id": "clxnode123",
    "projectId": "clxproj123",
    "prompt": "Qu'est-ce que React Hook ?",
    "response": "React Hooks sont des fonctions...",
    "summary": "React Hooks: fonctions spéciales",
    "status": "COMPLETED",
    "position": { "x": 150, "y": 250 },
    "llmModel": "gpt-4o",
    "llmTokens": 234,
    "parentIds": [],
    "metadata": {},
    "createdAt": "2026-01-03T10:00:00.000Z",
    "updatedAt": "2026-01-03T17:30:00.000Z"
  },
  "message": "Nœud mis à jour"
}
```

---

### 5.5 Delete Node

Supprimer un nœud.

#### Request

```http
DELETE /api/nodes/clxnode123
Authorization: Bearer <access_token>
```

#### Response 204

Pas de body de réponse.

---

### 5.6 Batch Create Nodes

Créer plusieurs nœuds en une seule requête.

#### Request

```http
POST /api/projects/clxproj123/nodes/batch
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "nodes": [
    {
      "prompt": "Qu'est-ce que TypeScript ?",
      "position": { "x": 100, "y": 200 }
    },
    {
      "prompt": "Qu'est-ce que Next.js ?",
      "position": { "x": 300, "y": 400 }
    }
  ]
}
```

#### DTO

```typescript
export class BatchCreateNodesDto {
  @ApiProperty({ type: [CreateNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  nodes: CreateNodeDto[];
}
```

#### Response 201

```json
{
  "success": true,
  "data": [
    {
      "id": "clxnode789",
      "projectId": "clxproj123",
      "prompt": "Qu'est-ce que TypeScript ?",
      "response": null,
      "status": "IDLE",
      "position": { "x": 100, "y": 200 },
      "createdAt": "2026-01-03T18:00:00.000Z",
      "updatedAt": "2026-01-03T18:00:00.000Z"
    },
    {
      "id": "clxnode012",
      "projectId": "clxproj123",
      "prompt": "Qu'est-ce que Next.js ?",
      "response": null,
      "status": "IDLE",
      "position": { "x": 300, "y": 400 },
      "createdAt": "2026-01-03T18:00:00.000Z",
      "updatedAt": "2026-01-03T18:00:00.000Z"
    }
  ],
  "message": "2 nœuds créés avec succès"
}
```

---

### 5.7 Create Edge

Créer une liaison entre deux nœuds.

#### Request

```http
POST /api/projects/clxproj123/edges
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "sourceId": "clxnode123",
  "targetId": "clxnode456"
}
```

#### DTO

```typescript
export class CreateEdgeDto {
  @ApiProperty()
  @IsString()
  sourceId: string;

  @ApiProperty()
  @IsString()
  targetId: string;
}
```

#### Response 201

```json
{
  "success": true,
  "data": {
    "id": "clxedge789",
    "sourceId": "clxnode123",
    "targetId": "clxnode456",
    "projectId": "clxproj123",
    "createdAt": "2026-01-03T19:00:00.000Z"
  },
  "message": "Liaison créée avec succès"
}
```

---

### 5.8 Delete Edge

Supprimer une liaison.

#### Request

```http
DELETE /api/edges/clxedge789
Authorization: Bearer <access_token>
```

#### Response 204

Pas de body de réponse.

---

## 6. WebSocket Collaboration

### 6.1 Connection

Se connecter au WebSocket de collaboration.

```javascript
const socket = io('http://localhost:3001', {
  path: '/socket.io/',
  query: {
    projectId: 'clxproj123'
  },
  auth: {
    token: '<access_token>'
  }
});
```

### 6.2 Server Events

#### user:joined

```json
{
  "userId": "clxuser123",
  "username": "johndoe",
  "avatar": "https://example.com/avatar.jpg",
  "joinedAt": "2026-01-03T10:00:00.000Z"
}
```

#### user:left

```json
{
  "userId": "clxuser123",
  "leftAt": "2026-01-03T10:30:00.000Z"
}
```

#### cursor:moved

```json
{
  "userId": "clxuser123",
  "cursor": {
    "x": 250.5,
    "y": 300.75,
    "nodeId": "clxnode123"
  }
}
```

#### node:created

```json
{
  "node": {
    "id": "clxnewnode456",
    "prompt": "Qu'est-ce que React ?",
    "position": { "x": 100, "y": 200 },
    "status": "IDLE",
    "createdAt": "2026-01-03T10:00:00.000Z"
  }
}
```

#### node:updated

```json
{
  "nodeId": "clxnode123",
  "updates": {
    "prompt": "Nouveau prompt",
    "status": "COMPLETED"
  },
  "updatedAt": "2026-01-03T10:30:00.000Z"
}
```

#### node:deleted

```json
{
  "nodeId": "clxnode123",
  "deletedAt": "2026-01-03T10:30:00.000Z"
}
```

#### node:streaming

Streaming de la génération LLM.

```json
{
  "nodeId": "clxnode123",
  "chunk": "React est une bibliothèque",
  "progress": 0.15
}
```

### 6.3 Client Events

#### cursor:move

```javascript
socket.emit('cursor:move', {
  x: 250.5,
  y: 300.75,
  nodeId: 'clxnode123'
});
```

#### node:create

```javascript
socket.emit('node:create', {
  prompt: 'Qu\'est-ce que Vue ?',
  position: { x: 400, y: 500 }
});
```

#### node:update

```javascript
socket.emit('node:update', {
  nodeId: 'clxnode123',
  updates: {
    prompt: 'Nouveau prompt',
    status: 'COMPLETED'
  }
});
```

#### node:delete

```javascript
socket.emit('node:delete', {
  nodeId: 'clxnode123'
});
```

---

## 7. LLM Generation

### 7.1 Start Generation

Démarrer la génération LLM pour un nœud.

#### Request

```http
POST /api/nodes/clxnode123/generate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "model": "gpt-4o",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

#### DTO

```typescript
export class GenerateNodeDto {
  @ApiProperty({ enum: ['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet', 'glm-4'] })
  @IsEnum(['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet', 'glm-4'])
  model: 'gpt-4o' | 'gpt-4o-mini' | 'claude-3.5-sonnet' | 'glm-4';

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(1)
  @Max(128000)
  maxTokens?: number;
}
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "nodeId": "clxnode123",
    "streamId": "stream_abc123",
    "status": "GENERATING",
    "startedAt": "2026-01-03T10:00:00.000Z"
  },
  "message": "Génération démarrée"
}
```

---

### 7.2 Stream Generation

Écouter le stream de génération via SSE.

```http
GET /api/nodes/clxnode123/generate/stream_abc123
Authorization: Bearer <access_token>
```

#### Response Stream (SSE)

```
data: {"chunk": "React", "progress": 0.02}

data: {"chunk": " est", "progress": 0.04}

data: {"chunk": " une", "progress": 0.06}

...

data: {"done": true, "summary": "React: bibliothèque JavaScript", "tokens": 234}
```

---

### 7.3 Cancel Generation

Annuler une génération en cours.

#### Request

```http
POST /api/nodes/clxnode123/generate/cancel
Authorization: Bearer <access_token>
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "nodeId": "clxnode123",
    "status": "IDLE",
    "cancelledAt": "2026-01-03T10:05:00.000Z"
  },
  "message": "Génération annulée"
}
```

---

### 7.4 Cascade Update

Mettre à jour tous les nœuds descendants en cascade.

#### Request

```http
POST /api/nodes/clxnode123/cascade
Authorization: Bearer <access_token>
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "startedAt": "2026-01-03T10:00:00.000Z",
    "affectedNodes": [
      {
        "nodeId": "clxnode456",
        "status": "STALE"
      },
      {
        "nodeId": "clxnode789",
        "status": "STALE"
      }
    ],
    "totalAffected": 2
  },
  "message": "Cascade update démarré"
}
```

---

## 8. Erreurs

### 8.1 Codes d'Erreur Standard

| Code | HTTP | Description |
|------|------|-------------|
| VALIDATION_ERROR | 400 | Erreur de validation des données |
| UNAUTHORIZED | 401 | Non authentifié |
| INVALID_CREDENTIALS | 401 | Identifiants invalides |
| FORBIDDEN | 403 | Accès refusé |
| ACCESS_DENIED | 403 | Pas la permission |
| NOT_FOUND | 404 | Ressource non trouvée |
| CONFLICT | 409 | Conflit (ressource déjà existe) |
| INTERNAL_ERROR | 500 | Erreur interne du serveur |
| SERVICE_UNAVAILABLE | 503 | Service temporairement indisponible |

### 8.2 Exemple de Réponse d'Erreur

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Le champ email est requis",
    "details": {
      "field": "email",
      "constraint": "required",
      "received": null
    }
  },
  "timestamp": "2026-01-03T10:30:00.000Z",
  "path": "/api/projects"
}
```

---

## 📚 Documentation Connexe

- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) - Architecture backend complète
- [BACKEND_DATABASE_SCHEMA.md](./BACKEND_DATABASE_SCHEMA.md) - Schéma database détaillé
- [FRONTEND_ARCHITECTURE_HYBRID.md](./ARCHITECTURE_HYBRID.md) - Architecture frontend

---

**Documentation API créée pour le projet NonLinear v1.0**
**Dernière mise à jour : 2026-01-03**
