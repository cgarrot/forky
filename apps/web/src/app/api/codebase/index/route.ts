import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import type { Dirent } from 'fs'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

type IndexRequest = {
  rootPath: string
  includeExtensions?: string[]
  maxFiles?: number
}

type IndexedFile = {
  filePath: string
  sha256: string
}

function isSubpath(params: { candidate: string; roots: string[] }): boolean {
  const resolvedCandidate = path.resolve(params.candidate)
  return params.roots.some((root) => {
    const resolvedRoot = path.resolve(root)
    const rel = path.relative(resolvedRoot, resolvedCandidate)
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
  })
}

async function* walkFiles(params: {
  rootPath: string
  includeExtensions: Set<string>
  maxFiles: number
}): AsyncGenerator<string> {
  const queue: string[] = [params.rootPath]
  let emitted = 0

  while (queue.length) {
    const dir = queue.shift()
    if (!dir) continue

    let entries: Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (emitted >= params.maxFiles) return

      const full = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue
        queue.push(full)
        continue
      }

      if (!entry.isFile()) continue

      const ext = path.extname(entry.name).toLowerCase()
      if (params.includeExtensions.size > 0 && !params.includeExtensions.has(ext)) continue

      emitted += 1
      yield full
    }
  }
}

async function fileHash(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath)
  return crypto.createHash('sha256').update(buf).digest('hex')
}

export async function POST(request: Request) {
  let body: IndexRequest
  try {
    body = (await request.json()) as IndexRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.rootPath) {
    return NextResponse.json({ error: 'rootPath is required' }, { status: 400 })
  }

  const allowedRoots = (process.env.CODEBASE_ROOTS ?? process.cwd())
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  if (!isSubpath({ candidate: body.rootPath, roots: allowedRoots })) {
    return NextResponse.json({ error: 'rootPath is not allowed' }, { status: 403 })
  }

  const includeExtensions = new Set((body.includeExtensions ?? ['.ts', '.tsx', '.js', '.jsx', '.md', '.py', '.go', '.rs']).map((e) => e.toLowerCase()))
  const maxFiles = typeof body.maxFiles === 'number' && body.maxFiles > 0 ? Math.min(body.maxFiles, 2000) : 800

  const indexed: IndexedFile[] = []
  const resolvedRoot = path.resolve(body.rootPath)

  for await (const filePath of walkFiles({ rootPath: resolvedRoot, includeExtensions, maxFiles })) {
    try {
      const sha256 = await fileHash(filePath)
      indexed.push({ filePath, sha256 })
    } catch {
    }
  }

  const indexId = crypto
    .createHash('sha256')
    .update(`${resolvedRoot}:${indexed.length}:${Date.now()}`)
    .digest('hex')
    .slice(0, 16)

  const outDir = path.join(process.cwd(), '.forky', 'codebase-indexes')
  await fs.mkdir(outDir, { recursive: true })

  await fs.writeFile(
    path.join(outDir, `${indexId}.json`),
    JSON.stringify({ rootPath: resolvedRoot, indexedAt: new Date().toISOString(), files: indexed }, null, 2),
    'utf8'
  )

  return NextResponse.json({ indexId, rootPath: resolvedRoot, fileCount: indexed.length })
}
