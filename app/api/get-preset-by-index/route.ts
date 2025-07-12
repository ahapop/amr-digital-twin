// =============================================================================
// app/api/get-preset-by-index/route.ts - FIXED VERSION
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
    const { model, preset_index } = await req.json();

    console.log(
      `🔧 get-preset-by-index API called with model: "${model}", preset_index: ${preset_index}`
    );

    if (!model || preset_index === undefined) {
      return NextResponse.json(
        { error: "Missing model or preset_index" },
        { status: 400 }
      );
    }

    const allowedModels = ["ground", "second", "third", "main", "machine"];
    if (!allowedModels.includes(model)) {
      return NextResponse.json(
        { error: `Invalid model. Allowed: ${allowedModels.join(", ")}` },
        { status: 400 }
      );
    }

    // 🔧 FIX: ใช้ tableName แทนการ hardcode ground_preset
    const tableName = `${model}_preset`;

    // 🔧 FIX: ใช้ preset_index โดยตรงแทนการใช้ CTE
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
      WHERE model = $1 AND preset_index = $2
    `;

    console.log(
      `🔧 Executing query: ${query} with model: "${model}", preset_index: ${preset_index}`
    );

    const { rows } = await pool.query(query, [model, preset_index]);

    if (!rows.length) {
      console.log(
        `🔧 No preset found for model: "${model}", preset_index: ${preset_index}`
      );
      return NextResponse.json(
        { error: "Preset not found", status: "error" },
        { status: 404 }
      );
    }

    console.log(
      `✅ Found preset for model: "${model}", preset_index: ${preset_index}:`,
      rows[0]
    );

    return NextResponse.json({
      status: "ok",
      preset: rows[0],
    });
  } catch (e) {
    console.error("Get preset by index API error:", e);
    return NextResponse.json(
      { error: "Internal error", status: "error" },
      { status: 500 }
    );
  }
}
