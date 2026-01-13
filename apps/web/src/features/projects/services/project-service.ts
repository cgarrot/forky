import { generateEdgeId, generateNodeId } from '@forky/shared'
import type { Edge, Node, QuickAction, Settings, Viewport } from '@forky/shared'
import { ApiError } from '@/lib/api/client'
import {
  createProjectApi,
  deleteProjectApi,
  getProjectApi,
  listProjectsApi,
  updateProjectApi,
} from '@/lib/api/projects'
import { createNodeApi, deleteNodeApi, listNodesApi, updateNodeApi } from '@/lib/api/nodes'
import { createEdgeApi, deleteEdgeApi, listEdgesApi } from '@/lib/api/edges'
import type { ProjectListItem, StoredEdge, StoredNode, StoredProject } from '../types'
import { sanitizeProject, validateProject } from '../utils/project-helpers'

type LoadedProject = {
  id: string
  name: string
  nodes: Node[]
  edges: Edge[]
  systemPrompt: string
  quickActions: QuickAction[]
  viewport: Viewport
}

type ApiNodeStatus = 'IDLE' | 'GENERATING' | 'COMPLETED' | 'ERROR' | 'STALE'

type LocalNodeStatus = Node['status']

type StoredProjectSnapshot = StoredProject

function toApiNodeStatus(status: LocalNodeStatus): ApiNodeStatus {
  if (status === 'loading') return 'GENERATING'
  if (status === 'error') return 'ERROR'
  if (status === 'stale') return 'STALE'
  return 'IDLE'
}

function fromApiNodeStatus(status: string): LocalNodeStatus {
  if (status === 'GENERATING') return 'loading'
  if (status === 'ERROR') return 'error'
  if (status === 'STALE') return 'stale'
  return 'idle'
}

const toStoredNode = (node: Node): StoredNode => ({
  ...node,
  createdAt: node.createdAt.toISOString(),
  updatedAt: node.updatedAt.toISOString(),
})

const toStoredEdge = (edge: Edge): StoredEdge => ({
  ...edge,
  createdAt: edge.createdAt.toISOString(),
})


function buildStoredSnapshot(params: {
  projectId: string
  name: string
  nodes: Node[]
  edges: Edge[]
  settings: Settings
  quickActions: QuickAction[]
  viewport: Viewport
  createdAt: string
  updatedAt: string
}): StoredProjectSnapshot {
  return {
    id: params.projectId,
    name: params.name,
    nodes: params.nodes.map(toStoredNode),
    edges: params.edges.map(toStoredEdge),
    systemPrompt: params.settings.systemPrompt,
    quickActions: params.quickActions,
    viewport: params.viewport,
    createdAt: params.createdAt,
    updatedAt: params.updatedAt,
  }
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const projects = await listProjectsApi()
  const items: ProjectListItem[] = (projects ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    nodeCount: project.nodeCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }))

  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function saveProject(params: {
  id?: string | null
  name: string
  nodes: Node[]
  edges: Edge[]
  settings: Settings
  quickActions: QuickAction[]
  viewport: Viewport
}): Promise<StoredProjectSnapshot> {
  const nowIso = new Date().toISOString()

  const projectId = params.id
    ? params.id
    : (await createProjectApi({
        name: params.name,
        systemPrompt: params.settings.systemPrompt,
        viewport: params.viewport,
        quickActions: params.quickActions,
      })).id

  if (params.id) {
    await updateProjectApi(projectId, {
      name: params.name,
      systemPrompt: params.settings.systemPrompt,
      viewport: params.viewport,
      quickActions: params.quickActions,
    })
  }

  const [existingNodes, existingEdges] = await Promise.all([
    listNodesApi(projectId),
    listEdgesApi(projectId),
  ])

  const desiredNodeIds = new Set(params.nodes.map((node) => node.id))
  const existingNodeIds = new Set(existingNodes.map((node) => node.id))

  const nodesToCreate = params.nodes.filter((node) => !existingNodeIds.has(node.id))
  const nodesToUpdate = params.nodes.filter((node) => existingNodeIds.has(node.id))
  const nodesToDelete = existingNodes.filter((node) => !desiredNodeIds.has(node.id))

  await Promise.all(
    nodesToCreate.map(async (node) =>
      createNodeApi(projectId, {
        id: node.id,
        prompt: node.prompt,
        position: node.position,
      })
    )
  )

  await Promise.all(
    nodesToUpdate.map(async (node) =>
      updateNodeApi(node.id, {
        prompt: node.prompt,
        response: node.response ?? '',
        summary: node.summary ?? null,
        status: toApiNodeStatus(node.status),
        position: node.position,
        metadata: node.metadata as unknown as Record<string, unknown>,
      })
    )
  )

  await Promise.all(nodesToDelete.map(async (node) => deleteNodeApi(node.id)))

  const existingEdgeKey = (edge: { sourceId: string; targetId: string }) =>
    `${edge.sourceId}::${edge.targetId}`

  const desiredEdges = params.edges
    .filter((edge) => desiredNodeIds.has(edge.source) && desiredNodeIds.has(edge.target))
    .map((edge) => ({ sourceId: edge.source, targetId: edge.target }))

  const desiredEdgeKeys = new Set(desiredEdges.map(existingEdgeKey))
  const existingEdgeKeys = new Set(existingEdges.map(existingEdgeKey))

  await Promise.all(
    desiredEdges
      .filter((edge) => !existingEdgeKeys.has(existingEdgeKey(edge)))
      .map(async (edge) => createEdgeApi(projectId, edge))
  )

  await Promise.all(
    existingEdges
      .filter((edge) => !desiredEdgeKeys.has(existingEdgeKey(edge)))
      .map(async (edge) => deleteEdgeApi(edge.id))
  )

  const createdAt = params.id ? nowIso : nowIso

  return buildStoredSnapshot({
    projectId,
    name: params.name,
    nodes: params.nodes,
    edges: params.edges,
    settings: params.settings,
    quickActions: params.quickActions,
    viewport: params.viewport,
    createdAt,
    updatedAt: nowIso,
  })
}

