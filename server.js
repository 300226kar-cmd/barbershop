const path = require("path");

// serve static files
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_PASSWORD = "1234"; // Փոխիր եթե ուզում ես

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Ստեղծում ենք table եթե գոյություն չունի
pool.query(`
  CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    date TEXT,
    time TEXT
  )
`).then(() => {
  console.log("✅ Table ready");
}).catch(err => {
  console.error("❌ Table creation error:", err);
});

// GET զբաղված ժամերը
app.get("/api/bookings", async (req, res) => {
  const { date } = req.query;

  try {
    const result = await pool.query(
      "SELECT time FROM bookings WHERE date = $1",
      [date]
    );

    const bookedTimes = result.rows.map(row => row.time);
    res.json(bookedTimes);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// POST նոր պատվեր
app.post("/api/book", async (req, res) => {
  const { name, phone, date, time } = req.body;

  if (!name || !phone || !date || !time)
    return res.status(400).json({ message: "Բոլոր դաշտերը պարտադիր են" });

  try {
    const check = await pool.query(
      "SELECT * FROM bookings WHERE date = $1 AND time = $2",
      [date, time]
    );

    if (check.rows.length > 0)
      return res.status(400).json({ message: "Ժամը արդեն զբաղված է" });

    const id = Date.now();

    await pool.query(
      "INSERT INTO bookings (id, name, phone, date, time) VALUES ($1, $2, $3, $4, $5)",
      [id, name, phone, date, time]
    );

    res.json({ message: "Պատվերը ընդունվեց" });

  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// Admin բոլոր պատվերները
app.post("/api/all-bookings", async (req, res) => {
  const { password } = req.body;

  if (password !== ADMIN_PASSWORD)
    return res.status(401).json({ message: "Սխալ գաղտնաբառ" });

  try {
    const result = await pool.query(
      "SELECT * FROM bookings ORDER BY date, time"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// Ջնջել պատվեր
app.post("/api/delete-booking", async (req, res) => {
  const { password, id } = req.body;

  if (password !== ADMIN_PASSWORD)
    return res.status(401).json({ message: "Սխալ գաղտնաբառ" });

  try {
    await pool.query("DELETE FROM bookings WHERE id = $1", [id]);
    res.json({ message: "Պատվերը ջնջվեց" });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");

});
