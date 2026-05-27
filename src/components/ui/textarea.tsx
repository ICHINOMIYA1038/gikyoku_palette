import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm transition-all outline-none placeholder:text-gray-400 hover:border-gray-300 focus-visible:border-pink-400 focus-visible:ring-4 focus-visible:ring-pink-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 aria-invalid:border-rose-400 aria-invalid:ring-4 aria-invalid:ring-rose-100 md:text-[15px]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
