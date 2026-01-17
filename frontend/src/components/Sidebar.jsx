import { Plus, MessageSquare, Trash2, Sun, Moon, X, Cpu, PanelLeft, ChevronRight, LogOut, Activity } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useRoom } from "@/contexts/RoomContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchUsage } from "@/contexts/SearchUsageContext";
import { useEffect, useState } from "react";
import { api } from "@/api";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  toggleSidebar,
}) {
  const { theme, toggleTheme } = useTheme();
  const { currentRoom, setCurrentRoom, rooms } = useRoom();
  const { signOut } = useAuth();
  const { usageCount, limit } = useSearchUsage();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete all conversations
  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAllConversations();
      const newConv = await api.createConversation();
      window.location.href = `/?conversation=${newConv.id}`;
    } catch (error) {
      console.error('Failed to delete all:', error);
      alert('Failed to delete conversations. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteAllDialogOpen(false);
    }
  };

  // Rooms are now loaded from config.js via RoomContext

  return (
    <>
      {/* Mobile Overlay */}
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-500 ease-in-out backdrop-blur-sm",
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onClick={toggleSidebar}
      />

      {/* Sidebar - Expandable */}
      <div
        className={cn(
          "fixed z-50 h-[100dvh] bg-background flex flex-col shrink-0 transition-all duration-500 ease-in-out border-r-3 border-foreground shadow-[4px_0_24px_rgba(0,0,0,0.1)]",
          // Mobile: Fixed width, slide in/out
          "w-[75vw] max-w-[300px] md:w-auto md:max-w-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: Relative, width changes based on expansion, always visible
          "md:relative md:translate-x-0 md:shadow-none",
          isExpanded ? "md:w-64" : "md:w-20"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Top Section with Padding */}
          <div className="p-2 shrink-0">
            {/* Logo */}
            <div className={cn(
              "flex items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-colors mb-2 group",
              (isExpanded || isOpen) ? "w-full px-3 h-12" : "w-12 h-12 mx-auto justify-center"
            )}>
              <img
                src={theme === 'dark' ? "/logo.png" : "/logo-light.png"}
                alt="RayanAI"
                className={cn(
                  "w-9 h-9 object-contain shrink-0 transition-all",
                  theme !== 'dark' && "group-hover:brightness-0 group-hover:invert"
                )}
              />
              {(isExpanded || isOpen) && <span className="text-base font-bold tracking-tight uppercase text-glitch brutal-underline">RayanAI</span>}
            </div>

            {/* New Chat Button */}
            <Button
              onClick={onNewConversation}
              variant="ghost"
              className={cn(
                "h-12 flex items-center border-2 border-foreground bg-primary text-primary-foreground hover:translate-x-[-2px] hover:translate-y-[-2px] mb-2 brutal-button",
                (isExpanded || isOpen) ? "w-full justify-start gap-3 px-3" : "w-12 mx-auto p-0 justify-center"
              )}
              title="New Chat"
            >
              <Plus className="w-6 h-6 shrink-0" />
              {(isExpanded || isOpen) && <span className="text-[15px] font-medium">New Chat</span>}
            </Button>
          </div>

          {/* Conversations List - Full Width */}
          {(isExpanded || isOpen) && (
            <div className="flex-1 overflow-y-auto min-h-0 border-t-2 border-foreground/10">
              <div className="flex items-center justify-between px-4 py-2 sticky top-0 bg-secondary/80 backdrop-blur-sm z-10 border-b-2 border-foreground/10">
                <h3 className="text-[10px] font-sans font-bold tracking-widest uppercase text-muted-foreground">
                  Recent
                </h3>
                {conversations.length > 0 && (
                  <button
                    onClick={() => setDeleteAllDialogOpen(true)}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                    title="Delete all conversations"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              {conversations.length === 0 ? (
                <div className="text-xs text-muted-foreground/50 text-center p-4">
                  No history yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectConversation(conv.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 text-sm transition-all group relative hover:bg-accent cursor-pointer border-b border-foreground/10",
                      currentConversationId === conv.id
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate text-xs">{conv.title || 'New Chat'}</span>
                      {currentConversationId === conv.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConversationToDelete(conv);
                            setDeleteDialogOpen(true);
                          }}
                          className="ml-auto p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Spacer if list is hidden or short */}
          {!isExpanded && <div className="flex-1" />}

          {/* Bottom Actions - Always visible */}
          <div className="shrink-0 space-y-1 p-2 pb-8 md:pb-2 border-t-2 border-foreground/10 bg-background z-10">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                "h-12 flex items-center border-2 border-foreground hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all",
                (isExpanded || isOpen) ? "w-full justify-start gap-3 px-3" : "w-12 mx-auto justify-center"
              )}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-6 h-6 shrink-0" /> : <Moon className="w-6 h-6 shrink-0" />}
              {(isExpanded || isOpen) && <span className="text-[15px]">{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>}
            </button>

            {/* Search Usage Tracker */}
            <div className={cn(
              "px-3 py-2 mb-1 transition-all",
              (isExpanded || isOpen) ? "w-full" : "w-12 mx-auto flex justify-center px-0"
            )}>
              <div className={cn(
                "flex items-center gap-3 p-2 rounded-lg border-2 transition-all brutal-shadow-sm",
                usageCount >= limit ? "bg-destructive/10 border-destructive text-destructive" :
                  usageCount >= limit * 0.8 ? "bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400" :
                    "bg-secondary border-foreground/20 text-muted-foreground"
              )}>
                <Activity className={cn("w-4 h-4 shrink-0", (isExpanded || isOpen) ? "" : "mx-auto")} />
                {(isExpanded || isOpen) && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider mb-1">
                      <span>Search Limit</span>
                      <span>{usageCount}/{limit}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-background border border-foreground/20 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-500",
                          usageCount >= limit ? "bg-destructive" :
                            usageCount >= limit * 0.8 ? "bg-yellow-500" :
                              "bg-primary"
                        )}
                        style={{ width: `${Math.min((usageCount / limit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={signOut}
              className={cn(
                "h-12 flex items-center rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all",
                (isExpanded || isOpen) ? "w-full justify-start gap-3 px-3" : "w-12 mx-auto justify-center"
              )}
              aria-label="Logout"
            >
              <LogOut className="w-6 h-6 shrink-0" />
              {(isExpanded || isOpen) && <span className="text-[15px]">Logout</span>}
            </button>
          </div>
        </div>
      </div >

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        conversationTitle={conversationToDelete?.title}
        onConfirm={() => {
          if (conversationToDelete) {
            onDeleteConversation(conversationToDelete.id);
          }
          setDeleteDialogOpen(false);
          setConversationToDelete(null);
        }}
      />

      {/* Delete All Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteAllDialogOpen}
        onOpenChange={setDeleteAllDialogOpen}
        isDeleteAll={true}
        onConfirm={handleDeleteAll}
      />
    </>
  );
}
