const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcryptjs");

// Настройка CORS для React
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json());

// Логирование всех запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ============================================
// ГЛАВНАЯ - http://localhost:5000/
// ============================================
app.get("/", (req, res) => {
    res.json({ 
        message: "✅ СЕРВЕР РАБОТАЕТ",
        time: new Date().toLocaleString(),
        urls: {
            "POST /api/register": "регистрация пользователя",
            "GET /test": "тестовый маршрут"
        }
    });
});

// ============================================
// ТЕСТОВЫЙ МАРШРУТ - http://localhost:5000/test
// ============================================
app.get("/test", (req, res) => {
    res.json({ message: "GET /test работает" });
});

// ============================================
// ТЕСТОВЫЙ POST - http://localhost:5000/test-post
// ============================================
app.post("/test-post", (req, res) => {
    console.log("📦 Test POST:", req.body);
    res.json({ 
        success: true, 
        message: "POST работает!",
        received: req.body 
    });
});

// ============================================
// РЕГИСТРАЦИЯ - http://localhost:5000/api/register
// ============================================
app.post("/api/register", async (req, res) => {
    console.log("\n" + "=".repeat(60));
    console.log("🔥 POST /api/register ВЫЗВАН!");
    console.log("📦 Тело запроса:", JSON.stringify(req.body, null, 2));
    console.log("=".repeat(60) + "\n");

    try {
        const {
            login,
            name,              // ФИО из формы
            email,
            password_hash,      // Пароль из формы
            password2,          // Подтверждение пароля
            role                // Роль пользователя
        } = req.body;

        // Проверка обязательных полей
        if (!login || !name || !email || !password_hash || !password2 || !role) {
            return res.status(400).json({
                success: false,
                error: "Заполните все обязательные поля",
                required: ["login", "name", "email", "password_hash", "password2", "role"],
                received: req.body
            });
        }

        // Проверка совпадения паролей
        if (password_hash !== password2) {
            return res.status(400).json({
                success: false,
                error: "Пароли не совпадают"
            });
        }

        // Проверка email для логина
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(login)) {
            return res.status(400).json({
                success: false,
                error: "Логин должен быть корректным email"
            });
        }

        // Проверка пароля (минимум 6 символов)
        if (password_hash.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Пароль должен быть минимум 6 символов"
            });
        }

        // Проверка существования пользователя
        const userExists = await pool.query(
            "SELECT * FROM users WHERE login = $1 OR email = $2",
            [login, email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: "Пользователь с таким логином или email уже существует"
            });
        }

        // Хеширование пароля
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password_hash, salt);

        // Сохранение в БД (таблица users)
        const newUser = await pool.query(
            `INSERT INTO users (login, name, email, password_hash, role) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING user_id, login, name, email, role`,
            [login, name, email, hashedPassword, role]
        );

        const userId = newUser.rows[0].user_id;
        console.log(`✅ Пользователь зарегистрирован с ID: ${userId}`);

        // Разбиваем ФИО на составляющие для таблицы user_profiles
        const nameParts = name.trim().split(' ');
        let lastName = '';
        let firstName = '';
        let middleName = '';

        if (nameParts.length >= 1) lastName = nameParts[0];
        if (nameParts.length >= 2) firstName = nameParts[1];
        if (nameParts.length >= 3) middleName = nameParts.slice(2).join(' '); // Объединяем оставшиеся части как отчество

        // Создаем запись в таблице user_profiles
        try {
            await pool.query(
                `INSERT INTO user_profiles 
                 (user_id, last_name, first_name, middle_name) 
                 VALUES ($1, $2, $3, $4)`,
                [userId, lastName, firstName, middleName]
            );
            console.log(`✅ Профиль создан для пользователя ${userId}`);
        } catch (profileErr) {
            console.log(`⚠️ Не удалось создать профиль: ${profileErr.message}`);
            // Не возвращаем ошибку, так как пользователь уже создан
        }

        res.status(201).json({
            success: true,
            message: "Регистрация прошла успешно!",
            user: {
                ...newUser.rows[0],
                // Добавляем информацию о том, что профиль создан
                profile_created: true
            }
        });

    } catch (err) {
        console.error("❌ Ошибка при регистрации:", err);
        
        // Проверка на ошибку структуры таблицы
        if (err.message.includes("column") && err.message.includes("does not exist")) {
            return res.status(500).json({
                success: false,
                error: "Ошибка при регистрации",
                details: `Проверьте структуру таблицы: ${err.message}`,
                hint: "В таблице должны быть поля: login, name, email, password_hash, role"
            });
        }

        res.status(500).json({
            success: false,
            error: "Ошибка при регистрации",
            details: err.message
        });
    }
});

