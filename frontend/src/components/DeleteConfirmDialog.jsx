import { AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

export function DeleteConfirmDialog({ open, onOpenChange, onConfirm, conversationTitle, isDeleteAll = false }) {
    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
        >
            <div
                className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                        {isDeleteAll ? 'Delete All Conversations?' : 'Delete Conversation?'}
                    </h2>
                </div>

                <div className="space-y-3 mb-6">
                    <p className="text-sm text-muted-foreground">
                        {isDeleteAll
                            ? 'Are you sure you want to delete ALL your conversations?'
                            : `Are you sure you want to delete "${conversationTitle || 'this conversation'}"?`
                        }
                    </p>

                    {/* Permanent deletion warning */}
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-xs text-destructive font-medium">
                            ⚠️ PERMANENT DELETION: This action cannot be undone.
                            {isDeleteAll
                                ? ' All conversations and messages will be permanently removed from the database.'
                                : ' This conversation and all its messages will be permanently removed from the database.'
                            }
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-secondary transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    >
                        {isDeleteAll ? 'Delete All' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
