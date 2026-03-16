"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Play, Undo2, Lightbulb, CheckCircle2, PenTool, Eraser, LogOut, LogIn, Sparkles, EyeOff, AlertTriangle } from "lucide-react";

const difficulties = ["easy", "medium", "hard", "expert"] as const;

type Difficulty = (typeof difficulties)[number];

type HistoryItem = {
  id: string;
  difficulty: string;
  elapsedMs: number;
  score: number;
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
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [fixed, setFixed] = useState<boolean[]>(Array(81).fill(false));
  const [board, setBoard] = useState<number[]>(emptyBoard());
  const [notes, setNotes] = useState<number[][]>(() => Array.from({ length: 81 }, () => []));
  const [selected, setSelected] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [scoreModal, setScoreModal] = useState<{ score: number; time: number } | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (timerRunning) {
      timer = setInterval(() => {
        setElapsedMs((prev) => prev + 1000);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timerRunning]);

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
    setTimerRunning(true);
    setStatus(null);
    setScoreModal(null);
  }

  function pushHistory(nextBoard: number[], nextNotes: number[][]) {
    setUndoStack((prev) => [{ board: nextBoard, notes: nextNotes }, ...prev].slice(0, 50));
  }

  const [undoStack, setUndoStack] = useState<{ board: number[]; notes: number[][] }[]>([]);

  function handleInput(value: number) {
    if (selected === null || fixed[selected]) return;

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
    if (selected === null || fixed[selected]) return;
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
      }),
    });

    if (!response.ok) {
      setStatus("Could not check the solution.");
      return;
    }

    const data = await response.json();
    if (!data.correct) {
      setStatus("Not quite solved yet. You got this.");
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
              <span className="badge-soft flex items-center gap-2 w-max text-rose-600 bg-white/60 mb-2">
                <Sparkles size={14} /> Wholesome Sudoku
              </span>
              <h1 className="text-4xl font-display mt-1 bg-clip-text text-transparent bg-gradient-to-r from-ink to-rose-600">
                Sudoku for Us
              </h1>
            </motion.a>
          </Link>
          <div className="mt-2">
            <p className="text-sm text-ink/70 font-medium bg-white/30 backdrop-blur-sm rounded-lg px-2 py-1 inline-block">
              A cozy puzzle corner with pastel vibes and just enough sparkle.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          <div className="sticker -top-4 right-8">Made with love ✨</div>
          <h2 className="text-2xl font-display w-full text-center">Start a new puzzle</h2>
          
          <div className="mt-6 flex flex-wrap gap-2 justify-center w-full">
            {difficulties.map((level) => (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={level}
                className={`badge-soft capitalize ${difficulty === level ? "bg-orange-300 text-white border-orange-400 shadow-md" : ""}`}
                onClick={() => setDifficulty(level)}
              >
                {level}
              </motion.button>
            ))}
          </div>

          <div className="mt-8 space-y-3 w-full">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Clues (Hints)</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`badge-soft ${hintsEnabled ? "bg-emerald-200 text-emerald-800 border-emerald-300" : ""}`}
                onClick={() => setHintsEnabled((prev) => !prev)}
              >
                {hintsEnabled ? "On" : "Off"}
              </motion.button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Notes</span>
              <span className="badge-soft bg-white/70">Always on</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Undo</span>
              <span className="badge-soft bg-white/70">Always on</span>
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(249, 115, 22, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary w-full mt-8" 
            onClick={startNewGame}
          >
            <Play size={18} /> {puzzleId ? "Start New Instead" : "Start a New Puzzle"}
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
                  <div className="flex items-center justify-between rounded-2xl bg-white/50 border border-white/40 shadow-sm px-4 py-3">
                    <span className="text-sm font-medium">Timer</span>
                    <span className="font-mono font-semibold text-rose-500 tracking-wider text-base">{formattedTime}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/50 border border-white/40 shadow-sm px-4 py-3">
                    <span className="text-sm font-medium">Hints used</span>
                    <span className="font-semibold">{hintsUsed}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-outline w-full disabled:opacity-50"
                    onClick={handleHint}
                    disabled={!hintsEnabled}
                  >
                    <Lightbulb size={16} /> Get a Hint
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
                    <EyeOff size={18} /> Give Up
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary flex-1 !bg-gradient-to-r !from-emerald-400 !to-teal-400 !shadow-emerald-500/30" 
                    onClick={() => setShowSubmitConfirm(true)}
                  >
                    <CheckCircle2 size={18} /> Submit
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
          <div className="sticker -top-4 left-10">No pressure, just vibes 🌸</div>
          
          <div className="grid grid-cols-9 gap-1 rounded-3xl bg-white/40 border border-white/60 p-3 sm:p-5 shadow-inner w-full max-w-lg aspect-square">
            {board.map((value, idx) => {
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
                  className={`grid-cell relative ${isFixed ? "fixed" : "editable"} ${
                    isSelected ? "selected" : ""
                  } ${highlight && !isSelected ? "highlight" : ""}`}
                  style={{
                    borderWidth: idx % 3 === 0 ? 2 : 1,
                    borderRightWidth: (idx + 1) % 3 === 0 ? 2 : 1,
                    borderTopWidth: idx < 9 ? 2 : 1,
                    borderBottomWidth: idx >= 72 ? 2 : 1,
                    borderColor: 'rgba(255,255,255,0.4)',
                  }}
                  onClick={() => setSelected(idx)}
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
                    disabled={isFixed}
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
          <h2 className="text-2xl font-display flex items-center gap-2">Your recent wins <Sparkles size={20} className="text-orange-400" /></h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {history.length === 0 ? (
              <p className="text-sm text-ink/70">No completed puzzles yet.</p>
            ) : (
              history.slice(0, 6).map((item) => (
                <motion.div
                  variants={itemVariants}
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl bg-white/60 border border-white/50 shadow-sm px-4 py-3"
                >
                  <span className="capitalize text-sm font-medium">{item.difficulty}</span>
                  <span className="text-sm text-ink/70 font-mono">
                    {Math.floor(item.elapsedMs / 60000)}m {Math.floor((item.elapsedMs % 60000) / 1000)}s
                  </span>
                  <span className="text-sm font-semibold text-rose-500">{item.score} pts</span>
                </motion.div>
              ))
            )}
          </div>
          {history.length > 6 && (
            <div className="mt-4 text-center">
              <span className="text-xs text-ink/50 font-medium bg-white/30 backdrop-blur-sm px-2 py-1 rounded-md">Showing latest 6 completions</span>
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
              <h3 className="text-3xl font-display bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">You did it!</h3>
              <p className="mt-2 text-sm text-ink/70 font-medium">Proud of you. That was so smooth.</p>
              
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
              <h3 className="text-2xl font-display bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-rose-600">Are you sure?</h3>
              <p className="mt-2 text-sm text-ink/80 font-medium">No edits can be made once submitted and your scored time will be final.</p>
              
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
                  Yes, Submit
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
