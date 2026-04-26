// const Pool = require("pg").Pool;

// const pool = new Pool({
//     user: "myuser",
//     password: "200204",
//     host: "localhost",
//     port: 5432,
//     database: "conf"
// });

// module.exports = pool;


const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Подключение к Supabase PostgreSQL через Session Pooler (порт 6543)...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL подключен через Session Pooler');
});

pool.on('error', (err) => {
  console.error('❌ Ошибка PostgreSQL:', err.message);
});

// Проверка подключения
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as time, current_user as user, version() as version');
    console.log('✅ База данных успешно подключена!');
    console.log(`👤 Пользователь: ${result.rows[0].user}`);
    console.log(`🕐 Время на сервере: ${result.rows[0].time}`);
    console.log(`💾 Версия PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
  } catch (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
    console.log('\n💡 Проверьте:');
    console.log('   1. DATABASE_URL в .env файле');
    console.log('   2. Пароль от базы данных');
    console.log('   3. Интернет соединение');
    process.exit(1);
  } finally {
    if (client) client.release();
  }
}

// Запускаем проверку подключения
testConnection();

module.exports = pool;