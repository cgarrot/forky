import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import type { Dirent } from 'fs'

export const dynamic = 'force-dynamic'

type SearchRequest = {
  rootPath: string
  query: string
  maxResults?: number
  includeExtensions?: string[]
}

type Match = {
  filePath: string
  lineNumber: number
  line: string
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

async function searchFile(params: { filePath: string; query: string; maxPerFile: number }): Promise<Match[]> {
  let content: string
  try {
    content = await fs.readFile(params.filePath, 'utf8')
  } catch {
    return []
  }

  const lines = content.split('\n')
  const matches: Match[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line) continue
    if (!line.toLowerCase().includes(params.query.toLowerCase())) continue

    matches.push({ filePath: params.filePath, lineNumber: i + 1, line })
    if (matches.length >= params.maxPerFile) break
  }

  return matches
}

export async function POST(request: Request) {
  let body: SearchRequest
  try {
    body = (await request.json()) as SearchRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.rootPath || !body.query) {
    return NextResponse.json({ error: 'rootPath and query are required' }, { status: 400 })
  }

  const allowedRoots = (process.env.CODEBASE_ROOTS ?? process.cwd())
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  if (!isSubpath({ candidate: body.rootPath, roots: allowedRoots })) {
    return NextResponse.json({ error: 'rootPath is not allowed' }, { status: 403 })
  }

  const includeExtensions = new Set((body.includeExtensions ?? ['.ts', '.tsx', '.js', '.jsx', '.md', '.py', '.go', '.rs']).map((e) => e.toLowerCase()))
  const maxResults = typeof body.maxResults === 'number' && body.maxResults > 0 ? Math.min(body.maxResults, 200) : 50

  const matches: Match[] = []

  for await (const filePath of walkFiles({ rootPath: path.resolve(body.rootPath), includeExtensions, maxFiles: 5000 })) {
    const fileMatches = await searchFile({ filePath, query: body.query, maxPerFile: 5 })
    for (const match of fileMatches) {
      matches.push(match)
      if (matches.length >= maxResults) {
        return NextResponse.json({ matches })
      }
    }
  }

  return NextResponse.json({ matches })
}
