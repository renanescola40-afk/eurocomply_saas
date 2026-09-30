"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EnterpriseFeedbackProps = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

function EnterpriseFeedbackShell({
  title,
  description,
  actionLabel,
  onAction,
  className,
  icon,
}: EnterpriseFeedbackProps & { icon: React.ReactNode }) {
  return (
    <div className={cn("enterprise-empty-state rounded-xl border border-slate-800 bg-[#0b121e] p-6 text-center", className)}>
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#0d1624] text-blue-300">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-100">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button type="button" className="mt-5 h-10 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

export function EnterpriseEmptyFeedback(props: EnterpriseFeedbackProps) {
  return <EnterpriseFeedbackShell {...props} icon={<Sparkles className="h-4 w-4" aria-hidden="true" />} />
}

export function EnterpriseLoadingFeedback({ title = "Loading workspace", description, className }: Partial<EnterpriseFeedbackProps>) {
  return (
    <div className={cn("enterprise-panel rounded-xl border border-slate-800 bg-[#0b121e] p-6", className)} aria-live="polite" role="status">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-4 w-4 animate-spin text-blue-400" aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-100">{title}</p>
      </div>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="skeleton-pulse h-20 rounded-xl border border-slate-800 bg-[#0d1624]" />
        ))}
      </div>
    </div>
  )
}

export function EnterpriseAlertFeedback(props: EnterpriseFeedbackProps) {
  return <EnterpriseFeedbackShell {...props} className={cn("border-rose-500/25 bg-rose-500/[0.08]", props.className)} icon={<AlertTriangle className="h-4 w-4 text-rose-200" aria-hidden="true" />} />
}
