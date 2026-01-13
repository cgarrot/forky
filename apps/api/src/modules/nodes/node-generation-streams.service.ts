import { Injectable } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { Observable, Subject } from 'rxjs'

export type GenerationChunkEvent = {
  chunk?: string
  progress?: number
  done?: boolean
  summary?: string | null
  tokens?: number | null
}

type StreamState = {
  nodeId: string
  subject: Subject<GenerationChunkEvent>
  abortController: AbortController
  createdAt: Date
}

@Injectable()
export class NodeGenerationStreamsService {
  private readonly streams = new Map<string, StreamState>()

  create(nodeId: string): { streamId: string; abortController: AbortController; stream: Observable<GenerationChunkEvent> } {
    const streamId = `stream_${randomBytes(8).toString('hex')}`
    const subject = new Subject<GenerationChunkEvent>()
    const abortController = new AbortController()

    this.streams.set(streamId, {
      nodeId,
      subject,
      abortController,
      createdAt: new Date(),
    })

    return { streamId, abortController, stream: subject.asObservable() }
  }

  get(streamId: string): Observable<GenerationChunkEvent> | null {
    const state = this.streams.get(streamId)
    return state ? state.subject.asObservable() : null
  }

  getAbortController(streamId: string): AbortController | null {
    return this.streams.get(streamId)?.abortController ?? null
  }

  emit(streamId: string, event: GenerationChunkEvent): void {
    const state = this.streams.get(streamId)
    if (!state) return
    state.subject.next(event)
  }

  complete(streamId: string): void {
    const state = this.streams.get(streamId)
    if (!state) return

    state.subject.complete()
    this.streams.delete(streamId)
  }

  findStreamIdByNodeId(nodeId: string): string | null {
    for (const [streamId, state] of this.streams.entries()) {
      if (state.nodeId === nodeId) return streamId
    }
    return null
  }
}