export async function loadProject(id: string): Promise<LoadedProject | null> {
  try {
    const [project, nodes, edges] = await Promise.all([
      getProjectApi(id),
      listNodesApi(id),
      listEdgesApi(id),
    ])

    const childrenBySourceId = new Map<string, string[]>()
    const parentsByTargetId = new Map<string, string[]>()

    for (const edge of edges) {
      const children = childrenBySourceId.get(edge.sourceId) ?? []
      children.push(edge.targetId)
      childrenBySourceId.set(edge.sourceId, children)

      const parents = parentsByTargetId.get(edge.targetId) ?? []
      parents.push(edge.sourceId)
      parentsByTargetId.set(edge.targetId, parents)
    }

    const runtimeNodes: Node[] = nodes.map((node) => ({
      id: node.id,
      prompt: node.prompt,
      response: node.response ?? '',
      summary: node.summary ?? undefined,
      status: fromApiNodeStatus(node.status),
      position: node.position,
      parentIds: parentsByTargetId.get(node.id) ?? node.parentIds ?? [],
      childrenIds: childrenBySourceId.get(node.id) ?? [],
      createdAt: new Date(node.createdAt),
      updatedAt: new Date(node.updatedAt),
      metadata: node.metadata as unknown as Node['metadata'],
    }))

    const runtimeEdges: Edge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      createdAt: new Date(edge.createdAt),
    }))

    return {
      id: project.id,
      name: project.name,
      nodes: runtimeNodes,
      edges: runtimeEdges,
      systemPrompt: project.systemPrompt ?? '',
      quickActions: project.quickActions ?? [],
      viewport: project.viewport ?? { x: 0, y: 0, zoom: 1 },
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    throw error
  }
}

export async function deleteProject(id: string): Promise<void> {
  await deleteProjectApi(id)
}

async function getStoredSnapshot(id: string): Promise<StoredProjectSnapshot> {
  const loaded = await loadProject(id)
  if (!loaded) {
    throw new ApiError('Project not found', 404)
  }

  const project = await getProjectApi(id)

  return buildStoredSnapshot({
    projectId: id,
    name: loaded.name,
    nodes: loaded.nodes,
    edges: loaded.edges,
    settings: { systemPrompt: loaded.systemPrompt, defaultModel: 'glm-4.7' },
    quickActions: loaded.quickActions,
    viewport: loaded.viewport,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  })
}

export async function exportProject(id: string): Promise<string> {
  const snapshot = await getStoredSnapshot(id)
  return JSON.stringify(snapshot, null, 2)
}

export async function getProjectStored(id: string): Promise<StoredProject> {
  return getStoredSnapshot(id)
}

function remapIdsForImport(project: StoredProject): StoredProject {
  const nodeIdMap = new Map<string, string>()

  const nodes = project.nodes.map((node) => {
    const nextId = generateNodeId()
    nodeIdMap.set(node.id, nextId)
    return { ...node, id: nextId }
  })

  const edges = project.edges.map((edge) => ({
    ...edge,
    id: generateEdgeId(),
    source: nodeIdMap.get(edge.source) ?? edge.source,
    target: nodeIdMap.get(edge.target) ?? edge.target,
  }))

  return {
    ...project,
    nodes,
    edges,
  }
}

export async function importProject(json: string): Promise<StoredProject> {
  const parsed = JSON.parse(json) as unknown

  if (!validateProject(parsed)) {
    throw new Error('Invalid project format')
  }

  const candidate = remapIdsForImport(parsed as StoredProject)
  const nowIso = new Date().toISOString()

  const imported: StoredProject = sanitizeProject({
    ...candidate,
    id: '',
    name: `${candidate.name} (Importé)`,
    createdAt: nowIso,
    updatedAt: nowIso,
  })

  const created = await createProjectApi({
    name: imported.name,
    systemPrompt: imported.systemPrompt,
    quickActions: imported.quickActions,
    viewport: imported.viewport,
  })

  await Promise.all(
    imported.nodes.map(async (node) =>
      createNodeApi(created.id, {
        id: node.id,
        prompt: node.prompt,
        position: node.position,
      })
    )
  )

  await Promise.all(
    imported.edges.map(async (edge) =>
      createEdgeApi(created.id, {
        sourceId: edge.source,
        targetId: edge.target,
      })
    )
  )

  return {
    ...imported,
    id: created.id,
  }
}

export async function duplicateProject(id: string): Promise<StoredProject> {
  const original = await getStoredSnapshot(id)
  const nowIso = new Date().toISOString()

  const duplicated = remapIdsForImport(
    sanitizeProject({
      ...original,
      id: '',
      name: `${original.name} (Copie)`,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
  )

  const created = await createProjectApi({
    name: duplicated.name,
    systemPrompt: duplicated.systemPrompt,
    quickActions: duplicated.quickActions,
    viewport: duplicated.viewport,
  })

  await Promise.all(
    duplicated.nodes.map(async (node) =>
      createNodeApi(created.id, {
        id: node.id,
        prompt: node.prompt,
        position: node.position,
      })
    )
  )

  await Promise.all(
    duplicated.edges.map(async (edge) =>
      createEdgeApi(created.id, {
        sourceId: edge.source,
        targetId: edge.target,
      })
    )
  )

  return {
    ...duplicated,
    id: created.id,
  }
}

