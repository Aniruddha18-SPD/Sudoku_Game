import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stringToBoard, isSolved } from "@/lib/sudoku";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const schema = z.object({
  puzzleId: z.string().min(1),
  board: z.string().length(81),
  elapsedMs: z.number().int().nonnegative(),
  hintsUsed: z.number().int().nonnegative().optional().default(0),
  timed: z.boolean().optional().default(true),
});

const baseScore: Record<string, number> = {
  easy: 1000,
  medium: 2000,
  hard: 3000,
  expert: 5000,
};

function scoreFor(difficulty: string, elapsedMs: number, hintsUsed: number, timed: boolean) {
  const base = baseScore[difficulty] ?? 1000;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  // No time penalty for untimed sessions — just hint penalty
  const timePenalty = timed ? Math.floor(elapsedSeconds / 5) * 10 : 0;
  const hintPenalty = hintsUsed * 250;
  return Math.max(0, base - timePenalty - hintPenalty);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const puzzle = await prisma.puzzle.findUnique({
    where: { id: parsed.data.puzzleId },
  });

  if (!puzzle) {
    return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
  }

  const board = stringToBoard(parsed.data.board);
  const solution = stringToBoard(puzzle.solution);
  if (!board || !solution) {
    return NextResponse.json({ error: "Invalid board" }, { status: 400 });
  }

  const correct = isSolved(board, solution);
  if (!correct) {
    return NextResponse.json({ correct: false, score: 0 });
  }

  const { timed } = parsed.data;
  const score = scoreFor(puzzle.difficulty, parsed.data.elapsedMs, parsed.data.hintsUsed, timed);

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    await prisma.completion.create({
      data: {
        userId: session.user.id,
        puzzleId: puzzle.id,
        difficulty: puzzle.difficulty,
        elapsedMs: parsed.data.elapsedMs,
        score,
        hintsUsed: parsed.data.hintsUsed,
        timed,
      },
    });
  }

  return NextResponse.json({ correct: true, score });
}
