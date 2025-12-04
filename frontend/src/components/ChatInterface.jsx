import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, PanelLeft, Trash2, Sparkles, Bot, Users, Cpu, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from "@/contexts/ThemeContext";
// import { ChatInput, ChatInputTextArea, ChatInputSubmit } from '@/components/ui/chat-input';
import RoomDetectionModal from './RoomDetectionModal';
import ToolsMenu from './ToolsMenu';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { CodeBlockCode } from '@/components/ui/code-block';

// Import chat models for display
const CHAT_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B' },
  { id: 'x-ai/grok-4.1-fast:free', name: 'Grok 4.1 Fast' },
  { id: 'moonshotai/kimi-k2-instruct', name: 'Moonshot Kimi K2' },
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B' },
];

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
  toggleSidebar,
  onDeleteConversation,
}) {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [detectedRoom, setDetectedRoom] = useState(null);
  const [pendingMessage, setPendingMessage] = useState('');
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isHoveringSidebarToggle, setIsHoveringSidebarToggle] = useState(false);
  const toolsButtonRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea when input changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const [currentMode, setCurrentMode] = useState('chat'); // Default: 'chat' (was 'council')
  const [currentRoom, setCurrentRoom] = useState('decision');
  const [currentModel, setCurrentModel] = useState('x-ai/grok-4.1-fast:free'); // Default: Grok 4.1 Fast

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const isSubmittingRef = useRef(false);

  const handleSubmit = async () => {
    const content = input.trim();
    if (content && !isLoading && !isSubmittingRef.current) {
      isSubmittingRef.current = true;
      setInput(''); // Clear input immediately to prevent double-submit race conditions

      if (currentMode === 'council') {
        // Detect room first
        try {
          const detection = await api.detectRoom(content);
          setPendingMessage(content);
          setDetectedRoom(detection.detected_room);
        } catch (error) {
          console.error('Room detection failed:', error);
          // Fallback: send without detection
          onSendMessage(content, { mode: 'council', room: currentRoom });
        } finally {
          isSubmittingRef.current = false;
        }
      } else {
        // Chat or Image mode - send directly
        onSendMessage(content, {
          mode: currentMode,
          room: currentRoom,
          model: currentModel
        });
        isSubmittingRef.current = false;
      }
    }
  };

  const handleProceedWithRoom = (room) => {
    if (pendingMessage) {
      onSendMessage(pendingMessage, { mode: 'council', room: room });
      setPendingMessage('');
      setDetectedRoom(null);
    }
  };

  const handleCancelDetection = () => {
    setInput(pendingMessage);
    setPendingMessage('');
    setDetectedRoom(null);
  };

  const hasMessages = conversation && conversation.messages.length > 0;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 h-screen flex flex-col bg-background relative transition-colors duration-300">


      {/* Mode Banner */}
      {detectedRoom && (
        <RoomDetectionModal
          detectedRoom={detectedRoom}
          onProceed={handleProceedWithRoom}
          onCancel={handleCancelDetection}
        />
      )}

      {/* Mobile Header with Sidebar Toggle */}
      <div className="md:hidden flex items-center p-4 border-b border-border/40 bg-background/80 backdrop-blur-sm z-10 absolute top-0 left-0 right-0 h-14">
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
        <div className="ml-2 font-semibold text-sm">OmniDesk AI</div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col pt-14 md:pt-0">

        {/* Messages or Empty State */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {!hasMessages ? (
            <div className="h-full flex flex-col items-center justify-center p-4 -mt-32">
              <div className="w-20 h-20 mb-6 opacity-90">
                <img
                  src={theme === 'dark' ? "/logo.png" : "/logo-light.png"}
                  alt="OmniDesk AI"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8 pb-32">
              {conversation.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                >
                  {msg.role === 'user' ? (
                    <>
                      <div className="max-w-[85%] bg-secondary/80 text-foreground px-5 py-3 rounded-2xl rounded-tr-sm text-[15px] leading-relaxed font-sans shadow-sm">
                        {msg.content}
                      </div>
                    </>
                  ) : (
                    <div className="w-full min-w-0 space-y-6 overflow-x-hidden">
                      {/* Check message mode from metadata */}
                      {
                        msg.metadata?.mode === 'chat' || msg.metadata?.mode === 'image' ? (
                          /* Simple Chat/Image Message Bubble */
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                              {msg.metadata?.mode === 'image' ? <Sparkles className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium font-sans text-foreground">
                                  {msg.metadata?.model || (msg.metadata?.mode === 'image' ? 'Image Generator' : 'Assistant')}
                                </span>
                              </div>

                              {/* Show shimmer if no response content yet */}
                              {!msg.stage3?.response && !msg.content ? (
                                <div className="mt-2">
                                  <TextShimmer
                                    duration={1.2}
                                    className="text-sm font-sans [--base-color:theme(colors.zinc.400)] [--base-gradient-color:theme(colors.zinc.200)] dark:[--base-color:theme(colors.zinc.600)] dark:[--base-gradient-color:theme(colors.zinc.400)]"
                                  >
                                    {currentMode === 'image' ? 'Generating image...' : 'Thinking...'}
                                  </TextShimmer>
                                </div>
                              ) : (
                                <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed break-words overflow-wrap-anywhere overflow-x-hidden" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>
                                  <ReactMarkdown
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
                                      }
                                    }}
                                  >
                                    {msg.stage3?.response || msg.content || ''}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Council Mode UI */
                          <>
                            <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                              <div className="w-6 h-6 bg-primary/10 text-primary rounded-md flex items-center justify-center text-xs">
                                <Users className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-sans text-xs font-medium tracking-widest text-muted-foreground uppercase">LLM Council</span>
                            </div>

                            {/* Stage 1: Individual Responses */}
                            {(msg.stage1 || msg.loading?.stage1) && (
                              <Stage1
                                responses={msg.stage1}
                                isLoading={msg.loading?.stage1}
                              />
                            )}

                            {/* Stage 2: Rankings */}
                            {(msg.stage2 || msg.loading?.stage2) && (
                              <Stage2
                                rankings={msg.stage2}
                                metadata={msg.metadata}
                                isLoading={msg.loading?.stage2}
                              />
                            )}

                            {/* Stage 3: Final Verdict */}
                            {(msg.stage3 || msg.loading?.stage3) && (
                              <Stage3
                                finalResponse={msg.stage3}
                                isLoading={msg.loading?.stage3}
                              />
                            )}
                          </>
                        )
                      }
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Dynamic Positioning */}
        <div className={cn(
          "w-full transition-all duration-500 ease-in-out z-10",
          hasMessages
            ? "bg-background p-4 border-t border-border/40"
            : "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl px-4 mt-12"
        )}>
          <div className={cn(
            "relative mx-auto",
            hasMessages ? "max-w-3xl" : "max-w-2xl"
          )}>
            <div className="relative flex items-center gap-2 bg-secondary/40 rounded-[26px] px-3 py-3 focus-within:bg-secondary/60 transition-all duration-300 shadow-sm hover:shadow-md">
              {/* AI Tools Button */}
              <button
                ref={toolsButtonRef}
                onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                className="shrink-0 p-2 h-10 w-10 flex items-center justify-center rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground transition-all duration-200"
                title="AI Tools"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {/* Tools Menu Dropdown */}
              {isToolsMenuOpen && (
                <div className="absolute left-0 bottom-full mb-2 z-20">
                  <ToolsMenu
                    isOpen={isToolsMenuOpen}
                    onClose={() => setIsToolsMenuOpen(false)}
                    currentMode={currentMode}
                    triggerRef={toolsButtonRef}
                    onModeChange={(mode, subMode) => {
                      setCurrentMode(mode);
                      if (mode === 'council' && subMode) setCurrentRoom(subMode);
                      if (mode === 'chat' && subMode) setCurrentModel(subMode);
                      setIsToolsMenuOpen(false);
                    }}
                  />
                </div>
              )}

              {/* Textarea */}
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize immediately on change
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="What can I help you with?"
                className="flex-1 bg-transparent border-0 focus:ring-0 resize-none min-h-[24px] max-h-[200px] text-base leading-relaxed font-sans placeholder:text-muted-foreground/50 scrollbar-hide outline-none py-2"
                rows={1}
              />

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="shrink-0 p-2 h-10 w-10 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-0 disabled:cursor-not-allowed transition-all duration-300 shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 ml-0.5" />
                )}
              </button>
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
                {currentMode === 'council'
                  ? 'COUNCIL MODE'
                  : currentMode === 'image'
                    ? 'IMAGE GENERATION'
                    : CHAT_MODELS.find(m => m.id === currentModel)?.name.toUpperCase() || 'CHAT MODE'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
