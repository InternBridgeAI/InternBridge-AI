import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-primary/10 text-primary hover:bg-primary/20',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                destructive: 'bg-destructive/10 text-destructive',
                outline: 'border border-border text-foreground hover:bg-accent hover:text-accent-foreground',
            },
        },
        defaultVariants: { variant: 'default' },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
