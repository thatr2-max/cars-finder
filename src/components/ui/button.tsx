/**
 * =============================================================================
 * BUTTON COMPONENT - CAR FINDER PWA
 * =============================================================================
 * 
 * Enhanced button component with variants optimized for the dark theme.
 * Includes glow effects, proper contrast, and smooth transitions.
 * =============================================================================
 */

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button variants using class-variance-authority
 * Each variant is designed for specific use cases in the dark theme
 */
const buttonVariants = cva(
  // Base styles applied to all buttons
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /**
         * DEFAULT/PRIMARY - Main CTA button
         * Uses the electric blue primary color with glow effect
         */
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow hover:shadow-glow-lg active:scale-[0.98]",
        
        /**
         * DESTRUCTIVE - Danger actions like delete
         * Red color scheme for warning actions
         */
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
        
        /**
         * OUTLINE - Secondary importance buttons
         * Transparent with border, suitable for dark backgrounds
         */
        outline:
          "border border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:border-primary active:scale-[0.98]",
        
        /**
         * SECONDARY - Alternative actions
         * Muted background with good contrast
         */
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50 active:scale-[0.98]",
        
        /**
         * GHOST - Minimal visual weight
         * Transparent until hovered
         */
        ghost: 
          "hover:bg-accent/50 hover:text-accent-foreground active:scale-[0.98]",
        
        /**
         * LINK - Text-style button
         * Looks like a link, no background
         */
        link: 
          "text-primary underline-offset-4 hover:underline",
        
        /**
         * HERO - Large prominent CTA
         * For the main "Set Car Location" button
         * Maximum glow and visual impact
         */
        hero:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon hover:shadow-glow-lg active:scale-[0.98] font-semibold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-16 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

/**
 * Button Component
 * 
 * A versatile button with multiple variants optimized for the dark theme.
 * Supports all standard button props plus variant styling.
 * 
 * @param variant - Visual style (default, destructive, outline, secondary, ghost, link, hero)
 * @param size - Button size (default, sm, lg, xl, icon)
 * @param asChild - If true, renders as child element instead of button
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
