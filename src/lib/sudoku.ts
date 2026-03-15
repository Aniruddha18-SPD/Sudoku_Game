export type Difficulty = "easy" | "medium" | "hard" | "expert";

const ROWS = 9;
const COLS = 9;

const difficultyClues: Record<Difficulty, [number, number]> = {
  easy: [40, 45],
  medium: [34, 39],
  hard: [28, 33],
  expert: [22, 27],
};

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function isSafe(board: number[], row: number, col: number, value: number) {
  for (let i = 0; i < 9; i += 1) {
    if (board[row * 9 + i] === value) return false;
    if (board[i * 9 + col] === value) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      if (board[r * 9 + c] === value) return false;
    }
  }

  return true;
}

function findEmpty(board: number[]) {
  for (let i = 0; i < 81; i += 1) {
    if (board[i] === 0) return i;
  }
  return -1;
}

function solveBoard(board: number[]) {
  const idx = findEmpty(board);
  if (idx === -1) return true;

  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  for (const num of nums) {
    if (isSafe(board, row, col, num)) {
      board[idx] = num;
      if (solveBoard(board)) return true;
      board[idx] = 0;
    }
  }

  return false;
}

function countSolutions(board: number[], limit = 2) {
  const idx = findEmpty(board);
  if (idx === -1) return 1;

  const row = Math.floor(idx / 9);
  const col = idx % 9;
  let count = 0;

  for (let num = 1; num <= 9; num += 1) {
    if (isSafe(board, row, col, num)) {
      board[idx] = num;
      count += countSolutions(board, limit);
      if (count >= limit) {
        board[idx] = 0;
        return count;
      }
      board[idx] = 0;
    }
  }

  return count;
}

export function generateSolvedBoard() {
  const board = Array(81).fill(0) as number[];
  solveBoard(board);
  return board;
}

export function generatePuzzle(difficulty: Difficulty) {
  const solution = generateSolvedBoard();
  const puzzle = [...solution];
  const [minClues, maxClues] = difficultyClues[difficulty];
  const targetClues = Math.floor(Math.random() * (maxClues - minClues + 1)) + minClues;
  let clues = 81;

  const indices = shuffle(Array.from({ length: 81 }, (_, i) => i));

  for (const idx of indices) {
    if (clues <= targetClues) break;

    const backup = puzzle[idx];
    puzzle[idx] = 0;

    const copy = [...puzzle];
    const solutionCount = countSolutions(copy, 2);
    if (solutionCount !== 1) {
      puzzle[idx] = backup;
    } else {
      clues -= 1;
    }
  }

  return {
    puzzle,
    solution,
  };
}

export function boardToString(board: number[]) {
  return board.map((v) => (v === 0 ? "0" : String(v))).join("");
}

export function stringToBoard(value: string) {
  if (value.length !== 81) return null;
  const board = value.split("").map((c) => Number(c));
  if (board.some((v) => Number.isNaN(v) || v < 0 || v > 9)) return null;
  return board;
}

export function isSolved(board: number[], solution: number[]) {
  for (let i = 0; i < 81; i += 1) {
    if (board[i] !== solution[i]) return false;
  }
  return true;
}
