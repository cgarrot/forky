# Design System NonLinear

> **Documentation complète du design system atomique pour NonLinear**

---

## 📋 Table des Matières

1. [Introduction](#1-introduction)
2. [Principes du Design System](#2-principes-du-design-system)
3. [Composants Atomes](#3-composants-atomes)
4. [Composants Molecules](#4-composants-molecules)
5. [Composants Organismes](#5-composants-organismes)
6. [Templates & Layouts](#6-templates--layouts)
7. [Tokens de Design](#7-tokens-de-design)
8. [Storybook Setup](#8-storybook-setup)
9. [Best Practices](#9-best-practices)

---

## 1. Introduction

Le design system de NonLinear suit les principes d'**Atomic Design** pour fournir une cohérence visuelle et une réutilisabilité maximale des composants UI.

### Objectifs

- ✅ **Cohérence** : UI consistante dans toute l'application
- ✅ **Réutilisabilité** : Composants partageables entre toutes les features
- ✅ **Maintenabilité** : Documentation claire, tests isolés
- ✅ **Scalabilité** : Facile à étendre avec de nouveaux composants
- ✅ **Accessibilité** : Respect des standards WCAG AA minimum

### Stack Technique

- **React 19** avec TypeScript strict
- **Tailwind CSS** pour le styling utilitaire
- **Framer Motion** pour les animations
- **Lucide React** pour les icônes
- **Storybook 8** pour la documentation et tests visuels

---

## 2. Principes du Design System

### 2.1 Hiérarchie Atomique

```
Atomes (Atoms)
    ↓
  Molecules (Combinations d'atomes)
    ↓
  Organismes (Combinations de molecules)
    ↓
  Templates (Layouts complets)
```

### 2.2 Responsabilités par Niveau

| Niveau | Description | Exemples |
|---------|-------------|-----------|
| **Atomes** | Composants primitifs, indivisibles | Button, Input, Badge, Icon |
| **Molecules** | Petits composés fonctionnels | FormField, NodeHeader, SearchBar |
| **Organismes** | Sections UI complexes | Sidebar, Toolbar, CanvasControls |
| **Templates** | Layouts d'application | AppLayout, ProjectLayout |

### 2.3 Conventions

#### Nommage
- Composants : `PascalCase` → `Button`, `FormField`
- Props interfaces : `${Component}Props` → `ButtonProps`
- Fichiers : `${Component}.tsx` → `Button.tsx`
- Dossiers : `kebab-case` → `button`, `form-field`

#### Structure de Dossier

```
packages/ui/src/[level]/[component]/
├── [Component].tsx          # Implementation
├── [Component].stories.tsx   # Stories Storybook
├── [Component].test.tsx      # Tests unitaires
├── types.ts                 # Types spécifiques (optionnel)
├── utils.ts                 # Helpers spécifiques (optionnel)
└── index.ts                 # Exports publics
```

#### Exports

```typescript
// index.ts - Export publique claire
export { ComponentName } from './ComponentName'
export type { ComponentNameProps } from './ComponentName'

// OU pour exports multiples
export * from './ComponentName'
```

---

## 3. Composants Atomes

### 3.1 Button

**Propriétés :**
- `variant`: primary | secondary | danger | ghost
- `size`: sm | md | lg
- `loading`: État de chargement
- `disabled`: Désactivé
- `icon`: Icône optionnelle
- `fullWidth`: Largeur complète

```typescript
// packages/ui/src/atoms/Button/Button.tsx
import { cn } from '@nonlinear/shared/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, fullWidth, ...props }, ref
) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          {
            'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-600 disabled:bg-gray-100 disabled:cursor-not-allowed': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 disabled:bg-red-400 disabled:cursor-not-allowed': variant === 'danger',
            'hover:bg-gray-100 focus-visible:ring-gray-600 disabled:opacity-50 disabled:cursor-not-allowed': variant === 'ghost',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-base': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
            'w-full': fullWidth,
          },
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!loading && icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
```

**Variants :**
- `primary` : Action principale, blue
- `secondary` : Action secondaire, gris
- `danger` : Action destructive, rouge
- `ghost` : Action discrète, transparent

### 3.2 Input

**Propriétés :**
- `type`: text | email | password | number
- `placeholder`: Texte placeholder
- `label`: Label optionnel
- `error`: Message d'erreur
- `disabled`: Désactivé

```typescript
// packages/ui/src/atoms/Input/Input.tsx
import { cn } from '@nonlinear/shared/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, icon, id, ...props }, ref
) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            id={id}
            className={cn(
              'w-full px-3 py-2 border rounded-md focus-visible:outline-none focus-visible:ring-2',
              {
                'border-gray-300 focus-visible:border-blue-500 focus-visible:ring-blue-500': !error,
                'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500': error,
              },
              icon && 'pl-10',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
```

### 3.3 Badge

**Propriétés :**
- `variant`: success | warning | danger | info
- `size`: sm | md | lg

```typescript
// packages/ui/src/atoms/Badge/Badge.tsx
import { cn } from '@nonlinear/shared/utils'

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const Badge = ({ variant = 'info', size = 'md', children }: BadgeProps) => {
  const variantStyles = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium',
      variantStyles[variant],
      sizeStyles[size]
    )}>
      {children}
    </span>
  )
}
```

### 3.4 Modal

**Propriétés :**
- `isOpen`: État ouvert/fermé
- `onClose`: Callback fermeture
- `title`: Titre optionnel
- `size`: sm | md | lg | xl

```typescript
// packages/ui/src/atoms/Modal/Modal.tsx
'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@nonlinear/shared/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  footer?: React.ReactNode
}

export const Modal = ({ isOpen, onClose, title, size = 'md', children, footer }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={cn(
        'relative bg-white rounded-lg shadow-2xl w-full',
        sizeClasses[size]
      )}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
```

### 3.5 Spinner

**Propriétés :**
- `size`: sm | md | lg
- `color`: Couleur personnalisée

```typescript
// packages/ui/src/atoms/Spinner/Spinner.tsx
import { cn } from '@nonlinear/shared/utils'
import { Loader2 } from 'lucide-react'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export const Spinner = ({ size = 'md', color }: SpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <Loader2
      className={cn('animate-spin', sizeClasses[size])}
      style={{ color }}
    />
  )
}
```

---

## 4. Composants Molecules

### 4.1 NodeHeader

**Propriétés :**
- `title`: Titre du nœud
- `status`: idle | loading | error | stale
- `onEdit`: Callback édition
- `onDelete`: Callback suppression

```typescript
// packages/ui/src/molecules/NodeHeader/NodeHeader.tsx
import { Button } from '@nonlinear/ui/atoms'
import { MoreVertical, Trash2, Edit3 } from 'lucide-react'

export interface NodeHeaderProps {
  title?: string
  status?: 'idle' | 'loading' | 'error' | 'stale'
  onEdit?: () => void
  onDelete?: () => void
}

export const NodeHeader = ({ title, status, onEdit, onDelete }: NodeHeaderProps) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'loading':
        return <span className="inline-flex items-center gap-1 text-sm text-blue-600">⏳ Génération...</span>
      case 'error':
        return <span className="inline-flex items-center gap-1 text-sm text-red-600">❌ Erreur</span>
      case 'stale':
        return <span className="inline-flex items-center gap-1 text-sm text-orange-600">🔄 Obsolète</span>
      default:
        return null
    }
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        {title && <span className="font-medium text-gray-900 truncate max-w-[200px]">{title}</span>}
      </div>
      
      <div className="flex items-center gap-1">
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            icon={<Edit3 className="h-4 w-4" />}
          />
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            icon={<Trash2 className="h-4 w-4" />}
          />
        )}
      </div>
    </div>
  )
}
```

### 4.2 FormField

**Propriétés :**
- `label`: Label du champ
- `error`: Message d'erreur
- `helperText`: Texte d'aide
- `required`: Champ requis

```typescript
// packages/ui/src/molecules/FormField/FormField.tsx
import { Input } from '@nonlinear/ui/atoms'
import { cn } from '@nonlinear/shared/utils'

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, required, id, ...props }, ref
) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Input
        ref={ref}
        id={id}
        error={!!error}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          ⚠️ {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}

FormField.displayName = 'FormField'
```

### 4.3 QuickActionButton

**Propriétés :**
- `label`: Texte du bouton
- `onClick`: Callback
- `icon`: Icône optionnelle
- `color`: Couleur de la bordure

```typescript
// packages/ui/src/molecules/QuickActionButton/QuickActionButton.tsx
import { Button } from '@nonlinear/ui/atoms'

export interface QuickActionButtonProps {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'orange' | 'purple'
}

export const QuickActionButton = ({ label, onClick, icon, color = 'blue' }: QuickActionButtonProps) => {
  const colorClasses = {
    blue: 'border-blue-600 hover:bg-blue-50',
    green: 'border-green-600 hover:bg-green-50',
    orange: 'border-orange-600 hover:bg-orange-50',
    purple: 'border-purple-600 hover:bg-purple-50',
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn('w-full justify-start text-left border-l-4', colorClasses[color])}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  )
}
```

---

## 5. Composants Organismes

### 5.1 Sidebar

**Propriétés :**
- `isOpen`: État ouvert/fermé
- `onClose`: Callback fermeture
- `children`: Contenu de la sidebar

```typescript
// packages/ui/src/organisms/Sidebar/Sidebar.tsx
'use client'

import { X } from 'lucide-react'
import { cn } from '@nonlinear/shared/utils'
import { Button } from '@nonlinear/ui/atoms'

export interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
  children: React.ReactNode
  width?: number
}

export const Sidebar = ({ isOpen, onClose, children, width = 280 }: SidebarProps) => {
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-xl z-50 transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ width }}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <span className="font-semibold text-lg text-gray-900">NonLinear</span>
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </aside>
    </>
  )
}
```

### 5.2 CanvasControls

**Propriétés :**
- `onZoomIn`: Callback zoom avant
- `onZoomOut`: Callback zoom arrière
- `onFitView`: Callback ajuster vue
- `canZoomIn`: Bouton zoom avant activé
- `canZoomOut`: Bouton zoom arrière activé

```typescript
// packages/ui/src/organisms/CanvasControls/CanvasControls.tsx
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { cn } from '@nonlinear/shared/utils'
import { Button } from '@nonlinear/ui/atoms'

export interface CanvasControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  canZoomIn?: boolean
  canZoomOut?: boolean
  zoomLevel?: number
}

export const CanvasControls = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  canZoomIn = true,
  canZoomOut = true,
  zoomLevel = 1,
}: CanvasControlsProps) => {
  return (
    <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
      {/* Zoom Out */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        icon={<ZoomOut className="h-4 w-4" />}
      />

      {/* Zoom In */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        icon={<ZoomIn className="h-4 w-4" />}
      />

      {/* Zoom Level Indicator */}
      <span className="text-sm font-medium text-gray-600 px-2">
        {Math.round(zoomLevel * 100)}%
      </span>

      {/* Fit View */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onFitView}
        icon={<Maximize2 className="h-4 w-4" />}
        title="Ajuster la vue"
      />
    </div>
  )
}
```

### 5.3 ToastContainer

**Propriétés :**
- Aucune (géré par contexte)

```typescript
// packages/ui/src/organisms/ToastContainer/ToastContainer.tsx
'use client'

import { create } from 'zustand'
import { Check, X, AlertCircle, Info } from 'lucide-react'
import { Button } from '@nonlinear/ui/atoms'
import { cn } from '@nonlinear/shared/utils'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  variant: ToastVariant
  message: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { ...toast, id: Date.now().toString() }],
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}))

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore()

  const getIcon = (variant: ToastVariant) => {
    switch (variant) {
      case 'success':
        return <Check className="h-5 w-5 text-green-600" />
      case 'error':
        return <X className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getVariantStyles = (variant: ToastVariant) => {
    switch (variant) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-in slide-in-from-right',
            getVariantStyles(toast.variant)
          )}
        >
          {getIcon(toast.variant)}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{toast.message}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeToast(toast.id)}
            icon={<X className="h-4 w-4" />}
          />
        </div>
      ))}
    </div>
  )
}

export const useToast = () => {
  const { addToast } = useToastStore()

  return {
    success: (message: string, duration = 5000) => addToast({ variant: 'success', message, duration }),
    error: (message: string, duration = 5000) => addToast({ variant: 'error', message, duration }),
    warning: (message: string, duration = 5000) => addToast({ variant: 'warning', message, duration }),
    info: (message: string, duration = 5000) => addToast({ variant: 'info', message, duration }),
  }
}
```

---

## 6. Templates & Layouts

### 6.1 AppLayout

**Propriétés :**
- `children`: Contenu de l'application
- `sidebar`: Sidebar optionnelle

```typescript
// packages/ui/src/templates/AppLayout/AppLayout.tsx
'use client'

import { ReactNode } from 'react'
import { Sidebar } from '@nonlinear/ui/organisms'

export interface AppLayoutProps {
  children: ReactNode
  sidebar?: ReactNode
}

export const AppLayout = ({ children, sidebar }: AppLayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-50">
      {sidebar && <Sidebar isOpen={true}>{sidebar}</Sidebar>}
      <main className="flex-1 h-full overflow-hidden">
        {children}
      </main>
    </div>
  )
}
```

### 6.2 ProjectLayout

**Propriétés :**
- `children`: Contenu du projet
- `header`: Header du projet
- `sidebar`: Sidebar optionnelle

```typescript
// packages/ui/src/templates/ProjectLayout/ProjectLayout.tsx
'use client'

import { ReactNode } from 'react'

export interface ProjectLayoutProps {
  children: ReactNode
  header?: ReactNode
  sidebar?: ReactNode
}

export const ProjectLayout = ({ children, header, sidebar }: ProjectLayoutProps) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      {header && (
        <header className="h-14 border-b border-gray-200 bg-white">
          {header}
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebar && (
          <aside className="w-64 border-r border-gray-200 bg-white">
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

## 7. Tokens de Design

### 7.1 Couleurs

```css
/* packages/ui/src/styles/variables.css */
:root {
  /* Primary Colors */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;

  /* Secondary Colors */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;

  /* Semantic Colors */
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;
  --color-danger-500: #ef4444;
  --color-danger-600: #dc2626;
  --color-info-500: #3b82f6;
  --color-info-600: #2563eb;

  /* Backgrounds */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --bg-elevated: #ffffff;
  --bg-overlay: rgba(0, 0, 0, 0.5);

  /* Text */
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-tertiary: #6b7280;
  --text-inverse: #ffffff;

  /* Borders */
  --border-default: #e5e7eb;
  --border-hover: #d1d5db;
  --border-focus: #3b82f6;
  --border-error: #ef4444;
}
```

### 7.2 Espacements

```css
:root {
  /* Spacing Scale (4px base) */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
}
```

### 7.3 Typographie

```css
:root {
  /* Font Families */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', 'Source Code Pro', monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

### 7.4 Border Radius

```css
:root {
  --radius-none: 0;
  --radius-sm: 0.25rem;    /* 4px */
  --radius-md: 0.375rem;    /* 6px */
  --radius-lg: 0.5rem;      /* 8px */
  --radius-xl: 0.75rem;     /* 12px */
  --radius-2xl: 1rem;      /* 16px */
  --radius-3xl: 1.5rem;    /* 24px */
  --radius-full: 9999px;
}
```

### 7.5 Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}
```

### 7.6 Transitions

```css
:root {
  --transition-fast: 150ms ease-in-out;
  --transition-base: 250ms ease-in-out;
  --transition-slow: 350ms ease-in-out;
  --transition-color: 150ms ease-in-out;
  --transition-transform: 250ms ease-in-out;
}
```

---

## 8. Storybook Setup

### 8.1 Installation & Configuration

```bash
# Installer les dépendances Storybook
cd packages/ui
pnpm add -Dw @storybook/react @storybook/react-vite @storybook/addon-themes
```

```typescript
// packages/ui/.storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite'
import { withThemeByDataAttribute } from '@storybook/addon-themes'
import { Themes } from '@storybook/addon-themes'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    withThemeByDataAttribute,
    Themes,
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
}

export default config
```

```typescript
// packages/ui/.storybook/preview.ts
import type { Preview } from '@storybook/react'
import '../src/styles/globals.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#ffffff' },
      { name: 'dark', value: '#111827' },
    ],
  },
}

export default preview
```

### 8.2 Écrire des Stories

```typescript
// packages/ui/src/atoms/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof Button>

// Default story
export const Default: Story = {
  args: {
    children: 'Button',
  },
}

// Variants
export const Primary: Story = {
  args: {
    children: 'Primary',
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
}

export const Danger: Story = {
  args: {
    children: 'Danger',
    variant: 'danger',
  },
}

export const Ghost: Story = {
  args: {
    children: 'Ghost',
    variant: 'ghost',
  },
}

// Sizes
export const Small: Story = {
  args: {
    children: 'Small',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    children: 'Large',
    size: 'lg',
  },
}

// With Icon
export const WithIcon: Story = {
  args: {
    children: 'With Icon',
    icon: <span>⭐</span>,
  },
}

// Loading State
export const Loading: Story = {
  args: {
    children: 'Loading...',
    loading: true,
  },
}

// Disabled State
export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
}
```

### 8.3 Scripts Package

```json
{
  "scripts": {
    "dev": "storybook dev -p 6006",
    "build": "storybook build",
    "test": "vitest",
    "lint": "eslint src/"
  }
}
```

---

## 9. Best Practices

### 9.1 Princes Fondamentaux

#### Accessibilité (WCAG AA)

```typescript
// Toujours inclure des attributs accessibilité
<button
  aria-label="Fermer"
  role="button"
>
  <X />
</button>

// Utiliser des labels corrects
<label htmlFor="email">Email</label>
<Input id="email" type="email" />

// Contraste suffisant (minimum 4.5:1)
<button className="bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-offset-2">
  Bouton
</button>
```

#### Typage Strict

```typescript
// ❌ Mauvais - utiliser `any`
const handleSomething = (data: any) => {
  console.log(data.anyProperty)
}

// ✅ Bon - utiliser des types explicites
interface DataProps {
  anyProperty: string
}

const handleSomething = (data: DataProps) => {
  console.log(data.anyProperty)
}
```

#### Réutilisation

```typescript
// ❌ Mauvais - dupliquer un composant
export const PrimaryButton = () => <button className="px-4 py-2 bg-blue-600">...</button>
export const SecondaryButton = () => <button className="px-4 py-2 bg-gray-200">...</button>

// ✅ Bon - utiliser le même composant avec des variantes
export const Button = ({ variant = 'primary' }: ButtonProps) => {
  return <button className={variant === 'primary' ? 'bg-blue-600' : 'bg-gray-200'}>...</button>
}
```

### 9.2 Performance

```typescript
// Utiliser React.memo pour éviter les re-renders inutiles
export const Button = React.memo(({ onClick, children }: ButtonProps) => {
  return <button onClick={onClick}>{children}</button>
})

// Utiliser useCallback pour les callbacks
export const MyComponent = () => {
  const handleClick = useCallback(() => {
    // Logic here
  }, [/* dépendances */])

  return <button onClick={handleClick}>Click</button>
}

// Lazy loading pour les composants lourds
const HeavyComponent = lazy(() => import('./HeavyComponent'))
```

### 9.3 Documentation

Chaque composant doit inclure :

1. **JSDoc comments**
```typescript
/**
 * Composant Button pour les actions primaires et secondaires
 * 
 * @example
 * <Button variant="primary">Save</Button>
 */
export const Button = ...
```

2. **Stories Storybook**
```typescript
// Au moins 3-5 stories par composant
export const Default: Story = { args: {...} }
export const Primary: Story = { args: { variant: 'primary' } }
export const Loading: Story = { args: { loading: true } }
```

3. **Tests unitaires**
```typescript
// Test du comportement et des variations
describe('Button', () => {
  it('should render correctly', () => {...})
  it('should call onClick when clicked', () => {...})
  it('should be disabled when loading', () => {...})
})
```

### 9.4 Conventions de Code

```typescript
// Ordre des imports
// 1. React
import { useState, useCallback } from 'react'

// 2. Composants UI externes
import { Button } from '@nonlinear/ui'

// 3. Composants locaux
import { SomeComponent } from './SomeComponent'

// 4. Services/Hooks
import { useMyHook } from './hooks/useMyHook'

// 5. Types
import type { MyType } from './types'

// 6. Utilitaires
import { cn } from '@nonlinear/shared/utils'

// 7. Styles
import './Component.css'
```

### 9.5 Gestion des Erreurs

```typescript
// Toujours gérer les erreurs gracefully
export const MyComponent = () => {
  const [error, setError] = useState<Error | null>(null)

  const handleSubmit = async () => {
    try {
      await someAsyncOperation()
    } catch (err) {
      setError(err as Error)
      // Log error pour debugging
      console.error('Operation failed:', err)
      // Notifier l'utilisateur
      showToast({ type: 'error', message: err.message })
    }
  }

  if (error) {
    return <ErrorMessage error={error} />
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### 9.6 Sécurité

```typescript
// Sanitization des inputs (pour éviter XSS)
import DOMPurify from 'dompurify'

export const MarkdownRenderer = ({ content }: { content: string }) => {
  // Sanitization avant le rendu
  const sanitized = DOMPurify.sanitize(content)
  
  return (
    <div
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
```

### 9.7 Testing Checklist

Pour chaque nouveau composant, vérifier :

- [ ] Accessibilité clavier (tab, enter, escape)
- [ ] Accessibilité lecteur d'écran (aria-labels)
- [ ] Contraste couleur suffisant (WCAG AA)
- [ ] Mobile responsive
- [ ] Dark mode support (si applicable)
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Stories Storybook (min 3)
- [ ] Tests unitaires (min 80% coverage)
- [ ] Pas de console warnings
- [ ] TypeScript strict sans erreurs
- [ ] Performance (Lighthouse > 90)

---

## 📚 Documentation Connexe

- [ARCHITECTURE_HYBRID.md](./ARCHITECTURE_HYBRID.md) - Architecture globale
- [FEATURE_STRUCTURE.md](./FEATURE_STRUCTURE.md) - Structure des features
- [CODING_STANDARDS.md](./CODING_STANDARDS.md) - Standards de code
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Guide de migration

---

**Design System créé pour le projet NonLinear v1.0**
**Dernière mise à jour : 2026-01-03**