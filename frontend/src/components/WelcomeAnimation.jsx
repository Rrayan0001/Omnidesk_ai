import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function WelcomeAnimation({ onComplete }) {
  const [isExited, setIsExited] = useState(false);

  useEffect(() => {
    // Hold the splash screen for 3.2 seconds total before starting exit
    const timer = setTimeout(() => {
      setIsExited(true);
    }, 3200);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isExited) {
      // Let the fadeout finish (600ms) before calling onComplete
      const exitTimer = setTimeout(() => {
        onComplete();
      }, 600);
      return () => clearTimeout(exitTimer);
    }
  }, [isExited, onComplete]);

  const brandName = "RAYANAI";
  const letterVariants = {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center bg-[#030712] z-[99999] overflow-hidden select-none"
      animate={isExited ? { opacity: 0, scale: 1.08 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.77, 0, 0.175, 1] }}
    >
      {/* Background Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0ea5e905_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e905_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none" />

      {/* Cyber/Neon Radial Background Glows */}
      <motion.div
        className="absolute w-[450px] h-[450px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[250px] h-[250px] rounded-full bg-blue-600/5 blur-[80px] pointer-events-none"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />

      {/* Center Animation Group */}
      <div className="flex flex-col items-center justify-center z-10">
        
        {/* Logo Frame Container */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          
          {/* Outer Rotating/Expanding Rings */}
          <svg className="absolute w-52 h-52 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
            {/* Solid Ring */}
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              stroke="#ffffff"
              strokeWidth="1.5"
              fill="transparent"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.9 }}
              transition={{ duration: 1.8, ease: [0.77, 0, 0.175, 1], delay: 0.2 }}
            />
            {/* Outer Dotted Ring */}
            <motion.circle
              cx="50"
              cy="50"
              r="47"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1"
              fill="transparent"
              strokeDasharray="4 6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={{ duration: 2.2, ease: "easeOut", delay: 0.4 }}
            />
          </svg>

          {/* Logo Reveal Core */}
          <motion.div
            className="relative w-36 h-36 p-5 bg-[#0b0f19]/80 backdrop-blur-lg border border-white/20 rounded-full flex items-center justify-center overflow-hidden"
            initial={{ 
              scale: 0.7, 
              opacity: 0,
              clipPath: "circle(0% at 50% 50%)"
            }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              clipPath: "circle(100% at 50% 50%)"
            }}
            transition={{ 
              opacity: { duration: 0.4 },
              clipPath: { duration: 1.5, ease: [0.77, 0, 0.175, 1], delay: 0.3 },
              scale: { duration: 1.6, type: "spring", stiffness: 70, damping: 14, delay: 0.3 }
            }}
          >
            <img
              src="/logo.png"
              alt="RayanAI Logo"
              className="w-full h-full object-contain select-none pointer-events-none"
            />

            {/* Sweep glare effect */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
              initial={{ left: "-150%" }}
              animate={{ left: "150%" }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 1.6 }}
            />
          </motion.div>
          
        </div>

        {/* Brand Name Text (Staggered spring letters) */}
        <motion.div 
          className="flex space-x-1 mt-6 overflow-hidden"
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.07, delayChildren: 1.2 }}
        >
          {brandName.split("").map((letter, idx) => (
            <motion.span
              key={idx}
              variants={letterVariants}
              transition={{ type: "spring", stiffness: 120, damping: 11 }}
              className="text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-white font-display"
            >
              {letter}
            </motion.span>
          ))}
        </motion.div>

        {/* Subtitle / Council Monospace text */}
        <motion.p
          className="text-[10px] sm:text-xs font-mono tracking-[0.25em] sm:tracking-[0.4em] uppercase text-white/80 font-bold mt-3 text-center opacity-80"
          initial={{ opacity: 0, y: 10, letterSpacing: "0.15em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.3em" }}
          transition={{ duration: 1.0, ease: "easeOut", delay: 1.8 }}
        >
          Multi-Model LLM Council
        </motion.p>

      </div>
      
      {/* Skip Button - positioned discretely at the bottom right */}
      <motion.button
        className="absolute bottom-6 right-8 text-[10px] font-mono tracking-widest text-white/40 hover:text-white uppercase bg-transparent border border-white/10 hover:border-white/40 rounded-none px-3 py-1.5 transition-all select-none cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.5 }}
        onClick={() => setIsExited(true)}
      >
        Skip Intro //
      </motion.button>
    </motion.div>
  );
}
