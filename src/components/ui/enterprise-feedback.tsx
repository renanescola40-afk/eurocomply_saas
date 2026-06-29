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
    <div className={cn("enterprise-empty-state rounded-2xl p-6 text-center", className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button type="button" variant="outline" className="mt-5 rounded-full" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

export function EnterpriseEmptyFeedback(props: EnterpriseFeedbackProps) {
  return <EnterpriseFeedbackShell {...props} icon={<Sparkles className="h-5 w-5" />} />
}

export function EnterpriseLoadingFeedback({ title = "Loading workspace", description, className }: Partial<EnterpriseFeedbackProps>) {
  return (
    <div className={cn("enterprise-panel rounded-2xl p-6", className)} aria-live="polite" role="status">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="skeleton-pulse h-20 rounded-2xl bg-white/[0.045]" />
        ))}
      </div>
    </div>
  )
}

export function EnterpriseAlertFeedback(props: EnterpriseFeedbackProps) {
  return <EnterpriseFeedbackShell {...props} className={cn("status-danger", props.className)} icon={<AlertTriangle className="h-5 w-5" />} />
}
