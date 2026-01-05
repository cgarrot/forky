# DevOps Guide NonLinear

> **Guide complet de déploiement et CI/CD pour le projet NonLinear**

---

## 📋 Table des Matières

1. [Introduction](#1-introduction)
2. [Infrastructure](#2-infrastructure)
3. [Environnement Variables](#3-environnement-variables)
4. [Docker Setup](#4-docker-setup)
5. [CI/CD Pipelines](#5-cicd-pipelines)
6. [Déploiment Frontend (Vercel)](#6-déploiement-frontend--vercel)
7. [Déploiment Backend (Railway/Render/AWS)](#7-déploiement-backend--railway--render--aws)
8. [Monitoring & Observabilité](#8-monitoring--observabilité)
9. [Security & Hardening](#9-security--hardening)
10. [Backup & Recovery](#10-backup--recovery)

---

## 1. Introduction

Ce guide couvre tous les aspects DevOps pour déployer et maintenir le projet NonLinear en production.

### Objectifs

- ✅ **Déploiment automatisé** : Pipeline CI/CD pour chaque commit
- ✅ **Environnements séparés** : Dev, Staging, Production
- ✅ **Monitoring** : Logs, métriques, alertes en temps réel
- ✅ **Sécurité** : HTTPS, headers sécurisés, CORS configuré
- ✅ **Disponibilité** : HA (High Availability), backup, recovery
- ✅ **Scalabilité** : Auto-scaling, load balancing

---

## 2. Infrastructure

### 2.1 Architecture de Déploiment

```
┌─────────────────────────────────────────────────────────┐
│                   Infrastructure Cloud                    │
├─────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐     ┌──────────────┐               │
│  │   Vercel      │     │   Railway     │               │
│  │  (Frontend)    │     │   (Backend)     │               │
│  │  Next.js 15     │     │   Node.js       │               │
│  └──────────────┘     └──────────────┘               │
│                                                               │
│  ┌──────────────┐     ┌──────────────┐               │
│  │  Supabase     │     │   PostgreSQL    │               │
│  │  (Database)     │     │   (Data Store)   │               │
│  │                 │     │                 │               │
│  └──────────────┘     └──────────────┘               │
│                                                               │
│  ┌──────────────┐     ┌──────────────┐               │
│  │   Cloudflare    │     │   Sentry       │               │
│  │  (CDN/Cache)  │     │  (Monitoring)  │               │
│  │                 │     │                 │               │
│  └──────────────┘     └──────────────┘               │
│                                                               │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Services Cloud Recommandés

| Service | Usage | Pourquoi ? |
|----------|-------|------------|
| **Vercel** | Frontend | Next.js natif, CDN global, facile CI/CD |
| **Railway** | Backend | Simplicité, Postgres inclus, WebSockets |
| **Supabase** | Database | Auth, Realtime, Storage en un |
| **Sentry** | Monitoring | Error tracking, performance monitoring |
| **Cloudflare** | CDN/Cache | Edge computing, DDoS protection |

---

## 3. Environnement Variables

### 3.1 Structure des Variables

```
Environnement          Frontend (.env.local)   Backend (.env.local)
=============================================================================================================
Dev (local)           ○ Développement      ○ Développement
Staging               ○ Déploiement test   ○ Déploiement test
Production            ○ Production        ○ Production
```

### 3.2 Variables Frontend (apps/web/.env.local)

```bash
# ==============================================
# FRONTEND ENVIRONMENT VARIABLES
# ==============================================

# Application
NEXT_PUBLIC_APP_URL=https://nonlinear.com
NEXT_PUBLIC_APP_NAME=NonLinear

# API Backend
NEXT_PUBLIC_API_URL=https://api.nonlinear.com
NEXT_PUBLIC_WS_URL=wss://ws.nonlinear.com

# Analytics (optionnel)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxx

# Feature Flags
NEXT_PUBLIC_ENABLE_COLLABORATION=false
NEXT_PUBLIC_ENABLE_VOICE=true
NEXT_PUBLIC_ENABLE_MULTIMODAL=false

# Build
NODE_ENV=development
```

### 3.3 Variables Backend (apps/api/.env.local)

```bash
# ==============================================
# BACKEND ENVIRONMENT VARIABLES
# ==============================================

# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nonlinear_dev
DATABASE_POOL_SIZE=10

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRY=604800 # 7 days

# LLM API Keys (jamais exposées)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ZHIPU_API_KEY=your-zhipu-key

# Redis (si utilisé pour cache)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxx
LOG_LEVEL=debug
```

### 3.4 Variables d'Environnement en Production

**⚠️ IMPORTANT :** Les variables sensibles doivent être dans les secrets des hébergeurs (Vercel Environment Variables, Railway Secrets), jamais dans le code.

```bash
# Railway Secrets (Backend)
DATABASE_URL=postgresql://user:RANDOM_PASS@host/db_name
JWT_SECRET=RANDOM_SECRET_MIN_32_CHARS
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Vercel Environment Variables (Frontend)
NEXT_PUBLIC_API_URL=https://api.nonlinear-production.com
NEXT_PUBLIC_WS_URL=wss://ws.nonlinear-production.com
NEXT_PUBLIC_SENTRY_DSN=https://prod-sentry-dsn
```

---

## 4. Docker Setup

### 4.1 Frontend Dockerfile

```dockerfile
# ==============================================
# FRONTEND DOCKERFILE (apps/web/Dockerfile)
# ==============================================

# Base image
FROM node:20-alpine AS base

# Install dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build application
COPY . .
RUN pnpm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/public ./public
COPY --from=base /app/package.json ./package.json

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').createServer((req, res) => res.writeHead(200).end('OK')).listen(3000)" || exit 1

# Start application
CMD ["node", "server.js"]
```

### 4.2 Backend Dockerfile

```dockerfile
# ==============================================
# BACKEND DOCKERFILE (apps/api/Dockerfile)
# ==============================================

# Base image
FROM node:20-alpine

# Install dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').createServer((req, res) => res.writeHead(200).end('OK')).listen(3001)" || exit 1

# Start application
CMD ["pnpm", "start"]
```

### 4.3 Docker Compose (Dev Local)

```yaml
# docker-compose.yml (racine)
version: '3.8'

services:
  # Frontend
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./apps/web/src:/app/src
    depends_on:
      - api
      - db

  # Backend
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/nonlinear
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db

  # Database
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=nonlinear
      - POSTGRES_USER=nonlinear
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis (optionnel)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 4.4 Production Docker Compose (avec PostgreSQL externe)

```yaml
# docker-compose.prod.yml (pour Railway/Railway)
version: '3.8'

services:
  web:
    image: nonlinear/web:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${API_URL}
    depends_on:
      - api

  api:
    image: nonlinear/api:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=${REDIS_URL}
```

---

## 5. CI/CD Pipelines

### 5.1 GitHub Actions (.github/workflows)

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '8'

jobs:
  # ==============================================
  # Lint & Test Job
  # ==============================================
  lint-test:
    name: Lint & Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Cache node modules
        uses: actions/cache@v3
        with:
          path: ~/.pnpm-store
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm run type-check

      - name: Lint
        run: pnpm run lint

      - name: Run tests
        run: pnpm test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # ==============================================
  # Build UI Package Job
  # ==============================================
  build-ui:
    name: Build UI Package
    runs-on: ubuntu-latest
    needs: lint-test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Cache node modules
        uses: actions/cache@v3
        with:
          path: ~/.pnpm-store
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build UI
        run: pnpm --filter @nonlinear/ui run build

      - name: Upload UI artifact
        uses: actions/upload-artifact@v3
        with:
          name: ui-package
          path: packages/ui/dist/

  # ==============================================
  # Build Frontend Job
  # ==============================================
  build-frontend:
    name: Build Frontend
    runs-on: ubuntu-latest
    needs: lint-test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Cache node modules
        uses: actions/cache@v3
        with:
          path: ~/.pnpm-store
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}

      - name: Download UI artifact
        uses: actions/download-artifact@v3
        with:
          name: ui-package

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build frontend
        run: pnpm --filter @nonlinear/web run build

      - name: Upload frontend artifact
        uses: actions/upload-artifact@v3
        with:
          name: frontend-dist
          path: apps/web/.next/

  # ==============================================
  # Build Backend Job
  # ==============================================
  build-backend:
    name: Build Backend
    runs-on: ubuntu-latest
    needs: lint-test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Cache node modules
        uses: actions/cache@v3
        with:
          path: ~/.pnpm-store
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build backend
        run: pnpm --filter @nonlinear/api run build

      - name: Upload backend artifact
        uses: actions/upload-artifact@v3
        with:
          name: backend-dist
          path: apps/api/dist/

  # ==============================================
  # E2E Tests Job
  # ==============================================
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [build-frontend, build-backend]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload E2E results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: e2e-results
          path: playwright-report/

  # ==============================================
  # Deploy to Vercel (Staging)
  # ==============================================
  deploy-staging:
    name: Deploy to Vercel (Staging)
    runs-on: ubuntu-latest
    needs: [build-frontend]
    if: github.ref == 'refs/heads/develop'
    
    environment:
      VERCEL_URL: https://api.vercel.com
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}

    steps:
      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod --prebuilt' # Deploy comme staging pour l'instant
          working-directory: ./apps/web

  # ==============================================
  # Deploy to Vercel (Production)
  # ==============================================
  deploy-production:
    name: Deploy to Vercel (Production)
    runs-on: ubuntu-latest
    needs: [build-frontend, build-backend, e2e-tests]
    if: github.ref == 'refs/heads/main'
    
    environment:
      VERCEL_URL: https://api.vercel.com
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}

    steps:
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod --prebuilt'
          working-directory: ./apps/web
```

### 5.2 Turborepo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "globalEnv": [
    "NEXT_PUBLIC_API_URL",
    "NODE_ENV"
  ]
}
```

---

## 6. Déploiment Frontend (Vercel)

### 6.1 Configuration Vercel

```json
// vercel.json (racine)
{
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "devCommand": "pnpm run dev",
  "regions": ["iad1"], // Vercel Data Center (Paris, EU)
  "functions": {
    "api/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://nonlinear.com"
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.nonlinear.com/api/:path*"
    }
  ]
}
```

### 6.2 Préparer le Déploiment

```bash
# 1. Installer Vercel CLI
pnpm add -g vercel

# 2. Connecter le projet à Vercel
cd apps/web
vercel link

# 3. Déployer en staging (branch develop)
vercel --env=staging --prod --prebuilt

# 4. Tester l'environnement de staging
# Ouvrir l'URL staging fournie par Vercel

# 5. Déployer en production (branch main)
vercel --prod --prebuilt
```

### 6.3 Monitoring avec Vercel

Vercel fournit automatiquement :
- ✅ **Analytics** : Visites, pages vues, performance
- ✅ **Logs** : Console logs, error logs
- ✅ **Deployment logs** : Historique des déploiments
- ✅ **Edge Network** : Performance globale

**Intégration Sentry pour l'erreur tracking :**

```typescript
// apps/web/src/app/layout.tsx
import { Sentry } from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SentryErrorBoundary>{children}</SentryErrorBoundary>
}
```

---

## 7. Déploiment Backend (Railway/Render/AWS)

### 7.1 Railway Configuration (Recommandé)

```yaml
# railway.toml (racine)
[build]
builder = "NIXPACKS"
buildCommand = "pnpm run build"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"

[[services]]
name = "api"
memory = "512Mi"
cpu = "0.5"
ports = ["3001:3001"]

[[services]]
name = "postgres"
memory = "1Gi"
cpu = "0.5"
databases = ["POSTGRES_DB"]
```

### 7.2 Render Configuration (Alternative)

```yaml
# render.yaml
services:
  # Backend API
  type: pserv
  name: nonlinear-api
  env: node
  plan: starter
  region: oregon
  buildCommand: "pnpm run build"
  startCommand: "pnpm run start"
  envVars:
    - key: DATABASE_URL
      sync: false # Depuis Render Database
    - key: REDIS_URL
      sync: false # Depuis Redis Render
    - key: JWT_SECRET
      generateValue: true

  # Database
  type: pserv
  name: nonlinear-db
  plan: starter
  region: oregon
  database:
    name: nonlinear
    plan: starter
    ipAllowList:
      - 0.0.0.0/0  # IP Railway (si DB externe)

  # Redis
  type: redis
  name: nonlinear-redis
  plan: free
  region: oregon
  maxmemoryPolicy: noeviction
```

### 7.3 AWS Configuration (Pour les grandes entreprises)

```yaml
# infrastructure/terraform/backend.tf
# Terraform pour AWS (optionnel, plus complexe)

resource "aws_ecs_cluster" "backend" {
  name               = "nonlinear-api"
  instance_type      = "t3.large"
  desired_capacity = 5
  min_capacity       = 1
  max_capacity       = 20
  vpc_id            = aws_vpc.main.id
}

resource "aws_elb" "backend_loadbalancer" {
  name               = "nonlinear-lb"
  subnets            = aws_subnet.backend[*].id
  internal          = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.backend.id]
}

resource "aws_rds_instance" "database" {
  identifier     = "nonlinear-db"
  engine        = "postgres"
  instance_class = "db.t3.medium"
  allocated_storage = 100 # GB
  username      = "admin"
  password      = var.db_password
  multi_az       = true
}

resource "aws_elasticache_cluster" "cache" {
  cluster_id           = "nonlinear-cache"
  node_type           = "cache.m5.large"
  node_count           = 3
  port                = 11211
  parameter_group_name = "default.redis7"
}
```

---

## 8. Monitoring & Observabilité

### 8.1 Sentry Integration

```typescript
// packages/shared/src/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,

  // Performance monitoring
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      sessionSampleRate: 0.1,
      errorSampleRate: 1.0,
    }),
  ],

  // Custom contexts
  beforeSend(event, hint) {
    // Filtrer les données sensibles
    if (event.request?.headers) {
      delete event.request.headers
    }

    // Ajouter des tags
    event.tags = {
      ...event.tags,
      environment: process.env.NODE_ENV,
    }
  },
})

export const captureException = (error: Error, context?: any) => {
  Sentry.captureException(error, {
    level: 'error',
    extra: context,
    tags: {
      feature: 'llm-generation',
    environment: process.env.NODE_ENV,
    },
  })
}

export const captureMessage = (message: string, level: Sentry.Severity = 'info') => {
  Sentry.captureMessage(message, {
    level,
    tags: {
      feature: 'canvas-interaction',
    },
  })
}
```

### 8.2 Custom Logging

```typescript
// apps/web/src/lib/utils/logger.ts
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export class Logger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.context}] [DEBUG]`, message, data)
    }
    // Envoyer à service de monitoring
    captureMessage(message, 'debug')
  }

  info(message: string, data?: any) {
    console.log(`[${this.context}] [INFO]`, message, data)
    captureMessage(message, 'info')
  }

  warn(message: string, data?: any) {
    console.warn(`[${this.context}] [WARN]`, message, data)
    captureMessage(message, 'warning')
  }

  error(message: string, error?: Error | any) {
    console.error(`[${this.context}] [ERROR]`, message, error)
    captureException(new Error(message), { error })
  }
}

export const logger = new Logger('NonLinear')
```

### 8.3 Health Checks

```typescript
// apps/web/src/app/api/health/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
  }

  return NextResponse.json(health, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  })
}
```

### 8.4 Performance Monitoring

```typescript
// apps/web/src/app/layout.tsx
'use client'

