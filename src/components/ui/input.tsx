import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "enterprise-input flex h-11 w-full min-w-0 rounded-xl border px-3.5 py-2 text-base text-foreground outline-none transition-[background,border-color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground md:text-sm aria-invalid:border-[rgba(255,92,122,0.72)] aria-invalid:ring-2 aria-invalid:ring-[rgba(255,92,122,0.22)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
