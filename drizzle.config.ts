import { defineConfig } from "drizzle-kit";

// Optional: `npm run db:push` syncs the schema after edits to src/lib/db/schema.ts.
// Fresh clones don't need this — the app bootstraps its own tables on first run.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: "./data/triptally.db" },
});
