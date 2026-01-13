
import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, LayoutDashboard, Sparkles, Eye, EyeOff } from 'lucide-react'

export function SignIn({ onSwitch }) {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
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
            <div className="w-full max-w-md p-6 sm:p-8 space-y-8 bg-card border-3 border-foreground brutal-shadow">
                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="w-20 h-20 p-3 bg-secondary border-2 border-foreground brutal-shadow-sm mb-2">
                        <img
                            src="/logo.png"
                            alt="RayanAI"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight font-display uppercase">Welcome Back</h1>
                        <p className="text-muted-foreground font-mono text-sm mt-1 uppercase tracking-wide">Sign in to continue to RayanAI</p>
                    </div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-6">
                    {error && <div className="p-3 text-sm text-red-500 bg-red-100 font-bold border-2 border-red-500 brutal-shadow-sm uppercase">{error}</div>}
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                className="flex h-11 w-full rounded-none border-2 border-foreground bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none placeholder:text-muted-foreground/50 font-medium"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="flex h-11 w-full rounded-none border-2 border-foreground bg-background px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none placeholder:text-muted-foreground/50 font-medium"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-none text-sm font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-4 py-2 w-full border-2 border-foreground brutal-shadow transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                        {loading ? <Sparkles className="w-4 h-4 animate-spin mr-2" /> : <><LogIn className="w-4 h-4 mr-2" /> Sign In</>}
                    </button>
                </form>

                <div className="text-center text-sm pt-6 border-t-2 border-foreground/10">
                    <button onClick={onSwitch} className="text-primary hover:text-primary/80 transition-colors font-bold uppercase tracking-wide decoration-2 underline-offset-4 hover:underline">
                        Don't have an account? Sign Up
                    </button>
                </div>
            </div>
        </div>
    )
}