// ============================================
// ВХОД - http://localhost:5000/api/login (исправлено с /api/input)
// ============================================
app.post("/api/input", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 POST /api/login ВЫЗВАН!");
  console.log("📦 Тело запроса:", JSON.stringify(req.body, null, 2));
  console.log("=".repeat(60) + "\n");

  try {
    const { login, password } = req.body;

    // Проверка обязательных полей
    if (!login || !password) {
      return res.status(400).json({
        success: false,
        error: "Заполните все обязательные поля",
        required: ["login", "password"],
        received: req.body
      });
    }

    // Поиск пользователя в БД (таблица users)
    const userResult = await pool.query(
      "SELECT * FROM users WHERE login = $1 OR email = $1",
      [login]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Неверный логин или пароль"
      });
    }

    const user = userResult.rows[0];

    // Проверка пароля
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: "Неверный логин или пароль"
      });
    }

    // Получаем данные из профиля, если они есть
    let profileData = {};
    try {
      const profileResult = await pool.query(
        "SELECT * FROM user_profiles WHERE user_id = $1",
        [user.user_id]
      );
      if (profileResult.rows.length > 0) {
        profileData = profileResult.rows[0];
      }
    } catch (profileErr) {
      console.log("Профиль не найден или таблица не существует");
    }

    console.log(`✅ Пользователь вошел: ${user.login}`);

    // Отправляем данные пользователя вместе с профилем
    res.json({
      success: true,
      message: "Вход выполнен успешно!",
      user: {
        id: user.user_id,
        user_id: user.user_id,
        login: user.login,
        name: user.name,
        email: user.email,
        role: user.role,
        // Данные из профиля
        ...profileData
      }
    });

  } catch (err) {
    console.error("❌ Ошибка при входе:", err);
    res.status(500).json({
      success: false,
      error: "Ошибка при входе в систему",
      details: err.message
    });
  }
});

// ============================================
// РАБОТА С ПРОФИЛЕМ ПОЛЬЗОВАТЕЛЯ (user_profiles)
// ============================================

// Получение профиля пользователя
app.get('/api/user-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const profile = await pool.query(
      `SELECT * FROM user_profiles WHERE user_id = $1`,
      [userId]
    );

    if (profile.rows.length === 0) {
      return res.json({
        success: true,
        profile: null,
        message: 'Профиль не найден'
      });
    }

    res.json({
      success: true,
      profile: profile.rows[0]
    });
  } catch (err) {
    console.error('Ошибка при получении профиля:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении данных профиля'
    });
  }
});

