const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ---------- CONFIG (change to match your MySQL) ----------
const DB = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'portfolio_db'
};
const PORT = process.env.PORT || 3000;

// ---------- APP SETUP ----------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const uploadDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) =>
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (png, jpg, gif, webp) are allowed'));
  }
});

let pool;

const removeImage = (file) => {
  if (!file) return;
  const p = path.join(uploadDir, path.basename(file));
  fs.unlink(p, () => {});
};

// ---------- DATABASE INIT ----------
async function initDb() {
  const root = await mysql.createConnection({ host: DB.host, user: DB.user, password: DB.password });
  await root.query(`CREATE DATABASE IF NOT EXISTS \`${DB.database}\``);
  await root.end();

  pool = mysql.createPool({ ...DB, waitForConnections: true, connectionLimit: 10 });

  await pool.query(`CREATE TABLE IF NOT EXISTS profile (
    id INT PRIMARY KEY DEFAULT 1,
    full_name VARCHAR(100) NOT NULL, title VARCHAR(100) NOT NULL, email VARCHAR(120) NOT NULL,
    phone VARCHAR(30), location VARCHAR(100), about TEXT,
    github VARCHAR(255), linkedin VARCHAR(255), image VARCHAR(255))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS skills (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(80) NOT NULL, level INT NOT NULL DEFAULT 50)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS education (
    id INT AUTO_INCREMENT PRIMARY KEY, degree VARCHAR(120) NOT NULL, institution VARCHAR(150) NOT NULL,
    start_year VARCHAR(10), end_year VARCHAR(10), description TEXT)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS experience (
    id INT AUTO_INCREMENT PRIMARY KEY, role VARCHAR(120) NOT NULL, company VARCHAR(150) NOT NULL,
    start_date VARCHAR(20), end_date VARCHAR(20), description TEXT)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(120) NOT NULL, description TEXT,
    tech VARCHAR(255), link VARCHAR(255), image VARCHAR(255))`);
}

// ---------- VALIDATION HELPERS ----------
const clean = (v) => (typeof v === 'string' ? v.trim() : v);
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRe = /^https?:\/\/.+/i;

function validateProfile(b) {
  const errors = [];
  if (!b.full_name) errors.push('Full name is required');
  if (!b.title) errors.push('Professional title is required');
  if (!b.email || !emailRe.test(b.email)) errors.push('A valid email is required');
  if (b.github && !urlRe.test(b.github)) errors.push('GitHub must be a full URL (http/https)');
  if (b.linkedin && !urlRe.test(b.linkedin)) errors.push('LinkedIn must be a full URL (http/https)');
  return errors;
}

// ---------- PROFILE ROUTES ----------
app.get('/api/profile', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM profile WHERE id = 1');
    res.json(rows[0] || null);
  } catch (e) { next(e); }
});

// Create or update profile (upsert) with optional image upload
app.post('/api/profile', upload.single('image'), async (req, res, next) => {
  try {
    const b = {};
    ['full_name', 'title', 'email', 'phone', 'location', 'about', 'github', 'linkedin']
      .forEach((k) => (b[k] = clean(req.body[k]) || ''));
    const errors = validateProfile(b);
    if (errors.length) {
      if (req.file) removeImage(req.file.filename);
      return res.status(400).json({ errors });
    }

    const [existing] = await pool.query('SELECT image FROM profile WHERE id = 1');
    let image = existing[0] ? existing[0].image : null;
    if (req.file) {
      removeImage(image);
      image = req.file.filename;
    }

    await pool.query(
      `INSERT INTO profile (id, full_name, title, email, phone, location, about, github, linkedin, image)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), title=VALUES(title), email=VALUES(email),
         phone=VALUES(phone), location=VALUES(location), about=VALUES(about),
         github=VALUES(github), linkedin=VALUES(linkedin), image=VALUES(image)`,
      [b.full_name, b.title, b.email, b.phone, b.location, b.about, b.github, b.linkedin, image]
    );
    res.json({ message: 'Profile saved' });
  } catch (e) { next(e); }
});

