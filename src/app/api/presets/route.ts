import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  const presetData = searchParams.get("preset_data");
  const customName = searchParams.get("custom_name");
  const kitUsed = searchParams.get("kit_used");
  const bpm = searchParams.get("bpm");

  // generate a unique preset_key
  const presetKey = nanoid(11);

  try {
    if (!presetData || !kitUsed || !bpm)
      throw new Error("Preset data, kit, and bpm required");
    await sql`
      INSERT INTO Presets (preset_key, preset_data, custom_name, kit_used, bpm)
      VALUES (${presetKey}, ${presetData}, ${customName}, ${kitUsed}, ${bpm});
    `;
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ presetKey }, { status: 200 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const presetKey = searchParams.get("preset_key");

  try {
    if (!presetKey) throw new Error("Preset key required");

    const presets =
      await sql`SELECT * FROM Presets WHERE preset_key = ${presetKey};`;

    return NextResponse.json({ presets }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
