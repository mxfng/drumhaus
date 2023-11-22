import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await sql`CREATE TABLE IF NOT EXISTS Presets (
      id SERIAL PRIMARY KEY,
      preset_key VARCHAR(32) NOT NULL UNIQUE,
      preset_data JSONB NOT NULL,
      custom_name VARCHAR(100),
      kit_used VARCHAR(50),
      bpm INT CHECK (bpm > 0 AND bpm <= 300), -- Adding a CHECK constraint for a positive int and not higher than 300
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
