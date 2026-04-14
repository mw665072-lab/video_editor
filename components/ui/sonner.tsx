'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          '--normal-bg': '#0f172a',
          '--normal-text': '#e2e8f0',
          '--normal-border': '#1e293b',
          '--success-bg': '#0f172a',
          '--success-text': '#34d399',
          '--success-border': '#1e293b',
          '--error-bg': '#0f172a',
          '--error-text': '#f87171',
          '--error-border': '#1e293b',
          '--info-bg': '#0f172a',
          '--info-text': '#818cf8',
          '--info-border': '#1e293b',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
