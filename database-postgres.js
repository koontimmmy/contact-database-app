const { Pool } = require('pg');

class Database {
  constructor() {
    // Use environment variable for database connection
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (connectionString) {
      // Production: use PostgreSQL
      this.pool = new Pool({
        connectionString: connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      console.log('Using PostgreSQL database');
    } else {
      // Development: fallback to SQLite
      const sqlite3 = require('sqlite3').verbose();
      const path = require('path');
      const dbPath = path.join(__dirname, 'database.sqlite');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening SQLite database:', err.message);
        } else {
          console.log('Using SQLite database (development)');
        }
      });
    }
    
    this.initializeTables();
  }

  async initializeTables() {
    const createContactsTable = `
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    if (this.pool) {
      // PostgreSQL
      try {
        await this.pool.query(createContactsTable);
        console.log('PostgreSQL contacts table ready');
      } catch (err) {
        console.error('Error creating PostgreSQL table:', err.message);
      }
    } else if (this.db) {
      // SQLite
      const sqliteTable = `
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      this.db.run(sqliteTable, (err) => {
        if (err) {
          console.error('Error creating SQLite table:', err.message);
        } else {
          console.log('SQLite contacts table ready');
        }
      });
    }
  }

  async addContact(name, phone, email, callback) {
    if (this.pool) {
      // PostgreSQL
      try {
        const result = await this.pool.query(
          'INSERT INTO contacts (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
          [name, phone, email]
        );
        callback(null, result.rows[0]);
      } catch (err) {
        callback(err, null);
      }
    } else if (this.db) {
      // SQLite
      const sql = 'INSERT INTO contacts (name, phone, email) VALUES (?, ?, ?)';
      this.db.run(sql, [name, phone, email], function(err) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, { id: this.lastID, name, phone, email });
        }
      });
    }
  }

  async getAllContacts(callback) {
    if (this.pool) {
      // PostgreSQL
      try {
        const result = await this.pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
        callback(null, result.rows);
      } catch (err) {
        callback(err, null);
      }
    } else if (this.db) {
      // SQLite
      const sql = 'SELECT * FROM contacts ORDER BY created_at DESC';
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, rows);
        }
      });
    }
  }

  async updateContact(id, name, phone, email, callback) {
    if (this.pool) {
      // PostgreSQL
      try {
        const result = await this.pool.query(
          'UPDATE contacts SET name = $1, phone = $2, email = $3 WHERE id = $4',
          [name, phone, email, id]
        );
        callback(null, { changes: result.rowCount });
      } catch (err) {
        callback(err, null);
      }
    } else if (this.db) {
      // SQLite
      const sql = 'UPDATE contacts SET name = ?, phone = ?, email = ? WHERE id = ?';
      this.db.run(sql, [name, phone, email, id], function(err) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, { changes: this.changes });
        }
      });
    }
  }

  async deleteContact(id, callback) {
    if (this.pool) {
      // PostgreSQL
      try {
        const result = await this.pool.query('DELETE FROM contacts WHERE id = $1', [id]);
        callback(null, { changes: result.rowCount });
      } catch (err) {
        callback(err, null);
      }
    } else if (this.db) {
      // SQLite
      const sql = 'DELETE FROM contacts WHERE id = ?';
      this.db.run(sql, [id], function(err) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, { changes: this.changes });
        }
      });
    }
  }

  close() {
    if (this.pool) {
      this.pool.end();
      console.log('PostgreSQL connection closed');
    } else if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing SQLite database:', err.message);
        } else {
          console.log('SQLite database connection closed');
        }
      });
    }
  }
}

module.exports = Database;