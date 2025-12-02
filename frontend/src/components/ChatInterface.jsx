import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, PanelLeft, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
// import { ChatInput, ChatInputTextArea, ChatInputSubmit } from '@/components/ui/chat-input';
import RoomDetectionModal from './RoomDetectionModal';
import ToolsMenu from './ToolsMenu';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import { TextShimmer } from '@/components/ui/text-shimmer';

// Import chat models for display
const CHAT_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Groq Llama 3.3 70B' },
  { id: 'gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash' },
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
  const [input, setInput] = useState('');
  const [detectedRoom, setDetectedRoom] = useState(null);
  const [pendingMessage, setPendingMessage] = useState('');
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);

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

  return (
    <div className="flex-1 h-screen flex flex-col bg-background relative transition-colors duration-300">
      {/* Header */}
      <div className="h-14 border-b border-border/40 flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <span className="text-sm font-serif font-medium opacity-80 ml-2 border-l border-border/40 pl-4">
            {conversation?.title || 'New Chat'}
          </span>
        </div>

        {conversation && (
          <button
            onClick={() => {
              if (window.confirm('Delete this conversation?')) {
                onDeleteConversation();
              }
            }}
            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete Conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode Banner */}
      {detectedRoom && (
        <RoomDetectionModal
          detectedRoom={detectedRoom}
          onProceed={handleProceedWithRoom}
          onCancel={handleCancelDetection}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">

        {/* Messages or Empty State */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {!hasMessages ? (
            <div className="h-full flex flex-col items-center justify-center p-4 space-y-8 -mt-20">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-2xl shadow-sm">
                🏛️
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-medium tracking-tight text-foreground text-center">
                What can I help you with?
              </h2>
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
                      <div className="max-w-[85%] bg-secondary/80 text-foreground px-5 py-3 rounded-2xl rounded-tr-sm text-[15px] leading-relaxed font-serif shadow-sm">
                        {msg.content}
                      </div>
                    </>
                  ) : (
                    <div className="w-full space-y-6">
                      {/* Check message mode from metadata */}
                      {
                        msg.metadata?.mode === 'chat' || msg.metadata?.mode === 'image' ? (
                          /* Simple Chat/Image Message Bubble */
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                              {msg.metadata?.mode === 'image' ? <Sparkles className="w-4 h-4 text-primary" /> : <div className="text-sm">🤖</div>}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium font-sans text-foreground">
                                  {msg.metadata?.model || (msg.metadata?.mode === 'image' ? 'Image Generator' : 'Assistant')}
                                </span>
                              </div>

                              {/* Show shimmer if loading and no response yet */}
                              {isLoading && !msg.stage3?.response && idx === conversation.messages.length - 1 ? (
                                <div className="mt-2">
                                  <TextShimmer
                                    duration={1.2}
                                    className="text-sm font-sans [--base-color:theme(colors.zinc.400)] [--base-gradient-color:theme(colors.zinc.200)] dark:[--base-color:theme(colors.zinc.600)] dark:[--base-gradient-color:theme(colors.zinc.400)]"
                                  >
                                    {msg.metadata?.mode === 'image' ? 'Generating image...' : 'Thinking...'}
                                  </TextShimmer>
                                </div>
                              ) : (
                                <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed">
                                  <ReactMarkdown>{msg.stage3?.response || msg.content || ''}</ReactMarkdown>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Council Mode UI */
                          <>
                            <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                              <div className="w-6 h-6 bg-primary/10 text-primary rounded-md flex items-center justify-center text-xs">
                                🏛️
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
            <div className="relative group shadow-lg rounded-2xl bg-background">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit();
                  }
                }}
                placeholder="Message the council..."
                className="w-full py-2 pl-12 pr-14 bg-secondary/30 border border-border/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all resize-none min-h-[40px] max-h-[200px] text-[15px] font-serif placeholder:font-sans placeholder:text-muted-foreground/50 flex items-center"
                rows={1}
                style={{ minHeight: '40px' }}
              />

              {/* Tools Button in Input */}
              <div className="absolute left-2 bottom-1.5">
                <div className="relative">
                  <button
                    onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all duration-200",
                      isToolsMenuOpen
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                    title="Tools"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  {/* Tools Menu Positioned Upwards */}
                  <div className="absolute bottom-full left-0 mb-2">
                    <ToolsMenu
                      isOpen={isToolsMenuOpen}
                      onClose={() => setIsToolsMenuOpen(false)}
                      currentMode={currentMode}
                      onModeChange={(mode, subMode) => {
                        setCurrentMode(mode);
                        if (mode === 'council' && subMode) setCurrentRoom(subMode);
                        if (mode === 'chat' && subMode) setCurrentModel(subMode);
                        setIsToolsMenuOpen(false);
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 bottom-2 p-2 bg-primary/90 text-primary-foreground rounded-xl hover:bg-primary hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex justify-between items-center px-2 mt-2">
              <p className="text-[10px] text-muted-foreground font-sans font-medium tracking-wide uppercase opacity-70">
                {currentMode === 'council'
                  ? (detectedRoom ? `Detected: ${detectedRoom.name}` : "Council Mode")
                  : (currentMode === 'chat'
                    ? `${CHAT_MODELS.find(m => m.id === currentModel)?.name || currentModel}`
                    : "Image Generation")
                }
              </p>
              <p className="text-[10px] text-muted-foreground/50 font-sans">
                Press Enter to send
              </p>
            </div>
          </div>
        </div>

      </div>
    </div >
  );
}
