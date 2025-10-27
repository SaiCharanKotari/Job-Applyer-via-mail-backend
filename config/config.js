const sql = require('mysql2');

const db = sql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.log("Error connecting to mySql:", err);
    return;
  }
  console.log("Connected to mySql dataBase");
})
module.exports = db;