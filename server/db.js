const Pool = require("pg").Pool;

const pool = new Pool({
    user: "myuser",
    password: "1234",
    host: "localhost",
    port: 5432,
    database: "conference_db"
});

module.exports = pool;