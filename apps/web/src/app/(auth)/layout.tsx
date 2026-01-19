import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Auth - forky",
  description: "Sign in to your forky space",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
