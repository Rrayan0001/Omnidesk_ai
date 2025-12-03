import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { CodeBlockCode } from '@/components/ui/code-block';
import { useTheme } from "@/contexts/ThemeContext";

export default function Stage3({ finalResponse, isLoading }) {
  const { theme } = useTheme();
  // DEBUG: Check what we're receiving
  console.log('Stage3 received finalResponse:', finalResponse, 'type:', typeof finalResponse);

  // Extract string from finalResponse (might be object or string)
  let responseText = '';
  if (typeof finalResponse === 'string') {
    responseText = finalResponse;
  } else if (finalResponse && typeof finalResponse === 'object') {
    // Handle object format - extract content or response field
    responseText = finalResponse.content || finalResponse.response || finalResponse.text || JSON.stringify(finalResponse);
  }

  console.log('Stage3 rendering:', typeof responseText, responseText.substring(0, 100));

  if (isLoading && !responseText) {
    return (
      <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-sans font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 opacity-80">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
            Verdict
          </h3>
        </div>
        <div className="bg-card border border-border/40 rounded-xl p-6 shadow-sm">
          <TextShimmer className="text-sm font-sans">
            The Chairman is synthesizing the final verdict...
          </TextShimmer>
        </div>
      </div>
    );
  }

  if (!responseText) return null;

  return (
    <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-sans font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 opacity-80">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
          Verdict
        </h3>
      </div>

      <div className="relative bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-border/40 pb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-lg">
              👑
            </div>
            <div>
              <div className="text-xs font-bold text-foreground uppercase tracking-widest font-sans opacity-90">
                Chairman's Decision
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5 opacity-70">
                Synthesized Verdict
              </div>
            </div>
          </div>

          <div className="markdown-content text-[15px] leading-relaxed text-foreground font-sans break-words overflow-wrap-anywhere overflow-x-hidden" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : 'text';

                  if (inline) {
                    return (
                      <code className={cn("bg-secondary/50 px-1.5 py-0.5 rounded text-sm font-mono text-primary", className)} {...props}>
                        {children}
                      </code>
                    );
                  }

                  return (
                    <div className="not-prose my-4 rounded-xl overflow-hidden border border-border/40 bg-card">
                      <CodeBlockCode
                        code={String(children).replace(/\n$/, '')}
                        language={language}
                        theme={theme === 'dark' ? 'github-dark' : 'github-light'}
                      />
                    </div>
                  );
                },
                table({ children }) {
                  return (
                    <div className="my-6 w-full overflow-x-auto rounded-lg border border-border/40">
                      <table className="w-full text-sm text-left">
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ children }) {
                  return (
                    <thead className="bg-secondary/30 text-xs uppercase font-semibold text-muted-foreground border-b border-border/40">
                      {children}
                    </thead>
                  );
                },
                tbody({ children }) {
                  return <tbody className="divide-y divide-border/40">{children}</tbody>;
                },
                tr({ children }) {
                  return <tr className="hover:bg-secondary/10 transition-colors">{children}</tr>;
                },
                th({ children }) {
                  return <th className="px-4 py-3 whitespace-nowrap">{children}</th>;
                },
                td({ children }) {
                  return <td className="px-4 py-3 align-top">{children}</td>;
                },
                h1({ children }) {
                  return <h1 className="text-2xl font-bold mt-8 mb-4 first:mt-0">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="text-xl font-bold mt-6 mb-3">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-lg font-semibold mt-5 mb-2">{children}</h3>;
                },
                ul({ children }) {
                  return <ul className="list-disc list-outside ml-5 my-4 space-y-1">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal list-outside ml-5 my-4 space-y-1">{children}</ol>;
                },
                li({ children }) {
                  return <li className="pl-1">{children}</li>;
                },
                p({ children }) {
                  return <p className="my-3 last:mb-0">{children}</p>;
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-primary/30 pl-4 py-1 my-4 bg-secondary/20 rounded-r italic">
                      {children}
                    </blockquote>
                  );
                }
              }}
            >
              {responseText}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
