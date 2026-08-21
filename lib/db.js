const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.JDBC_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;