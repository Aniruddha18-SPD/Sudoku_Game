"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Sparkles, Trophy, Zap, Heart, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";

export default function LandingPage() {
  const { data: session } = useSession();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <main className="min-h-screen px-6 py-12 relative overflow-hidden flex flex-col items-center">
      {/* Background elements */}
      <motion.div 
        className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 z-0"
        animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 40, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-10 right-[-10%] w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 z-0"
        animate={{ scale: [1, 1.1, 1], x: [0, -40, 0], y: [0, -60, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <nav className="w-full max-w-5xl z-20 flex justify-between items-center mb-10 md:mb-20 bg-white/40 backdrop-blur-md rounded-2xl px-6 py-4 shadow-sm border border-white/50">
        <div className="flex items-center gap-2 font-display text-2xl text-rose-600">
          <Sparkles /> Sudoku for Us
        </div>
        <div className="flex gap-4">
          {session?.user ? (
             <Link href="/play" passHref legacyBehavior>
                <motion.a 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-outline !px-4 !py-2 text-sm bg-white/70"
                >
                  Dashboard
                </motion.a>
             </Link>
          ) : (
            <Link href="/login" passHref legacyBehavior>
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-outline !px-4 !py-2 text-sm bg-white/70"
              >
                Log In
              </motion.a>
            </Link>
          )}
        </div>
      </nav>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-5xl z-10 flex flex-col items-center text-center mt-4 md:mt-10"
      >
        <motion.div variants={itemVariants} className="badge-soft flex items-center gap-2 mb-6 text-emerald-700 bg-emerald-50 border-emerald-200">
          <Zap size={16} /> A relaxing logic puzzle tailored for you
        </motion.div>
        
        <motion.h1 
          variants={itemVariants} 
          className="text-6xl md:text-8xl font-display mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-ink via-rose-800 to-rose-500 leading-tight pb-2"
        >
          Sudoku, but Aesthetic.
        </motion.h1>
        
        <motion.p 
          variants={itemVariants} 
          className="text-lg md:text-xl text-ink/80 max-w-2xl mb-12 font-medium bg-white/30 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/40"
        >
          Unwind with beautiful pastel colors, satisfying animations, and just the right amount of challenge. No stressful ads, just pure focus and good vibes.
        </motion.p>
        
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/play" passHref legacyBehavior>
            <motion.a 
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(249, 115, 22, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary !text-lg !px-8 !py-4"
            >
              <Play size={20} /> Play Game
            </motion.a>
          </Link>

          {!session?.user && (
            <Link href="/login" passHref legacyBehavior>
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-outline !text-lg !px-8 !py-4 bg-white/70 shadow-md"
              >
                Sign In to Track Scores <ArrowRight size={20} />
              </motion.a>
            </Link>
          )}
        </motion.div>
      </motion.div>

      {/* Features Section */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="w-full max-w-5xl z-10 grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 pb-20"
      >
        <motion.div variants={itemVariants} className="card-soft flex flex-col items-center text-center p-8 transition-transform hover:-translate-y-2">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-500 mb-6 shadow-inner ring-1 ring-rose-200">
            <Heart size={32} />
          </div>
          <h3 className="text-2xl font-display mb-3">Pure Vibes</h3>
          <p className="text-ink/70">No aggressive timers, no stressful sounds. Just smooth glassmorphism and calming colors to clear your mind.</p>
        </motion.div>
        
        <motion.div variants={itemVariants} className="card-soft flex flex-col items-center text-center p-8 transition-transform hover:-translate-y-2">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-600 mb-6 shadow-inner ring-1 ring-teal-200">
            <Zap size={32} />
          </div>
          <h3 className="text-2xl font-display mb-3">Fluid Interactions</h3>
          <p className="text-ink/70">Every tap, hover, and completed puzzle is met with satisfying micro-animations to keep you engaged.</p>
        </motion.div>

        <motion.div variants={itemVariants} className="card-soft flex flex-col items-center text-center p-8 transition-transform hover:-translate-y-2">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6 shadow-inner ring-1 ring-amber-200">
            <Trophy size={32} />
          </div>
          <h3 className="text-2xl font-display mb-3">Track Progress</h3>
          <p className="text-ink/70">Sign in to save your personal bests, secure your history, and see how fast you conquer the expert levels.</p>
        </motion.div>
      </motion.div>
    </main>
  );
}
