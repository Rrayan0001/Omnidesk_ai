import { Plus, MessageSquare, Trash2, Sun, Moon, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useRoom } from "@/contexts/RoomContext";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);


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
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed md:relative z-50 h-screen bg-secondary/30 flex flex-col shrink-0 transition-all duration-300 ease-in-out border-r border-border/50 shadow-xl md:shadow-none",
          isOpen ? "translate-x-0 w-[280px]" : "-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden"
        )}
      >
        <div className="p-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-8 px-1">
            <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
              <div className="w-6 h-6 bg-primary/20 text-primary rounded-md flex items-center justify-center text-xs">
                🏛️
              </div>
              <h1 className="text-sm font-serif font-bold tracking-tight text-foreground/90">
                LLM Council
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-all md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Button
            onClick={onNewConversation}
            variant="outline"
            className="w-full justify-start gap-2 font-sans font-medium shadow-sm mb-8 bg-background hover:bg-white/80 dark:hover:bg-white/5 border-border/50 h-10 rounded-xl text-foreground/80 shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>

          {/* Room Selector */}
          <div className="mb-6 shrink-0">
            <div className="text-[10px] font-sans font-bold text-muted-foreground/70 mb-2 uppercase tracking-widest px-2">
              Room
            </div>
            <Select value={currentRoom} onValueChange={setCurrentRoom}>
              <SelectTrigger className="w-full bg-transparent hover:bg-secondary/50 border-transparent focus:ring-0 focus:ring-offset-0 h-10 font-medium">
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="opacity-80 w-5 text-center">{room.icon}</span>
                      <span>{room.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 min-h-0">
            <div className="flex items-center justify-between px-3 mt-2 mb-2 sticky top-0 bg-secondary/30 backdrop-blur-sm py-1 z-10">
              <div className="text-[10px] font-sans font-bold text-muted-foreground/70 uppercase tracking-widest">
                Recents
              </div>
              {conversations.length > 0 && (
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
                      try {
                        await api.deleteAllConversations();
                        window.location.reload();
                      } catch (error) {
                        console.error('Failed to delete conversations:', error);
                        alert('Failed to delete conversations. Please try again.');
                      }
                    }
                  }}
                  className="p-1 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                  title="Delete all conversations"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {conversations.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs mt-10 px-4 font-serif italic opacity-60">
                No history yet
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex flex-row items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 relative",
                    conv.id === currentConversationId
                      ? "bg-secondary/80 text-foreground font-medium"
                      : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    onClick={() => onSelectConversation(conv.id)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <span className="text-sm truncate font-sans">
                      {conv.title || 'New Chat'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setConversationToDelete(conv);
                      setDeleteDialogOpen(true);
                    }}
                    className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-md transition-all shrink-0 z-10 relative opacity-0 group-hover:opacity-100"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
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
      </div>
    </>
  );
}
