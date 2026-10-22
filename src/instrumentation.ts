export async function register() {
  // The Edge bundle of instrumentation must not touch better-sqlite3 (native addon),
  // so the seeding lives in a Node-only file behind this runtime check.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seedDemoIfEmpty } = await import("./instrumentation-node");
    try {
      await seedDemoIfEmpty();
    } catch (err) {
      console.error("[instrumentation] seed failed:", err);
    }
  }
}
