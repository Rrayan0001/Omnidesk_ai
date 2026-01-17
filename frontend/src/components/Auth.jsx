
import React, { useState, useEffect } from 'react'
import { SignIn } from './SignIn'
import { SignUp } from './SignUp'
import { ForgotPassword } from './ForgotPassword'
import { ResetPassword } from './ResetPassword'

export function Auth() {
    const [authView, setAuthView] = useState('signin')

    // Check URL hash for password reset
    useEffect(() => {
        const hash = window.location.hash
        if (hash.includes('type=recovery')) {
            setAuthView('reset-password')
        }
    }, [])

    if (authView === 'forgot-password') {
        return <ForgotPassword
            onBack={() => setAuthView('signin')}
            onVerified={() => setAuthView('reset-password')}
        />
    }

    if (authView === 'reset-password') {
        return <ResetPassword onSuccess={() => setAuthView('signin')} />
    }

    if (authView === 'signin') {
        return <SignIn onSwitch={() => setAuthView('signup')} onForgotPassword={() => setAuthView('forgot-password')} />
    }

    return <SignUp onSwitch={() => setAuthView('signin')} />
}
