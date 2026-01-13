import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import type { StoredProject } from '@/features/projects/types'

type ProjectStoreFile = {
  projects: StoredProject[]
}

function resolveAppRootDir(): string {
  const cwd = process.cwd()
  const appDirCandidate = path.join(cwd, 'apps', 'web')

  if (fs.existsSync(path.join(appDirCandidate, 'src', 'app'))) {
    return appDirCandidate
  }

  return cwd
}

function getProjectsFilePath(): string {
  const appRoot = resolveAppRootDir()
  return path.join(appRoot, 'data', 'projects.json')
}

async function ensureDataDirExists(): Promise<void> {
  const filePath = getProjectsFilePath()
  await fsp.mkdir(path.dirname(filePath), { recursive: true })
}

export async function readAllProjects(): Promise<StoredProject[]> {
  const filePath = getProjectsFilePath()

  try {
    const raw = await fsp.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as ProjectStoreFile
    return Array.isArray(parsed.projects) ? parsed.projects : []
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const code = (error as Error & { code?: string }).code
      if (code === 'ENOENT') {
        return []
      }
    }

    throw error
  }
}

export async function writeAllProjects(projects: StoredProject[]): Promise<void> {
  await ensureDataDirExists()

  const filePath = getProjectsFilePath()
  const payload: ProjectStoreFile = { projects }
  await fsp.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

export async function getProjectById(id: string): Promise<StoredProject | null> {
  const projects = await readAllProjects()
  return projects.find((p) => p.id === id) ?? null
}

export async function upsertProject(project: StoredProject): Promise<StoredProject> {
  const projects = await readAllProjects()
  const index = projects.findIndex((p) => p.id === project.id)
  const next = index >= 0 ? projects.map((p) => (p.id === project.id ? project : p)) : [...projects, project]

  await writeAllProjects(next)
  return project
}

export async function deleteProjectById(id: string): Promise<boolean> {
  const projects = await readAllProjects()
  const next = projects.filter((p) => p.id !== id)

  if (next.length === projects.length) {
    return false
  }

  await writeAllProjects(next)
  return true
}
