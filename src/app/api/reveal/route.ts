import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stringToBoard } from "@/lib/sudoku";

const schema = z.object({
  puzzleId: z.string().min(1),
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

  const solution = stringToBoard(puzzle.solution);
  if (!solution) {
    return NextResponse.json({ error: "Invalid board" }, { status: 500 });
  }

  return NextResponse.json({ solution });
}
