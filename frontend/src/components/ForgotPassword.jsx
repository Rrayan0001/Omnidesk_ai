
import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export function ForgotPassword({ onBack }) {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const { resetPasswordForEmail } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { error } = await resetPasswordForEmail(email)
            if (error) throw error
            setSuccess(true)
        } catch (error) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground animate-in fade-in zoom-in duration-500 px-4 sm:px-6 py-8">
                <div className="w-full max-w-md p-5 sm:p-8 space-y-6 sm:space-y-8 bg-card border-3 border-foreground brutal-shadow">
                    <div className="flex flex-col items-center space-y-3 sm:space-y-4 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 p-3 bg-green-500 border-2 border-foreground brutal-shadow-sm mb-2 flex items-center justify-center">
                            <CheckCircle className="w-full h-full text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display uppercase">Check Your Email</h1>
                            <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-2 sm:mt-3 leading-relaxed">
                                We've sent password reset instructions to <strong className="text-foreground break-all">{email}</strong>
                            </p>
                            <p className="text-muted-foreground font-mono text-xs mt-2">
                                Check your inbox and click the link to reset your password.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onBack}
                        className="inline-flex items-center justify-center rounded-none text-xs sm:text-sm font-bold uppercase tracking-wide sm:tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 h-10 sm:h-11 px-4 py-2 w-full border-2 border-foreground brutal-shadow transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground animate-in fade-in zoom-in duration-500 px-4 sm:px-6 py-8">
            <div className="w-full max-w-md p-5 sm:p-8 space-y-6 sm:space-y-8 bg-card border-3 border-foreground brutal-shadow">
                <div className="flex flex-col items-center space-y-3 sm:space-y-4 text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 p-3 bg-secondary border-2 border-foreground brutal-shadow-sm mb-2">
                        <img
                            src="/logo.png"
                            alt="RayanAI"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display uppercase">Forgot Password</h1>
                        <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-1 uppercase tracking-wide">Enter your email to reset password</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                    {error && <div className="p-2.5 sm:p-3 text-xs sm:text-sm text-red-500 bg-red-100 font-bold border-2 border-red-500 brutal-shadow-sm uppercase break-words">{error}</div>}

                    <div className="space-y-2">
                        <label className="text-xs sm:text-sm font-bold uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            className="flex h-10 sm:h-11 w-full rounded-none border-2 border-foreground bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none placeholder:text-muted-foreground/50 font-medium"
                            placeholder="your.email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-none text-xs sm:text-sm font-bold uppercase tracking-wide sm:tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 h-10 sm:h-11 px-4 py-2 w-full border-2 border-foreground brutal-shadow transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
                    >
                        {loading ? <>Sending...</> : <><Mail className="w-4 h-4 mr-2" /> Send Reset Link</>}
                    </button>
                </form>

                <div className="text-center text-xs sm:text-sm pt-4 sm:pt-6 border-t-2 border-foreground/10">
                    <button
                        onClick={onBack}
                        className="text-primary hover:text-primary/80 transition-colors font-bold uppercase tracking-wide decoration-2 underline-offset-4 hover:underline"
                    >
                        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    )
}
