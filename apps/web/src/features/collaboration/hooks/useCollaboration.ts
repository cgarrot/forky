'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '@/lib/store';

interface CollaborationHookProps {
  projectId: string;
  token?: string;
  onCursorMove?: (data: { userId: string; x: number; y: number }) => void;
  onNodeUpdate?: (data: { userId: string; nodeId: string; data: unknown }) => void;
  onNodeCreated?: (data: { node: { id: string; prompt: string; position: { x: number; y: number }; status: string }; createdAt: string }) => void;
  onNodeStreaming?: (data: {
    nodeId: string;
    chunk?: string;
    progress?: number;
    done?: boolean;
    summary?: string | null;
    tokens?: number | null;
  }) => void;
  onUserJoin?: (data: { userId: string }) => void;
  onUserLeave?: (data: { userId: string }) => void;
}

type CollaborationHookReturn = {
  socket: Socket | null;
  moveCursor: (x: number, y: number) => void;
  updateNode: (nodeId: string, data: unknown) => void;
  createNode: (params: { projectId: string; prompt: string; position: { x: number; y: number } }) => void;

};

export const useCollaboration = ({
  projectId,
  token,
  onCursorMove,
  onNodeUpdate,
  onNodeStreaming,
  onNodeCreated,
  onUserJoin,
  onUserLeave,
}: CollaborationHookProps): CollaborationHookReturn => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    socketRef.current = io(url, {
      path: '/socket.io',
      auth: token ? { token } : undefined,
      query: { projectId },
      transports: ['websocket'],
      withCredentials: true,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to collaboration server');
      socket.emit('join-project', { projectId });
    });

    const handleCursorMoved = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return;
      if (!('userId' in data)) return;
      if (!('cursor' in data)) return;

      const userId = (data as { userId?: unknown }).userId;
      const cursor = (data as { cursor?: unknown }).cursor;

      if (typeof userId !== 'string') return;
      if (typeof cursor !== 'object' || cursor === null) return;

      const x = (cursor as { x?: unknown }).x;
      const y = (cursor as { y?: unknown }).y;

      if (typeof x !== 'number' || typeof y !== 'number') return;

      onCursorMove?.({ userId, x, y });
    };

    socket.on('cursor:moved', handleCursorMoved);
    socket.on('cursor-update', handleCursorMoved);

    const handleNodeUpdated = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return;
      const nodeId = (data as { nodeId?: unknown }).nodeId;
      if (typeof nodeId !== 'string') return;

      const userId = typeof (data as { userId?: unknown }).userId === 'string'
        ? (data as { userId: string }).userId
        : 'unknown';

      const updates = (data as { updates?: unknown; data?: unknown }).updates ?? (data as { data?: unknown }).data;

      onNodeUpdate?.({ userId, nodeId, data: updates });
    };

    socket.on('node:updated', handleNodeUpdated);
    socket.on('node-updated', handleNodeUpdated);

    const handleNodeStreaming = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return;
      const nodeId = (data as { nodeId?: unknown }).nodeId;
      if (typeof nodeId !== 'string' || nodeId.length === 0) return;

      const chunk = (data as { chunk?: unknown }).chunk;
      const done = (data as { done?: unknown }).done;
      const progress = (data as { progress?: unknown }).progress;
      const summary = (data as { summary?: unknown }).summary;
      const tokens = (data as { tokens?: unknown }).tokens;

      const state = useStore.getState();
      const node = state.nodes.get(nodeId);
      if (!node) return;

      if (typeof chunk === 'string' && chunk.length > 0) {
        if (node.status !== 'loading') {
          state.setNodeStatus(nodeId, 'loading');
        }
        state.updateNodeResponse(nodeId, `${node.response ?? ''}${chunk}`);
      }

      if (done === true) {
        state.setNodeStatus(nodeId, 'idle');
        if (typeof summary === 'string' && summary.trim()) {
          state.updateNodeSummary(nodeId, summary);
        }
      }

      onNodeStreaming?.({
        nodeId,
        chunk: typeof chunk === 'string' ? chunk : undefined,
        progress: typeof progress === 'number' ? progress : undefined,
        done: done === true,
        summary: typeof summary === 'string' ? summary : summary === null ? null : undefined,
        tokens: typeof tokens === 'number' ? tokens : tokens === null ? null : undefined,
      });
    };

    socket.on('node:streaming', handleNodeStreaming);

    const handleNodeCreated = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return;
      const nodeData = (data as { node?: unknown }).node;
      if (typeof nodeData !== 'object' || nodeData === null) return;

      const id = (nodeData as { id?: unknown }).id;
      const prompt = (nodeData as { prompt?: unknown }).prompt;
      const position = (nodeData as { position?: unknown }).position;

      if (typeof id !== 'string' || typeof prompt !== 'string' || typeof position !== 'object' || position === null) return;

      const x = (position as { x?: unknown }).x;
      const y = (position as { y?: unknown }).y;

      if (typeof x !== 'number' || typeof y !== 'number') return;

      const state = useStore.getState();
      const statusRaw = (nodeData as { status?: unknown }).status;
      const status = statusRaw === 'IDLE' ? 'idle' : statusRaw === 'GENERATING' ? 'loading' : statusRaw === 'ERROR' ? 'error' : statusRaw === 'STALE' ? 'stale' : 'idle';

      if (state.nodes.has(id)) {
        state.updateNode(id, {
          prompt,
          position: { x, y },
          status,
        });
      } else {
        state.addNodeWithPrompt({ x, y }, prompt);
      }

      onNodeCreated?.({
        node: {
          id,
          prompt,
          position: { x, y },
          status,
        },
        createdAt: new Date().toISOString(),
      });
    };

    socket.on('node:created', handleNodeCreated);

    const handleUserJoined = (data: unknown) => {
      if (typeof data === 'object' && data !== null && 'userId' in data) {
        const userId = (data as { userId?: unknown }).userId;
        if (typeof userId === 'string') {
          onUserJoin?.({ userId });
        }
      }
    };

    const handleUserLeft = (data: unknown) => {
      if (typeof data === 'object' && data !== null && 'userId' in data) {
        const userId = (data as { userId?: unknown }).userId;
        if (typeof userId === 'string') {
          onUserLeave?.({ userId });
        }
      }
    };

    socket.on('user:joined', handleUserJoined);
    socket.on('user-joined', handleUserJoined);

    socket.on('user:left', handleUserLeft);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, token, onCursorMove, onNodeUpdate, onNodeStreaming, onNodeCreated, onUserJoin, onUserLeave]);

  const moveCursor = useCallback((x: number, y: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('cursor:move', { projectId, x, y });
      socketRef.current.emit('move-cursor', { projectId, x, y });
    }
  }, [projectId]);

  const updateNode = useCallback((nodeId: string, data: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('node:update', { projectId, nodeId, data });
      socketRef.current.emit('update-node', { projectId, nodeId, data });
    }
  }, [projectId]);

  const createNode = useCallback(
    (params: { projectId: string; prompt: string; position: { x: number; y: number } }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('node:create', {
          ...params,
        });
        socketRef.current.emit('create-node', {
          ...params,
        });
      }
    },
    [projectId],
  );

  return {
    socket: socketRef.current,
    moveCursor,
    updateNode,
    createNode,
  };
};
