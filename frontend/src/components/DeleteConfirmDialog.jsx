export function DeleteConfirmDialog({ open, onOpenChange, onConfirm, conversationTitle }) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
        >
            <div
                className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold mb-2 text-foreground">Delete Conversation?</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Are you sure you want to delete "{conversationTitle || 'this conversation'}"?
                    This action cannot be undone.
                </p>
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
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
