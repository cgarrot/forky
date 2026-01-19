'use client'

import { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import './Canvas.css'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type NodeTypes,
  BackgroundVariant,
  type OnNodesChange,
  type OnEdgesChange,
  type OnSelectionChangeFunc,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import { CustomNode } from '../../nodes/components/CustomNode'
import { CreationMenu } from './CreationMenu'
import { useStore, useNodes, useEdges, useQuickActions, useViewport } from '@/lib/store'
import { updateNodeApi } from '@/lib/api/nodes'
import type { Node as NodeType, Edge as EdgeType, QuickAction } from '@forky/shared'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '@forky/shared'

const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

const BRANCH_COLORS = [
  '#38bdf8',
  '#a78bfa',
  '#34d399',
  '#fb7185',
  '#facc15',
  '#60a5fa',
  '#f97316',
  '#22c55e',
]

const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const getBranchColor = (branchId: string) => {
  const index = hashString(branchId) % BRANCH_COLORS.length
  return BRANCH_COLORS[index] ?? BRANCH_COLORS[0]
}

function computeBranchByNode(
  nodes: Map<string, NodeType>,
  edges: Map<string, EdgeType>
): Map<string, string> {
  const nodeIds = Array.from(nodes.keys())
  const parentsByTarget = new Map<string, string[]>()
  const childrenBySource = new Map<string, string[]>()

  edges.forEach((edge) => {
    if (!childrenBySource.has(edge.source)) {
      childrenBySource.set(edge.source, [])
    }
    childrenBySource.get(edge.source)!.push(edge.target)

    if (!parentsByTarget.has(edge.target)) {
      parentsByTarget.set(edge.target, [])
    }
    parentsByTarget.get(edge.target)!.push(edge.source)
  })

  const sortByPosition = (ids: string[]) => {
    return ids.slice().sort((a, b) => {
      const ax = nodes.get(a)?.position?.x ?? 0
      const bx = nodes.get(b)?.position?.x ?? 0
      if (ax !== bx) return ax - bx
      return a.localeCompare(b)
    })
  }

  const roots = nodeIds.filter(
    (id) => (parentsByTarget.get(id) ?? []).length === 0
  )
  const sortedRoots = sortByPosition(roots.length ? roots : nodeIds)

  const branchByNode = new Map<string, string>()
  const depthByNode = new Map<string, number>()
  const queue: Array<{ nodeId: string; depth: number }> = []

  sortedRoots.forEach((rootId) => {
    branchByNode.set(rootId, rootId)
    depthByNode.set(rootId, 0)
    queue.push({ nodeId: rootId, depth: 0 })
  })

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!
    const children = sortByPosition(childrenBySource.get(nodeId) ?? [])
    const parentBranch = branchByNode.get(nodeId) ?? nodeId

    for (const childId of children) {
      if (depthByNode.has(childId)) continue
      depthByNode.set(childId, depth + 1)
      const branchId = depth === 0 ? childId : parentBranch
      branchByNode.set(childId, branchId)
      queue.push({ nodeId: childId, depth: depth + 1 })
    }
  }

  nodeIds.forEach((nodeId) => {
    if (!branchByNode.has(nodeId)) {
      branchByNode.set(nodeId, nodeId)
    }
  })

  return branchByNode
}

function toFlowNodes(
  nodes: Map<string, NodeType>,
  branchColors: Map<string, string>
): Node[] {
  return Array.from(nodes.values()).map((node) => ({
    id: node.id,
    type: 'custom',
    position: node.position,
    data: { node, branchColor: branchColors.get(node.id) },
    selected: false,
  }))
}

function toFlowEdges(
  edges: Map<string, EdgeType>,
  branchColors: Map<string, string>
): Edge[] {
  return Array.from(edges.values()).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    style: {
      stroke: branchColors.get(edge.target) ?? '#6b7280',
    },
  }))
}

