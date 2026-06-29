import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "enterprise-input flex min-h-[116px] w-full rounded-xl border px-3.5 py-3 text-base leading-6 text-foreground outline-none transition-[background,border-color,box-shadow] placeholder:text-muted-foreground md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
