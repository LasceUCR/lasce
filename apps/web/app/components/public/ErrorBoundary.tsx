'use client'

import { Component, type ReactNode } from 'react'

export interface ErrorBoundaryProps {
  /** Rendered instead of `children` once a descendant throws during render. */
  fallback: ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches a render-time error from its subtree and shows `fallback` instead, so one
 * broken widget (a third-party map, a chart) cannot take the rest of the page down
 * with it. Only a class component can implement `getDerivedStateFromError`; there is
 * no hook equivalent, which is why this is not written as a function component like
 * the rest of this codebase.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
