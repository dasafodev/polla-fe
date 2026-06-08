import { type HTMLAttributes } from 'react'

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-surface rounded-card border border-border shadow-card ${className}`} {...rest} />
}
