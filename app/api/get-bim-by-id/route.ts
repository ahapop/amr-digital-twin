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
    const { model, expressID } = await req.json();

    console.log(
      `🔧 get-bim-by-id API called with model: "${model}", expressID: ${expressID}`
    );

    if (!model || !expressID) {
      console.log("🔧 Missing required parameters");
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Missing model or expressID",
          details: { model: !!model, expressID: !!expressID },
        },
        { status: 400 }
      );
    }

    // 🔧 FIX: Validate model parameter
    const allowedModels = ["ground", "second", "third", "main", "machine"];
    if (!allowedModels.includes(model)) {
      console.log(`🔧 Invalid model: "${model}"`);
      return NextResponse.json(
        {
          error: "invalid_model",
          message: `Invalid model "${model}". Allowed models: ${allowedModels.join(
            ", "
          )}`,
          allowedModels,
        },
        { status: 400 }
      );
    }

    // 🔧 FIX: Use dynamic table name instead of hardcoded "ground_bim"
    const tableName = `${model}_bim`;

    const query = `
      SELECT * FROM ${tableName} WHERE model = $1 AND expressid = $2
    `;

    console.log(
      `🔧 Executing query: ${query} with params: ["${model}", ${expressID}]`
    );

    const { rows } = await pool.query(query, [model, expressID]);

    if (!rows.length) {
      console.log(
        `🔧 No BIM data found for model: "${model}", expressID: ${expressID}`
      );
      return NextResponse.json(
        {
          error: "not_found",
          message: `No BIM data found for expressID ${expressID} in model "${model}"`,
          expressID,
          model,
          suggestion:
            "This object may not have BIM data in the database. Try double-clicking another object or contact administrator to add BIM data.",
        },
        { status: 404 }
      );
    }

    console.log(
      `✅ Found BIM data for model: "${model}", expressID: ${expressID}`
    );
    return NextResponse.json(rows[0]);
  } catch (e) {
    console.error("🔧 get-bim-by-id API error:", e);

    // 🔧 FIX: Better error categorization
    if (e instanceof Error) {
      if (
        e.message.includes("relation") &&
        e.message.includes("does not exist")
      ) {
        // Table doesn't exist
        return NextResponse.json(
          {
            error: "table_not_found",
            message: "BIM data table does not exist for this model",
            details: e.message,
            suggestion:
              "Contact administrator to create the BIM data table for this model",
          },
          { status: 500 }
        );
      } else if (e.message.includes("connection")) {
        // Database connection error
        return NextResponse.json(
          {
            error: "database_connection",
            message: "Unable to connect to database",
            suggestion: "Check database connection and try again",
          },
          { status: 500 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "internal_error",
        message: "Internal server error occurred",
        suggestion: "Please try again or contact administrator",
      },
      { status: 500 }
    );
  }
}
