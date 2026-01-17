import React, { useState, useEffect, useRef } from 'react';

import {
    Users,
    Bot,
    Image as ImageIcon,
    ChevronRight,
    Check,
    Sparkles,
    Upload
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
                { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B' },
                { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
                { id: 'moonshotai/kimi-k2-instruct-0905', label: 'Kimi K2' },
                { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B' },
                { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B' },
            ]
        },
        {
            id: 'image',
            title: 'Create Images',
            description: 'Generate AI images in the chat',
            icon: <ImageIcon className="w-5 h-5" />,
            color: 'text-purple-500', // Purple for Creative
            subItems: [] // No sub-items for now, just opens prompt
        },
        {
            id: 'file',
            title: 'Upload File',
            description: 'Analyze PDF, DOCX, PPTX, or images',
            icon: <Upload className="w-5 h-5" />,
            color: 'text-cyan-500',
            subItems: [] // File picker will be triggered
        }
    ];

    return (
        <div
            ref={menuRef}
            className="absolute bottom-full left-0 mb-4 z-50 w-[320px] max-w-[90vw] max-h-[350px] overflow-y-auto bg-background border-3 border-foreground brutal-shadow animate-in slide-in-from-bottom-2 duration-200"
        >
            {/* Header */}
            <div className="px-4 py-3 border-b-3 border-foreground bg-primary flex items-center gap-2 sticky top-0 z-10">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
                <span className="text-xs font-display font-bold tracking-widest uppercase text-primary-foreground text-spread text-glitch">
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
                                "w-full flex items-start gap-4 p-3 transition-all duration-100 text-left border-b-2 border-foreground/20 last:border-b-0",
                                "hover:bg-accent hover:border-foreground",
                                activeTool === tool.id ? "bg-accent border-b-2 border-foreground" : "bg-transparent"
                            )}
                        >
                            <div className={cn(
                                "p-2 bg-background border-2 border-foreground shrink-0 transition-colors brutal-shadow-sm",
                                tool.color
                            )}>
                                {tool.icon}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-foreground font-sans uppercase tracking-wide">
                                        {tool.title}
                                    </span>
                                    {tool.subItems.length > 0 && (
                                        <ChevronRight className={cn(
                                            "w-4 h-4 text-muted-foreground transition-transform duration-200",
                                            activeTool === tool.id ? "rotate-90" : ""
                                        )} />
                                    )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 font-mono leading-tight uppercase">
                                    {tool.description}
                                </p>
                            </div>
                        </button>

                        {/* Sub-menu */}
                        {activeTool === tool.id && tool.subItems.length > 0 && (
                            <div className="ml-[52px] mt-1 mb-2 space-y-0.5 border-l-3 border-foreground pl-3 animate-in slide-in-from-left-2 duration-150 fade-in">
                                {tool.subItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            onModeChange(tool.id, item.id);
                                            onClose();
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-muted-foreground hover:text-primary-foreground hover:bg-primary transition-colors text-left font-mono uppercase tracking-wide border-2 border-transparent hover:border-foreground brutal-shadow-hover"
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