import { useEffect } from 'react'
import { useReportWebVitals } from 'next/web-vitals'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useReportWebVitals((metric) => {
    // Envoyer les métriques à Sentry
    console.log('Web Vital:', metric)
    
    // Custom Metrics
    switch (metric.name) {
      case 'FCP':
        // First Contentful Paint - temps jusqu'au premier pixel rendu
        if (metric.value > 2500) {
          console.warn('FCP > 2.5s:', metric.value)
        }
        break
      case 'LCP':
        // Largest Contentful Paint
        if (metric.value > 4000) {
          console.warn('LCP > 4s:', metric.value)
        }
        break
      case 'CLS':
        // Cumulative Layout Shift
        if (metric.value > 0.1) {
          console.warn('CLS > 0.1:', metric.value)
        }
        break
      case 'FID':
        // First Input Delay
        if (metric.value > 100) {
          console.warn('FID > 100ms:', metric.value)
        }
        break
    }
  }
  })

  return <div>{children}</div>
}
```

---

## 9. Security & Hardening

### 9.1 HTTP Security Headers

```typescript
// apps/web/src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'")

  // CORS (si backend sur un autre domaine)
  const origin = request.headers.get('origin')
  if (origin && process.env.ALLOWED_ORIGINS?.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  // CSP (Content Security Policy)
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:cdn.nonlinear.com`,
    `connect-src 'self' wss://ws.nonlinear.com`,
    `font-src 'self'`,
    `object-src 'self'`,
    `frame-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `form-ancestor 'self'`,
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  return response
}
```

### 9.2 Rate Limiting

```typescript
// apps/api/src/lib/rate-limiter.ts
import { LRUCache } from 'lru-cache'

interface RateLimiterConfig {
  windowMs: number
  maxRequests: number
}

class RateLimiter {
  private cache: LRUCache<string, { count: number; resetTime: number }>

  constructor(config: RateLimiterConfig) {
    this.cache = new LRUCache({
      max: 1000, // Max 1000 IP/Token différents
      ttl: config.windowMs, // TTL en ms
    })
  }

  check(key: string): boolean {
    const record = this.cache.get(key)
    const now = Date.now()
    const windowStart = now - this.windowMs

    if (!record || record.resetTime < windowStart) {
      // Nouvelle fenêtre ou fenêtre expirée
      this.cache.set(key, { count: 1, resetTime: now })
      return true
    }

    if (record.count >= this.maxRequests) {
      // Trop de requêtes
      return false
    }

    // Incrémenter le compteur
    record.count++
    this.cache.set(key, { count: record.count, resetTime: record.resetTime })
    return true
  }
}

// Limiteur global (100 requêtes par IP par minute)
export const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
})

// Limiteur génération LLM (10 requêtes par user par minute)
export const llmLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
})
```

### 9.3 Input Validation

```typescript
// apps/web/src/lib/validation/schemas.ts
import { z } from 'zod'

export const nodePromptSchema = z.object({
  prompt: z.string()
    .min(1, 'Le prompt ne peut pas être vide')
    .max(10000, 'Le prompt ne peut pas dépasser 10000 caractères')
    .trim(),
  model: z.enum(['glm-4.7', 'gpt-4o', 'claude-3.5-sonnet']),
  temperature: z.number()
    .min(0, 'La température doit être positive')
    .max(2, 'La température ne peut pas dépasser 2')
    .default(0.7),
})

export const projectCreateSchema = z.object({
  name: z.string()
    .min(1, 'Le nom du projet ne peut pas être vide')
    .max(100, 'Le nom du projet ne peut pas dépasser 100 caractères')
    .trim(),
  systemPrompt: z.string()
    .max(5000, 'Le system prompt ne peut pas dépasser 5000 caractères')
    .optional(),
})

export const registerUserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule'),
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule'),
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
})
```

### 9.4 Secrets Management

**⚠️ RÈGLE D'OR** : Jamais commiter de secrets dans le code ou le git !

```bash
# ❌ NE JAMAIS FAIRE ÇA
git add .env.local
git commit -m "Add environment variables"

# ✅ TOUJOURS FAIRE ÇA
# 1. Ajouter .env.local à .gitignore (déjà fait)
# 2. Définir les variables dans les secrets du fournisseur cloud

# Vercel Environment Variables
# Settings > Environment Variables > Add New Variable
# Name: NEXT_PUBLIC_API_URL
# Value: https://api.nonlinear.com
# Environment: Production

# Railway Secrets
# Settings > Variables > New Variable
# Name: DATABASE_URL
# Value: postgresql://user:pass@host/db
# Service: nonlinear-api
```

---

## 10. Backup & Recovery

### 10.1 Database Backups

```bash
#!/bin/bash
# scripts/backup-database.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
S3_BUCKET="s3://nonlinear-backups"

echo "🗄️ Création backup de la base de données..."
pg_dump -F c -f "$BACKUP_DIR/nonlinear_$TIMESTAMP.sql" \
  --host=$DATABASE_HOST \
  --port=$DATABASE_PORT \
  --username=$DATABASE_USER \
  --dbname=$DATABASE_NAME

# Upload vers S3
echo "☁️ Upload vers S3..."
aws s3 cp "$BACKUP_DIR/nonlinear_$TIMESTAMP.sql" "s3://$S3_BUCKET/database/"

# Nettoyer les vieux backups (garder les 30 derniers)
find "$BACKUP_DIR" -name "*.sql" -type f -mtime +30 -delete

echo "✅ Backup terminé : nonlinear_$TIMESTAMP.sql"
```

### 10.2 Automated Backups avec Cron

```yaml
# Créer un job cron pour les backups automatiques
# Railway Settings > Cron Jobs

# Backup quotidien à 2h du matin
Name: database-backup-daily
Cron: 0 2 * * *
Command: ./scripts/backup-database.sh

# Backup toutes les 6 heures
Name: database-backup-every-6h
Cron: 0 */6 * *
Command: ./scripts/backup-database.sh
```

### 10.3 Disaster Recovery Plan

```markdown
# docs/operations/DISASTER_RECOVERY.md

# Plan de Reprise en Cas de Sinistre

## Scénarios de Sinistre

### 1. Panne de Base de Données
- **Détection** : Monitoring automatique
- **Action immédiate** :
  1. Notifier l'équipe via Slack/Discord
  2. Switcher vers le mode dégradé (lecture seule)
  3. Vérifier les backups récents
- **Réparation** :
  1. Restaurer depuis le backup le plus récent
  2. Vérifier l'intégrité des données
  3. Remettre le service en ligne
- **Après-crise** : Analyse de la cause et implémentation de mesures préventives

### 2. Défaillance du Serveur
- **Détection** : Health checks échouent
- **Action immédiate** :
  1. Redéployer automatiquement
  2. Basculer vers le backend de secours (si disponible)
  3. Notifier les utilisateurs
- **Réparation** :
  1. Vérifier les logs
  2. Identifier la cause racine
  3. Corriger et redéployer

### 3. Perte de Données
- **Prévention** :
  - Backups quotidiens
  - Backups géographiquement répartis (différentes régions AWS)
  - Encryption des backups (AES-256)
- **Récupération** :
  1. Restaurer depuis le backup le plus récent
  2. Vérifier avec l'équipe
  3. Documenter l'incident

### 4. Attaque de Sécurité
- **Détection** :
  - Anomalies dans les logs
  - Trafic inhabituel (spike)
  - Tentatives d'intrusion multiples échouées
- **Action immédiate** :
  1. Bloquer les IPs malveillantes
  2. Renforcer les règles de sécurité
  3. Faire un audit complet
  4. Notifier les autorités si requis

## Contacts d'Urgence

| Rôle | Nom | Email | Téléphone |
|------|-----|-------|----------|
| Lead DevOps | Cgarrot | devops@nonlinear.com | +3361234567 |
| Lead Tech | Cgarrot | tech@nonlinear.com | +3361234568 |
| CEO | Cgarrot | ceo@nonlinear.com | +3361234569 |

## Procédures d'Urgence

1. Déterminer la sévérité (P1, P2, P3, P4)
2. Notifier l'équipe via Slack #devops-alerts
3. Commencer les actions de réparation
4. Communiquer avec les parties prenantes (clients, utilisateurs)
5. Documenter l'incident post-crise
```

---

## 📚 Références

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploiment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected-framework/latest/)
- [OWASP Security Guidelines](https://owasp.org/)

---

**DevOps Guide créé pour NonLinear v1.0**
**Dernière mise à jour : 2026-01-03**
