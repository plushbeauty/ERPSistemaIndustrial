import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'ui-industrial-control inline-flex h-[30px] min-h-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[2px] border px-2.5 text-[10px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
        secondary: 'border-border bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'h-auto min-h-0 border-transparent bg-transparent p-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: '',
        sm: 'h-7 min-h-0 px-2 text-[10px]',
        lg: 'h-9 min-h-0 px-3 text-xs',
        icon: 'h-[30px] w-[30px] min-h-0 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { Button, buttonVariants }
