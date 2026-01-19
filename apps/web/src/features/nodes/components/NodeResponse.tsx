'use client'

import ReactMarkdown from 'react-markdown'
import { Loader2, AlertTriangle } from 'lucide-react'

interface NodeResponseProps {
  content: string
  isLoading?: boolean
  error?: string
  summary?: string
}

const CHAR_LIMIT = 200

export function NodeResponse({ content, isLoading, error, summary }: NodeResponseProps) {
  const displayContent = summary && summary.trim() ? summary : (content.length > CHAR_LIMIT ? content.slice(0, CHAR_LIMIT) + '...' : content)
  return (
    <div className="p-4 min-h-[100px]">
      {error ? (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-100">
              {"An error occurred"}
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              {error}
            </p>
          </div>
        </div>
      ) : content ? (
        <>
          {isLoading && (
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Generating...
              </p>
            </div>
          )}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code({ children, ...props }) {
                  return (
                    <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm text-gray-900 dark:text-gray-100" {...props}>
                      {children}
                    </code>
                  )
                },
                pre({ children }) {
                  return <div className="my-2">{children}</div>
                },
                h1({ children }) {
                  return (
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 mt-6">
                      {children}
                    </h1>
                  )
                },
                h2({ children }) {
                  return (
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-5">
                      {children}
                    </h2>
                  )
                },
                h3({ children }) {
                  return (
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 mt-4">
                      {children}
                    </h3>
                  )
                },
                p({ children }) {
                  return (
                    <p className="text-gray-900 dark:text-gray-100 leading-relaxed mb-4">
                      {children}
                    </p>
                  )
                },
                ul({ children }) {
                  return <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
                },
                ol({ children }) {
                  return <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
                },
                li({ children }) {
                  return <li className="text-gray-900 dark:text-gray-100">{children}</li>
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-700 dark:text-gray-300">
                      {children}
                    </blockquote>
                  )
                },
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        </>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[100px] space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generating...
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full min-h-[100px]">
          <p className="text-sm text-gray-400 dark:text-gray-600 italic">
            The response will appear here...
          </p>
        </div>
      )}
    </div>
  )
}
