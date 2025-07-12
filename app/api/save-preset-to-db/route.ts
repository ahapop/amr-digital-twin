// =============================================================================
// app/api/save-preset-to-db/route.ts - UPDATED
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
    const {
      model,
      preset_index,
      label,
      position_x,
      position_y,
      position_z,
      target_x,
      target_y,
      target_z,
      zoom,
    } = await req.json();

    console.log(
      `🔧 save-preset-to-db API called with model: "${model}", preset_index: ${preset_index}`
    );

    // Validation
    if (!model || preset_index === undefined || !label) {
      return NextResponse.json(
        { error: "Missing required fields: model, preset_index, label" },
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

    // 🔧 FIX: ใช้ UPSERT (INSERT ... ON CONFLICT) เพื่อรองรับการ save/update
    const upsertQuery = `
      INSERT INTO ${tableName} 
      (model, preset_index, label, position_x, position_y, position_z,
       target_x, target_y, target_z, zoom, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (model, preset_index) 
      DO UPDATE SET
        label = EXCLUDED.label,
        position_x = EXCLUDED.position_x,
        position_y = EXCLUDED.position_y,
        position_z = EXCLUDED.position_z,
        target_x = EXCLUDED.target_x,
        target_y = EXCLUDED.target_y,
        target_z = EXCLUDED.target_z,
        zoom = EXCLUDED.zoom,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, (xmax = 0) AS was_insert;
    `;

    console.log(`🔧 Executing UPSERT query for preset_index: ${preset_index}`);

    const { rows } = await pool.query(upsertQuery, [
      model,
      preset_index,
      label,
      position_x,
      position_y,
      position_z,
      target_x,
      target_y,
      target_z,
      zoom,
    ]);

    const result = rows[0];
    const wasInsert = result.was_insert;

    console.log(
      `✅ ${
        wasInsert ? "Created" : "Updated"
      } preset ${preset_index} for model "${model}"`
    );

    return NextResponse.json({
      status: "ok",
      message: wasInsert
        ? "Preset created successfully"
        : "Preset updated successfully",
      id: result.id,
      was_insert: wasInsert,
      preset_index: preset_index,
    });
  } catch (e) {
    console.error("Save preset API error:", e);
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
