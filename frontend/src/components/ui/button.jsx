import { cn } from "@/lib/utils";

export function Button({
    children,
    className = '',
    variant = 'default',
    onClick,
    disabled = false,
    type = 'button',
    ...props
}) {
    const baseClasses = "inline-flex items-center justify-center px-4 py-2 font-bold text-sm transition-all duration-200 border-2 border-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed brutal-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none";

    const variants = {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "bg-background text-foreground hover:bg-secondary",
        ghost: "bg-transparent border-transparent hover:bg-secondary shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={cn(baseClasses, variants[variant] || variants.default, className)}
            {...props}
        >
            {children}
        </button>
    );
}
