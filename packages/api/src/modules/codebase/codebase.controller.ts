import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import path from 'path';
import fs from 'fs/promises';
import type { Dirent } from 'fs';
import crypto from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

type SearchRequest = {
  rootPath: string;
  query: string;
  maxResults?: number;
  includeExtensions?: string[];
};

type IndexRequest = {
  rootPath: string;
  includeExtensions?: string[];
  maxFiles?: number;
};

type Match = {
  filePath: string;
  lineNumber: number;
  line: string;
};

type IndexedFile = {
  filePath: string;
  sha256: string;
};

function assertCodebaseEnabled() {
  if (process.env.CODEBASE_ENABLED && process.env.CODEBASE_ENABLED !== 'true') {
    throw new ForbiddenException('Codebase access disabled');
  }
}

function isSubpath(params: { candidate: string; roots: string[] }): boolean {
  const resolvedCandidate = path.resolve(params.candidate);
  return params.roots.some((root) => {
    const resolvedRoot = path.resolve(root);
    const rel = path.relative(resolvedRoot, resolvedCandidate);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  });
}

async function* walkFiles(params: {
  rootPath: string;
  includeExtensions: Set<string>;
  maxFiles: number;
}): AsyncGenerator<string> {
  const queue: string[] = [params.rootPath];
  let emitted = 0;

  while (queue.length) {
    const dir = queue.shift();
    if (!dir) continue;

    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (emitted >= params.maxFiles) return;

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === '.next'
        )
          continue;
        queue.push(full);
        continue;
      }

      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (
        params.includeExtensions.size > 0 &&
        !params.includeExtensions.has(ext)
      )
        continue;

      emitted += 1;
      yield full;
    }
  }
}

async function searchFile(params: {
  filePath: string;
  query: string;
  maxPerFile: number;
}): Promise<Match[]> {
  let content: string;
  try {
    content = await fs.readFile(params.filePath, 'utf8');
  } catch {
    return [];
  }

  const lines = content.split('\n');
  const matches: Match[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    if (!line.toLowerCase().includes(params.query.toLowerCase())) continue;

    matches.push({ filePath: params.filePath, lineNumber: i + 1, line });
    if (matches.length >= params.maxPerFile) break;
  }

  return matches;
}

async function fileHash(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

@Controller('codebase')
@UseGuards(JwtAuthGuard)
export class CodebaseController {
  @Post('search')
  async search(@Body() body: SearchRequest) {
    assertCodebaseEnabled();

    if (!body.rootPath || !body.query) {
      throw new BadRequestException('rootPath and query are required');
    }

    const allowedRoots = (process.env.CODEBASE_ROOTS ?? process.cwd())
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (!isSubpath({ candidate: body.rootPath, roots: allowedRoots })) {
      throw new ForbiddenException('rootPath is not allowed');
    }

    const includeExtensions = new Set(
      (
        body.includeExtensions ?? [
          '.ts',
          '.tsx',
          '.js',
          '.jsx',
          '.md',
          '.py',
          '.go',
          '.rs',
        ]
      ).map((e) => e.toLowerCase()),
    );
    const maxResults =
      typeof body.maxResults === 'number' && body.maxResults > 0
        ? Math.min(body.maxResults, 200)
        : 50;

    const matches: Match[] = [];

    for await (const filePath of walkFiles({
      rootPath: path.resolve(body.rootPath),
      includeExtensions,
      maxFiles: 5000,
    })) {
      const fileMatches = await searchFile({
        filePath,
        query: body.query,
        maxPerFile: 5,
      });
      for (const match of fileMatches) {
        matches.push(match);
        if (matches.length >= maxResults) {
          return { matches };
        }
      }
    }

    return { matches };
  }

  @Post('index')
  async index(@Body() body: IndexRequest) {
    assertCodebaseEnabled();

    if (!body.rootPath) {
      throw new BadRequestException('rootPath is required');
    }

    const allowedRoots = (process.env.CODEBASE_ROOTS ?? process.cwd())
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (!isSubpath({ candidate: body.rootPath, roots: allowedRoots })) {
      throw new ForbiddenException('rootPath is not allowed');
    }

    const includeExtensions = new Set(
      (
        body.includeExtensions ?? [
          '.ts',
          '.tsx',
          '.js',
          '.jsx',
          '.md',
          '.py',
          '.go',
          '.rs',
        ]
      ).map((e) => e.toLowerCase()),
    );
    const maxFiles =
      typeof body.maxFiles === 'number' && body.maxFiles > 0
        ? Math.min(body.maxFiles, 2000)
        : 800;

    const indexed: IndexedFile[] = [];
    const resolvedRoot = path.resolve(body.rootPath);

    for await (const filePath of walkFiles({
      rootPath: resolvedRoot,
      includeExtensions,
      maxFiles,
    })) {
      try {
        const sha256 = await fileHash(filePath);
        indexed.push({ filePath, sha256 });
      } catch {
        // Ignore per-file errors.
      }
    }

    const indexId = crypto
      .createHash('sha256')
      .update(`${resolvedRoot}:${indexed.length}:${Date.now()}`)
      .digest('hex')
      .slice(0, 16);

    const outDir = path.join(process.cwd(), '.forky', 'codebase-indexes');
    await fs.mkdir(outDir, { recursive: true });

    await fs.writeFile(
      path.join(outDir, `${indexId}.json`),
      JSON.stringify(
        {
          rootPath: resolvedRoot,
          indexedAt: new Date().toISOString(),
          files: indexed,
        },
        null,
        2,
      ),
      'utf8',
    );

    return { indexId, rootPath: resolvedRoot, fileCount: indexed.length };
  }
}
