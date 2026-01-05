# Build Forkidea Command

Build Forkidea project following hybrid architecture with monorepo structure.

## Workflow

### 1. Analysis
- **Read agent prompt from section below based on provided agent number**
- Understand agent's specific tasks and requirements
- Check reference documentation at `@forkidea-v1/docs/`
- Identify dependencies on previous agents' work
- Verify current project state (what's already implemented)
- **Ask questions if prerequisites or context are unclear**

### 2. Planning
- Create structured task list from agent prompt
- Break down complex tasks into sub-tasks
- Identify implementation order and dependencies
- Plan should contain all code/files to create/modify
- Include validation/testing steps in plan

### 3. Execution
- Implement planned tasks following agent specifications
- Follow project conventions defined in `@forkidea-v1/docs/`
- Use exact versions specified (Next.js 15, React 19, TypeScript 5, etc.)
- Create all required files and configurations
- Test implementation thoroughly
- Fix any issues discovered during execution

---

## Project Context

**Architecture:** Monorepo with pnpm workspace + Turborepo
**Pattern:** Hybrid (Atomic Design for UI + Feature-Based for logic)

**Structure:**
```
forkidea-v1/
├── apps/
│   ├── web/          # Next.js 15, features: canvas, nodes, sidebar, projects
│   └── api/          # NestJS (structure only, backend future)
├── packages/
│   ├── ui/           # Design System: atoms, molecules, organisms, templates
│   ├── shared/       # Types, constants, utils, graph algorithms, validation
│   ├── config/       # Environment config, LLM config
│   └── contracts/    # DTOs, events, interfaces
└── docs/
```

**Tech Stack:**
- Next.js 15.0.0, React 19.0.0, TypeScript 5.0.0
- pnpm 8.0.0+, Turborepo 2.0.0+
- Tailwind CSS 3.4.0, Zustand 5.0.0, @xyflow/react 12.0.0
- Storybook 8.0.0, NestJS 11+ (backend future)

**Key Features:**
- Infinite canvas with React Flow
- LLM-powered nodes with streaming
- Cascade updates propagation
- Project management with system prompts
- Quick actions (macros)
- Complete design system
