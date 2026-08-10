import { cn } from '@/lib/utils';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import AnimatedMarkdown from '@/components/ui/animated-markdown';
import { CodeBlockCode } from '@/components/ui/code-block';
import { useTheme } from "@/contexts/ThemeContext";

export default function Stage3({ finalResponse, isLoading, isNew = false }) {
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
          <TextGenerateEffect
            words="The Chairman is synthesizing the final verdict..."
            className="text-sm font-sans"
            textClassName="text-muted-foreground text-sm font-medium"
            duration={0.5}
          />
        </div>
      </div>
    );
  }

  if (!responseText) return null;

  return (
    <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-sans font-bold text-muted-foreground flex items-center gap-2 opacity-80">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
          Verdict
        </h3>
      </div>

      <div className="relative bg-card border-2 border-foreground brutal-shadow-sm p-6">
        <div>
          <div className="flex items-center gap-3 mb-6 border-b-2 border-foreground pb-4 bg-secondary/30 p-2 brutal-border">
            <div className="w-10 h-10 bg-primary/20 text-primary border-2 border-foreground flex items-center justify-center text-xl">
              👑
            </div>
            <div>
              <div className="text-sm font-black text-foreground uppercase tracking-widest font-display">
                Chairman's Decision
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5 uppercase tracking-wide">
                Synthesized Verdict
              </div>
            </div>
          </div>

          <AnimatedMarkdown
            content={responseText}
            animate={isNew}
            wordDelay={16}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : 'text';
                if (inline) {
                  return (
                    <code className={cn("bg-secondary px-1.5 py-0.5 border border-foreground text-sm font-mono text-primary font-bold", className)} {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <div className="not-prose my-6 border-2 border-foreground brutal-shadow-sm bg-card">
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
                  <div className="my-6 w-full border-2 border-foreground brutal-shadow-sm">
                    <table className="w-full text-sm text-left table-auto break-words">{children}</table>
                  </div>
                );
              },
              thead({ children }) {
                return <thead className="bg-secondary text-xs uppercase font-bold text-foreground border-b-2 border-foreground">{children}</thead>;
              },
              tbody({ children }) {
                return <tbody className="divide-y-2 divide-foreground/20">{children}</tbody>;
              },
              tr({ children }) {
                return <tr className="hover:bg-secondary/50 transition-colors">{children}</tr>;
              },
              th({ children }) {
                return <th className="px-4 py-3 align-top border-r-2 border-foreground last:border-r-0 break-words">{children}</th>;
              },
              td({ children }) {
                return <td className="px-4 py-3 align-top border-r-2 border-foreground/20 last:border-r-0 break-words">{children}</td>;
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
