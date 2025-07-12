// =============================================================================
// app/api/get-preset-count/route.ts
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

    if (!model) {
      return NextResponse.json(
        { error: "Missing model parameter" },
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

    const countQuery = `
      SELECT COUNT(*) as count FROM ${tableName} 
      WHERE model = $1
    `;

    const { rows } = await pool.query(countQuery, [model]);

    return NextResponse.json({
      status: "ok",
      count: parseInt(rows[0].count),
      model: model,
    });
  } catch (e) {
    console.error("Get preset count API error:", e);
    return NextResponse.json(
      { error: "Internal error", status: "error" },
      { status: 500 }
    );
  }
}
