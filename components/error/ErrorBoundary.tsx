'use client'

import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
                  Something went wrong
                </h2>
              </div>
              <p className="text-sm text-red-800 dark:text-red-300">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <Button
                onClick={this.resetError}
                className="w-full gap-2"
                variant="default"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <p className="text-xs text-red-700 dark:text-red-400">
                If the problem persists, please try refreshing the page.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
