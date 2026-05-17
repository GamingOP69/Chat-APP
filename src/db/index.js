const { Pool } = require('pg');
const config = require('../config/index');

const pool = new Pool({
  user: config.db.user,
  host: config.db.host,
  database: config.db.database,
  password: config.db.password,
  port: config.db.port,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS call_logs (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        call_type VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_states (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        state VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS read_receipts (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    console.log('Tables created successfully');
  } catch (err) {
    console.error('Error creating tables', err);
  }
};

createTables();

module.exports = pool;