import { UserPlus, X, Sparkles } from 'lucide-react';

export default function SignupReminderModal({ onSignUp, onDismiss, queryCount }) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-background border-3 border-foreground brutal-shadow max-w-md w-full p-6 animate-in slide-in-from-bottom-4 relative">
                {/* Close button */}
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 p-1 hover:bg-secondary rounded-sm transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 border-2 border-foreground brutal-shadow-sm flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                </div>

                {/* Content */}
                <div className="text-center space-y-3">
                    <h3 className="text-xl font-black uppercase tracking-tight font-display">
                        Enjoying RayanAI?
                    </h3>
                    <p className="text-muted-foreground text-sm font-medium">
                        You've sent <span className="text-primary font-bold">{queryCount} messages</span> in demo mode!
                        Sign up to save your conversations and unlock all features.
                    </p>
                </div>

                {/* Benefits */}
                <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-green-500/20 text-green-500 rounded-sm flex items-center justify-center text-xs font-bold">✓</span>
                        <span>Save conversations permanently</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-green-500/20 text-green-500 rounded-sm flex items-center justify-center text-xs font-bold">✓</span>
                        <span>Access from any device</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-green-500/20 text-green-500 rounded-sm flex items-center justify-center text-xs font-bold">✓</span>
                        <span>Unlimited chat history</span>
                    </li>
                </ul>

                {/* Actions */}
                <div className="mt-6 space-y-3">
                    <button
                        onClick={onSignUp}
                        className="w-full inline-flex items-center justify-center rounded-none text-sm font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-4 py-2 border-2 border-foreground brutal-shadow transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Free Account
                    </button>
                    <button
                        onClick={onDismiss}
                        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors font-medium uppercase tracking-wide"
                    >
                        Maybe Later – Continue Demo
                    </button>
                </div>
            </div>
        </div>
    );
}
