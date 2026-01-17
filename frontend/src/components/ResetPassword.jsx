import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export function ResetPassword({ onSuccess }) {
    const [loading, setLoading] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const { updatePassword, clearPasswordRecoveryMode } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            setLoading(false)
            return
        }

        // Validate password length
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters')
            setLoading(false)
            return
        }

        try {
            const { error } = await updatePassword(newPassword)
            if (error) throw error
            setSuccess(true)
            // Clear password recovery mode and redirect to login after 2 seconds
            setTimeout(() => {
                clearPasswordRecoveryMode()
                onSuccess()
            }, 2000)
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
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display uppercase">Password Reset</h1>
                            <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-2 sm:mt-3 leading-relaxed">
                                Your password has been successfully reset!
                            </p>
                            <p className="text-muted-foreground font-mono text-xs mt-2">
                                Redirecting to login...
                            </p>
                        </div>
                    </div>
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
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display uppercase">Reset Password</h1>
                        <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-1 uppercase tracking-wide">Enter your new password</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                    {error && <div className="p-2.5 sm:p-3 text-xs sm:text-sm text-red-500 bg-red-100 font-bold border-2 border-red-500 brutal-shadow-sm uppercase break-words">{error}</div>}

                    <div className="space-y-4 sm:space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs sm:text-sm font-bold uppercase tracking-wider">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    className="flex h-10 sm:h-11 w-full rounded-none border-2 border-foreground bg-background px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none placeholder:text-muted-foreground/50 font-medium"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs sm:text-sm font-bold uppercase tracking-wider">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    className="flex h-10 sm:h-11 w-full rounded-none border-2 border-foreground bg-background px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none placeholder:text-muted-foreground/50 font-medium"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-none text-xs sm:text-sm font-bold uppercase tracking-wide sm:tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 h-10 sm:h-11 px-4 py-2 w-full border-2 border-foreground brutal-shadow transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
                    >
                        {loading ? <>Updating...</> : <><Lock className="w-4 h-4 mr-2" /> Reset Password</>}
                    </button>
                </form>
            </div>
        </div>
    )
}