export function Canvas() {
  const storeNodes = useNodes()
  const storeEdges = useEdges()
  const quickActions = useQuickActions()
  const viewport = useViewport()
  const addNodeToStore = useStore((s) => s.addNode)
  const addNodeWithPrompt = useStore((s) => s.addNodeWithPrompt)
  const updateNode = useStore((s) => s.updateNode)
  const addEdgeToStore = useStore((s) => s.addEdge)
  const deleteEdge = useStore((s) => s.deleteEdge)
  const setViewport = useStore((s) => s.setViewport)
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds)
  const setPromptFocusNodeId = useStore((s) => s.setPromptFocusNodeId)

  const { screenToFlowPosition } = useReactFlow()

  const wrapperRef = useRef<HTMLDivElement>(null)

  const isDraggingRef = useRef(false)
  const dragSourceRef = useRef<string | null>(null)
  const didConnectRef = useRef(false)
  const lastDragEndTimeRef = useRef(0)
  const lastMenuOpenTimeRef = useRef(0)

  const [dragDropPosition, setDragDropPosition] = useState<{ x: number; y: number } | null>(null)

  const [creationMenuVisible, setCreationMenuVisible] = useState(false)
  const [creationMenuPosition, setCreationMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [creationMenuSourceNodeId, setCreationMenuSourceNodeId] = useState<string | null>(null)

  const lastClickTimeRef = useRef(0)
  const lastClickPositionRef = useRef<{ x: number; y: number } | null>(null)

  const branchByNodeId = useMemo(
    () => computeBranchByNode(storeNodes, storeEdges),
    [storeNodes, storeEdges]
  )

  const branchColorsByNodeId = useMemo(() => {
    const map = new Map<string, string>()
    branchByNodeId.forEach((branchId, nodeId) => {
      map.set(nodeId, getBranchColor(branchId))
    })
    return map
  }, [branchByNodeId])

  const initialNodes = useMemo(
    () => toFlowNodes(storeNodes, branchColorsByNodeId),
    [storeNodes, branchColorsByNodeId]
  )
  const initialEdges = useMemo(
    () => toFlowEdges(storeEdges, branchColorsByNodeId),
    [storeEdges, branchColorsByNodeId]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const persistParentIds = useCallback((nodeId: string, parentIds: string[]) => {
    void updateNodeApi(nodeId, { parentIds }).catch((error) => {
      console.error('Failed to persist parentIds', error)
    })
  }, [])

  const persistPosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    void updateNodeApi(nodeId, { position }).catch((error) => {
      console.error('Failed to persist position', error)
    })
  }, [])

  const centerFlowPosition = useCallback((position: { x: number; y: number }) => {
    return {
      x: position.x - DEFAULT_NODE_WIDTH / 2,
      y: position.y,
    }
  }, [])

  useEffect(() => {
    setNodes(toFlowNodes(storeNodes, branchColorsByNodeId))
  }, [storeNodes, branchColorsByNodeId, setNodes])

  useEffect(() => {
    setEdges(toFlowEdges(storeEdges, branchColorsByNodeId))
  }, [storeEdges, branchColorsByNodeId, setEdges])

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)

      changes.forEach((nodeChange) => {
        if (nodeChange.type === 'position' && nodeChange.position) {
          updateNode(nodeChange.id, { position: nodeChange.position })
          window.dispatchEvent(
            new CustomEvent('node:ws-update', {
              detail: { nodeId: nodeChange.id, data: { position: nodeChange.position } },
            })
          )
          if (!nodeChange.dragging) {
            persistPosition(nodeChange.id, nodeChange.position)
          }
        }
      })

      changes.forEach((nodeChange) => {
        if (nodeChange.type === 'add' && nodeChange.item && isDraggingRef.current && dragSourceRef.current) {
          if (!storeNodes.has(nodeChange.item.id)) {
            setNodes((ns) => ns.filter((n) => n.id !== nodeChange.item.id))
          }
        }
      })
    },
    [onNodesChange, updateNode, storeNodes, setNodes, persistPosition]
  )

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)

      changes.forEach((change) => {
        if (change.type === 'remove') {
          const edge = storeEdges.get(change.id)
          deleteEdge(change.id)
          if (edge) {
            const targetNode = useStore.getState().nodes.get(edge.target)
            if (targetNode) {
              window.dispatchEvent(
                new CustomEvent('node:ws-update', {
                  detail: { nodeId: targetNode.id, data: { parentIds: targetNode.parentIds } },
                })
              )
              persistParentIds(targetNode.id, targetNode.parentIds)
            }
          }
        }
      })
    },
    [onEdgesChange, deleteEdge, storeEdges, persistParentIds]
  )

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return

      didConnectRef.current = true

      const sourceNode = storeNodes.get(connection.source)
      const targetNode = storeNodes.get(connection.target)

      if (sourceNode && targetNode) {
        const wouldCycle = checkForCycle(connection.source, connection.target, storeNodes)
        if (wouldCycle) {
          return
        }
      }

      const edgeId = addEdgeToStore(connection.source, connection.target)
      if (edgeId) {
        setEdges((eds) =>
          addEdge(
            {
              ...connection,
              id: edgeId,
              type: 'smoothstep',
            },
            eds
          )
        )
        const targetNode = useStore.getState().nodes.get(connection.target)
        if (targetNode) {
          window.dispatchEvent(
            new CustomEvent('node:ws-update', {
              detail: { nodeId: targetNode.id, data: { parentIds: targetNode.parentIds } },
            })
          )
          persistParentIds(targetNode.id, targetNode.parentIds)
        }
      }
    },
    [addEdgeToStore, setEdges, storeNodes, persistParentIds]
  )

  const onConnectStart = useCallback(
    (_event: unknown, params: { nodeId: string | null }) => {
      if (params.nodeId) {
        isDraggingRef.current = true
        dragSourceRef.current = params.nodeId
        didConnectRef.current = false
        setDragDropPosition(null)
      }
    },
    []
  )

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current || !dragSourceRef.current) {
        isDraggingRef.current = false
        dragSourceRef.current = null
        return
      }

      if (didConnectRef.current) {
        didConnectRef.current = false
        lastDragEndTimeRef.current = Date.now()
        isDraggingRef.current = false
        dragSourceRef.current = null
        return
      }

      const sourceNodeId = dragSourceRef.current
      const clientX = 'clientX' in event ? event.clientX : 0
      const clientY = 'clientY' in event ? event.clientY : 0

      const clientPosition = {
        x: clientX,
        y: clientY,
      }

      setDragDropPosition(null)

      const canvasPos = screenToFlowPosition(clientPosition)
      const newNodeId = addNodeToStore(centerFlowPosition(canvasPos))

      if (sourceNodeId) {
        addEdgeToStore(sourceNodeId, newNodeId)
      }

      window.dispatchEvent(new CustomEvent('node:ws-create', { detail: { nodeId: newNodeId } }))

      if (sourceNodeId) {
        const targetNode = useStore.getState().nodes.get(newNodeId)
        if (targetNode) {
          window.dispatchEvent(
            new CustomEvent('node:ws-update', {
              detail: { nodeId: targetNode.id, data: { parentIds: targetNode.parentIds } },
            })
          )
        }
      }

      setPromptFocusNodeId(newNodeId)

      lastDragEndTimeRef.current = Date.now()
      lastMenuOpenTimeRef.current = Date.now()
      lastClickTimeRef.current = 0
      lastClickPositionRef.current = null

      setTimeout(() => {
        isDraggingRef.current = false
        dragSourceRef.current = null
      }, 100)
    },
    [addNodeToStore, addEdgeToStore, screenToFlowPosition, centerFlowPosition, setPromptFocusNodeId]
  )

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (creationMenuVisible) {
        return
      }

      if (dragDropPosition) {
        setDragDropPosition(null)
        return
      }

      const timeSinceDragEnd = Date.now() - lastDragEndTimeRef.current
      if (timeSinceDragEnd < 1000) {
        return
      }

      const now = Date.now()
      const timeSinceLastClick = now - lastClickTimeRef.current
      const isDoubleClick = timeSinceLastClick < 300 && lastClickPositionRef.current !== null

      const clientPosition = {
        x: event.clientX,
        y: event.clientY,
      }

      const positionChanged = lastClickPositionRef.current
        ? (Math.abs(lastClickPositionRef.current.x - clientPosition.x) > 5 ||
             Math.abs(lastClickPositionRef.current.y - clientPosition.y) > 5)
        : false

      if (isDoubleClick && !positionChanged) {
        setCreationMenuPosition(clientPosition)
        setCreationMenuSourceNodeId(null)
        setCreationMenuVisible(true)

        lastMenuOpenTimeRef.current = Date.now()

        lastClickTimeRef.current = 0
        lastClickPositionRef.current = null
      } else {
        lastClickTimeRef.current = now
        lastClickPositionRef.current = clientPosition
      }
    },
    [dragDropPosition, creationMenuVisible]
  )

  const handleCreationMenuClose = useCallback(() => {
    setCreationMenuVisible(false)
    setCreationMenuPosition(null)
    setCreationMenuSourceNodeId(null)
  }, [])

  const handleCreationMenuSelectEmpty = useCallback(() => {
    if (!creationMenuPosition) {
      return
    }

    const canvasPos = screenToFlowPosition(creationMenuPosition)
    const nodeId = addNodeToStore(centerFlowPosition(canvasPos))
    window.dispatchEvent(new CustomEvent('node:ws-create', { detail: { nodeId } }))

    setCreationMenuVisible(false)
    setCreationMenuPosition(null)
    setCreationMenuSourceNodeId(null)
  }, [creationMenuPosition, addNodeToStore, screenToFlowPosition, centerFlowPosition])

  const handleCreationMenuSelectWithPrompt = useCallback(() => {
    if (!creationMenuPosition) {
      return
    }

    const canvasPos = screenToFlowPosition(creationMenuPosition)
    const newNodeId = addNodeToStore(centerFlowPosition(canvasPos))

    if (creationMenuSourceNodeId) {
      addEdgeToStore(creationMenuSourceNodeId, newNodeId)
    }

    window.dispatchEvent(new CustomEvent('node:ws-create', { detail: { nodeId: newNodeId } }))

    if (creationMenuSourceNodeId) {
      const targetNode = useStore.getState().nodes.get(newNodeId)
      if (targetNode) {
        window.dispatchEvent(
          new CustomEvent('node:ws-update', {
            detail: { nodeId: targetNode.id, data: { parentIds: targetNode.parentIds } },
          })
        )
      }
    }

    setPromptFocusNodeId(newNodeId)

    setCreationMenuVisible(false)
    setCreationMenuPosition(null)
    setCreationMenuSourceNodeId(null)

    lastMenuOpenTimeRef.current = Date.now()
  }, [
    creationMenuPosition,
    creationMenuSourceNodeId,
    addNodeToStore,
    addEdgeToStore,
    screenToFlowPosition,
    centerFlowPosition,
    setPromptFocusNodeId,
  ])

  const handleCreationMenuQuickAction = useCallback(
    (action: QuickAction) => {
      if (!creationMenuPosition) {
        return
      }

      const canvasPos = screenToFlowPosition(creationMenuPosition)
      const newNodeId = addNodeWithPrompt(centerFlowPosition(canvasPos), action.instruction)

      if (creationMenuSourceNodeId) {
        addEdgeToStore(creationMenuSourceNodeId, newNodeId)
      }

      window.dispatchEvent(new CustomEvent('node:ws-create', { detail: { nodeId: newNodeId } }))

      if (creationMenuSourceNodeId) {
        const targetNode = useStore.getState().nodes.get(newNodeId)
        if (targetNode) {
          window.dispatchEvent(
            new CustomEvent('node:ws-update', {
              detail: { nodeId: targetNode.id, data: { parentIds: targetNode.parentIds } },
            })
          )
        }
      }

      setTimeout(() => {
        const customEvent = new CustomEvent('node:generate', { detail: { nodeId: newNodeId } })
        window.dispatchEvent(customEvent)
      }, 100)

      setCreationMenuVisible(false)
      setCreationMenuPosition(null)
      setCreationMenuSourceNodeId(null)
    },
    [
      creationMenuPosition,
      creationMenuSourceNodeId,
      addNodeWithPrompt,
      addEdgeToStore,
      screenToFlowPosition,
      centerFlowPosition,
    ]
  )

  const handleMoveEnd = useCallback(
    (_event: unknown, vp: { x: number; y: number; zoom: number }) => {
      setViewport(vp)
    },
    [setViewport]
  )

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      setSelectedNodeIds(selectedNodes.map((n) => n.id))
    },
    [setSelectedNodeIds]
  )

  return (
    <div className="w-full h-full" ref={wrapperRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onPaneClick={handlePaneClick}
        onMoveEnd={handleMoveEnd}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        defaultViewport={viewport}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.25}
        maxZoom={2}
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-gray-50"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#94a3b8"
          className="opacity-50"
        />
        <Controls />
        <MiniMap
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>

      {creationMenuVisible && creationMenuPosition && (
        <CreationMenu
          x={creationMenuPosition.x}
          y={creationMenuPosition.y}
          sourceNodeId={creationMenuSourceNodeId}
          quickActions={quickActions}
          onSelectEmpty={handleCreationMenuSelectEmpty}
          onSelectWithPrompt={handleCreationMenuSelectWithPrompt}
          onSelectQuickAction={handleCreationMenuQuickAction}
          onClose={handleCreationMenuClose}
        />
      )}
    </div>
  )
}

function checkForCycle(sourceId: string, targetId: string, nodes: Map<string, NodeType>): boolean {
  const visited = new Set<string>()
  const stack = [sourceId]

  while (stack.length > 0) {
    const current = stack.pop()!

    if (current === targetId) {
      return true
    }

    if (visited.has(current)) {
      continue
    }

    visited.add(current)

    const node = nodes.get(current)
    if (node) {
      for (const childId of node.childrenIds) {
        if (!visited.has(childId)) {
          stack.push(childId)
        }
      }
    }
  }

  return false
}
