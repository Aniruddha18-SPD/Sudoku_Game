"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useTheme } from "next-themes";
import { Play, Undo2, Lightbulb, CheckCircle2, PenTool, Eraser, LogOut, LogIn, Sparkles, EyeOff, AlertTriangle, Moon, Sun } from "lucide-react";

const difficulties = ["easy", "medium", "hard", "expert"] as const;

type Difficulty = (typeof difficulties)[number];

type HistoryItem = {
  id: string;
  difficulty: string;
  elapsedMs: number;
  score: number;
  timed: boolean;
  createdAt: string;
};

function emptyBoard() {
  return Array(81).fill(0) as number[];
}

function parseBoard(value: string) {
  return value.split("").map((c) => Number(c));
}

function boardToString(board: number[]) {
  return board.map((v) => (v === 0 ? "0" : String(v))).join("");
}

function cloneNotes(notes: number[][]) {
  return notes.map((cell) => [...cell]);
}

export default function HomePage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [fixed, setFixed] = useState<boolean[]>(Array(81).fill(false));
  const [board, setBoard] = useState<number[]>(emptyBoard());
  const [notes, setNotes] = useState<number[][]>(() => Array.from({ length: 81 }, () => []));
  const [selected, setSelected] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [timedMode, setTimedMode] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [scoreModal, setScoreModal] = useState<{ score: number; time: number } | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [wrongModal, setWrongModal] = useState<{ userBoard: number[]; solution: number[] } | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (timerRunning && timedMode) {
      timer = setInterval(() => {
        setElapsedMs((prev) => prev + 1000);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timerRunning, timedMode]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.completions) setHistory(data.completions);
      })
      .catch(() => null);
  }, [session?.user?.id]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (selected === null) return;
      if (event.key >= "1" && event.key <= "9") {
        handleInput(Number(event.key));
      }
      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        handleClear();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected, board, notes, noteMode, fixed]);

  const highlightCells = useMemo(() => {
    if (selected === null) return Array(81).fill(false) as boolean[];
    const row = Math.floor(selected / 9);
    const col = selected % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    return Array.from({ length: 81 }, (_, idx) => {
      const r = Math.floor(idx / 9);
      const c = idx % 9;
      return r === row || c === col || (r >= boxRow && r < boxRow + 3 && c >= boxCol && c < boxCol + 3);
    });
  }, [selected]);

  async function startNewGame() {
    setStatus("Generating a new puzzle...");
    const response = await fetch("/api/puzzle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty }),
    });

    if (!response.ok) {
      setStatus("Could not generate a puzzle.");
      return;
    }

    const data = await response.json();
    const puzzle = parseBoard(data.puzzle);
    setPuzzleId(data.puzzleId);
    setBoard(puzzle);
    setFixed(puzzle.map((value) => value !== 0));
    setNotes(Array.from({ length: 81 }, () => []));
    setSelected(null);
    setHintsUsed(0);
    setElapsedMs(0);
    setTimerRunning(true);  // flag it running, effect only fires if timedMode
    setStatus(null);
    setScoreModal(null);
  }

  function pushHistory(nextBoard: number[], nextNotes: number[][]) {
    setUndoStack((prev) => [{ board: nextBoard, notes: nextNotes }, ...prev].slice(0, 50));
  }

  const [undoStack, setUndoStack] = useState<{ board: number[]; notes: number[][] }[]>([]);

  function handleInput(value: number) {
    if (!puzzleId || selected === null || fixed[selected]) return;

    const nextBoard = [...board];
    const nextNotes = cloneNotes(notes);

    if (noteMode) {
      const cellNotes = new Set(nextNotes[selected]);
      if (cellNotes.has(value)) {
        cellNotes.delete(value);
      } else {
        cellNotes.add(value);
      }
      nextNotes[selected] = Array.from(cellNotes).sort();
    } else {
      nextBoard[selected] = value;
      nextNotes[selected] = [];
    }

    pushHistory(board, notes);
    setBoard(nextBoard);
    setNotes(nextNotes);
  }

  function handleClear() {
    if (!puzzleId || selected === null || fixed[selected]) return;
    pushHistory(board, notes);
    const nextBoard = [...board];
    const nextNotes = cloneNotes(notes);
    nextBoard[selected] = 0;
    nextNotes[selected] = [];
    setBoard(nextBoard);
    setNotes(nextNotes);
  }

  function handleUndo() {
    const prev = undoStack[0];
    if (!prev) return;
    setBoard(prev.board);
    setNotes(prev.notes);
    setUndoStack((stack) => stack.slice(1));
  }

  async function handleHint() {
    if (!puzzleId || !hintsEnabled) return;
    const response = await fetch("/api/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puzzleId, board: boardToString(board) }),
    });

    if (!response.ok) return;

    const data = await response.json();
    const idx = data.row * 9 + data.col;
    if (fixed[idx]) return;

    const nextBoard = [...board];
    const nextNotes = cloneNotes(notes);
    nextBoard[idx] = data.value;
    nextNotes[idx] = [];
    pushHistory(board, notes);
    setBoard(nextBoard);
    setNotes(nextNotes);
    setHintsUsed((prev) => prev + 1);
  }

  async function handleFinish() {
    if (!puzzleId) return;
    const response = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzleId,
        board: boardToString(board),
        elapsedMs,
        hintsUsed,
        timed: timedMode,
      }),
    });

    if (!response.ok) {
      setShowSubmitConfirm(false);
      setStatus("Could not check the solution.");
      return;
    }

    const data = await response.json();
    if (!data.correct) {
      setShowSubmitConfirm(false);
      // Fetch the correct solution to show a comparison
      const revealRes = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzleId }),
      });
      if (revealRes.ok) {
        const revealData = await revealRes.json();
        setWrongModal({ userBoard: [...board], solution: revealData.solution });
      } else {
        setStatus("Not quite right. Keep trying!");
      }
      return;
    }

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ffd3b6", "#ffaaa5", "#a8e6cf", "#dcedc1"],
    });

    setTimerRunning(false);
    setShowSubmitConfirm(false);
    setScoreModal({ score: data.score, time: elapsedMs });
    setStatus(null);

    if (session?.user?.id) {
      const historyResponse = await fetch("/api/history");
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(historyData.completions ?? []);
      }
    }
  }

  async function handleReveal() {
    if (!puzzleId) return;
    const response = await fetch("/api/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puzzleId }),
    });

    if (!response.ok) {
      setStatus("Could not reveal the solution.");
      return;
    }

    const data = await response.json();
    setBoard(data.solution);
    setNotes(Array.from({ length: 81 }, () => []));
    setTimerRunning(false);
    setStatus("Puzzle revealed. Better luck next time!");
    
    // We treat this as a completed puzzle functionally but it's not a win, we set all fields to fixed so user can't edit
    setFixed(Array(81).fill(true));
  }

  const formattedTime = `${String(Math.floor(elapsedMs / 60000)).padStart(2, "0")}:${String(
    Math.floor((elapsedMs % 60000) / 1000)
  ).padStart(2, "0")}`;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <main className="min-h-screen px-6 py-10 relative overflow-hidden">
      {/* Decorative background elements */}
      <motion.div 
        className="absolute top-20 left-10 w-64 h-64 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 40, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute top-40 right-20 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        animate={{ scale: [1, 1.1, 1], x: [0, -40, 0], y: [0, 60, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10"
      >
        <div>
          <Link href="/" passHref legacyBehavior>
            <motion.a 
              whileHover={{ scale: 1.02, x: 2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block cursor-pointer focus:outline-none"
            >
              <span className="badge-soft flex items-center gap-2 w-max text-rose-600 dark:text-rose-300 bg-white/60 mb-2">
                <Sparkles size={14} /> Wholesome Sudoku
              </span>
              <h1 className="text-4xl font-display mt-1 bg-clip-text text-transparent bg-gradient-to-r from-ink to-rose-600 dark:from-cream dark:to-orange-300">
                Sudoku for Us
              </h1>
            </motion.a>
          </Link>
            <div className="mt-2 text-sm font-medium bg-white/30 backdrop-blur-sm rounded-lg px-2 py-1 inline-block dark:bg-black/20 text-ink/80 dark:text-cream/90 flex items-center gap-2">
              {session?.user?.name ? <span>hey <strong>{session.user.name}</strong> 🤩 |</span> : ""} 
              <span>your cozy puzzle corner.</span>
            </div>
        </div>
        <div className="flex items-center gap-3 mt-4 lg:mt-0 z-50">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-outline !p-2 !rounded-full" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>

          {session?.user ? (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-outline" 
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut size={16} /> Sign out
            </motion.button>
          ) : (
            <Link href="/login" passHref legacyBehavior>
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-outline"
              >
                <LogIn size={16} /> Sign in
              </motion.a>
            </Link>
          )}
        </div>
      </motion.header>

      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mt-10 grid gap-8 lg:grid-cols-[360px_1fr] relative z-10"
      >
        <motion.aside variants={itemVariants} className="card-soft relative flex flex-col items-center">
          <div className="sticker -top-4 right-8">crafted with ❤️ vibes</div>
          <h2 className="text-2xl font-display w-full text-center">pick your vibe 🌟</h2>
          
          <div className="mt-6 flex flex-wrap gap-2 justify-center w-full">
            {difficulties.map((level) => (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={level}
                className={`badge-soft capitalize transition-all cursor-pointer ${difficulty === level ? "!bg-rose-500 !text-white !border-rose-500 shadow-md scale-105" : "hover:bg-rose-100 dark:hover:bg-rose-900/30 text-ink/70 dark:text-cream/70"}`}
                onClick={() => setDifficulty(level)}
              >
                {level}
              </motion.button>
            ))}
          </div>

          <div className="mt-8 space-y-3 w-full">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">timer mode ⏱️</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`badge-soft transition-all ${timedMode ? "bg-rose-100 text-rose-700 border-rose-300" : ""}`}
                onClick={() => setTimedMode((prev) => !prev)}
                disabled={!!puzzleId}
                title={puzzleId ? "start a new game to change this" : ""}
              >
                {timedMode ? "on ⏳" : "off 😌"}
              </motion.button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">hints? 🧠</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`badge-soft ${hintsEnabled ? "bg-emerald-200 text-emerald-800 border-emerald-300" : ""}`}
                onClick={() => setHintsEnabled((prev) => !prev)}
              >
                {hintsEnabled ? "yeah lol" : "nah"}
              </motion.button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">pencil mode ✏️</span>
              <span className="badge-soft bg-white/70">always ready</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">oops button 🔙</span>
              <span className="badge-soft bg-white/70">always on</span>
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(249, 115, 22, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary w-full mt-8" 
            onClick={startNewGame}
          >
            <Play size={18} /> {puzzleId ? "start fresh 🔄" : "let's gooo 🚀"}
          </motion.button>

          <AnimatePresence>
            {puzzleId && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full overflow-hidden"
              >
                 <div className="mt-6 grid gap-3 w-full">
                  {timedMode ? (
                    <div className="flex items-center justify-between rounded-2xl bg-rose-50 border border-rose-100 shadow-sm px-4 py-3 dark:bg-rose-900/20 dark:border-rose-900">
                      <span className="text-sm font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1">⏱️ time</span>
                      <span className="font-mono font-semibold text-rose-500 tracking-wider text-base">{formattedTime}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-2xl bg-white/40 border border-white/30 shadow-sm px-4 py-3 dark:bg-neutral-800/40 dark:border-neutral-700">
                      <span className="text-sm font-medium text-ink/50 dark:text-cream/50 flex items-center gap-1">😌 no timer</span>
                      <span className="text-xs badge-soft text-ink/40 dark:text-cream/40">chillin&apos;</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-2xl bg-white/50 border border-white/40 shadow-sm px-4 py-3">
                    <span className="text-sm font-medium">hints used</span>
                    <span className="font-semibold">{hintsUsed}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-outline w-full disabled:opacity-50"
                    onClick={handleHint}
                    disabled={!hintsEnabled}
                  >
                    <Lightbulb size={16} /> help me out 💡
                  </motion.button>
                </div>

                <div className="mt-6 flex gap-3 w-full">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`btn-outline flex-1 ${noteMode ? "bg-amber-100/80 border-amber-200" : ""}`} 
                    onClick={() => setNoteMode((prev) => !prev)}
                  >
                    <PenTool size={16} /> Notes
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-outline flex-1" 
                    onClick={handleUndo}
                  >
                    <Undo2 size={16} /> Undo
                  </motion.button>
                </div>

                <div className="flex gap-3 w-full mt-4">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-outline flex-1 border-rose-200 text-rose-600 hover:bg-rose-50" 
                    onClick={handleReveal}
                  >
                    <EyeOff size={18} /> i give up 🏳️
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary flex-1 !bg-gradient-to-r !from-emerald-400 !to-teal-400 !shadow-emerald-500/30" 
                    onClick={() => setShowSubmitConfirm(true)}
                  >
                    <CheckCircle2 size={18} /> i'm done, check it ✨
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {status && (
             <motion.p 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="mt-4 text-sm font-medium text-orange-700 bg-orange-100/50 px-3 py-1 rounded-full text-center"
             >
               {status}
             </motion.p>
          )}
        </motion.aside>

        <motion.section variants={itemVariants} className="card-soft relative flex flex-col items-center">
          <div className="sticker -top-4 left-10">no rush, take your time 🌸</div>
          
          <div className="grid grid-cols-3 gap-2 sm:gap-3 rounded-2xl sm:rounded-3xl bg-white/40 border border-white/60 p-3 sm:p-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] w-full max-w-lg aspect-square">
            {Array.from({ length: 9 }).map((_, boxIdx) => {
              const boxRow = Math.floor(boxIdx / 3);
              const boxCol = boxIdx % 3;
              
              return (
                <div key={boxIdx} className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 9 }).map((_, innerIdx) => {
                    const innerRow = Math.floor(innerIdx / 3);
                    const innerCol = innerIdx % 3;
                    const row = boxRow * 3 + innerRow;
                    const col = boxCol * 3 + innerCol;
                    const idx = row * 9 + col;
                    
                    const value = board[idx];
                    const isSelected = selected === idx;
                    const isFixed = fixed[idx];
                    const highlight = highlightCells[idx];
                    const cellNotes = notes[idx];
                    
                    return (
                      <motion.div
                        whileHover={!isFixed ? { scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.9)", zIndex: 10 } : {}}
                        whileTap={!isFixed ? { scale: 0.95 } : {}}
                        initial={puzzleId ? { scale: 0.5, opacity: 0 } : false}
                        animate={puzzleId ? { scale: 1, opacity: 1 } : false}
                        transition={{ delay: puzzleId ? (idx % 9) * 0.02 + Math.floor(idx / 9) * 0.02 : 0 }}
                        key={`${puzzleId}-${idx}`}
                        className={`grid-cell relative border border-white/40 shadow-sm ${isFixed ? "fixed" : "editable"} ${
                          isSelected ? "selected" : ""
                        } ${highlight && !isSelected ? "highlight" : ""}`}
                        onClick={() => {
                          if (puzzleId) setSelected(idx);
                        }}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[1-9]*"
                          maxLength={1}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          value={value !== 0 ? String(value) : ""}
                          onChange={(e) => {
                             const val = e.target.value.slice(-1);
                             if (val >= "1" && val <= "9") {
                               handleInput(Number(val));
                             } else if (val === "" || val === "0") {
                               handleClear();
                             }
                          }}
                          disabled={!puzzleId || isFixed}
                          aria-label={`Cell ${idx}`}
                        />
                        {value !== 0 ? (
                          <span className={`pointer-events-none transition-transform ${isFixed ? "text-ink text-xl sm:text-2xl font-semibold" : "text-rose-600 text-xl sm:text-2xl font-bold font-display drop-shadow-sm scale-[1.15]"}`}>{value}</span>
                        ) : cellNotes.length > 0 ? (
                          <div className="grid grid-cols-3 w-full h-full p-0.5 pointer-events-none">
                            {Array.from({ length: 9 }, (_, n) => n + 1).map((num) => (
                              <span key={num} className="text-[9px] sm:text-[11px] leading-none flex items-center justify-center text-ink/40 font-medium">
                                {cellNotes.includes(num) ? num : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-5 gap-2 sm:gap-3 w-full max-w-lg">
            {Array.from({ length: 9 }, (_, idx) => idx + 1).map((num) => (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                key={num} 
                className="btn-outline text-lg !py-3 font-display" 
                onClick={() => handleInput(num)}
              >
                {num}
              </motion.button>
            ))}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              className="btn-outline col-span-2 flex items-center justify-center gap-2 !py-3" 
              onClick={handleClear}
            >
              <Eraser size={18} /> Clear
            </motion.button>
          </div>
        </motion.section>
      </motion.section>

      {session?.user?.id && (
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-10 card-soft max-w-3xl relative z-10"
        >
          <h2 className="text-2xl font-display flex items-center gap-2">your W's 💫 <Sparkles size={20} className="text-orange-400" /></h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {history.length === 0 ? (
              <p className="text-sm text-ink/70">nothing yet... go solve something bestie 👀</p>
            ) : (
              history.slice(0, 6).map((item) => (
                <motion.div
                  variants={itemVariants}
                  key={item.id}
                  className={`flex items-center justify-between rounded-2xl shadow-sm px-4 py-3 border ${item.timed ? "bg-white/60 border-white/50 dark:bg-neutral-800/60 dark:border-neutral-700" : "bg-emerald-50/60 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${item.timed ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"}`}>
                      {item.timed ? "⏱️ timed" : "😌 chill"}
                    </span>
                    <span className="capitalize text-sm font-medium">{item.difficulty}</span>
                  </div>
                  <span className="text-sm text-ink/70 dark:text-cream/70 font-mono">
                    {item.timed
                      ? `${Math.floor(item.elapsedMs / 60000)}m ${Math.floor((item.elapsedMs % 60000) / 1000)}s`
                      : "—"}
                  </span>
                  <span className="text-sm font-semibold text-rose-500">{item.score} pts</span>
                </motion.div>
              ))
            )}
          </div>
          {history.length > 6 && (
            <div className="mt-4 text-center">
              <span className="text-xs text-ink/50 font-medium bg-white/30 backdrop-blur-sm px-2 py-1 rounded-md">showing your last 6 🔥</span>
            </div>
          )}
        </motion.section>
      )}

      <AnimatePresence>
        {scoreModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-white/20 backdrop-blur-md px-6 z-50"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="card-soft max-w-sm w-full text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border-white/80 border-2"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <h3 className="text-3xl font-display bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">no way you did it!! 🎉</h3>
              <p className="mt-2 text-sm text-ink/70 font-medium">genuinely impressed rn. that was clean asf.</p>
              
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center rounded-2xl bg-white/60 border border-white/50 px-4 py-3">
                  <span className="text-sm font-medium text-ink/80">Time</span>
                  <span className="text-lg font-mono font-semibold text-ink">{formattedTime}</span>
                </div>
                <div className="flex justify-between items-center rounded-2xl bg-teal-50 border border-teal-100 px-4 py-3">
                  <span className="text-sm font-medium text-teal-800">Score</span>
                  <span className="text-xl font-bold text-teal-600">{scoreModal.score}</span>
                </div>
                <div className="flex justify-between items-center rounded-2xl bg-white/60 border border-white/50 px-4 py-3">
                  <span className="text-sm font-medium text-ink/80">Hints used</span>
                  <span className="text-sm font-semibold">{hintsUsed}</span>
                </div>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary w-full mt-8 !text-lg !py-3 !bg-gradient-to-r !from-emerald-400 !to-teal-400 !shadow-emerald-500/30 font-display" 
                onClick={() => setScoreModal(null)}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {showSubmitConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-white/20 backdrop-blur-md px-6 z-50"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="card-soft max-w-sm w-full text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border-orange-200 border-2"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-300 to-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                <AlertTriangle size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-display bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-rose-600">hold up, you sure? 🔔</h3>
              <p className="mt-2 text-sm text-ink/80 font-medium dark:text-cream/80">once you submit it's a done deal — no edits, no takebacks. your time is getting locked in fr.</p>
              
              <div className="mt-6 flex gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-outline flex-1" 
                  onClick={() => setShowSubmitConfirm(false)}
                >
                  Cancel
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary flex-1 !bg-gradient-to-r !from-orange-400 !to-rose-400" 
                  onClick={() => handleFinish()}
                >
                  yep, lock it in 🔐
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {wrongModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-md px-4 z-50 overflow-y-auto py-8"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="card-soft w-full max-w-2xl text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border-rose-200 dark:border-rose-900 border-2"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/30">
                <AlertTriangle size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-display bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-red-500">oof, not quite 😬</h3>
              <p className="mt-1 text-sm text-ink/70 dark:text-cream/70 font-medium">no worries tho! here's how your answers stacked up against the real deal.</p>

              <div className="mt-6 grid grid-cols-2 gap-4 text-left">
                {/* User board */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-2 text-center">what you put 👀</p>
                  <div className="grid grid-cols-9 gap-px bg-rose-200/60 dark:bg-rose-900/30 rounded-xl overflow-hidden border border-rose-200 dark:border-rose-800">
                    {wrongModal.userBoard.map((val, idx) => {
                      const isWrong = val !== 0 && val !== wrongModal.solution[idx];
                      const isEmpty = val === 0;
                      return (
                        <div
                          key={idx}
                          className={`aspect-square flex items-center justify-center text-[10px] sm:text-xs font-semibold
                            ${isWrong ? "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400" :
                              isEmpty ? "bg-white/60 dark:bg-neutral-800/60 text-ink/30 dark:text-white/30" :
                              "bg-white/80 dark:bg-neutral-800 text-ink/80 dark:text-neutral-200"}
                            ${[2,5,8,11,14,17,20,23,26,29,32,35,38,41,44,47,50,53,56,59,62,65,68,71,74,77,80].includes(idx) ? "border-r-0" : ""}
                          `}
                        >
                          {val !== 0 ? val : ""}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Solution board */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2 text-center">the real answer ✅</p>
                  <div className="grid grid-cols-9 gap-px bg-emerald-200/60 dark:bg-emerald-900/30 rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-800">
                    {wrongModal.solution.map((val, idx) => {
                      const userVal = wrongModal.userBoard[idx];
                      const wasMistake = userVal !== 0 && userVal !== val;
                      return (
                        <div
                          key={idx}
                          className={`aspect-square flex items-center justify-center text-[10px] sm:text-xs font-semibold
                            ${wasMistake ? "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold" :
                              "bg-white/80 dark:bg-neutral-800 text-ink/80 dark:text-neutral-200"}
                          `}
                        >
                          {val}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs text-ink/50 dark:text-cream/50">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-200 dark:bg-rose-800 mr-1 align-middle"></span>
                Red cells = mistakes &nbsp;
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-100 dark:bg-emerald-800 ml-2 mr-1 align-middle"></span>
                Green = corrected position
              </p>

              <div className="mt-6 flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-outline flex-1"
                  onClick={() => setWrongModal(null)}
                >
                  keep trying 💪
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary flex-1"
                  onClick={() => { setWrongModal(null); startNewGame(); }}
                >
                  <Play size={16} /> fresh start ✨
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
