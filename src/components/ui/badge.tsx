import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
 * AIOS badge — pill (radius 999px). Soft variants follow the design system:
 *   primary  → #EEEDFE bg / #4F46E5 text
 *   neutral  → #F3F4F6 bg / #111827 text
 *   success  → soft WhatsApp green
 *   info     → soft blue
 *   danger   → soft red
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-primary-soft text-primary-soft-foreground',
        neutral: 'bg-muted text-foreground',
        outline: 'border border-border bg-surface text-muted-foreground',
        success: 'bg-success-soft text-success/90',
        info: 'bg-info-soft text-info/90',
        danger: 'bg-destructive-soft text-destructive/90',
        warning: 'bg-warning-soft text-[#92400E]',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px] leading-4',
        md: 'px-2.5 py-0.5 text-[11px] leading-5',
        lg: 'px-3 py-1 text-[12px] leading-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { badgeVariants };
