import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "./data/voicebench.db";

// Create the SQLite connection
const sqlite = new Database(databaseUrl);

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");

// Create the Drizzle ORM instance with schema
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite connection for advanced use cases
export { sqlite };

// Export schema for convenience
export * from "./schema";
