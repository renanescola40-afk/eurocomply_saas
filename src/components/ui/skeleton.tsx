import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl border border-border/60 bg-muted/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
