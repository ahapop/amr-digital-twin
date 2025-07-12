// =============================================================================
// app/api/delete-preset-from-db/route.ts - UPDATED
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
      `🔧 delete-preset-from-db API called with model: "${model}", preset_index: ${preset_index}`
    );

    if (!model || preset_index === undefined) {
      return NextResponse.json(
        { error: "Missing model or preset_index" },
        { status: 400 }
      );
    }

    // ตรวจสอบ preset_index range
    if (preset_index < 0 || preset_index >= 20) {
      return NextResponse.json(
        { error: "preset_index must be between 0-19" },
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

    const tableName = `${model}_preset`;

    // 🔧 FIX: Delete โดยใช้ model และ preset_index แทน
    const deleteQuery = `
      DELETE FROM ${tableName} 
      WHERE model = $1 AND preset_index = $2
      RETURNING id, label;
    `;

    console.log(`🔧 Executing delete query for preset_index: ${preset_index}`);

    const result = await pool.query(deleteQuery, [model, preset_index]);

    if (result.rowCount === 0) {
      console.log(
        `🔧 No preset found to delete for model: "${model}", preset_index: ${preset_index}`
      );
      return NextResponse.json(
        { error: "Preset not found", status: "error" },
        { status: 404 }
      );
    }

    const deletedPreset = result.rows[0];
    console.log(
      `✅ Deleted preset ${preset_index} for model "${model}": "${deletedPreset.label}"`
    );

    return NextResponse.json({
      status: "ok",
      message: "Preset deleted successfully",
      deleted_rows: result.rowCount,
      deleted_preset: {
        id: deletedPreset.id,
        label: deletedPreset.label,
        preset_index: preset_index,
      },
    });
  } catch (e) {
    console.error("Delete preset API error:", e);
    return NextResponse.json(
      {
        error: "Internal error",
        status: "error",
        details: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
