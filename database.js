const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// For production/serverless environments, use /tmp directory
const isProduction = process.env.NODE_ENV === 'production';
const dbPath = isProduction 
  ? path.join('/tmp', 'database.sqlite')
  : path.join(__dirname, 'database.sqlite');

class Database {
  constructor() {
    // Ensure directory exists for production
    if (isProduction) {
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log(`Connected to SQLite database at: ${dbPath}`);
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    const createContactsTable = `
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.run(createContactsTable, (err) => {
      if (err) {
        console.error('Error creating contacts table:', err.message);
      } else {
        console.log('Contacts table ready');
      }
    });
  }

  addContact(name, phone, email, callback) {
    const sql = 'INSERT INTO contacts (name, phone, email) VALUES (?, ?, ?)';
    this.db.run(sql, [name, phone, email], function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { id: this.lastID, name, phone, email });
      }
    });
  }

  getAllContacts(callback) {
    const sql = 'SELECT * FROM contacts ORDER BY created_at DESC';
    this.db.all(sql, [], (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, rows);
      }
    });
  }

  updateContact(id, name, phone, email, callback) {
    const sql = 'UPDATE contacts SET name = ?, phone = ?, email = ? WHERE id = ?';
    this.db.run(sql, [name, phone, email, id], function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  }

  deleteContact(id, callback) {
    const sql = 'DELETE FROM contacts WHERE id = ?';
    this.db.run(sql, [id], function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  }

  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = Database;