app.delete('/api/profile/image', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT image FROM profile WHERE id = 1');
    if (rows[0] && rows[0].image) removeImage(rows[0].image);
    await pool.query('UPDATE profile SET image = NULL WHERE id = 1');
    res.json({ message: 'Image removed' });
  } catch (e) { next(e); }
});

// ---------- GENERIC CRUD FOR LIST SECTIONS ----------
const resources = {
  skills: {
    fields: ['name', 'level'], required: ['name'], order: 'level DESC, id DESC',
    check: (b) => {
      const lvl = Number(b.level);
      return Number.isInteger(lvl) && lvl >= 0 && lvl <= 100 ? [] : ['Level must be a number from 0 to 100'];
    }
  },
  education: {
    fields: ['degree', 'institution', 'start_year', 'end_year', 'description'],
    required: ['degree', 'institution'], order: 'id DESC'
  },
  experience: {
    fields: ['role', 'company', 'start_date', 'end_date', 'description'],
    required: ['role', 'company'], order: 'id DESC'
  },
  projects: {
    fields: ['title', 'description', 'tech', 'link'], required: ['title'], order: 'id DESC', hasImage: true,
    check: (b) => (b.link && !urlRe.test(b.link) ? ['Link must be a full URL (http/https)'] : [])
  }
};

Object.entries(resources).forEach(([table, cfg]) => {
  const base = '/api/' + table;
  const fields = cfg.hasImage ? [...cfg.fields, 'image'] : cfg.fields;

  const parse = (req) => {
    const b = {};
    cfg.fields.forEach((f) => (b[f] = clean(req.body[f]) ?? ''));
    const errors = [];
    cfg.required.forEach((f) => { if (!b[f]) errors.push(f.replace('_', ' ') + ' is required'); });
    if (cfg.check) errors.push(...cfg.check(b));
    return { b, errors };
  };

  // READ ALL
  app.get(base, async (req, res, next) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY ${cfg.order}`);
      res.json(rows);
    } catch (e) { next(e); }
  });

  // CREATE
  app.post(base, upload.single('image'), async (req, res, next) => {
    try {
      const { b, errors } = parse(req);
      if (errors.length) {
        if (req.file) removeImage(req.file.filename);
        return res.status(400).json({ errors });
      }
      if (cfg.hasImage) b.image = req.file ? req.file.filename : null;
      const cols = Object.keys(b);
      const [r] = await pool.query(
        `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
        cols.map((c) => b[c])
      );
      res.status(201).json({ id: r.insertId, message: 'Added' });
    } catch (e) { next(e); }
  });

  // UPDATE
  app.put(base + '/:id', upload.single('image'), async (req, res, next) => {
    try {
      const { b, errors } = parse(req);
      if (errors.length) {
        if (req.file) removeImage(req.file.filename);
        return res.status(400).json({ errors });
      }
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!rows[0]) {
        if (req.file) removeImage(req.file.filename);
        return res.status(404).json({ errors: ['Record not found'] });
      }
      if (cfg.hasImage && req.file) {
        removeImage(rows[0].image);
        b.image = req.file.filename;
      }
      const cols = Object.keys(b);
      await pool.query(
        `UPDATE ${table} SET ${cols.map((c) => c + '=?').join(',')} WHERE id = ?`,
        [...cols.map((c) => b[c]), req.params.id]
      );
      res.json({ message: 'Updated' });
    } catch (e) { next(e); }
  });

  // DELETE
  app.delete(base + '/:id', async (req, res, next) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!rows[0]) return res.status(404).json({ errors: ['Record not found'] });
      if (cfg.hasImage) removeImage(rows[0].image);
      await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      res.json({ message: 'Deleted' });
    } catch (e) { next(e); }
  });
});

// ---------- ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error(err.message);
  const status = err instanceof multer.MulterError || /image files/.test(err.message) ? 400 : 500;
  res.status(status).json({ errors: [status === 400 ? err.message : 'Server error. Please try again.'] });
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`Portfolio running at http://localhost:${PORT}`)))
  .catch((e) => {
    console.error('Database connection failed. Check DB settings in server.js:', e.message);
    process.exit(1);
  });
