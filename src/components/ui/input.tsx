import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 md:h-11 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-2 text-base shadow-sm transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-gray-400 hover:border-gray-300 focus-visible:border-pink-400 focus-visible:ring-4 focus-visible:ring-pink-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 aria-invalid:border-rose-400 aria-invalid:ring-4 aria-invalid:ring-rose-100 md:text-[15px]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
