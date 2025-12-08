
import React, { useState } from 'react'
import { SignIn } from './SignIn'
import { SignUp } from './SignUp'

export function Auth() {
    const [isLogin, setIsLogin] = useState(true)

    if (isLogin) {
        return <SignIn onSwitch={() => setIsLogin(false)} />
    }
    return <SignUp onSwitch={() => setIsLogin(true)} />
}
