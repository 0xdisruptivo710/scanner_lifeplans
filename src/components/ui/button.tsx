import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
 * AIOS button — pill-shaped by default, with the soft-purple "tag" variant
 * lifted straight from the Aios CRM design system.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/92 active:bg-primary/88 shadow-[0_1px_0_rgb(255_255_255/0.12)_inset]',
        outline:
          'border border-border bg-surface text-foreground hover:bg-muted/70 hover:border-border-strong',
        ghost:
          'bg-transparent text-foreground hover:bg-muted/70 active:bg-muted',
        soft:
          'bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/80',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        secondary:
          'bg-muted text-foreground hover:bg-muted/70',
      },
      size: {
        default: 'h-9 px-5',
        sm: 'h-8 px-4 text-[13px]',
        lg: 'h-10 px-6',
        icon: 'h-8 w-8 rounded-md p-0',
        'icon-lg': 'h-10 w-10 rounded-md p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
