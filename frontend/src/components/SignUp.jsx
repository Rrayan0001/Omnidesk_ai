
import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, Sparkles, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'

export function SignUp({ onSwitch }) {
    const [step, setStep] = useState(1) // 1: Details, 2: OTP
    const [loading, setLoading] = useState(false)

    // Form Data
    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        password: ''
    })

    const [otp, setOtp] = useState('')
    const { signUp, verifyOtp } = useAuth()
    const [error, setError] = useState('')

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleDetailsSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            // 1. First Pass: Sign Up to trigger OTP
            const { data, error } = await signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        first_name: formData.firstName,
                        middle_name: formData.middleName,
                        last_name: formData.lastName
                    }
                }
            })
            if (error) throw error

            // If successful, move to OTP step
            // Note: If email confirmation is enabled, session might be null.
            setStep(2)

        } catch (error) {
            // Handle rate limit specifically if needed, but generic error display works
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleOtpSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const { error } = await verifyOtp({
                email: formData.email,
                token: otp,
                type: 'signup'
            })
            if (error) throw error
            // If verified, AuthContext will perform auto-login redirect usually, or we can force redirect
        } catch (error) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    // Render Step 1: Details
    if (step === 1) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground animate-in fade-in zoom-in duration-500">
                <div className="w-full max-w-lg p-8 space-y-6 bg-secondary/30 backdrop-blur-lg rounded-2xl border border-secondary/50 shadow-2xl">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold tracking-tighter">Create Account</h1>
                        <p className="text-muted-foreground">Join Omnidesk AI today</p>
                    </div>

                    <form onSubmit={handleDetailsSubmit} className="space-y-4">
                        {error && <div className="p-4 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">First Name</label>
                                <input name="firstName" value={formData.firstName} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Last Name</label>
                                <input name="lastName" value={formData.lastName} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Middle Name (Optional)</label>
                            <input name="middleName" value={formData.middleName} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary" required />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary" required minLength={6} />
                        </div>

                        <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 shadow-lg transition-all">
                            {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" /> Continue</>}
                        </button>
                    </form>

                    <div className="text-center text-sm pt-4 border-t border-border/50">
                        <button onClick={onSwitch} className="text-primary hover:text-primary/80 transition-colors font-medium">
                            Already have an account? Sign In
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Render Step 2: OTP
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground animate-in slide-in-from-right duration-500">
            <div className="w-full max-w-md p-8 space-y-8 bg-secondary/30 backdrop-blur-lg rounded-2xl border border-secondary/50 shadow-2xl">
                <div className="text-center space-y-2">
                    <div className="flexjustify-center mb-4">
                        <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                    </div>
                    <h1 className="text-2xl font-bold">Verify your Email</h1>
                    <p className="text-muted-foreground text-sm">
                        We've sent a code to <span className="font-semibold text-foreground">{formData.email}</span>
                    </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                    {error && <div className="p-4 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Enter 8-digit OTP</label>
                        <input
                            type="text"
                            className="flex h-12 w-full rounded-md border border-input bg-background/50 px-3 text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-primary"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="00000000"
                            maxLength={8}
                            required
                        />
                        <p className="text-xs text-muted-foreground text-center">
                            Check your spam folder if you don't see it.
                        </p>
                    </div>

                    <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 shadow-lg transition-all">
                        {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : "Verify & Start"}
                    </button>
                </form>

                <button onClick={() => setStep(1)} className="w-full text-sm text-muted-foreground hover:text-primary flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to details
                </button>
            </div>
        </div>
    )
}
