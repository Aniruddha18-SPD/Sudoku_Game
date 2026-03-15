# Sudoku_Game

A wholesome, pastel Sudoku web app with Gen Z vibes, built on Next.js + NextAuth + Prisma.

## Features
- Difficulty levels: Easy, Medium, Hard, Expert
- Timer and time-based scoring
- Optional hints (off by default)
- Notes and undo always available
- Email/password + Google OAuth
- Email verification and password reset
- Per-user completion history

## Setup
1. Install dependencies
   - `npm install`
2. Configure env vars
   - Copy `.env.example` to `.env` and fill values
3. Run Prisma
   - `npx prisma generate`
   - `npx prisma migrate dev --name init`
4. Start dev server
   - `npm run dev`

## Notes
- Node.js 18.18+ recommended. If you are on Node 19, use Next.js 14.x (already pinned in `package.json`).
- This repo ships without a database. Use a local Postgres instance or a managed provider.
