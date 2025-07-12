// =============================================================================
// app/api/test-preset-connection/route.ts - สำหรับทดสอบการเชื่อมต่อ
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});

export async function GET() {
  try {
    // ทดสอบการเชื่อมต่อโดยการ query ง่ายๆ
    const { rows } = await pool.query("SELECT 1 as test, NOW() as timestamp");

    // ทดสอบการ query table preset (ถ้ามี)
    const tableTest = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%_preset' 
      AND table_schema = 'public'
    `);

    return NextResponse.json({
      status: "ok",
      message: "Database connection successful",
      database_type: "PostgreSQL",
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      port: process.env.PGPORT,
      test_result: rows[0],
      preset_tables: tableTest.rows.map((row) => row.table_name),
    });
  } catch (e) {
    console.error("Database connection test failed:", e);
    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed",
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