// Создание или обновление профиля пользователя
app.post('/api/user-profile/update', async (req, res) => {
  try {
    const {
      user_id,
      last_name,
      first_name,
      middle_name,
      academic_degree,
      academic_title,
      position,
      workplace,
      phone,
      orcid_id,
      avatar_url
    } = req.body;

    // Проверяем, существует ли уже профиль
    const existingProfile = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [user_id]
    );

    let result;

    if (existingProfile.rows.length === 0) {
      // Создаем новый профиль
      result = await pool.query(
        `INSERT INTO user_profiles 
         (user_id, last_name, first_name, middle_name, academic_degree, 
          academic_title, position, workplace, phone, orcid_id, avatar_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [user_id, last_name, first_name, middle_name, academic_degree,
         academic_title, position, workplace, phone, orcid_id, avatar_url]
      );
    } else {
      // Обновляем существующий профиль
      result = await pool.query(
        `UPDATE user_profiles 
         SET last_name = COALESCE($2, last_name),
             first_name = COALESCE($3, first_name),
             middle_name = COALESCE($4, middle_name),
             academic_degree = COALESCE($5, academic_degree),
             academic_title = COALESCE($6, academic_title),
             position = COALESCE($7, position),
             workplace = COALESCE($8, workplace),
             phone = COALESCE($9, phone),
             orcid_id = COALESCE($10, orcid_id),
             avatar_url = COALESCE($11, avatar_url)
         WHERE user_id = $1
         RETURNING *`,
        [user_id, last_name, first_name, middle_name, academic_degree,
         academic_title, position, workplace, phone, orcid_id, avatar_url]
      );
    }

    console.log(`✅ Профиль пользователя ${user_id} обновлен`);

    res.json({
      success: true,
      message: 'Профиль успешно сохранен',
      profile: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Ошибка при сохранении профиля:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка при сохранении профиля',
      details: err.message
    });
  }
});

// Получение полной информации о пользователе (из обеих таблиц)
app.get('/api/user-full/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `SELECT u.user_id, u.login, u.name, u.email, u.role,
              p.last_name, p.first_name, p.middle_name,
              p.academic_degree, p.academic_title, p.position,
              p.workplace, p.phone, p.orcid_id, p.avatar_url
       FROM users u
       LEFT JOIN user_profiles p ON u.user_id = p.user_id
       WHERE u.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Ошибка при получении данных пользователя:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении данных'
    });
  }
});



// ============================================
// СОЗДАНИЕ КОНФЕРЕНЦИИ - http://localhost:5000/api/conferences
// ============================================
app.post('/api/conferences', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 POST /api/conferences ВЫЗВАН!");
  console.log("📦 Тело запроса:", JSON.stringify(req.body, null, 2));
  console.log("=".repeat(60) + "\n");

  try {
    const { 
      title, 
      description, 
      start_date, 
      end_date, 
      submission_deadline, 
      location, 
      format, 
      sections,
      created_by 
    } = req.body;

    // Валидация обязательных полей
    const requiredFields = {
      title: 'Название конференции',
      description: 'Описание',
      start_date: 'Дата начала',
      end_date: 'Дата окончания',
      submission_deadline: 'Дедлайн подачи заявок',
      location: 'Место проведения',
      format: 'Формат',
      sections: 'Секции',
      created_by: 'Создатель'
    };

    const missingFields = [];
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field]) {
        missingFields.push(label);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Заполните обязательные поля: ${missingFields.join(', ')}`
      });
    }

    // Проверяем, что секции не пустые
    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Добавьте хотя бы одну секцию'
      });
    }

    // Проверяем существование пользователя (created_by)
    const userCheck = await pool.query(
      'SELECT user_id, login, name, email FROM users WHERE user_id = $1',
      [created_by]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // Фильтруем пустые секции
    const nonEmptySections = sections.filter(s => s && s.trim() !== '');
    
    if (nonEmptySections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Секции не могут быть пустыми'
      });
    }

    // Преобразуем массив секций в JSON для PostgreSQL
    const sectionsJson = JSON.stringify(nonEmptySections);

    // Проверяем структуру таблицы conferences
    try {
      // Сначала проверим, существует ли таблица и какие в ней колонки
      const tableCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'conferences'
      `);

      console.log('Структура таблицы conferences:', tableCheck.rows.map(r => r.column_name));

      // Если таблицы нет, создаем её
      if (tableCheck.rows.length === 0) {
        console.log('Таблица conferences не найдена, создаем...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS conferences (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            submission_deadline DATE NOT NULL,
            location VARCHAR(255) NOT NULL,
            format VARCHAR(50) CHECK (format IN ('offline', 'online', 'hybrid')),
            section JSONB DEFAULT '[]',
            created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ Таблица conferences создана');
      }
    } catch (err) {
      console.log('Ошибка при проверке таблицы:', err.message);
    }

    // Вставляем данные в таблицу conferences
    const query = `
      INSERT INTO conferences 
      (title, description, start_date, end_date, submission_deadline, 
       location, format, section, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, title, created_by
    `;

    const values = [
      title,
      description,
      start_date,
      end_date,
      submission_deadline,
      location,
      format,
      sectionsJson,
      created_by
    ];

    const result = await pool.query(query, values);
    const conferenceId = result.rows[0].id;

    console.log(`✅ Конференция создана с ID: ${conferenceId}`);
    console.log(`👤 Создатель: ${userCheck.rows[0].login} (ID: ${created_by})`);

    res.status(201).json({
      success: true,
      message: 'Конференция успешно создана!',
      conference: {
        id: conferenceId,
        title,
        created_by: {
          id: userCheck.rows[0].user_id,
          login: userCheck.rows[0].login,
          name: userCheck.rows[0].name
        },
        created_at: result.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при создании конференции:', error);
    
    // Проверяем специфические ошибки PostgreSQL
    if (error.code === '42P01') { // Таблица не существует
      return res.status(500).json({
        success: false,
        error: 'Таблица conferences не существует. Проверьте базу данных.',
        details: error.message
      });
    }
    
    if (error.code === '23503') { // Нарушение внешнего ключа
      return res.status(400).json({
        success: false,
        error: 'Указанный пользователь не существует',
        details: error.message
      });
    }

    if (error.code === '23502') { // NOT NULL violation
      return res.status(400).json({
        success: false,
        error: 'Отсутствует обязательное поле',
        details: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Ошибка при создании конференции',
      details: error.message
    });
  }
});

// ============================================
// ПОЛУЧЕНИЕ ВСЕХ КОНФЕРЕНЦИЙ - http://localhost:5000/api/conferences
// ============================================
app.get('/api/conferences', async (req, res) => {
  try {
    const query = `
      SELECT c.*, 
             u.login as creator_login, 
             u.name as creator_name,
             u.email as creator_email
      FROM conferences c
      LEFT JOIN users u ON c.created_by = u.user_id
      ORDER BY c.start_date DESC
    `;
    
    const result = await pool.query(query);
    
    // Парсим JSON для секций
    const conferences = result.rows.map(conf => ({
      ...conf,
      sections: conf.section ? JSON.parse(conf.section) : []
    }));

    console.log(`📊 Получено конференций: ${conferences.length}`);

    res.json({
      success: true,
      conferences
    });

  } catch (error) {
    console.error('❌ Ошибка при получении конференций:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка конференций',
      details: error.message
    });
  }
});

