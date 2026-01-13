'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import ReactMarkdown from 'react-markdown'

export function CanvasFocusOverlay() {
  const focusModeNodeId = useStore((s) => s.ui.focusModeNodeId)
  const setFocusModeNodeId = useStore((s) => s.setFocusModeNodeId)
  const nodes = useStore((s) => s.nodes)

  const node = focusModeNodeId ? nodes.get(focusModeNodeId) : null

  useEffect(() => {
    if (!focusModeNodeId) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocusModeNodeId(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [focusModeNodeId, setFocusModeNodeId])

  const handleClose = () => {
    setFocusModeNodeId(null)
  }

  if (!node) return null

  return (
    <AnimatePresence>
      {focusModeNodeId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex flex-col h-full bg-gray-50 dark:bg-gray-900"
        >
          <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mode focus
            </h2>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Fermer (Escape)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-4xl mx-auto space-y-6 pb-12">
              {node.prompt && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Prompt
                  </h3>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap text-sm leading-relaxed">
                      {node.prompt}
                    </p>
                  </div>
                </div>
              )}

              {node.response && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Réponse
                  </h3>
                  <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="prose prose-base dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          code({ children, ...props }) {
                            return (
                              <code
                                className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm text-gray-900 dark:text-gray-100"
                                {...props}
                              >
                                {children}
                              </code>
                            )
                          },
                          pre({ children }) {
                            return <div className="my-4">{children}</div>
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
                        {node.response}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {!node.response && !node.prompt && (
                <div className="flex items-center justify-center py-12">
                  <p className="text-gray-400 dark:text-gray-600 italic">
                    Aucun contenu à afficher
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
