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
import { DirectPromptInput } from './DirectPromptInput'
import { useStore, useNodes, useEdges, useQuickActions, useViewport } from '@/lib/store'
import type { Node as NodeType, Edge as EdgeType, QuickAction } from '@forky/shared'

const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

function toFlowNodes(nodes: Map<string, NodeType>): Node[] {
  return Array.from(nodes.values()).map((node) => ({
    id: node.id,
    type: 'custom',
    position: node.position,
    data: { node },
    selected: false,
  }))
}

function toFlowEdges(edges: Map<string, EdgeType>): Edge[] {
  return Array.from(edges.values()).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
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
  const deleteNode = useStore((s) => s.deleteNode)
  const addEdgeToStore = useStore((s) => s.addEdge)
  const deleteEdge = useStore((s) => s.deleteEdge)
  const setViewport = useStore((s) => s.setViewport)
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds)

  const { screenToFlowPosition } = useReactFlow()

  const wrapperRef = useRef<HTMLDivElement>(null)

  const isDraggingRef = useRef(false)
  const dragSourceRef = useRef<string | null>(null)
  const lastDragEndTimeRef = useRef(0)
  const lastMenuOpenTimeRef = useRef(0)

  const [dragDropPosition, setDragDropPosition] = useState<{ x: number; y: number } | null>(null)

  const [creationMenuVisible, setCreationMenuVisible] = useState(false)
  const [creationMenuPosition, setCreationMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [creationMenuSourceNodeId, setCreationMenuSourceNodeId] = useState<string | null>(null)

  const [directPromptVisible, setDirectPromptVisible] = useState(false)
  const [directPromptPosition, setDirectPromptPosition] = useState<{ x: number; y: number } | null>(null)
  const [directPromptSourceNodeId, setDirectPromptSourceNodeId] = useState<string | null>(null)
  const [directPromptPendingNodeId, setDirectPromptPendingNodeId] = useState<string | null>(null)

  const lastClickTimeRef = useRef(0)
  const lastClickPositionRef = useRef<{ x: number; y: number } | null>(null)

  const initialNodes = useMemo(() => toFlowNodes(storeNodes), [storeNodes])
  const initialEdges = useMemo(() => toFlowEdges(storeEdges), [storeEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(toFlowNodes(storeNodes))
  }, [storeNodes, setNodes])

  useEffect(() => {
    setEdges(toFlowEdges(storeEdges))
  }, [storeEdges, setEdges])

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)

      changes.forEach((nodeChange) => {
        if (nodeChange.type === 'position' && nodeChange.position) {
          updateNode(nodeChange.id, { position: nodeChange.position })
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
    [onNodesChange, updateNode, storeNodes, setNodes]
  )

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)

      changes.forEach((change) => {
        if (change.type === 'remove') {
          deleteEdge(change.id)
        }
      })
    },
    [onEdgesChange, deleteEdge]
  )

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return

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
      }
    },
    [addEdgeToStore, setEdges, storeNodes]
  )

  const onConnectStart = useCallback(
    (_event: unknown, params: { nodeId: string | null }) => {
      if (params.nodeId) {
        isDraggingRef.current = true
        dragSourceRef.current = params.nodeId
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

      const clientX = 'clientX' in event ? event.clientX : 0
      const clientY = 'clientY' in event ? event.clientY : 0

      const clientPosition = {
        x: clientX,
        y: clientY,
      }

      setDragDropPosition(null)

      setDirectPromptPosition(clientPosition)
      setDirectPromptSourceNodeId(dragSourceRef.current)
      setDirectPromptVisible(true)

      lastDragEndTimeRef.current = Date.now()
      lastMenuOpenTimeRef.current = Date.now()
      lastClickTimeRef.current = 0
      lastClickPositionRef.current = null

      setTimeout(() => {
        isDraggingRef.current = false
        dragSourceRef.current = null
      }, 100)
    },
    []
  )

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (directPromptVisible || creationMenuVisible) {
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
    [dragDropPosition, directPromptVisible, creationMenuVisible]
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
    addNodeToStore(canvasPos)

    setCreationMenuVisible(false)
    setCreationMenuPosition(null)
    setCreationMenuSourceNodeId(null)
  }, [creationMenuPosition, addNodeToStore, screenToFlowPosition])

  const handleCreationMenuSelectWithPrompt = useCallback(() => {
    if (!creationMenuPosition) {
      return
    }

    const canvasPos = screenToFlowPosition(creationMenuPosition)
    const newNodeId = addNodeToStore(canvasPos)

    setDirectPromptPosition(creationMenuPosition)
    setDirectPromptSourceNodeId(creationMenuSourceNodeId)
    setDirectPromptPendingNodeId(newNodeId)
    setDirectPromptVisible(true)

    setCreationMenuVisible(false)
    setCreationMenuPosition(null)
    setCreationMenuSourceNodeId(null)

    lastMenuOpenTimeRef.current = Date.now()
  }, [creationMenuPosition, creationMenuSourceNodeId, addNodeToStore, screenToFlowPosition])

  const handleCreationMenuQuickAction = useCallback(
    (action: QuickAction) => {
      if (!creationMenuPosition) {
        return
      }

      const canvasPos = screenToFlowPosition(creationMenuPosition)
      const newNodeId = addNodeWithPrompt(canvasPos, action.instruction)

      if (creationMenuSourceNodeId) {
        addEdgeToStore(creationMenuSourceNodeId, newNodeId)
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
    ]
  )

  const handleDirectPromptSubmit = useCallback(
    (prompt: string) => {
      if (directPromptPendingNodeId) {
        updateNode(directPromptPendingNodeId, { prompt })

        if (directPromptSourceNodeId) {
          addEdgeToStore(directPromptSourceNodeId, directPromptPendingNodeId)
        }

        setTimeout(() => {
          const customEvent = new CustomEvent('node:generate', { detail: { nodeId: directPromptPendingNodeId } })
          window.dispatchEvent(customEvent)
        }, 100)
      } else if (!directPromptPosition) {
        return
      } else {
        const canvasPos = screenToFlowPosition(directPromptPosition)

        const newNodeId = addNodeWithPrompt(canvasPos, prompt)

        if (directPromptSourceNodeId) {
          addEdgeToStore(directPromptSourceNodeId, newNodeId)
        }

        setTimeout(() => {
          const customEvent = new CustomEvent('node:generate', { detail: { nodeId: newNodeId } })
          window.dispatchEvent(customEvent)
        }, 100)
      }

      setDirectPromptVisible(false)
      setDirectPromptPosition(null)
      setDirectPromptSourceNodeId(null)
      setDirectPromptPendingNodeId(null)
    },
    [
      directPromptPendingNodeId,
      directPromptPosition,
      directPromptSourceNodeId,
      updateNode,
      addNodeWithPrompt,
      addEdgeToStore,
      screenToFlowPosition,
    ]
  )

  const handleDirectPromptSubmitDraft = useCallback(
    (prompt: string) => {
      if (directPromptPendingNodeId) {
        updateNode(directPromptPendingNodeId, { prompt })

        if (directPromptSourceNodeId) {
          addEdgeToStore(directPromptSourceNodeId, directPromptPendingNodeId)
        }
      } else if (!directPromptPosition) {
        return
      } else {
        const canvasPos = screenToFlowPosition(directPromptPosition)

        const newNodeId = addNodeWithPrompt(canvasPos, prompt)

        if (directPromptSourceNodeId) {
          addEdgeToStore(directPromptSourceNodeId, newNodeId)
        }
      }

      setDirectPromptVisible(false)
      setDirectPromptPosition(null)
      setDirectPromptSourceNodeId(null)
      setDirectPromptPendingNodeId(null)
    },
    [
      directPromptPendingNodeId,
      directPromptPosition,
      directPromptSourceNodeId,
      updateNode,
      addNodeWithPrompt,
      addEdgeToStore,
      screenToFlowPosition,
    ]
  )

  const handleDirectPromptCancel = useCallback(() => {
    if (directPromptPendingNodeId && !directPromptSourceNodeId) {
      deleteNode(directPromptPendingNodeId)
      setNodes((currentNodes) => currentNodes.filter((n) => n.id !== directPromptPendingNodeId))
    }
    setDirectPromptVisible(false)
    setDirectPromptPosition(null)
    setDirectPromptSourceNodeId(null)
    setDirectPromptPendingNodeId(null)
  }, [directPromptPendingNodeId, directPromptSourceNodeId, deleteNode, setNodes])

  const handleCreateFromQuickActionAtPosition = useCallback(
    (action: QuickAction) => {
      if (directPromptPendingNodeId) {
        updateNode(directPromptPendingNodeId, { prompt: action.instruction })

        if (directPromptSourceNodeId) {
          addEdgeToStore(directPromptSourceNodeId, directPromptPendingNodeId)
        }

        setTimeout(() => {
          const customEvent = new CustomEvent('node:generate', { detail: { nodeId: directPromptPendingNodeId } })
          window.dispatchEvent(customEvent)
        }, 100)
      } else if (!directPromptPosition) {
        return
      } else {
        const canvasPos = screenToFlowPosition(directPromptPosition)

        const newNodeId = addNodeWithPrompt(canvasPos, action.instruction)

        if (directPromptSourceNodeId) {
          addEdgeToStore(directPromptSourceNodeId, newNodeId)
        }

        setTimeout(() => {
          const customEvent = new CustomEvent('node:generate', { detail: { nodeId: newNodeId } })
          window.dispatchEvent(customEvent)
        }, 100)
      }

      setDirectPromptVisible(false)
      setDirectPromptPosition(null)
      setDirectPromptSourceNodeId(null)
      setDirectPromptPendingNodeId(null)
    },
    [
      directPromptPendingNodeId,
      directPromptPosition,
      directPromptSourceNodeId,
      updateNode,
      addNodeWithPrompt,
      addEdgeToStore,
      screenToFlowPosition,
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

      {directPromptVisible && directPromptPosition && (
        <DirectPromptInput
          position={directPromptPosition}
          sourceNodeId={directPromptSourceNodeId}
          quickActions={quickActions}
          onSubmit={handleDirectPromptSubmit}
          onSubmitDraft={handleDirectPromptSubmitDraft}
          onCancel={handleDirectPromptCancel}
          onQuickActionSelect={handleCreateFromQuickActionAtPosition}
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
