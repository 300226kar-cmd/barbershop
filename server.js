const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_PASSWORD = "1234"; // Փոխիր քո գաղտնաբառով

const DATA_FILE = path.join(__dirname, "bookings.json");
const CLOSED_DAYS_FILE = path.join(__dirname, "closed-days.json");

/* =========================
   BOOKINGS FUNCTIONS
========================= */

function loadBookings() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveBookings(bookings) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
}

/* =========================
   CLOSED DAYS FUNCTIONS
========================= */

function loadClosedDays() {
  if (!fs.existsSync(CLOSED_DAYS_FILE)) {
    fs.writeFileSync(CLOSED_DAYS_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(CLOSED_DAYS_FILE, "utf8"));
}

function saveClosedDays(days) {
  fs.writeFileSync(CLOSED_DAYS_FILE, JSON.stringify(days, null, 2));
}

/* =========================
   API ROUTES
========================= */

// Ստանալ զբաղված ժամերը
app.get("/api/bookings", (req, res) => {
  const date = req.query.date;
  const bookings = loadBookings();
  const bookedTimes = bookings
    .filter(b => b.date === date)
    .map(b => b.time);

  res.json(bookedTimes);
});

// Ստանալ փակ օրերը
app.get("/api/closed-days", (req, res) => {
  res.json(loadClosedDays());
});

// Նոր պատվեր
app.post("/api/book", (req, res) => {
  const { name, phone, date, time } = req.body;

  if (!name || !phone || !date || !time)
    return res.status(400).json({ message: "Բոլոր դաշտերը պարտադիր են" });

  const closedDays = loadClosedDays();
  if (closedDays.includes(date))
    return res.status(400).json({ message: "Այս օրը փակ է" });

  const bookings = loadBookings();
  if (bookings.find(b => b.date === date && b.time === time))
    return res.status(400).json({ message: "Ժամը արդեն զբաղված է" });

  const booking = {
    id: Date.now(),
    name,
    phone,
    date,
    time
  };

  bookings.push(booking);
  saveBookings(bookings);

  res.json({ message: "Պատվերը ընդունվեց", booking });
});

// Admin ստանալ բոլոր պատվերները
app.post("/api/all-bookings", (req, res) => {
  const { password } = req.body;

  if (password !== ADMIN_PASSWORD)
    return res.status(401).json({ message: "Սխալ գաղտնաբառ" });

  res.json(loadBookings());
});

// Admin ջնջել պատվեր
app.post("/api/delete-booking", (req, res) => {
  const { password, id } = req.body;

  if (password !== ADMIN_PASSWORD)
    return res.status(401).json({ message: "Սխալ գաղտնաբառ" });

  let bookings = loadBookings();
  const before = bookings.length;

  bookings = bookings.filter(b => b.id !== id);

  if (bookings.length === before)
    return res.status(404).json({ message: "Պատվերը չի գտնվել" });

  saveBookings(bookings);
  res.json({ message: "Պատվերը ջնջվեց" });
});

// Admin ավելացնել փակ օր
app.post("/api/add-closed-day", (req, res) => {
  const { password, date } = req.body;

  if (password !== ADMIN_PASSWORD)
    return res.status(401).json({ message: "Սխալ գաղտնաբառ" });

  if (!date)
    return res.status(400).json({ message: "Օրը պարտադիր է" });

  const days = loadClosedDays();

  if (days.includes(date))
    return res.status(400).json({ message: "Օրը արդեն փակ է" });

  days.push(date);
  saveClosedDays(days);

  res.json({ message: "Փակ օրը ավելացվեց" });
});

// Admin ջնջել փակ օր
app.post("/api/remove-closed-day", (req, res) => {
  const { password, date } = req.body;

  if (password !== ADMIN_PASSWORD)
    return res.status(401).json({ message: "Սխալ գաղտնաբառ" });

  let days = loadClosedDays();
  days = days.filter(d => d !== date);
  saveClosedDays(days);

  res.json({ message: "Փակ օրը ջնջվեց" });
});

/* =========================
   RENDER PORT FIX
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
