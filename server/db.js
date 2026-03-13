const Pool = require("pg").Pool;

const pool = new Pool({
    user: "myuser",
    password: "200204",
    host: "localhost",
    port: 5432,
    database: "conf"
});

module.exports = pool;