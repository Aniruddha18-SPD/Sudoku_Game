"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

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
  const [noteMode, setNoteMode] = useState(true);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [scoreModal, setScoreModal] = useState<{ score: number; time: number } | null>(null);

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

    setTimerRunning(false);
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

  const formattedTime = `${String(Math.floor(elapsedMs / 60000)).padStart(2, "0")}:${String(
    Math.floor((elapsedMs % 60000) / 1000)
  ).padStart(2, "0")}`;

  return (
    <main className="min-h-screen px-6 py-10">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="badge-soft">Wholesome Sudoku</p>
          <h1 className="text-4xl font-display mt-3">Sudoku for Us</h1>
          <p className="text-sm text-ink/70 mt-2">
            A cozy puzzle corner with pastel vibes and just enough sparkle.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <button className="btn-outline" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </button>
          ) : (
            <Link className="btn-outline" href="/login">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <section className="mt-10 grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="card-soft relative">
          <div className="sticker -top-4 right-8">Made with love</div>
          <h2 className="text-2xl font-display">Start a new puzzle</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {difficulties.map((level) => (
              <button
                key={level}
                className={`badge-soft capitalize ${difficulty === level ? "bg-orange-200" : ""}`}
                onClick={() => setDifficulty(level)}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Clues (Hints)</span>
              <button
                className={`badge-soft ${hintsEnabled ? "bg-emerald-100" : ""}`}
                onClick={() => setHintsEnabled((prev) => !prev)}
              >
                {hintsEnabled ? "On" : "Off"}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Notes</span>
              <span className="badge-soft bg-white">Always on</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Undo</span>
              <span className="badge-soft bg-white">Always on</span>
            </div>
          </div>

          <button className="btn-primary w-full mt-6" onClick={startNewGame}>
            Start a New Puzzle
          </button>

          <div className="mt-6 grid gap-3">
            <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
              <span className="text-sm font-medium">Timer</span>
              <span className="font-semibold">{formattedTime}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
              <span className="text-sm font-medium">Hints used</span>
              <span className="font-semibold">{hintsUsed}</span>
            </div>
            <button
              className="btn-outline w-full"
              onClick={handleHint}
              disabled={!hintsEnabled || !puzzleId}
            >
              Get a Hint
            </button>
          </div>

          <div className="mt-6 flex gap-3">
            <button className="btn-outline flex-1" onClick={() => setNoteMode((prev) => !prev)}>
              Notes: {noteMode ? "On" : "Off"}
            </button>
            <button className="btn-outline flex-1" onClick={handleUndo}>
              Undo
            </button>
          </div>

          <button className="btn-primary w-full mt-4" onClick={handleFinish}>
            Finish Puzzle
          </button>

          {status ? <p className="mt-4 text-sm text-orange-700">{status}</p> : null}
        </aside>

        <section className="card-soft relative">
          <div className="sticker -top-4 left-10">No pressure, just vibes</div>
          <div className="grid grid-cols-9 gap-1 rounded-3xl bg-white/90 p-4">
            {board.map((value, idx) => {
              const isSelected = selected === idx;
              const isFixed = fixed[idx];
              const highlight = highlightCells[idx];
              const cellNotes = notes[idx];
              return (
                <button
                  key={idx}
                  className={`grid-cell ${isFixed ? "fixed" : "editable"} ${
                    isSelected ? "selected" : ""
                  } ${highlight && !isSelected ? "highlight" : ""}`}
                  style={{
                    borderWidth:
                      idx % 3 === 0 ? 2 : 1,
                    borderRightWidth: (idx + 1) % 3 === 0 ? 2 : 1,
                    borderTopWidth: idx < 9 ? 2 : 1,
                    borderBottomWidth: idx >= 72 ? 2 : 1,
                  }}
                  onClick={() => setSelected(idx)}
                >
                  {value !== 0 ? (
                    value
                  ) : cellNotes.length > 0 ? (
                    <div className="grid grid-cols-3 text-[10px] text-ink/60">
                      {Array.from({ length: 9 }, (_, n) => n + 1).map((num) => (
                        <span key={num} className="text-center">
                          {cellNotes.includes(num) ? num : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    ""
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-5 gap-2">
            {Array.from({ length: 9 }, (_, idx) => idx + 1).map((num) => (
              <button key={num} className="btn-outline" onClick={() => handleInput(num)}>
                {num}
              </button>
            ))}
            <button className="btn-outline col-span-2" onClick={handleClear}>
              Clear
            </button>
          </div>
        </section>
      </section>

      {session?.user?.id ? (
        <section className="mt-10 card-soft">
          <h2 className="text-2xl font-display">Your recent wins</h2>
          <div className="mt-4 grid gap-3">
            {history.length === 0 ? (
              <p className="text-sm text-ink/70">No completed puzzles yet.</p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3"
                >
                  <span className="capitalize text-sm font-medium">{item.difficulty}</span>
                  <span className="text-sm text-ink/70">
                    {Math.floor(item.elapsedMs / 60000)}m {Math.floor((item.elapsedMs % 60000) / 1000)}s
                  </span>
                  <span className="text-sm font-semibold">{item.score} pts</span>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {scoreModal ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 px-6">
          <div className="card-soft max-w-sm w-full text-center">
            <h3 className="text-2xl font-display">You did it</h3>
            <p className="mt-2 text-sm text-ink/70">Proud of you. That was so smooth.</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between rounded-2xl bg-white/80 px-4 py-2">
                <span className="text-sm">Time</span>
                <span className="text-sm font-semibold">{formattedTime}</span>
              </div>
              <div className="flex justify-between rounded-2xl bg-white/80 px-4 py-2">
                <span className="text-sm">Score</span>
                <span className="text-sm font-semibold">{scoreModal.score}</span>
              </div>
              <div className="flex justify-between rounded-2xl bg-white/80 px-4 py-2">
                <span className="text-sm">Hints used</span>
                <span className="text-sm font-semibold">{hintsUsed}</span>
              </div>
            </div>
            <button className="btn-primary w-full mt-6" onClick={() => setScoreModal(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

