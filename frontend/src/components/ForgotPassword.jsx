
import React, { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, ArrowLeft, CheckCircle, KeyRound, Loader2 } from 'lucide-react'

export function ForgotPassword({ onBack, onVerified }) {
    const [step, setStep] = useState('email') // 'email' | 'otp' | 'success'
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState(['', '', '', '', '', '', '', ''])
    const [error, setError] = useState('')
    const [resendCooldown, setResendCooldown] = useState(0)
    const { sendOtpForPasswordReset, verifyOtpForRecovery } = useAuth()
    const inputRefs = useRef([])

    // Handle email submission
    const handleEmailSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { error } = await sendOtpForPasswordReset(email)
            if (error) throw error
            setStep('otp')
            startResendCooldown()
        } catch (error) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    // Handle OTP input change
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return // Only allow digits

        const newOtp = [...otp]
        newOtp[index] = value.slice(-1) // Only take last character
        setOtp(newOtp)

        // Auto-focus next input
        if (value && index < 7) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    // Handle backspace
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    // Handle paste
    const handlePaste = (e) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8)
        const newOtp = [...otp]
        for (let i = 0; i < pastedData.length; i++) {
            newOtp[i] = pastedData[i]
        }
        setOtp(newOtp)
        if (pastedData.length === 8) {
            inputRefs.current[7]?.focus()
        }
    }

    // Handle OTP verification
    const handleOtpSubmit = async (e) => {
        e.preventDefault()
        const otpString = otp.join('')
        if (otpString.length !== 8) {
            setError('Please enter all 8 digits')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error } = await verifyOtpForRecovery(email, otpString)
            if (error) throw error
            setStep('success')
            // Navigate to reset password after short delay
            setTimeout(() => {
                onVerified?.()
            }, 1500)
        } catch (error) {
            setError(error.message || 'Invalid or expired code')
            setOtp(['', '', '', '', '', '', '', ''])
            inputRefs.current[0]?.focus()
        } finally {
            setLoading(false)
        }
    }

    // Resend cooldown timer
    const startResendCooldown = () => {
        setResendCooldown(60)
        const interval = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(interval)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    // Resend OTP
    const handleResend = async () => {
        if (resendCooldown > 0) return
        setLoading(true)
        setError('')
        try {
            const { error } = await sendOtpForPasswordReset(email)
            if (error) throw error
            startResendCooldown()
            setOtp(['', '', '', '', '', ''])
        } catch (error) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    // Success screen
    if (step === 'success') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground animate-in fade-in zoom-in duration-500 px-4 sm:px-6 py-8">
                <div className="w-full max-w-md p-5 sm:p-8 space-y-6 sm:space-y-8 bg-card border-3 border-foreground brutal-shadow">
                    <div className="flex flex-col items-center space-y-3 sm:space-y-4 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 p-3 bg-green-500 border-2 border-foreground brutal-shadow-sm mb-2 flex items-center justify-center">
                            <CheckCircle className="w-full h-full text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display uppercase">Verified!</h1>
                            <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-2 sm:mt-3 leading-relaxed">
                                Your identity has been verified. Redirecting to password reset...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // OTP entry screen
    if (step === 'otp') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground animate-in fade-in zoom-in duration-500 px-4 sm:px-6 py-8">
                <div className="w-full max-w-md p-5 sm:p-8 space-y-6 sm:space-y-8 bg-card border-3 border-foreground brutal-shadow">
                    <div className="flex flex-col items-center space-y-3 sm:space-y-4 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 p-3 bg-secondary border-2 border-foreground brutal-shadow-sm mb-2 flex items-center justify-center">
                            <KeyRound className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display uppercase">Enter Code</h1>
                            <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-1 uppercase tracking-wide">
                                We sent an 8-digit code to
                            </p>
                            <p className="text-foreground font-mono text-xs sm:text-sm font-bold break-all">
                                {email}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleOtpSubmit} className="space-y-5 sm:space-y-6">
                        {error && <div className="p-2.5 sm:p-3 text-xs sm:text-sm text-red-500 bg-red-100 font-bold border-2 border-red-500 brutal-shadow-sm uppercase break-words">{error}</div>}

                        {/* OTP Input */}
                        <div className="flex justify-center gap-1.5 sm:gap-2" onPaste={handlePaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => inputRefs.current[index] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-8 h-10 sm:w-10 sm:h-12 text-center text-lg sm:text-xl font-bold border-2 border-foreground bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none"
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.join('').length !== 8}
                            className="inline-flex items-center justify-center rounded-none text-xs sm:text-sm font-bold uppercase tracking-wide sm:tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 h-10 sm:h-11 px-4 py-2 w-full border-2 border-foreground brutal-shadow transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
                        >
                            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : <>Verify Code</>}
                        </button>

                        {/* Resend */}
                        <div className="text-center text-xs sm:text-sm">
                            <span className="text-muted-foreground">Didn't receive the code? </span>
                            {resendCooldown > 0 ? (
                                <span className="text-muted-foreground font-mono">Resend in {resendCooldown}s</span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={loading}
                                    className="text-primary hover:text-primary/80 transition-colors font-bold uppercase tracking-wide decoration-2 underline-offset-4 hover:underline"
                                >
                                    Resend Code
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="text-center text-xs sm:text-sm pt-4 sm:pt-6 border-t-2 border-foreground/10">
                        <button
                            onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError('') }}
                            className="text-primary hover:text-primary/80 transition-colors font-bold uppercase tracking-wide decoration-2 underline-offset-4 hover:underline"
                        >
                            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                            Change Email
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Email entry screen (default)
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
                        <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-1 uppercase tracking-wide">Enter your email to receive a code</p>
                    </div>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-5 sm:space-y-6">
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
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Mail className="w-4 h-4 mr-2" /> Send Code</>}
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
