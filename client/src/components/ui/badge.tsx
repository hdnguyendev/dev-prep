import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        warning: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
        error: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
        success: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20",
        secondary: "bg-secondary text-secondary-foreground",
        primary: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        info: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
        muted: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/20",
        light: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/20",
        dark: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }


