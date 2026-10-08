import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils/general-utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-linear-to-b from-primary to-primary/90 text-primary-foreground hover:brightness-105",
        destructive:
          "bg-linear-to-b from-destructive to-destructive/90 text-destructive-foreground hover:brightness-105",
        outline:
          "border-2 border-primary bg-transparent text-primary-strong hover:bg-primary/5 shadow-xs",
        secondary:
          "bg-linear-to-b from-secondary to-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-secondary/30 hover:brightness-105",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary-strong underline-offset-4 hover:underline",
        /** Frosted, for glass pages: secondary actions over a photo backdrop. */
        glass:
          "rounded-full border border-glass-border bg-glass-strong text-foreground hover:bg-glass-inset hover:brightness-125",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
