# Schéma de Base de Données NonLinear

> **Documentation complète du schéma Prisma avec tous les modèles, relations et indexes**

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Prisma Schema Complet](#2-prisma-schema-complet)
3. [Modèles Détaillés](#3-modèles-détaillés)
4. [Relations](#4-relations)
5. [Indexes](#5-indexes)
6. [Seeds](#6-seeds)
7. [Migrations](#7-migrations)

---

## 1. Vue d'Ensemble

### Stack Technique

```
Database : PostgreSQL 16+
ORM      : Prisma 6+
Client    : Prisma Client (Type-safe)
Migration : Prisma Migrate
Studio    : Prisma Studio (GUI)
```

### Principes de Design

1. **Soft Deletes** : `deletedAt` au lieu de DELETE physique
2. **Audit Trail** : `createdAt` et `updatedAt` automatiques
3. **UUID/CUID** : IDs non-sequentiels et uniques
4. **Enum pour statuts** : Type safety
5. **Indexes stratégiques** : Performance optimisée
6. **Relations explicites** : Clarté et foreign keys

---

## 2. Prisma Schema Complet

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ========================================
// ENUMS
// ========================================

enum NodeStatus {
  IDLE
  GENERATING
  COMPLETED
  ERROR
  STALE
}

enum ProjectRole {
  OWNER
  ADMIN
  EDITOR
  MEMBER
  VIEWER
}

enum AgentStatus {
  IDLE
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum AgentTaskStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

// ========================================
// AUTH & USERS
// ========================================

model User {
  id            String       @id @default(cuid())
  email         String       @unique
  username      String?      @unique
  passwordHash  String
  firstName     String?
  lastName      String?
  avatar        String?
  
  // Preferences
  preferences   Json?
  
  // Relations
  refreshToken  RefreshToken?
  ownedProjects Project[]     @relation("ProjectOwner")
  projectMembers ProjectMember[]
  
  // Audit
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  deletedAt     DateTime?
  
  @@map("users")
  @@index([email])
  @@index([deletedAt])
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  
  // Audit
  createdAt DateTime @default(now())
  
  @@map("refresh_tokens")
  @@index([userId])
  @@index([expiresAt])
}

// ========================================
// PROJECTS
// ========================================

model Project {
  id           String         @id @default(cuid())
  name         String
  description  String?
  systemPrompt String         @default("")
  
  // Relations
  ownerId      String
  owner        User           @relation("ProjectOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members      ProjectMember[]
  nodes        Node[]
  edges        Edge[]
  
  // Collaboration
  isPublic     Boolean        @default(false)
  
  // Viewport state
  viewport     Json?
  
  // Audit
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  deletedAt    DateTime?
  
  @@map("projects")
  @@index([ownerId])
  @@index([ownerId, deletedAt])
  @@index([isPublic])
  @@index([deletedAt])
}

model ProjectMember {
  id        String      @id @default(cuid())
  projectId String
  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Permissions
  role      ProjectRole @default(MEMBER)
  
  // Audit
  joinedAt  DateTime    @default(now())
  
  @@unique([projectId, userId])
  @@map("project_members")
  @@index([projectId])
  @@index([userId])
}

// ========================================
// NODES & EDGES
// ========================================

model Node {
  id          String     @id @default(cuid())
  
  // Content
  prompt      String
  response    String?
  summary     String?
  
  // Status
  status      NodeStatus @default(IDLE)
  
  // Graph
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parentEdges Edge[]     @relation("NodeSource")
  childEdges  Edge[]     @relation("NodeTarget")
  
  // Position & Metadata
  position    Json       // { x: number, y: number }
  metadata    Json?
  
  // LLM metadata
  llmModel    String?
  llmTokens   Int?
  llmCost     Float?
  
  // Audit
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?
  
  @@map("nodes")
  @@index([projectId])
  @@index([projectId, deletedAt])
  @@index([status])
  @@index([projectId, deletedAt, status])
}

model Edge {
  id        String   @id @default(cuid())
  
  sourceId  String
  source    Node     @relation("NodeSource", fields: [sourceId], references: [id], onDelete: Cascade)
  targetId  String
  target    Node     @relation("NodeTarget", fields: [targetId], references: [id], onDelete: Cascade)
  
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt DateTime @default(now())
  
  @@map("edges")
  @@index([projectId])
  @@index([sourceId])
  @@index([targetId])
  @@unique([sourceId, targetId])
}

// ========================================
// COLLABORATION (presence, cursors)
// ========================================

model UserSession {
  id        String   @id @default(cuid())
  userId    String
  projectId String
  cursor    Json?    // { x, y, nodeId, timestamp }
  isActive  Boolean  @default(true)
  
  joinedAt  DateTime @default(now())
  lastSeen  DateTime @default(now())
  
  @@unique([userId, projectId])
  @@map("user_sessions")
  @@index([projectId])
  @@index([userId])
  @@index([isActive])
}

// ========================================
// AGENTS (Futur)
// ========================================

model Agent {
  id          String       @id @default(cuid())
  name        String
  description String?
  type        String       // "cursor-agent", "researcher", "writer", etc.
  config      Json         // Agent configuration
  
  // Relations
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks       AgentTask[]
  
  // Audit
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  @@map("agents")
  @@index([userId])
  @@index([type])
}

model AgentTask {
  id          String       @id @default(cuid())
  
  // Task details
  name        String
  description String?
  prompt      String
  status      AgentTaskStatus @default(PENDING)
  result      Json?
  error       String?
  
  // Execution
  startedAt   DateTime?
  completedAt DateTime?
  
  // Relations
  agentId     String
  agent       Agent        @relation(fields: [agentId], references: [id], onDelete: Cascade)
  nodeId      String?      // Optional: associated node
  node        Node?        @relation("AgentNode", fields: [nodeId], references: [id], onDelete: SetNull)
  
  // Metadata
  metadata    Json?
  
  // Audit
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  @@map("agent_tasks")
  @@index([agentId])
  @@index([nodeId])
  @@index([status])
}

// ========================================
// MULTIMEDIA (Futur - images, videos, documents)
// ========================================

model Media {
  id          String   @id @default(cuid())
  
  // Type & URL
  type        MediaType
  url         String
  thumbnailUrl String?
  filename    String
  mimeType    String?
  size        Int?     // bytes
  
  // Relations
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  nodeId      String?
  node        Node?    @relation("MediaNode", fields: [nodeId], references: [id], onDelete: Cascade)
  
  // Metadata
  metadata    Json?    // EXIF data, duration, dimensions, etc.
  alt         String?  // Alt text for accessibility
  
  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("media")
  @@index([userId])
  @@index([projectId])
  @@index([nodeId])
  @@index([type])
}

enum MediaType {
  IMAGE
  VIDEO
  DOCUMENT
  AUDIO
  LINK
}

// ========================================
// VOICE (Futur - voice interactions)
// ========================================

model VoiceInteraction {
  id          String   @id @default(cuid())
  
  // Type
  type        VoiceType // "speech-to-text" | "text-to-speech"
  
  // Relations
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  nodeId      String?
  node        Node?    @relation(fields: [nodeId], references: [id], onDelete: Cascade)
  
  // Content
  text        String?
  audioUrl    String?
  duration    Float?   // seconds
  
  // Status
  status      VoiceStatus @default(COMPLETED)
  error       String?
  
  // Metadata
  language    String?  @default("en")
  metadata    Json?
  
  // Audit
  createdAt   DateTime @default(now())
  
  @@map("voice_interactions")
  @@index([userId])
  @@index([nodeId])
  @@index([type])
  @@index([createdAt])
}

enum VoiceType {
  SPEECH_TO_TEXT
  TEXT_TO_SPEECH
}

enum VoiceStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

// ========================================
// NOTIFICATIONS (Futur)
// ========================================

model Notification {
  id          String          @id @default(cuid())
  
  // Content
  type        NotificationType
  title       String
  message     String
  data        Json?           // Payload
  
  // Relations
  userId      String
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectId   String?
  project     Project?        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  nodeId      String?
  node        Node?           @relation(fields: [nodeId], references: [id], onDelete: Cascade)
  
  // Status
  read        Boolean         @default(false)
  readAt      DateTime?
  
  // Metadata
  priority    NotificationPriority @default(MEDIUM)
  
  // Audit
  createdAt   DateTime        @default(now())
  expiresAt   DateTime?
  
  @@map("notifications")
  @@index([userId, read])
  @@index([userId, createdAt])
  @@index([type])
  @@index([projectId])
}

enum NotificationType {
  PROJECT_INVITE
  PROJECT_SHARE
  NODE_GENERATED
  NODE_ERROR
  AGENT_COMPLETED
  AGENT_FAILED
  COLLABORATION_JOINED
  COLLABORATION_LEFT
  SYSTEM
}

enum NotificationPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

---

## 3. Modèles Détaillés

### 3.1 User

**Responsabilité** : Gestion des utilisateurs du système

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique (CUID) | auto |
| email | String | Email unique (login) | - |
| username | String? | Nom d'utilisateur unique (optionnel) | null |
| passwordHash | String | Mot de passe hashé (bcrypt) | - |
| firstName | String? | Prénom | null |
| lastName | String? | Nom de famille | null |
| avatar | String? | URL de l'avatar | null |
| preferences | Json | Préférences utilisateur (thème, notifs, etc.) | null |
| createdAt | DateTime | Date de création | now() |
| updatedAt | DateTime | Date de dernière modification | auto |
| deletedAt | DateTime? | Soft delete (null = actif) | null |

**Relations** :
- `refreshToken` : One-to-One avec RefreshToken
- `ownedProjects` : One-to-Many avec Project (owner)
- `projectMembers` : One-to-Many avec ProjectMember

**Exemple de preferences** :
```json
{
  "theme": "dark",
  "notifications": {
    "email": true,
    "browser": true,
    "mobile": false
  },
  "language": "fr",
  "timezone": "Europe/Paris"
}
```

### 3.2 RefreshToken

**Responsabilité** : Stocker les tokens de rafraîchissement

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique | auto |
| token | String | Token JWT encodé (unique) | - |
| userId | String | ID de l'utilisateur (FK) | - |
| expiresAt | DateTime | Date d'expiration | - |
| createdAt | DateTime | Date de création | now() |

**Relations** :
- `user` : Many-to-One avec User

**Utilisation** :
- Le token JWT d'accès expire en 15 minutes
- Le refresh token expire en 7 jours
- Utiliser pour obtenir un nouveau access_token sans re-login

### 3.3 Project

**Responsabilité** : Conteneur pour les nœuds et edges d'un projet

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique | auto |
| name | String | Nom du projet | - |
| description | String? | Description du projet | null |
| systemPrompt | String | Prompt système pour LLM | "" |
| ownerId | String | ID du propriétaire (FK User) | - |
| isPublic | Boolean | Projet public (accessible sans être membre) | false |
| viewport | Json | État du viewport {x, y, zoom} | null |
| createdAt | DateTime | Date de création | now() |
| updatedAt | DateTime | Date de dernière modification | auto |
| deletedAt | DateTime? | Soft delete | null |

**Relations** :
- `owner` : Many-to-One avec User
- `members` : One-to-Many avec ProjectMember
- `nodes` : One-to-Many avec Node
- `edges` : One-to-Many avec Edge

**Exemple de viewport** :
```json
{
  "x": 0,
  "y": 0,
  "zoom": 1.5
}
```

### 3.4 ProjectMember

**Responsabilité** : Gérer les membres et leurs rôles dans un projet

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique | auto |
| projectId | String | ID du projet (FK) | - |
| userId | String | ID de l'utilisateur (FK) | - |
| role | ProjectRole | Rôle dans le projet | MEMBER |
| joinedAt | DateTime | Date d'ajout au projet | now() |

**Contrainte unique** : `(projectId, userId)` - Un utilisateur ne peut être membre qu'une fois par projet

**Rôles et Permissions** :
| Rôle | View | Edit | Add Node | Delete Node | Invite | Delete |
|------|------|------|----------|------------|--------|--------|
| OWNER | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| EDITOR | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| MEMBER | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| VIEWER | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.5 Node

**Responsabilité** : Nœud contenant prompt, réponse LLM et position

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique | auto |
| prompt | String | Prompt / question de l'utilisateur | - |
| response | String? | Réponse générée par LLM (markdown) | null |
| summary | String? | Résumé court de la réponse | null |
| status | NodeStatus | État du nœud | IDLE |
| projectId | String | ID du projet (FK) | - |
| position | Json | Position sur le canvas {x, y} | - |
| metadata | Json? | Métadonnées LLM (model, tokens, etc.) | null |
| llmModel | String? | Modèle LLM utilisé | null |
| llmTokens | Int? | Nombre de tokens générés | null |
| llmCost | Float? | Coût de la génération | null |
| createdAt | DateTime | Date de création | now() |
| updatedAt | DateTime | Date de dernière modification | auto |
| deletedAt | DateTime? | Soft delete | null |

**Relations** :
- `project` : Many-to-One avec Project
- `parentEdges` : One-to-Many avec Edge (source)
- `childEdges` : One-to-Many avec Edge (target)
- `agentTasks` : One-to-Many avec AgentTask

**Exemple de position** :
```json
{
  "x": 250.5,
  "y": 300.75
}
```

**Exemple de metadata** :
```json
{
  "model": "gpt-4o",
  "temperature": 0.7,
  "maxTokens": 2000,
  "stream": true
}
```

### 3.6 Edge

**Responsabilité** : Liaison directionnelle entre deux nœuds

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique | auto |
| sourceId | String | ID du nœud source (FK) | - |
| targetId | String | ID du nœud cible (FK) | - |
| projectId | String | ID du projet (FK) | - |
| createdAt | DateTime | Date de création | now() |

**Contrainte unique** : `(sourceId, targetId)` - Une seule liaison entre deux nœuds

**Relations** :
- `source` : Many-to-One avec Node (NodeSource)
- `target` : Many-to-One avec Node (NodeTarget)
- `project` : Many-to-One avec Project

**Directionnalité** : Les edges sont orientés, indiquant la dépendance (source → target)

### 3.7 UserSession

**Responsabilité** : Suivi de la présence et curseurs en temps réel

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique | auto |
| userId | String | ID de l'utilisateur (FK) | - |
| projectId | String | ID du projet (FK) | - |
| cursor | Json? | Position du curseur {x, y, nodeId, timestamp} | null |
| isActive | Boolean | Utilisateur actif dans le projet | true |
| joinedAt | DateTime | Date de connexion | now() |
| lastSeen | DateTime | Dernière activité | now() |

**Contrainte unique** : `(userId, projectId)` - Une seule session par utilisateur/projet

**Exemple de cursor** :
```json
{
  "x": 250.5,
  "y": 300.75,
  "nodeId": "clxnode123",
  "timestamp": "2026-01-03T10:30:00.000Z"
}
```

### 3.8 Agent (Futur)

**Responsabilité** : Agents IA autonomes pour automatiser des tâches

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique | auto |
| name | String | Nom de l'agent | - |
| description | String? | Description | null |
| type | String | Type d'agent ("cursor-agent", "researcher", etc.) | - |
| config | Json | Configuration de l'agent | - |
| userId | String | ID du propriétaire (FK) | - |
| createdAt | DateTime | Date de création | now() |
| updatedAt | DateTime | Date de dernière modification | auto |

**Relations** :
- `user` : Many-to-One avec User
- `tasks` : One-to-Many avec AgentTask

### 3.9 AgentTask (Futur)

**Responsabilité** : Tâches exécutées par les agents

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique | auto |
| name | String | Nom de la tâche | - |
| description | String? | Description | null |
| prompt | String | Prompt / instruction de la tâche | - |
| status | AgentTaskStatus | État de la tâche | PENDING |
| result | Json? | Résultat de la tâche | null |
| error | String? | Message d'erreur | null |
| startedAt | DateTime? | Date de début | null |
| completedAt | DateTime? | Date de fin | null |
| agentId | String | ID de l'agent (FK) | - |
| nodeId | String? | ID du nœud associé (FK optionnel) | null |
| metadata | Json? | Métadonnées de la tâche | null |
| createdAt | DateTime | Date de création | now() |
| updatedAt | DateTime | Date de dernière modification | auto |

**Relations** :
- `agent` : Many-to-One avec Agent
- `node` : Many-to-One avec Node (optionnel)

### 3.10 Media (Futur)

**Responsabilité** : Fichiers multimédias (images, vidéos, documents)

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique | auto |
| type | MediaType | Type de média (IMAGE, VIDEO, DOCUMENT, AUDIO, LINK) | - |
| url | String | URL du fichier | - |
| thumbnailUrl | String? | URL de la miniature | null |
| filename | String | Nom du fichier original | - |
| mimeType | String? | Type MIME (image/jpeg, etc.) | null |
| size | Int? | Taille en bytes | null |
| userId | String | ID de l'utilisateur (FK) | - |
| projectId | String? | ID du projet (FK optionnel) | null |
| nodeId | String? | ID du nœud associé (FK optionnel) | null |
| metadata | Json? | Métadonnées (EXIF, durée, dimensions, etc.) | null |
| alt | String? | Texte alternatif (accessibilité) | null |
| createdAt | DateTime | Date de création | now() |
| updatedAt | DateTime | Date de dernière modification | auto |

**Relations** :
- `user` : Many-to-One avec User
- `project` : Many-to-One avec Project (optionnel)
- `node` : Many-to-One avec Node (optionnel)

### 3.11 VoiceInteraction (Futur)

**Responsabilité** : Interactions vocales (speech-to-text, text-to-speech)

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique | auto |
| type | VoiceType | Type (SPEECH_TO_TEXT ou TEXT_TO_SPEECH) | - |
| userId | String | ID de l'utilisateur (FK) | - |
| nodeId | String? | ID du nœud associé (FK optionnel) | null |
| text | String? | Texte transcrit ou à prononcer | null |
| audioUrl | String? | URL du fichier audio | null |
| duration | Float? | Durée en secondes | null |
| status | VoiceStatus | État de la transcription/synthèse | COMPLETED |
| error | String? | Message d'erreur | null |
| language | String? | Langue (code ISO 639-1) | "en" |
| metadata | Json? | Métadonnées additionnelles | null |
| createdAt | DateTime | Date de création | now() |

**Relations** :
- `user` : Many-to-One avec User
- `node` : Many-to-One avec Node (optionnel)

### 3.12 Notification (Futur)

**Responsabilité** : Notifications utilisateurs

| Champ | Type | Description | Default |
|-------|------|-------------|----------|
| id | String | ID unique | auto |
| type | NotificationType | Type de notification | - |
| title | String | Titre court | - |
| message | String | Message détaillé | - |
| data | Json? | Payload additionnel | null |
| userId | String | ID de l'utilisateur (FK) | - |
| projectId | String? | ID du projet concerné (FK optionnel) | null |
| nodeId | String? | ID du nœud concerné (FK optionnel) | null |
| read | Boolean | Lu par l'utilisateur | false |
| readAt | DateTime? | Date de lecture | null |
| priority | NotificationPriority | Priorité (LOW, MEDIUM, HIGH, URGENT) | MEDIUM |
| createdAt | DateTime | Date de création | now() |
| expiresAt | DateTime? | Date d'expiration | null |

**Relations** :
- `user` : Many-to-One avec User
- `project` : Many-to-One avec Project (optionnel)
- `node` : Many-to-One avec Node (optionnel)

---

## 4. Relations

### 4.1 Diagramme ERD (Entity-Relationship)

```
┌─────────────────┐
│      User       │
├─────────────────┤
│ id (PK)       │
│ email         │
│ passwordHash   │
│ ...           │
└───────┬───────┘
        │
        │ 1
        │
        ├──────────────────────────────────────┐
        │                              │
        │                              │ N
        │                              │
        │ N                            ▼
        │                        ┌──────────────┐
        │ 1                      │ RefreshToken │
        │                        └──────────────┘
        │
        │ N
        │
        ▼
┌─────────────────┐         N
│    Project     │───────────────────────┐
├─────────────────┤                         │
│ id (PK)       │                         │
│ name          │                     N   │
│ ownerId (FK)  │───────────────────────┤
│ ...           │         │               │
└───────┬───────┘         │               │
        │ 1                │ 1              │
        │                  │                │
        │ N                │ N              │
        ▼                  ▼                ▼
┌─────────────────┐   ┌─────────────────┐   ┌───────────────┐
│ ProjectMember  │   │     Node       │   │     Edge      │
├─────────────────┤   ├─────────────────┤   ├───────────────┤
│ id (PK)        │   │ id (PK)       │   │ id (PK)       │
│ projectId (FK) │── │ projectId (FK) │── │ projectId (FK) │
│ userId (FK)    │   │ prompt         │   │ sourceId (FK) │
│ role           │   │ response       │   │ targetId (FK) │
│ ...            │   │ status         │   │ ...            │
└─────────────────┘   └─────────────────┘   └───────────────┘
                                              │
                                              │ M
                                              │
                                              ▼
                                       ┌─────────────────┐
                                       │ UserSession    │
                                       ├─────────────────┤
                                       │ userId (FK)    │
                                       │ projectId (FK) │
                                       │ cursor         │
                                       │ isActive       │
                                       └─────────────────┘
```

### 4.2 Description des Relations

#### User ↔ Project
- **Relation** : One-to-Many
- **Foreign Key** : `Project.ownerId → User.id`
- **Cascade** : DELETE CASCADE (si User supprimé, Projects supprimés)

#### User ↔ ProjectMember
- **Relation** : One-to-Many
- **Foreign Key** : `ProjectMember.userId → User.id`
- **Cascade** : DELETE CASCADE
- **Utilisation** : Un utilisateur peut être membre de plusieurs projets

#### Project ↔ ProjectMember
- **Relation** : One-to-Many
- **Foreign Key** : `ProjectMember.projectId → Project.id`
- **Cascade** : DELETE CASCADE
- **Utilisation** : Un projet peut avoir plusieurs membres

#### Project ↔ Node
- **Relation** : One-to-Many
- **Foreign Key** : `Node.projectId → Project.id`
- **Cascade** : DELETE CASCADE
- **Utilisation** : Un projet contient plusieurs nœuds

#### Project ↔ Edge
- **Relation** : One-to-Many
- **Foreign Key** : `Edge.projectId → Project.id`
- **Cascade** : DELETE CASCADE
- **Utilisation** : Les edges appartiennent à un projet

#### Node ↔ Edge (Self-Referencing)
- **Relation Source** : One-to-Many (Node → Edge via sourceId)
- **Relation Target** : One-to-Many (Node → Edge via targetId)
- **Foreign Keys** : `Edge.sourceId → Node.id`, `Edge.targetId → Node.id`
- **Cascade** : DELETE CASCADE
- **Utilisation** : Un nœud peut avoir plusieurs edges entrants et sortants

#### User ↔ UserSession
- **Relation** : One-to-Many
- **Foreign Key** : `UserSession.userId → User.id`
- **Cascade** : DELETE CASCADE
- **Utilisation** : Suivi de la présence en temps réel

---

## 5. Indexes

### 5.1 Indexes Principaux

#### User
| Index | Champs | Type | Raison |
|-------|--------|------|---------|
| idx_user_email | email | UNIQUE | Login rapide |
| idx_user_deleted | deletedAt | INDEX | Soft delete queries |

#### Project
| Index | Champs | Type | Raison |
|-------|--------|------|---------|
| idx_project_owner | ownerId | INDEX | Projets par utilisateur |
| idx_project_owner_deleted | ownerId, deletedAt | INDEX | Projets actifs par utilisateur |
| idx_project_public | isPublic | INDEX | Projets publics |
| idx_project_deleted | deletedAt | INDEX | Soft delete queries |

#### Node
| Index | Champs | Type | Raison |
|-------|--------|------|---------|
| idx_node_project | projectId | INDEX | Nœuds par projet |
| idx_node_project_deleted | projectId, deletedAt | INDEX | Nœuds actifs par projet |
| idx_node_status | status | INDEX | Filtrer par statut |
| idx_node_project_deleted_status | projectId, deletedAt, status | INDEX | Combiné (très utilisé) |

#### Edge
| Index | Champs | Type | Raison |
|-------|--------|------|---------|
| idx_edge_project | projectId | INDEX | Edges par projet |
| idx_edge_source | sourceId | INDEX | Edges sortants d'un nœud |
| idx_edge_target | targetId | INDEX | Edges entrants d'un nœud |
| idx_edge_unique | sourceId, targetId | UNIQUE | Éviter doublons |

#### UserSession
| Index | Champs | Type | Raison |
|-------|--------|------|---------|
| idx_session_unique | userId, projectId | UNIQUE | Une session par utilisateur/projet |
| idx_session_project | projectId | INDEX | Utilisateurs dans un projet |
| idx_session_user | userId | INDEX | Projets d'un utilisateur |
| idx_session_active | isActive | INDEX | Nettoyage sessions inactives |

### 5.2 Performance Queries Optimisés

#### Obtenir les nœuds actifs d'un projet
```sql
-- Avec index idx_node_project_deleted_status
SELECT * FROM nodes 
WHERE projectId = ? 
  AND deletedAt IS NULL 
  AND status = 'COMPLETED'
ORDER BY createdAt DESC;
```

#### Projets accessibles d'un utilisateur
```sql
-- Propriétaire OU membre
SELECT DISTINCT p.* FROM projects p
WHERE p.ownerId = ?
   OR p.id IN (
     SELECT pm.projectId 
     FROM project_members pm 
     WHERE pm.userId = ?
   )
AND p.deletedAt IS NULL
ORDER BY p.updatedAt DESC;
```

#### Sessions actives dans un projet
```sql
-- Avec index idx_session_active
SELECT * FROM user_sessions 
WHERE projectId = ? 
  AND isActive = true 
  AND lastSeen > NOW() - INTERVAL '5 minutes';
```

---

## 6. Seeds

### 6.1 Demo User

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDemoUser() {
  const hashedPassword = await bcrypt.hash('DemoPassword123!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@nonlinear.app' },
    update: {},
    create: {
      email: 'demo@nonlinear.app',
      username: 'demo',
      passwordHash: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      preferences: {
        theme: 'dark',
        notifications: {
          email: false,
          browser: true,
        },
        language: 'fr',
      },
    },
  });

  return user;
}
```

### 6.2 Demo Project

```typescript
async function seedDemoProject(userId: string) {
  const project = await prisma.project.create({
    data: {
      name: 'Demo Project - Architecture Web',
      description: 'Un projet de démonstration pour explorer l\'architecture web moderne',
      systemPrompt: 'Tu es un expert en architecture web moderne, avec une profonde connaissance de React, Next.js, NestJS, et des meilleures pratiques de développement.',
      ownerId: userId,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: {
        create: [
          {
            prompt: 'Qu\'est-ce que l\'architecture de composants ?',
            response: 'L\'architecture de composants divise l\'interface utilisateur en petits blocs réutilisables appelés composants. Chaque composant gère sa propre logique et son propre état, ce qui permet de construire des interfaces complexes de manière modulaire et maintenable.\n\n**Principes clés :**\n- **Encapsulation** : Chaque composant isole sa logique\n- **Réutilisabilité** : Les composants peuvent être utilisés plusieurs fois\n- **Composition** : Les composants peuvent être combinés\n- **Props** : Communication via des propriétés\n\n**Exemples :**\n- Button, Input, Modal dans React\n- Controller, Service, Module dans NestJS',
            summary: 'Architecture de composants : modulaire et réutilisable',
            status: 'COMPLETED',
            position: { x: 0, y: 0 },
            llmModel: 'gpt-4o',
            llmTokens: 234,
          },
          {
            prompt: 'Qu\'est-ce que l\'injection de dépendances ?',
            status: 'IDLE',
            position: { x: 400, y: 0 },
          },
          {
            prompt: 'Qu\'est-ce que le server-side rendering ?',
            status: 'IDLE',
            position: { x: 200, y: 300 },
          },
        ],
      },
      edges: {
        create: [
          {
            sourceId: (await prisma.node.findFirst({ where: { projectId: { project: { id: userId } } } }))!.id,
            targetId: (await prisma.node.findFirst({ where: { projectId: { project: { id: userId } }, skip: 1 }))!.id,
          },
          {
            sourceId: (await prisma.node.findFirst({ where: { projectId: { project: { id: userId } } }))!.id,
            targetId: (await prisma.node.findFirst({ where: { projectId: { project: { id: userId } }, skip: 2 }))!.id,
          },
        ],
      },
    },
    include: {
      nodes: true,
      edges: true,
    },
  });

  return project;
}
```

### 6.3 Seed Script Complet

```typescript
// packages/database/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean database
  console.log('🧹 Cleaning database...');
  await prisma.userSession.deleteMany();
  await prisma.agentTask.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.voiceInteraction.deleteMany();
  await prisma.media.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.edge.deleteMany();
  await prisma.node.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  console.log('👤 Creating demo user...');
  const demoUser = await seedDemoUser();

  // Create demo project
  console.log('📁 Creating demo project...');
  const demoProject = await seedDemoProject(demoUser.id);

  console.log('✅ Database seeded successfully!');
  console.log('📧 Demo user: demo@nonlinear.app');
  console.log('🔑 Demo password: DemoPassword123!');
  console.log('📂 Demo project ID:', demoProject.id);
}

async function seedDemoUser() {
  const hashedPassword = await bcrypt.hash('DemoPassword123!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@nonlinear.app' },
    update: {},
    create: {
      email: 'demo@nonlinear.app',
      username: 'demo',
      passwordHash: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      preferences: {
        theme: 'dark',
        language: 'fr',
      },
    },
  });

  return user;
}

async function seedDemoProject(userId: string) {
  const project = await prisma.project.create({
    data: {
      name: 'Demo Project',
      description: 'Un projet de démonstration',
      systemPrompt: 'Tu es un assistant utile et expert.',
      ownerId: userId,
      nodes: {
        create: [
          {
            prompt: 'Qu\'est-ce que React ?',
            response: 'React est une bibliothèque JavaScript pour construire des interfaces utilisateur.',
            summary: 'React: bibliothèque UI',
            status: 'COMPLETED',
            position: { x: 0, y: 0 },
            llmModel: 'gpt-4o',
          },
          {
            prompt: 'Qu\'est-ce que Next.js ?',
            status: 'IDLE',
            position: { x: 400, y: 0 },
          },
        ],
      },
      edges: {
        create: [
          {
            sourceId: (await prisma.node.findFirst({ 
              where: { projectId: { project: { id: userId } } } 
            }))!.id,
            targetId: (await prisma.node.findFirst({ 
              where: { projectId: { project: { id: userId } }, 
              skip: 1 
            }))!.id,
          },
        ],
      },
    },
  });

  return project;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

---

## 7. Migrations

### 7.1 Workflow de Migration

```bash
# 1. Créer une nouvelle migration
pnpm db:migrate:dev --name add_voice_interactions

# 2. Review la migration générée
# packages/database/prisma/migrations/20260103120000_add_voice_interactions/migration.sql

# 3. Appliquer la migration en dev
pnpm db:migrate:dev

# 4. Pour déployer en prod
pnpm db:migrate:deploy
```

### 7.2 Bonnes Pratiques

#### Nommage des Migrations
```
{timestamp}_{description}
Ex: 20260103120000_add_voice_interactions
```

#### Types de Changements

**Création d'une nouvelle table**
```sql
CREATE TABLE "voice_interactions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT,
    "text" TEXT,
    "audioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "voice_interactions_pkey" PRIMARY KEY ("id")
);
```

**Ajout d'une colonne**
```sql
ALTER TABLE "projects" 
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
```

**Ajout d'un index**
```sql
CREATE INDEX "idx_nodes_project_deleted_status" 
ON "nodes"("projectId", "deletedAt", "status");
```

**Ajout d'une contrainte unique**
```sql
ALTER TABLE "project_members"
ADD CONSTRAINT "project_members_userId_projectId_key" 
UNIQUE ("projectId", "userId");
```

#### Migration avec Données

```sql
-- Ajout d'une colonne avec valeur par défaut
ALTER TABLE "nodes" 
ADD COLUMN "llmCost" FLOAT 
DEFAULT NULL;

-- Migrer les données existantes
UPDATE "nodes" 
SET "llmCost" = ("llmTokens" * 0.00002) 
WHERE "llmCost" IS NULL 
  AND "llmTokens" IS NOT NULL;
```

### 7.3 Rollback (Annulation)

```bash
# Prisma ne supporte pas directement le rollback
# Mais vous pouvez :

# Option 1: Créer une migration inversée manuelle
pnpm db:migrate:dev --name rollback_add_voice

# Option 2: Utiliser snapshot avant migration
cp -r prisma/migrations prisma/migrations.backup
# Si problème: cp -r prisma/migrations.backup prisma/migrations
```

### 7.4 Backup & Restore

```bash
# Backup de la base de données
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql $DATABASE_URL < backup_20260103_120000.sql
```

---

## 📚 Documentation Connexe

- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) - Architecture backend complète
- [BACKEND_API_DOCUMENTATION.md](./BACKEND_API_DOCUMENTATION.md) - Documentation API
- [BACKEND_TESTING_GUIDE.md](./BACKEND_TESTING_GUIDE.md) - Guide de testing
- [BACKEND_COLLABORATION_GUIDE.md](./BACKEND_COLLABORATION_GUIDE.md) - Guide WebSocket
- [FRONTEND_ARCHITECTURE_HYBRID.md](./ARCHITECTURE_HYBRID.md) - Architecture frontend

---

**Schéma de base de données créé pour le projet NonLinear v1.0**
**Dernière mise à jour : 2026-01-03**
