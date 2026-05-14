import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[140px] w-full rounded-md border border-border bg-surface px-3.5 py-3 text-[13.5px] leading-relaxed text-foreground shadow-[0_1px_0_rgb(17_24_39/0.02)] outline-none transition-colors placeholder:text-subtle-foreground focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