// ============================================
// ПОЛУЧЕНИЕ КОНКРЕТНОЙ КОНФЕРЕНЦИИ - http://localhost:5000/api/conferences/:id
// ============================================
app.get('/api/conferences/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT c.*, 
             u.login as creator_login, 
             u.name as creator_name,
             u.email as creator_email
      FROM conferences c
      LEFT JOIN users u ON c.created_by = u.user_id
      WHERE c.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Конференция не найдена'
      });
    }

    const conference = {
      ...result.rows[0],
      sections: result.rows[0].section ? JSON.parse(result.rows[0].section) : []
    };

    res.json({
      success: true,
      conference
    });

  } catch (error) {
    console.error('❌ Ошибка при получении конференции:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении конференции',
      details: error.message
    });
  }
});

// ============================================
// ОБНОВЛЕНИЕ КОНФЕРЕНЦИИ - http://localhost:5000/api/conferences/:id
// ============================================
app.put('/api/conferences/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Проверяем существование конференции
    const conferenceCheck = await pool.query(
      'SELECT * FROM conferences WHERE id = $1',
      [id]
    );

    if (conferenceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Конференция не найдена'
      });
    }

    // Подготавливаем обновление
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    const updateFields = {
      title: updates.title,
      description: updates.description,
      start_date: updates.start_date,
      end_date: updates.end_date,
      submission_deadline: updates.submission_deadline,
      location: updates.location,
      format: updates.format,
      section: updates.sections ? JSON.stringify(updates.sections) : undefined
    };

    for (const [field, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        setClause.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    // Добавляем updated_at
    setClause.push(`updated_at = CURRENT_TIMESTAMP`);

    if (setClause.length === 1) { // Только updated_at
      return res.status(400).json({
        success: false,
        error: 'Нет данных для обновления'
      });
    }

    values.push(id); // для WHERE id = $last

    const query = `
      UPDATE conferences 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    console.log(`✅ Конференция ${id} обновлена`);

    res.json({
      success: true,
      message: 'Конференция успешно обновлена',
      conference: {
        ...result.rows[0],
        sections: JSON.parse(result.rows[0].section || '[]')
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при обновлении конференции:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении конференции',
      details: error.message
    });
  }
});

// ============================================
// УДАЛЕНИЕ КОНФЕРЕНЦИИ - http://localhost:5000/api/conferences/:id
// ============================================
app.delete('/api/conferences/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем существование конференции
    const conferenceCheck = await pool.query(
      'SELECT * FROM conferences WHERE id = $1',
      [id]
    );

    if (conferenceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Конференция не найдена'
      });
    }

    // Удаляем конференцию
    await pool.query('DELETE FROM conferences WHERE id = $1', [id]);

    console.log(`✅ Конференция ${id} удалена`);

    res.json({
      success: true,
      message: 'Конференция успешно удалена'
    });

  } catch (error) {
    console.error('❌ Ошибка при удалении конференции:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении конференции',
      details: error.message
    });
  }
});




// ============================================
// ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ - http://localhost:5000/api/users/:id
// ============================================

app.get('/api/users', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 GET /api/users ВЫЗВАН!");
  console.log("=".repeat(60) + "\n");

  try {
    
    const query = `
      SELECT 
        user_id,
        login,
        email,
        name,
        role
      FROM users
      ORDER BY user_id DESC
    `;

    const result = await pool.query(query);

    console.log(`✅ Загружено пользователей: ${result.rows.length}`);

    res.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('❌ Ошибка при загрузке пользователей:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при загрузке пользователей',
      details: error.message
    });
  }
});
// ============================================
// ОБНОВЛЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЯ - http://localhost:5000/api/users/:id/role
// ============================================
app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Проверка допустимых ролей
    const validRoles = ['admin', 'organizer', 'section_head', 'reviewer', 'author', 'participant'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Недопустимая роль'
      });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING user_id, login, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    console.log(`✅ Роль пользователя ${id} изменена на ${role}`);

    res.json({
      success: true,
      message: 'Роль пользователя обновлена',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Ошибка при обновлении роли:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении роли'
    });
  }
});


// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================
const PORT = 5000;
app.listen(PORT, () => {
    console.log("\n" + "=".repeat(60));
    console.log(`🚀 СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}`);
    console.log("=".repeat(60));
    console.log("📝 Проверьте маршруты:");
    console.log(`   GET  http://localhost:${PORT}/`);
    console.log(`   GET  http://localhost:${PORT}/test`);
    console.log(`   POST http://localhost:${PORT}/test-post`);
    console.log(`   POST http://localhost:${PORT}/api/register <- РЕГИСТРАЦИЯ`);
    console.log(`   POST http://localhost:${PORT}/api/login <- ВХОД`);
    console.log(`   GET  http://localhost:${PORT}/api/user-profile/:userId <- ПОЛУЧЕНИЕ ПРОФИЛЯ`);
    console.log(`   POST http://localhost:${PORT}/api/user-profile/update <- ОБНОВЛЕНИЕ ПРОФИЛЯ`);
    console.log(`   POST http://localhost:${PORT}/api/conferences <- СОЗДАНИЕ КОНФЕРЕНЦИИ (НОВЫЙ!)`);
    console.log(`   GET  http://localhost:${PORT}/api/conferences <- СПИСОК КОНФЕРЕНЦИЙ (НОВЫЙ!)`);
    console.log(`   GET  http://localhost:${PORT}/api/conferences/:id <- ПОЛУЧЕНИЕ КОНФЕРЕНЦИИ (НОВЫЙ!)`);
    console.log(`   PUT  http://localhost:${PORT}/api/conferences/:id <- ОБНОВЛЕНИЕ КОНФЕРЕНЦИИ (НОВЫЙ!)`);
    console.log(`   DELETE http://localhost:${PORT}/api/conferences/:id <- УДАЛЕНИЕ КОНФЕРЕНЦИИ (НОВЫЙ!)`);
    console.log("=".repeat(60) + "\n");
});
