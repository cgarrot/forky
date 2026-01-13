import { AppLayout, Spinner } from '@forky/ui'

export default function AppGroupLoading() {
  return (
    <AppLayout>
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    </AppLayout>
  )
}
