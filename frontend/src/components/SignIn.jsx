
import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, LayoutDashboard, Sparkles } from 'lucide-react'

export function SignIn({ onSwitch }) {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const { signIn } = useAuth()
    const [error, setError] = useState('')

    const handleSignIn = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const { error } = await signIn({ email, password })
            if (error) throw error
        } catch (error) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground animate-in fade-in zoom-in duration-500 px-4">
            <div className="w-full max-w-md p-6 sm:p-8 space-y-8 bg-secondary/30 backdrop-blur-lg rounded-2xl border border-secondary/50 shadow-2xl">
                <div className="flex flex-col items-center space-y-2 text-center">
                    <div className="p-3 bg-primary/10 rounded-xl mb-4">
                        <LayoutDashboard className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tighter">Welcome Back</h1>
                    <p className="text-muted-foreground">Sign in to continue to Omnidesk AI</p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-5">
                    {error && <div className="p-4 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <input
                                type="email"
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <input
                                type="password"
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full shadow-lg shadow-primary/25 transition-all"
                    >
                        {loading ? <Sparkles className="w-4 h-4 animate-spin mr-2" /> : <><LogIn className="w-4 h-4 mr-2" /> Sign In</>}
                    </button>
                </form>

                <div className="text-center text-sm pt-4 border-t border-border/50">
                    <button onClick={onSwitch} className="text-primary hover:text-primary/80 transition-colors font-medium">
                        Don't have an account? Sign Up
                    </button>
                </div>
            </div>
        </div>
    )
}
