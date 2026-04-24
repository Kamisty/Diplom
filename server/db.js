const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,  // Обязательно для Supabase
    },
    // Дополнительные настройки для стабильности
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Проверка подключения с повторными попытками
const connectWithRetry = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            console.log('✅ Подключено к Supabase!');
            client.release();
            return;
        } catch (err) {
            console.log(`⚠️ Попытка ${i + 1}/${retries} подключения к Supabase...`);
            if (i === retries - 1) {
                console.error('❌ Ошибка подключения к Supabase:', err.message);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};

connectWithRetry();

module.exports = pool;