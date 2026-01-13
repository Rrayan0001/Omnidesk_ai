
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground animate-in fade-in zoom-in duration-500 px-4">
                <div className="w-full max-w-lg p-6 sm:p-8 space-y-6 bg-card border-3 border-foreground brutal-shadow">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-20 h-20 p-3 bg-secondary border-2 border-foreground brutal-shadow-sm">
                            <img
                                src="/logo.png"
                                alt="RayanAI"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight font-display uppercase">Create Account</h1>
                            <p className="text-muted-foreground font-mono text-sm uppercase tracking-wide">Join RayanAI today</p>
                        </div>
                    </div>

                    <form onSubmit={handleDetailsSubmit} className="space-y-4">
                        {error && <div className="p-3 text-sm text-red-500 bg-red-100 font-bold border-2 border-red-500 brutal-shadow-sm uppercase">{error}</div>}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-wider">First Name</label>
                                <input name="firstName" value={formData.firstName} onChange={handleChange} className="flex h-11 w-full rounded-none border-2 border-foreground bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none font-medium" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-wider">Last Name</label>
                                <input name="lastName" value={formData.lastName} onChange={handleChange} className="flex h-11 w-full rounded-none border-2 border-foreground bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none font-medium" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider">Middle Name (Optional)</label>
                            <input name="middleName" value={formData.middleName} onChange={handleChange} className="flex h-11 w-full rounded-none border-2 border-foreground bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none font-medium" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="flex h-11 w-full rounded-none border-2 border-foreground bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none font-medium" required />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider">Password</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} className="flex h-11 w-full rounded-none border-2 border-foreground bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none font-medium" required minLength={6} />
                        </div>

                        <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center rounded-none text-sm font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 h-11 border-2 border-foreground brutal-shadow transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                            {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" /> Continue</>}
                        </button>
                    </form>

                    <div className="text-center text-sm pt-6 border-t-2 border-foreground/10">
                        <button onClick={onSwitch} className="text-primary hover:text-primary/80 transition-colors font-bold uppercase tracking-wide decoration-2 underline-offset-4 hover:underline">
                            Already have an account? Sign In
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Render Step 2: OTP
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground animate-in slide-in-from-right duration-500 px-4">
            <div className="w-full max-w-md p-6 sm:p-8 space-y-8 bg-card border-3 border-foreground brutal-shadow">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary text-primary-foreground border-2 border-foreground brutal-shadow-sm">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black font-display uppercase tracking-tight">Verify your Email</h1>
                    <p className="text-muted-foreground text-sm font-mono mt-1">
                        We've sent a code to <span className="font-bold text-foreground border-b-2 border-primary">{formData.email}</span>
                    </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                    {error && <div className="p-3 text-sm text-red-500 bg-red-100 font-bold border-2 border-red-500 brutal-shadow-sm uppercase">{error}</div>}

                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider">Enter 8-digit OTP</label>
                        <input
                            type="text"
                            className="flex h-14 w-full rounded-none border-2 border-foreground bg-background px-3 text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all brutal-shadow-sm focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="00000000"
                            maxLength={8}
                            required
                        />
                        <p className="text-xs text-muted-foreground text-center font-mono uppercase">
                            Check your spam folder if you don't see it.
                        </p>
                    </div>

                    <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center rounded-none text-sm font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 h-11 border-2 border-foreground brutal-shadow transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                        {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : "Verify & Start"}
                    </button>
                </form>

                <button onClick={() => setStep(1)} className="w-full text-sm font-bold text-muted-foreground hover:text-primary flex items-center justify-center uppercase tracking-wide hover:underline decoration-2">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to details
                </button>
            </div>
        </div>
    )
}
