import { Plus, MessageSquare, Trash2, Sun, Moon, X, Cpu, PanelLeft, ChevronRight, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useRoom } from "@/contexts/RoomContext";
import { useAuth } from "@/contexts/AuthContext";
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
  const { currentRoom, setCurrentRoom, rooms, setRooms } = useRoom();
  const { signOut } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load rooms on mount
  useEffect(() => {
    api.listRooms().then((data) => {
      setRooms(data.rooms);
      if (data.default) {
        setCurrentRoom(data.default);
      }
    }).catch(err => console.error('Failed to load rooms:', err));
  }, [setRooms, setCurrentRoom]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:bg-transparent md:backdrop-blur-none"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar - Expandable */}
      <div
        className={cn(
          "fixed md:relative z-50 h-screen bg-secondary/30 flex flex-col shrink-0 transition-all duration-300 ease-in-out border-r border-border/50",
          isOpen ? "translate-x-0 w-[85vw]" : "-translate-x-full w-16",
          "md:translate-x-0",
          isExpanded ? "md:w-64" : "md:w-16"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="p-2 flex-1 flex flex-col min-h-0">
          {/* Logo */}
          <div className={cn(
            "flex items-center gap-3 hover:bg-secondary/50 rounded-lg transition-colors mb-2",
            (isExpanded || isOpen) ? "w-full px-3 h-12" : "w-12 h-12 mx-auto justify-center"
          )}>
            <img
              src={theme === 'dark' ? "/logo.png" : "/logo-light.png"}
              alt="OmniDesk AI"
              className="w-9 h-9 object-contain shrink-0"
            />
            {(isExpanded || isOpen) && <span className="text-base font-bold tracking-tight">OmniDesk</span>}
          </div>

          {/* New Chat Button */}
          <Button
            onClick={onNewConversation}
            variant="ghost"
            className={cn(
              "h-12 flex items-center rounded-lg hover:bg-secondary/50 text-foreground/80 mb-2",
              (isExpanded || isOpen) ? "w-full justify-start gap-3 px-3" : "w-12 mx-auto p-0 justify-center"
            )}
            title="New Chat"
          >
            <Plus className="w-6 h-6 shrink-0" />
            {(isExpanded || isOpen) && <span className="text-[15px] font-medium">New Chat</span>}
          </Button>

          {/* Conversations List */}
          {isExpanded && (
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              <div className="flex items-center justify-between px-3 py-2 sticky top-0 bg-secondary/30 backdrop-blur-sm">
                <h3 className="text-[10px] font-sans font-bold tracking-widest uppercase text-muted-foreground">
                  Recent
                </h3>
                {conversations.length > 0 && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Clear all conversations and start fresh?')) {
                        try {
                          // Delete all conversations
                          await api.deleteAllConversations();
                          // Create a new empty conversation
                          const newConv = await api.createConversation();
                          // Refresh the page to the new conversation
                          window.location.href = `/?conversation=${newConv.id}`;
                        } catch (error) {
                          console.error('Failed to clear:', error);
                        }
                      }
                    }}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
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
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-all group relative hover:bg-secondary/70",
                      currentConversationId === conv.id
                        ? "bg-secondary text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate text-xs font-medium">{conv.title || 'New Chat'}</span>
                      {currentConversationId === conv.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConversationToDelete(conv);
                            setDeleteDialogOpen(true);
                          }}
                          className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "h-12 flex items-center rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all",
              (isExpanded || isOpen) ? "w-full justify-start gap-3 px-3" : "w-12 mx-auto justify-center"
            )}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-6 h-6 shrink-0" /> : <Moon className="w-6 h-6 shrink-0" />}
            {(isExpanded || isOpen) && <span className="text-[15px]">{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>}
          </button>

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
    </>
  );
}
