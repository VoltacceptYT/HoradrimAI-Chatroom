import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-gray-700 to-gray-800 text-gray-200 hover:from-red-600 hover:to-red-700 hover:text-white border border-gray-600 hover:border-red-500",
        destructive:
          "bg-gradient-to-b from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 border border-red-500 hover:border-red-400",
        outline:
          "border border-gray-600 bg-gradient-to-b from-gray-700 to-gray-800 text-gray-200 hover:from-gray-600 hover:to-gray-700 hover:border-gray-500",
        secondary: "bg-gradient-to-b from-gray-600 to-gray-700 text-gray-200 hover:from-gray-500 hover:to-gray-600",
        ghost: "text-gray-200 hover:bg-gray-800 hover:text-white",
        link: "text-red-400 underline-offset-4 hover:underline hover:text-red-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
