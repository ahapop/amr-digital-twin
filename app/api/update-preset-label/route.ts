// =============================================================================
// app/api/update-preset-label/route.ts - UPDATED
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
    const { model, preset_index, label } = await req.json();

    console.log(
      `🔧 update-preset-label API called with model: "${model}", preset_index: ${preset_index}, label: "${label}"`
    );

    if (!model || preset_index === undefined || !label) {
      return NextResponse.json(
        { error: "Missing model, preset_index, or label" },
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

    // ตรวจสอบ label length
    if (label.length > 100) {
      return NextResponse.json(
        { error: "Label must be less than 100 characters" },
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

    // 🔧 FIX: ใช้ model และ preset_index แทน row number
    const updateQuery = `
      UPDATE ${tableName} 
      SET label = $1, updated_at = CURRENT_TIMESTAMP
      WHERE model = $2 AND preset_index = $3
      RETURNING id, label, preset_index;
    `;

    console.log(`🔧 Executing update query for preset_index: ${preset_index}`);

    const result = await pool.query(updateQuery, [label, model, preset_index]);

    if (result.rowCount === 0) {
      console.log(
        `🔧 No preset found to update for model: "${model}", preset_index: ${preset_index}`
      );
      return NextResponse.json(
        { error: "Preset not found", status: "error" },
        { status: 404 }
      );
    }

    const updatedPreset = result.rows[0];
    console.log(
      `✅ Updated preset ${preset_index} label for model "${model}": "${updatedPreset.label}"`
    );

    return NextResponse.json({
      status: "ok",
      message: "Preset label updated successfully",
      updated_rows: result.rowCount,
      updated_preset: {
        id: updatedPreset.id,
        label: updatedPreset.label,
        preset_index: updatedPreset.preset_index,
      },
    });
  } catch (e) {
    console.error("Update preset label API error:", e);
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
