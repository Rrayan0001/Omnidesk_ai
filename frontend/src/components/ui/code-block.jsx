"use client"

import { cn } from "@/lib/utils"
import React, { useEffect, useState } from "react"
import { codeToHtml } from "shiki"

function CodeBlock({ children, className, ...props }) {
    return (
        <div
            className={cn(
                "not-prose flex w-full flex-col overflow-clip border",
                "border-border bg-card text-card-foreground rounded-xl",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

function CodeBlockCode({
    code,
    language = "tsx",
    theme = "github-dark", // Default to dark theme for better contrast
    className,
    ...props
}) {
    const [highlightedHtml, setHighlightedHtml] = useState(null)
    const [isCopied, setIsCopied] = useState(false)

    useEffect(() => {
        async function highlight() {
            if (!code) {
                setHighlightedHtml("<pre><code></code></pre>")
                return
            }

            try {
                const html = await codeToHtml(code, { lang: language, theme })
                setHighlightedHtml(html)
            } catch (error) {
                console.error("Failed to highlight code:", error)
                // Fallback to plain text if highlighting fails
                setHighlightedHtml(`<pre><code>${code}</code></pre>`)
            }
        }
        highlight()
    }, [code, language, theme])

    const copyToClipboard = async () => {
        if (!code) return
        try {
            await navigator.clipboard.writeText(code)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch (err) {
            console.error("Failed to copy code:", err)
        }
    }

    const classNames = cn(
        "w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-4 [&>pre]:bg-transparent [&>pre]:m-0",
        className
    )

    return (
        <div className="relative group">
            {/* Header with Language and Copy Button */}
            <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 border-b border-border/40">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-sans">
                    {language}
                </span>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy code"
                >
                    {isCopied ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                            <span className="text-green-500">Copied!</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code Content */}
            {highlightedHtml ? (
                <div
                    className={classNames}
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                    {...props}
                />
            ) : (
                <div className={classNames} {...props}>
                    <pre>
                        <code>{code}</code>
                    </pre>
                </div>
            )}
        </div>
    )
}

function CodeBlockGroup({
    children,
    className,
    ...props
}) {
    return (
        <div
            className={cn("flex items-center justify-between", className)}
            {...props}
        >
            {children}
        </div>
    )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
