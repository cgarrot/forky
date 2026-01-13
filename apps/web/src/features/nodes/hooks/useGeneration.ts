'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettings, useStore } from '@/lib/store'
import { readOrchestrationMetadata, writeOrchestrationMetadata } from '@forky/shared'
import type { Node, TodoItem } from '@forky/shared'

type GenerationEvent = {
  chunk?: string
  progress?: number
  done?: boolean
  summary?: string | null
  tokens?: number | null
}

type GenerateTitleResponse = {
  error?: string
}

type GenerateTitleSuccess = {
  title?: string
}

function parseTodoItems(markdown: string): TodoItem[] {
  const lines = markdown.split('\n').map((l) => l.trim())
  const items: TodoItem[] = []

  for (const line of lines) {
    const match = line.match(/^-\s*\[( |x|X)\]\s+(.+)$/)
    if (!match) continue

    const checked = match[1].toLowerCase() === 'x'
    const title = match[2].trim()
    if (!title) continue

    items.push({
      id: `todo_${Date.now()}_${items.length}`,
      title,
      status: checked ? 'done' : 'todo',
    })

    if (items.length >= 50) break
  }

  return items
}

async function startGeneration(params: { nodeId: string; model: string }) {
  const response = await fetch(`/api/nodes/${encodeURIComponent(params.nodeId)}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: params.model }),
  })

  const payload = (await response.json().catch(() => null)) as { streamId?: string; error?: string } | null

  if (!response.ok || !payload?.streamId) {
    throw new Error(payload?.error ?? 'Generation failed')
  }

  return payload.streamId
}

async function generateTitle(prompt: string, response: string): Promise<string | null> {
  try {
    const apiResponse = await fetch('/api/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, response }),
    })

    if (!apiResponse.ok) {
      const errorPayload = (await apiResponse.json().catch(() => null)) as GenerateTitleResponse | null
      if (apiResponse.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        return generateTitle(prompt, response)
      }
      return errorPayload?.error && typeof errorPayload.error === 'string' ? null : null
    }

    const payload = (await apiResponse.json().catch(() => null)) as GenerateTitleSuccess | null
    const title = payload?.title
    return typeof title === 'string' && title.trim() ? title.trim() : null
  } catch {
    return null
  }
}

export function useGeneration(nodeId: string) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const fullResponseRef = useRef<string>('')

  const nodes = useStore((s) => s.nodes)
  const settings = useSettings()
  const setNodeStatus = useStore((s) => s.setNodeStatus)
  const updateNodeResponse = useStore((s) => s.updateNodeResponse)
  const updateNodeSummary = useStore((s) => s.updateNodeSummary)
  const updateNode = useStore((s) => s.updateNode)
  const setCurrentProjectName = useStore((s) => s.setCurrentProjectName)
  const currentProjectName = useStore((s) => s.currentProjectName)

  const closeStream = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
  }, [])

  const cancel = useCallback(async () => {
    closeStream()
    setIsGenerating(false)
    setNodeStatus(nodeId, 'idle')

    try {
      await fetch(`/api/nodes/${encodeURIComponent(nodeId)}/generate/cancel`, { method: 'POST' })
    } catch {
      return
    }
  }, [closeStream, nodeId, setNodeStatus])

  const generateNode = useCallback(async () => {
    const node = nodes.get(nodeId)
    if (!node || !node.prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setNodeStatus(nodeId, 'loading')
    updateNodeResponse(nodeId, '')
    fullResponseRef.current = ''

    closeStream()

    try {
      const streamId = await startGeneration({ nodeId, model: settings.defaultModel })

      const source = new EventSource(`/api/nodes/${encodeURIComponent(nodeId)}/generate/${encodeURIComponent(streamId)}`)
      eventSourceRef.current = source

      source.onmessage = (event) => {
        const data = (() => {
          try {
            return JSON.parse(event.data) as GenerationEvent
          } catch {
            return null
          }
        })()

        if (!data) return

        if (typeof data.chunk === 'string' && data.chunk.length > 0) {
          fullResponseRef.current += data.chunk
          updateNodeResponse(nodeId, fullResponseRef.current)
        }

        if (data.done) {
          closeStream()
          setIsGenerating(false)
          setNodeStatus(nodeId, 'idle')

          if (typeof data.summary === 'string' && data.summary.trim()) {
            updateNodeSummary(nodeId, data.summary)
          }

          updateNode(nodeId, {
            metadata: {
              ...node.metadata,
              customData: {
                ...node.metadata?.customData,
                error: undefined,
              },
            },
          })

            const latest = nodes.get(nodeId)
            if (latest) {
              const orchestration = readOrchestrationMetadata(latest.metadata)

              if (orchestration.logicalRole === 'plan' && orchestration.plan && Array.isArray(orchestration.plan.versions)) {
                const activeVersion = orchestration.plan.activeVersion
                const createdAt = new Date().toISOString()

                const versions = (() => {
                  const existing = orchestration.plan?.versions ?? []
                  const hasActive = existing.some((v) => v.version === activeVersion)

                  const updated = existing.map((v) => (v.version === activeVersion ? { ...v, content: fullResponseRef.current } : v))

                  return hasActive ? updated : [...updated, { version: activeVersion, content: fullResponseRef.current, createdAt }]
                })()

                const nextPlan = { ...orchestration.plan, versions, isStale: false }
                updateNode(nodeId, {
                  metadata: writeOrchestrationMetadata(latest.metadata, { logicalRole: 'plan', plan: nextPlan }),
                })
              }

              if (orchestration.todo) {
                const items = parseTodoItems(fullResponseRef.current)
                const nextTodo = { ...orchestration.todo, items }

                updateNode(nodeId, {
                  metadata: writeOrchestrationMetadata(latest.metadata, { todo: nextTodo }),
                })
              }
            }


          if (currentProjectName === 'Projet sans titre' && node.prompt) {
            const prompt = node.prompt
            const response = fullResponseRef.current
            void (async () => {
              const title = await generateTitle(prompt, response)
              if (title && title.trim()) {
                setCurrentProjectName(title)
              }
            })()
          }

          markDescendantsStale(nodeId, nodes)
        }
      }

      source.onerror = () => {
        closeStream()
        setIsGenerating(false)
        setError('Erreur de streaming')
        setNodeStatus(nodeId, 'error')
        updateNode(nodeId, {
          metadata: {
            ...node.metadata,
            customData: {
              ...node.metadata?.customData,
              error: 'Erreur de streaming',
            },
          },
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      setNodeStatus(nodeId, 'error')
      updateNode(nodeId, {
        metadata: {
          ...node.metadata,
          customData: {
            ...node.metadata?.customData,
            error: errorMessage,
          },
        },
      })
      setIsGenerating(false)
    }
  }, [
    closeStream,
    currentProjectName,
    nodeId,
    nodes,
    setCurrentProjectName,
    setNodeStatus,
    settings.defaultModel,
    updateNode,
    updateNodeResponse,
    updateNodeSummary,
  ])

  useEffect(() => {
    const handleGenerate = (event: CustomEvent<{ nodeId: string }>) => {
      if (event.detail.nodeId === nodeId) {
        void generateNode()
      }
    }

    window.addEventListener('node:generate', handleGenerate as EventListener)
    return () => {
      window.removeEventListener('node:generate', handleGenerate as EventListener)
      closeStream()
    }
  }, [closeStream, generateNode, nodeId])

  return {
    generate: generateNode,
    cancel,
    isGenerating,
    error,
  }
}

export function useNodeGenerationProvider() {
  const settings = useSettings()

  useEffect(() => {
    const generateNodeOnce = async (id: string, options: { markDescendants: boolean }) => {
      const currentNodes = useStore.getState().nodes
      const node = currentNodes.get(id)
      if (!node || !node.prompt.trim()) {
        return
      }

      const { setNodeStatus, updateNodeResponse, updateNode, updateNodeSummary, setCurrentProjectName } =
        useStore.getState()
      const currentProjectName = useStore.getState().currentProjectName

      setNodeStatus(id, 'loading')
      updateNodeResponse(id, '')

      let full = ''

      const streamId = await startGeneration({ nodeId: id, model: settings.defaultModel })

      await new Promise<void>((resolve, reject) => {
        const source = new EventSource(`/api/nodes/${encodeURIComponent(id)}/generate/${encodeURIComponent(streamId)}`)

        source.onmessage = (evt) => {
          const data = (() => {
            try {
              return JSON.parse(evt.data) as GenerationEvent
            } catch {
              return null
            }
          })()

          if (!data) return

          if (typeof data.chunk === 'string' && data.chunk.length > 0) {
            full += data.chunk
            updateNodeResponse(id, full)
          }

          if (data.done) {
            source.close()
            setNodeStatus(id, 'idle')

            if (typeof data.summary === 'string' && data.summary.trim()) {
              updateNodeSummary(id, data.summary)
            }

            updateNode(id, {
              metadata: {
                ...node.metadata,
                customData: {
                  ...node.metadata?.customData,
                  error: undefined,
                },
              },
            })

            const latest = currentNodes.get(id)
            if (latest) {
              const orchestration = readOrchestrationMetadata(latest.metadata)

              if (orchestration.logicalRole === 'plan' && orchestration.plan && Array.isArray(orchestration.plan.versions)) {
                const activeVersion = orchestration.plan.activeVersion
                const createdAt = new Date().toISOString()

                const versions = (() => {
                  const existing = orchestration.plan?.versions ?? []
                  const hasActive = existing.some((v) => v.version === activeVersion)

                  const updated = existing.map((v) => (v.version === activeVersion ? { ...v, content: full } : v))

                  return hasActive ? updated : [...updated, { version: activeVersion, content: full, createdAt }]
                })()

                const nextPlan = { ...orchestration.plan, versions, isStale: false }
                updateNode(id, {
                  metadata: writeOrchestrationMetadata(latest.metadata, { logicalRole: 'plan', plan: nextPlan }),
                })
              }

              if (orchestration.todo) {
                const items = parseTodoItems(full)
                const nextTodo = { ...orchestration.todo, items }

                updateNode(id, {
                  metadata: writeOrchestrationMetadata(latest.metadata, { todo: nextTodo }),
                })
              }
            }

            if (currentProjectName === 'Projet sans titre' && node.prompt) {
              void (async () => {
                const title = await generateTitle(node.prompt, full)
                if (title && title.trim()) {
                  setCurrentProjectName(title)
                }
              })()
            }

            if (options.markDescendants) {
              markDescendantsStale(id, currentNodes)
            }

            resolve()
          }
        }

        source.onerror = () => {
          source.close()
          reject(new Error('Erreur de streaming'))
        }
      })
    }

    const handleGenerate = (event: CustomEvent<{ nodeId: string }>) => {
      void generateNodeOnce(event.detail.nodeId, { markDescendants: true }).catch(() => {
        const { setNodeStatus, updateNode } = useStore.getState()
        const currentNodes = useStore.getState().nodes
        const node = currentNodes.get(event.detail.nodeId)
        if (!node) return

        setNodeStatus(event.detail.nodeId, 'error')
        updateNode(event.detail.nodeId, {
          metadata: {
            ...node.metadata,
            customData: {
              ...node.metadata?.customData,
              error: 'Erreur de génération',
            },
          },
        })
      })
    }

    const handleCascade = (event: CustomEvent<{ nodeId: string }>) => {
      void (async () => {
        const rootId = event.detail.nodeId

        const response = await fetch(`/api/nodes/${encodeURIComponent(rootId)}/cascade`, { method: 'POST' })
        const payload = (await response.json().catch(() => null)) as unknown

        const record = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : null
        const affectedNodesRaw = record && Array.isArray(record.affectedNodes) ? record.affectedNodes : null

        const affectedNodes: Array<{ nodeId: string }> = []

        if (affectedNodesRaw) {
          for (const item of affectedNodesRaw) {
            if (typeof item === 'object' && item !== null && 'nodeId' in item) {
              const nodeId = (item as { nodeId?: unknown }).nodeId
              if (typeof nodeId === 'string' && nodeId.length > 0) {
                affectedNodes.push({ nodeId })
              }
            }
          }
        }

        if (!response.ok || affectedNodes.length === 0) {
          return
        }

        const { setNodeStatus } = useStore.getState()

        for (const item of affectedNodes) {
          setNodeStatus(item.nodeId, 'stale')
        }

        for (const item of affectedNodes) {
          await generateNodeOnce(item.nodeId, { markDescendants: false })
        }
      })().catch(() => null)
    }

    window.addEventListener('node:generate', handleGenerate as unknown as EventListener)
    window.addEventListener('node:cascade-regenerate', handleCascade as unknown as EventListener)
    return () => {
      window.removeEventListener('node:generate', handleGenerate as unknown as EventListener)
      window.removeEventListener('node:cascade-regenerate', handleCascade as unknown as EventListener)
    }
  }, [settings.defaultModel])
}

function markDescendantsStale(nodeId: string, nodes: Map<string, Node>) {
  const descendants = getDescendants(nodeId, nodes)
  const setNodeStatus = useStore.getState().setNodeStatus

  descendants.forEach((descendantId) => {
    setNodeStatus(descendantId, 'stale')
  })
}

function getDescendants(nodeId: string, nodes: Map<string, Node>): string[] {
  const descendants: string[] = []
  const visited = new Set<string>()
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue
    if (visited.has(current)) continue
    visited.add(current)

    const node = nodes.get(current)
    if (node) {
      for (const childId of node.childrenIds) {
        if (!visited.has(childId)) {
          descendants.push(childId)
          queue.push(childId)
        }
      }
    }
  }

  return descendants
}
