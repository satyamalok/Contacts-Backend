import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'contacts_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigrations() {
  try {
    console.log('Starting database migrations...');

    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const migrationsDir = __dirname;
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Check if migration already executed
      const result = await pool.query('SELECT * FROM migrations WHERE name = $1', [file]);

      if (result.rows.length === 0) {
        console.log(`Executing migration: ${file}`);

        // Read and execute migration file
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        await pool.query(sql);

        // Record migration as executed
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);

        console.log(`Migration ${file} completed successfully`);
      } else {
        console.log(`Migration ${file} already executed, skipping...`);
      }
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error('Failed to run migrations:', error);
  process.exit(1);
});
