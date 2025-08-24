import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
});
db.connect().catch((err) => {
  console.error("Failed to connect to database:", err);
  process.exit(1);
});

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

let currentUserId = 1; // For demonstration only

async function getUsers() {
  const result = await db.query("SELECT * FROM users ORDER BY id");
  return result.rows;
}

async function getCurrentUser() {
  const users = await getUsers();
  return users.find((user) => user.id == currentUserId);
}

async function getVisitedCountries(userId) {
  const result = await db.query(
    `SELECT vc.id, vc.country_code, c.country_name
     FROM visited_countries vc
     JOIN countries c ON vc.country_code = c.country_code
     WHERE vc.user_id = $1`,
    [userId]
  );
  return result.rows;
}

app.get("/", async (req, res) => {
  try {
    const users = await getUsers();
    const currentUser = await getCurrentUser();
    const visited = await getVisitedCountries(currentUserId);

    const total = visited.length;
    const countries = visited.map(c => c.country_code).join(",");
    res.render("index", {
      users,
      currentUser,
      visited,
      color: currentUser?.color || "teal",
      total,
      countries,
      error: null
    });
  } catch (err) {
    res.status(500).send("Error loading page.");
  }
});

 
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  if (!input || input.trim() === "") {
    return res.redirect("/");
  }
  try {
    const countryResult = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    if (countryResult.rows.length === 0) {
      const users = await getUsers();
      const currentUser = await getCurrentUser();
      const visited = await getVisitedCountries(currentUserId);
      const total = visited.length;
      const countries = visited.map(c => c.country_code).join(",");
      return res.render("index", {
        users,
        currentUser,
        visited,
        color: currentUser?.color || "teal",
        total,
        countries,
        error: "Country not found. Please check your spelling."
      });
    }
    const countryCode = countryResult.rows[0].country_code;
    await db.query(
      "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;",
      [countryCode, currentUserId]
    );
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Error adding country.");
  }
});

app.post("/delete-country", async (req, res) => {
  const countryId = req.body["countryId"];
  if (!countryId) return res.redirect("/");
  try {
    await db.query("DELETE FROM visited_countries WHERE id = $1 AND user_id = $2", [countryId, currentUserId]);
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Error deleting country.");
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.redirect("/new");
  } else if (req.body.delete) {

    const userId = parseInt(req.body.delete);
    await db.query("DELETE FROM visited_countries WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM users WHERE id = $1", [userId]);

    const users = await getUsers();
    currentUserId = users.length > 0 ? users[0].id : null;
    res.redirect("/");
  } else {
    currentUserId = parseInt(req.body.user);
    res.redirect("/");
  }
});


app.get("/new", async (req, res) => {
  const users = await getUsers();
  res.render("new", { users, error: null });
});


app.post("/new", async (req, res) => {
  const name = req.body.name?.trim();
  const color = req.body.color;
  if (!name || !color || name.length > 15) {
    const users = await getUsers();
    return res.render("new", { users, error: "Invalid name or color." });
  }
  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id;",
      [name, color]
    );
    currentUserId = result.rows[0].id;
    res.redirect("/");
  } catch (err) {
    const users = await getUsers();
    if (err.code === "23505") {
      res.render("new", { users, error: "User name already exists." });
    } else {
      res.render("new", { users, error: "Error creating user." });
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});