import React, { useState, useEffect, useRef } from 'react';

import {
    Users,
    Bot,
    Image as ImageIcon,
    ChevronRight,
    Check,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ToolsMenu({
    isOpen,
    onClose,
    currentMode = 'council', // 'council', 'chat', 'image'
    onModeChange,
    triggerRef
}) {
    const [activeTool, setActiveTool] = useState(null);
    const menuRef = useRef(null);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // If menu is open, and click is NOT inside menu, and click is NOT inside trigger button
            if (isOpen &&
                menuRef.current &&
                !menuRef.current.contains(event.target) &&
                (!triggerRef?.current || !triggerRef.current.contains(event.target))) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen) return null;

    const tools = [
        {
            id: 'council',
            title: 'LLM Council',
            description: 'Switch between different AI rooms',
            icon: <Users className="w-5 h-5" />,
            color: 'text-primary', // Professional monochrome
            subItems: [
                { id: 'decision', label: 'Decision Room' },
                { id: 'code', label: 'Code Room' },
                { id: 'study', label: 'Study Room' },
                { id: 'creative', label: 'Creative Room' },
                { id: 'general', label: 'General Room' },
            ]
        },
        {
            id: 'chat',
            title: 'Normal Chat',
            description: 'Chat using different AI models',
            icon: <Bot className="w-5 h-5" />,
            color: 'text-primary', // Professional monochrome
            subItems: [
                { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
                { id: 'qwen/qwen3-coder-480b-a35b:free', label: 'Qwen3 Coder 480B' },
                { id: 'moonshotai/kimi-k2-0711:free', label: 'Kimi K2' },
                { id: 'openai/gpt-oss-20b:free', label: 'GPT OSS 20B' },
                { id: 'openai/gpt-oss-120b:free', label: 'GPT OSS 120B' },
                { id: 'qwen/qwen-2.5-72b-instruct:free', label: 'Qwen 2.5 72B' },
            ]
        },
        {
            id: 'image',
            title: 'Create Images',
            description: 'Generate AI images in the chat',
            icon: <ImageIcon className="w-5 h-5" />,
            color: 'text-purple-500', // Purple for Creative
            subItems: [] // No sub-items for now, just opens prompt
        }
    ];

    return (
        <div
            ref={menuRef}
            className="absolute bottom-full left-0 mb-2 z-50 w-[320px] max-w-[90vw] max-h-[350px] overflow-y-auto bg-background/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2 duration-200"
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/40 bg-secondary/20 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-sans font-medium tracking-widest uppercase text-muted-foreground">
                    AI Tools
                </span>
            </div>

            {/* Tools List */}
            <div className="p-2 space-y-1">
                {tools.map((tool) => (
                    <div key={tool.id} className="relative group">
                        <button
                            onClick={() => {
                                if (tool.subItems.length > 0) {
                                    setActiveTool(activeTool === tool.id ? null : tool.id);
                                } else {
                                    onModeChange(tool.id);
                                    onClose();
                                }
                            }}
                            className={cn(
                                "w-full flex items-start gap-4 p-3 rounded-xl transition-all duration-200 text-left",
                                "hover:bg-secondary/60 hover:shadow-sm",
                                activeTool === tool.id ? "bg-secondary/80" : "bg-transparent"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-lg bg-background/50 border border-border/40 shadow-sm shrink-0 transition-colors group-hover:border-primary/20",
                                tool.color
                            )}>
                                {tool.icon}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-foreground font-sans">
                                        {tool.title}
                                    </span>
                                    {tool.subItems.length > 0 && (
                                        <ChevronRight className={cn(
                                            "w-4 h-4 text-muted-foreground transition-transform duration-200",
                                            activeTool === tool.id ? "rotate-90" : ""
                                        )} />
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 font-sans leading-tight">
                                    {tool.description}
                                </p>
                            </div>
                        </button>

                        {/* Sub-menu */}
                        {activeTool === tool.id && tool.subItems.length > 0 && (
                            <div className="ml-[52px] mt-1 mb-2 space-y-0.5 border-l-2 border-border/40 pl-2 animate-in slide-in-from-left-2 duration-150 fade-in">
                                {tool.subItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            onModeChange(tool.id, item.id);
                                            onClose();
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors text-left font-sans"
                                    >
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
