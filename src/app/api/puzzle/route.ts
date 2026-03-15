import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { boardToString, generatePuzzle } from "@/lib/sudoku";

const schema = z.object({
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { puzzle, solution } = generatePuzzle(parsed.data.difficulty);

  const created = await prisma.puzzle.create({
    data: {
      difficulty: parsed.data.difficulty,
      puzzle: boardToString(puzzle),
      solution: boardToString(solution),
    },
  });

  return NextResponse.json({
    puzzleId: created.id,
    puzzle: created.puzzle,
  });
}
