const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const os = require('os');
const Database = require('./database-postgres');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const db = new Database();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/api/contacts', (req, res) => {
  const { name, phone, email } = req.body;
  
  if (!name || !phone || !email) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' });
  }

  db.addContact(name, phone, email, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
    res.json({ success: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว', data: result });
  });
});

app.get('/api/contacts', (req, res) => {
  db.getAllContacts((err, contacts) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
    res.json(contacts);
  });
});

app.put('/api/contacts/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, email } = req.body;
  
  if (!name || !phone || !email) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' });
  }

  db.updateContact(id, name, phone, email, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
    }
    if (result.changes === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลที่ต้องการแก้ไข' });
    }
    res.json({ success: true, message: 'แก้ไขข้อมูลเรียบร้อยแล้ว' });
  });
});

app.delete('/api/contacts/:id', (req, res) => {
  const { id } = req.params;
  
  db.deleteContact(id, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
    if (result.changes === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลที่ต้องการลบ' });
    }
    res.json({ success: true, message: 'ลบข้อมูลเรียบร้อยแล้ว' });
  });
});

function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, HOST, () => {
  const networkIP = getNetworkIP();
  console.log(`Server is running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://${networkIP}:${PORT}`);
  console.log(`Admin: http://${networkIP}:${PORT}/admin`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('Running in production mode');
  } else {
    console.log('Running in development mode');
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  db.close();
  process.exit(0);
});