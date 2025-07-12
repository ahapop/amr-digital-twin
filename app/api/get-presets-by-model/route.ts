// app/api/get-presets-by-model/route.ts - UPDATED

import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});

export async function POST(req: NextRequest) {
  try {
    const { model } = await req.json();

    console.log(`🔧 get-presets-by-model API called with model: "${model}"`);

    // 1) ตรวจสอบ model
    if (!model || typeof model !== "string") {
      return NextResponse.json(
        { status: "error", error: "Missing or invalid model parameter" },
        { status: 400 }
      );
    }

    // 2) mapping table name ปลอดภัย
    const tableMap: Record<string, string> = {
      ground: "ground_preset",
      second: "second_preset",
      third: "third_preset",
      main: "main_preset",
      machine: "machine_preset",
    };
    const tableName = tableMap[model];
    if (!tableName) {
      return NextResponse.json(
        {
          status: "error",
          error: `Invalid model. Allowed: ${Object.keys(tableMap).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 🔧 FIX: ใช้ preset_index แบบคงที่แทน row_number()
    const query = `
      SELECT
        id,
        label,
        position_x,
        position_y,
        position_z,
        target_x,
        target_y,
        target_z,
        zoom,
        preset_index,
        created_at,
        updated_at
      FROM ${tableName}
      WHERE model = $1 AND preset_index IS NOT NULL
      ORDER BY preset_index ASC;
    `;

    console.log(`🔧 Executing query: ${query} with model: "${model}"`);

    const { rows } = await pool.query(query, [model]);

    console.log(
      `🔧 Query returned ${rows.length} presets for model "${model}"`
    );

    return NextResponse.json({
      status: "ok",
      presets: rows,
      count: rows.length,
    });
  } catch (err: any) {
    console.error("get-presets-by-model error:", err);
    return NextResponse.json(
      {
        status: "error",
        error: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
