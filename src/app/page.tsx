"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Sparkles, Trophy, Zap, Heart, ArrowRight, Sun, Moon, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";

export default function LandingPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

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
        <div className="flex items-center gap-2 font-display text-2xl text-rose-600 dark:text-rose-300">
          <Sparkles /> Sudoku for Us
        </div>
        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-outline !p-2 !rounded-full bg-white/70" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>
          {session?.user ? (
            <>
              <Link href="/play" passHref legacyBehavior>
                 <motion.a 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   className="btn-primary !px-4 !py-2 text-sm"
                 >
                   Dashboard
                 </motion.a>
              </Link>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-outline !px-4 !py-2 text-sm bg-white/70 dark:bg-black/40"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut size={16} /> Sign out
              </motion.button>
            </>
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
          <Zap size={16} /> no cap, this sudoku actually slaps ✨
        </motion.div>
        
        <motion.h1 
          variants={itemVariants} 
          className="text-6xl md:text-8xl font-display mb-2 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-ink via-rose-800 to-rose-500 dark:from-cream dark:via-rose-300 dark:to-orange-300 leading-tight pb-2 max-w-4xl"
        >
          {session?.user?.name ? `hey ${session.user.name}, you're back 🫶` : "sudoku, but make it cute."}
        </motion.h1>
        
        <motion.p 
          variants={itemVariants} 
          className="text-lg md:text-xl text-ink/80 max-w-2xl mb-12 font-medium bg-white/30 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/40"
        >
          your brain needs a break and we got you. solve puzzles, feel that satisfying click, and actually enjoy yourself for once. zero ads, zero stress, just vibes. 🌸
        </motion.p>
        
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/play" passHref legacyBehavior>
            <motion.a 
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(249, 115, 22, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary !text-lg !px-8 !py-4"
            >
              <Play size={20} /> let's get it 🎮
            </motion.a>
          </Link>

          {!session?.user && (
            <Link href="/login" passHref legacyBehavior>
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-outline !text-lg !px-8 !py-4 bg-white/70 shadow-md"
              >
                sign in & flex your scores <ArrowRight size={20} />
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
          <h3 className="text-2xl font-display mb-3">Main character energy 💅</h3>
          <p className="text-ink/70">no annoying timers breathing down your neck. just you, the puzzle, and some really pretty colors. it's giving zen.</p>
        </motion.div>
        
        <motion.div variants={itemVariants} className="card-soft flex flex-col items-center text-center p-8 transition-transform hover:-translate-y-2">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-600 mb-6 shadow-inner ring-1 ring-teal-200">
            <Zap size={32} />
          </div>
          <h3 className="text-2xl font-display mb-3">satisfying af ⚡</h3>
          <p className="text-ink/70">every tap hits different. smooth animations, buttery transitions — the kind of polish that makes you go "wait that was clean".</p>
        </motion.div>

        <motion.div variants={itemVariants} className="card-soft flex flex-col items-center text-center p-8 transition-transform hover:-translate-y-2">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6 shadow-inner ring-1 ring-amber-200">
            <Trophy size={32} />
          </div>
          <h3 className="text-2xl font-display mb-3">lowkey competitive 🏆</h3>
          <p className="text-ink/70">sign in, save your scores, and let the numbers speak. show the expert level who's boss — then screenshot it for the 'gram.</p>
        </motion.div>
      </motion.div>
    </main>
  );
}
