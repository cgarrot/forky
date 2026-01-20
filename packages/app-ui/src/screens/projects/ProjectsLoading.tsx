import { ProjectLayout, Skeleton } from '@forky/ui'

export function ProjectsLoading() {
  return (
    <ProjectLayout
      header={
        <div className="flex h-full items-center justify-between px-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      }
    >
      <div className="p-6 space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </ProjectLayout>
  )
}
