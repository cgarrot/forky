import type { StoredProject } from '../types'

type UnknownRecord = Record<string, unknown>

export function validateProject(project: unknown): project is UnknownRecord {
  if (!project || typeof project !== 'object') return false

  const requiredFields = ['id', 'name', 'nodes', 'edges', 'createdAt', 'updatedAt']
  for (const field of requiredFields) {
    if (!(field in project)) return false
  }

  const candidate = project as UnknownRecord
  return Array.isArray(candidate.nodes) && Array.isArray(candidate.edges)
}

export function sanitizeProject(project: StoredProject): StoredProject {
  return JSON.parse(JSON.stringify(project))
}

export function exportProjectAsJSON(project: StoredProject): string {
  return JSON.stringify(project, null, 2)
}

export function exportProjectAsMarkdown(project: StoredProject): string {
  const { name, systemPrompt, nodes, edges, createdAt } = project

  const date = new Date(createdAt).toLocaleDateString()
  
  let md = `# ${name}\n\n`
  md += `**Date:** ${date}\n`
  
  if (systemPrompt && systemPrompt.trim()) {
    md += `\n## System Prompt\n\n${systemPrompt}\n`
  }

  if (nodes && nodes.length > 0) {
    md += `\n## Nodes (${nodes.length})\n\n`

    const sortedNodes = [...nodes].sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) > 50) {
        return a.position.y - b.position.y
      }
      return a.position.x - b.position.x
    })

    sortedNodes.forEach((node, index) => {
      md += `### Node ${index + 1}\n`
      
      if (node.prompt) {
        md += `**Prompt:**\n${node.prompt}\n\n`
      }
      
      if (node.response) {
        md += `**Response:**\n${node.response}\n\n`
      }
      
      md += `---\n\n`
    })
  }

  if (edges && edges.length > 0) {
    md += `## Connections\n\n`
    edges.forEach((edge: StoredProject['edges'][number]) => {
      const sourceIndex = nodes.findIndex((n: StoredProject['nodes'][number]) => n.id === edge.source)
      const targetIndex = nodes.findIndex((n: StoredProject['nodes'][number]) => n.id === edge.target)
      
      const sourceName = sourceIndex >= 0 ? `Node ${sourceIndex + 1}` : edge.source
      const targetName = targetIndex >= 0 ? `Node ${targetIndex + 1}` : edge.target
      
      md += `- ${sourceName} → ${targetName}\n`
    })
  }
  
  return md
}
