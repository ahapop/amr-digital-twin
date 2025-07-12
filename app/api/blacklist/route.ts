import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  try {
    const result = await pool.query(
      "SELECT expressid, modelname, subobject_name FROM blacklist"
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const expressID = Number(body.expressID);
    const modelname = typeof body.modelname === "string" ? body.modelname : "";
    const subobject_name =
      typeof body.subobject_name === "string" ? body.subobject_name : "";

    if (!Number.isFinite(expressID) || !modelname) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    await pool.query(
      "INSERT INTO blacklist (expressid, modelname, subobject_name) VALUES ($1, $2, $3) ON CONFLICT (expressid, modelname) DO NOTHING",
      [expressID, modelname, subobject_name]
    );

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
