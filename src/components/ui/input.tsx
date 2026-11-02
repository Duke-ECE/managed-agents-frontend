import * as React from "react"
import { cn } from "@/utils/format"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-ink-700 bg-ink-850 px-3 text-[13px] text-ink-100 placeholder:text-ink-500 transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
