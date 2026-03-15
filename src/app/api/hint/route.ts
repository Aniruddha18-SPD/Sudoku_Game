import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stringToBoard } from "@/lib/sudoku";

const schema = z.object({
  puzzleId: z.string().min(1),
  board: z.string().length(81),
});

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
  if (!board) {
    return NextResponse.json({ error: "Invalid board" }, { status: 400 });
  }

  const solution = stringToBoard(puzzle.solution);
  if (!solution) {
    return NextResponse.json({ error: "Invalid solution" }, { status: 500 });
  }

  const emptyIndices = board
    .map((value, idx) => ({ value, idx }))
    .filter((item) => item.value === 0)
    .map((item) => item.idx);

  if (emptyIndices.length === 0) {
    return NextResponse.json({ error: "No empty cells" }, { status: 400 });
  }

  const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];

  return NextResponse.json({
    row: Math.floor(idx / 9),
    col: idx % 9,
    value: solution[idx],
  });
}
