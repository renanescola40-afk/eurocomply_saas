"use client"

import * as React from "react"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

type DivProps = React.HTMLAttributes<HTMLDivElement> & {
  inset?: boolean
  asChild?: boolean
  checked?: boolean
  sideOffset?: number
  align?: "start" | "center" | "end"
}

const DropdownMenu = ({ className, ...props }: DivProps) => (
  <div className={cn("relative inline-block text-left", className)} {...props} />
)
DropdownMenu.displayName = "DropdownMenu"

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ asChild, children, className, type = "button", ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        ...props,
        ref,
        className: cn((children.props as { className?: string }).className, className),
      })
    }

    return (
      <button ref={ref} type={type} className={className} {...props}>
        {children}
      </button>
    )
  },
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuGroup = ({ className, ...props }: DivProps) => <div className={cn("py-1", className)} {...props} />
DropdownMenuGroup.displayName = "DropdownMenuGroup"

const DropdownMenuPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>
DropdownMenuPortal.displayName = "DropdownMenuPortal"

const DropdownMenuSub = ({ className, ...props }: DivProps) => <div className={cn("relative", className)} {...props} />
DropdownMenuSub.displayName = "DropdownMenuSub"

const DropdownMenuRadioGroup = ({ className, ...props }: DivProps) => <div role="radiogroup" className={className} {...props} />
DropdownMenuRadioGroup.displayName = "DropdownMenuRadioGroup"

const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, DivProps>(({ className, inset, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </div>
))
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger"

const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, DivProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
      className,
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName = "DropdownMenuSubContent"

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DivProps>(({ className, sideOffset: _sideOffset = 4, align = "center", ...props }, ref) => (
  <div
    ref={ref}
    data-align={align}
    className={cn(
      "absolute right-0 z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
      align === "start" && "left-0 right-auto",
      align === "center" && "left-1/2 right-auto -translate-x-1/2",
      className,
    )}
    {...props}
  />
))
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DivProps>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    role="menuitem"
    tabIndex={0}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, DivProps>(({ className, children, checked, ...props }, ref) => (
  <div
    ref={ref}
    role="menuitemcheckbox"
    aria-checked={checked}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      {checked ? <Check className="h-4 w-4" /> : null}
    </span>
    {children}
  </div>
))
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, DivProps>(({ className, children, checked, ...props }, ref) => (
  <div
    ref={ref}
    role="menuitemradio"
    aria-checked={checked}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      {checked ? <Circle className="h-2 w-2 fill-current" /> : null}
    </span>
    {children}
  </div>
))
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem"

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DivProps>(({ className, inset, ...props }, ref) => (
  <div ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...props} />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, DivProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
