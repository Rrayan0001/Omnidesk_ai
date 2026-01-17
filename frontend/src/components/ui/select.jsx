import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from "@/lib/utils";

export function Select({ value, onValueChange, children }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={selectRef} className="relative">
            {children({ isOpen, setIsOpen, value, onValueChange })}
        </div>
    );
}

export function SelectTrigger({ children, className = '' }) {
    return (
        <button
            type="button"
            className={cn(
                "flex items-center justify-between w-full px-3 py-2 text-sm font-medium bg-background border-2 border-foreground hover:bg-secondary transition-colors brutal-shadow-sm",
                className
            )}
        >
            {children}
            <ChevronDown className="w-4 h-4 ml-2" />
        </button>
    );
}

export function SelectValue({ placeholder }) {
    return <span className="truncate">{placeholder}</span>;
}

export function SelectContent({ children, className = '' }) {
    return (
        <div className={cn(
            "absolute z-50 w-full mt-1 bg-background border-2 border-foreground brutal-shadow overflow-hidden",
            className
        )}>
            {children}
        </div>
    );
}

export function SelectItem({ value, children, onSelect, className = '' }) {
    return (
        <button
            type="button"
            onClick={() => onSelect?.(value)}
            className={cn(
                "flex items-center w-full px-3 py-2 text-sm hover:bg-secondary transition-colors text-left",
                className
            )}
        >
            {children}
        </button>
    );
}
