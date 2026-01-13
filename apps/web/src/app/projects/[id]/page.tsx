import { ProjectWorkspace } from './project-workspace'

export const dynamic = 'force-dynamic'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProjectWorkspace projectId={id} />
}
