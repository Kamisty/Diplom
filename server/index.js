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
            name,
            email,
            password_hash,
            password2,
            role,
            // УБЕРИТЕ roles из деструктуризации, если она не приходит!
            // roles - удалите эту строку
        } = req.body;

        console.log("🔍 ПРОВЕРКА ПОЛЕЙ:");
        console.log(`   login: ${login ? '✅' : '❌'} (${login})`);
        console.log(`   name: ${name ? '✅' : '❌'} (${name})`);
        console.log(`   email: ${email ? '✅' : '❌'} (${email})`);
        console.log(`   password_hash: ${password_hash ? '✅' : '❌'}`);
        console.log(`   password2: ${password2 ? '✅' : '❌'}`);
        console.log(`   role: ${role ? '✅' : '❌'} (${role})`);

        // Проверка обязательных полей
        if (!login || !name || !email || !password_hash || !password2) {
            console.log("❌ Ошибка: Не все обязательные поля заполнены");
            return res.status(400).json({
                success: false,
                error: "Заполните все обязательные поля"
            });
        }

        // Проверка наличия роли
        if (!role || typeof role !== 'string' || role.trim() === '') {
            console.log("❌ Ошибка: Роль не выбрана");
            return res.status(400).json({
                success: false,
                error: "Выберите роль"
            });
        }

        // Преобразуем одиночную роль в массив
        const rolesArray = [role];
        console.log("📦 Роли для назначения:", rolesArray);

        // Проверка совпадения паролей
        if (password_hash !== password2) {
            console.log("❌ Ошибка: Пароли не совпадают");
            return res.status(400).json({
                success: false,
                error: "Пароли не совпадают"
            });
        }
        console.log("✅ Пароли совпадают");

        // Проверка email для логина
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(login)) {
            console.log("❌ Ошибка: Логин не является корректным email");
            return res.status(400).json({
                success: false,
                error: "Логин должен быть корректным email"
            });
        }
        console.log("✅ Логин - корректный email");

        // Проверка пароля
        if (password_hash.length < 8) {
            console.log("❌ Ошибка: Пароль слишком короткий");
            return res.status(400).json({
                success: false,
                error: "Пароль должен быть минимум 8 символов"
            });
        }
        
        if (!/[A-Z]/.test(password_hash)) {
            console.log("❌ Ошибка: Нет заглавной буквы в пароле");
            return res.status(400).json({
                success: false,
                error: "Пароль должен содержать хотя бы одну заглавную букву"
            });
        }
        
        if (!/[0-9]/.test(password_hash)) {
            console.log("❌ Ошибка: Нет цифры в пароле");
            return res.status(400).json({
                success: false,
                error: "Пароль должен содержать хотя бы одну цифру"
            });
        }
        console.log("✅ Пароль соответствует требованиям безопасности");

        // Проверка существования пользователя
        console.log("🔍 Проверка существования пользователя...");
        const userExists = await pool.query(
            "SELECT * FROM users WHERE login = $1 OR email = $2",
            [login, email]
        );

        if (userExists.rows.length > 0) {
            console.log("❌ Пользователь уже существует");
            return res.status(400).json({
                success: false,
                error: "Пользователь с таким логином или email уже существует"
            });
        }
        console.log("✅ Пользователь не найден, можно регистрировать");

        // Хеширование пароля
        console.log("🔐 Хеширование пароля...");
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password_hash, salt);
        console.log("✅ Пароль захеширован");

        // Начинаем транзакцию
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            console.log("📝 Начата транзакция");

            // 1. Сохранение в таблицу users (без поля role!)
            console.log("💾 Сохранение пользователя в таблицу users...");
            const newUser = await client.query(
                `INSERT INTO users (login, name, email, password_hash) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING user_id, login, name, email`,
                [login, name, email, hashedPassword]
            );

            const userId = newUser.rows[0].user_id;
            console.log(`✅ Пользователь зарегистрирован с ID: ${userId}`);

            // 2. Маппинг ролей
            const roleMapping = {
                'admin': 'Администратор конференции',
                'section_head': 'Руководитель секции',
                'reviewer': 'Рецензент',
                'author': 'Автор',
            };

            // 3. Для каждой выбранной роли создаем запись в user_roles
            const assignedRoles = [];

            for (const userRole of rolesArray) {
                const dbRoleName = roleMapping[userRole] || userRole;
                
                console.log(`🔍 Поиск роли: "${dbRoleName}" для пользователя ${userId}`);
                
                // Ищем роль в таблице roles
                let roleResult = await client.query(
                    `SELECT role_id, role_name FROM roles WHERE role_name = $1`,
                    [dbRoleName]
                );
                
                if (roleResult.rows.length === 0) {
                    console.log(`⚠️ Точное совпадение не найдено для "${dbRoleName}", ищем частичное...`);
                    
                    const fuzzyRoleResult = await client.query(
                        `SELECT role_id, role_name FROM roles WHERE role_name ILIKE $1`,
                        [`%${userRole}%`]
                    );
                    
                    if (fuzzyRoleResult.rows.length === 0) {
                        console.log(`❌ Роль "${dbRoleName}" не найдена в БД`);
                        throw new Error(`Роль "${dbRoleName}" не найдена в базе данных`);
                    }
                    
                    roleResult = fuzzyRoleResult;
                }
                
                const roleId = roleResult.rows[0].role_id;
                const roleName = roleResult.rows[0].role_name;
                
                console.log(`✅ Найдена роль: "${roleName}" (ID: ${roleId})`);
                
                // Создаем запись в таблице user_roles
                await client.query(
                    `INSERT INTO user_roles (user_id, role_id) 
                     VALUES ($1, $2)`,
                    [userId, roleId]
                );
                assignedRoles.push(roleName);
                console.log(`✅ Назначена роль "${roleName}" (ID: ${roleId}) пользователю ${userId}`);
            }

            if (assignedRoles.length === 0) {
                throw new Error(`Не удалось назначить ни одной роли`);
            }

            // 4. Разбиваем ФИО для профиля
            const nameParts = name.trim().split(' ');
            let lastName = '';
            let firstName = '';
            let middleName = '';

            if (nameParts.length >= 1) lastName = nameParts[0];
            if (nameParts.length >= 2) firstName = nameParts[1];
            if (nameParts.length >= 3) middleName = nameParts.slice(2).join(' ');

            // 5. Создаем запись в таблице user_profiles
            try {
                await client.query(
                    `INSERT INTO user_profiles 
                     (user_id, last_name, first_name, middle_name) 
                     VALUES ($1, $2, $3, $4)`,
                    [userId, lastName, firstName, middleName]
                );
                console.log(`✅ Профиль создан для пользователя ${userId}`);
            } catch (profileErr) {
                console.log(`⚠️ Не удалось создать профиль: ${profileErr.message}`);
                // Не прерываем транзакцию, профиль не критичен
            }

            await client.query('COMMIT');
            console.log("✅ Транзакция завершена успешно");
            
            res.status(201).json({
                success: true,
                message: "Регистрация прошла успешно!",
                user: {
                    user_id: userId,
                    login: newUser.rows[0].login,
                    name: newUser.rows[0].name,
                    email: newUser.rows[0].email,
                    roles: assignedRoles
                }
            });

        } catch (transactionErr) {
            await client.query('ROLLBACK');
            console.error("❌ Ошибка в транзакции:", transactionErr);
            throw transactionErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("❌ Ошибка при регистрации:", err);
        console.error("❌ Стек ошибки:", err.stack);
        
        res.status(500).json({
            success: false,
            error: "Ошибка при регистрации",
            details: err.message
        });
    }
});



// ============================================
// ВХОД - http://localhost:5000/api/input
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

    // ========== ВАЖНО: Получаем роли пользователя из таблицы user_roles ==========
    let userRoles = [];
    try {
      const rolesResult = await pool.query(
        `SELECT r.role_name 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.role_id 
         WHERE ur.user_id = $1`,
        [user.user_id]
      );
      userRoles = rolesResult.rows.map(row => row.role_name);
      console.log(`✅ Загружены роли для пользователя ${user.login}:`, userRoles);
    } catch (rolesErr) {
      console.log("Ошибка при загрузке ролей:", rolesErr.message);
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

    // Отправляем данные пользователя вместе с ролями и профилем
    res.json({
      success: true,
      message: "Вход выполнен успешно!",
      user: {
        id: user.user_id,
        user_id: user.user_id,
        login: user.login,
        name: user.name,
        email: user.email,
        roles: userRoles,  // ВАЖНО: добавляем роли в ответ
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
// ПОЛУЧЕНИЕ РОЛЕЙ ПОЛЬЗОВАТЕЛЯ
// ============================================
app.get('/api/user/:userId/roles', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `SELECT r.role_name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = $1`,
      [userId]
    );
    
    const roles = result.rows.map(row => row.role_name);
    
    res.json({
      success: true,
      roles: roles
    });
    
  } catch (error) {
    console.error('❌ Ошибка при получении ролей:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера'
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


  try {
  for (const sectionName of nonEmptySections) {
    await pool.query(
      `INSERT INTO sections (conference_id, name_section, user_id) 
       VALUES ($1, $2, $3)`,
      [conferenceId, sectionName, created_by] // Передаем ID создателя
    );
  }
  console.log(`✅ Секции сохранены в таблицу sections для конференции ${conferenceId}`);
} catch (sectionErr) {
  console.error('❌ Ошибка при сохранении секций:', sectionErr);
}

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
// СОХРАНЕНИЕ СЕКЦИЙ КОНФЕРЕНЦИИ - http://localhost:5000/api/sections
// ============================================
app.post('/api/sections', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 POST /api/sections ВЫЗВАН!");
  console.log("📦 Тело запроса:", JSON.stringify(req.body, null, 2));
  console.log("=".repeat(60) + "\n");

  try {
    const { conferenceId, sections } = req.body;

    if (!conferenceId || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Не указан ID конференции или список секций'
      });
    }

    // Начинаем транзакцию
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Удаляем старые секции для этой конференции
      await client.query(
        'DELETE FROM sections WHERE conference_id = $1',
        [conferenceId]
      );

      // Вставляем новые секции
      for (const sectionName of sections) {
        if (sectionName && sectionName.trim() !== '') {
          // Вставляем в name_section 
          await client.query(
            `INSERT INTO sections (conference_id, name_section) 
             VALUES ($1, $2)`,
            [conferenceId, sectionName.trim()]
          );
        }
      }

      await client.query('COMMIT');
      
      console.log(`✅ Секции сохранены для конференции ${conferenceId}`);

      res.json({
        success: true,
        message: 'Секции успешно сохранены'
      });

    } catch (transactionErr) {
      await client.query('ROLLBACK');
      throw transactionErr;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Ошибка при сохранении секций:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при сохранении секций',
      details: error.message
    });
  }
});

// ============================================
// ПОЛУЧЕНИЕ СЕКЦИЙ КОНФЕРЕНЦИИ - http://localhost:5000/api/sections?conferenceId=1
// ============================================
app.get('/api/sections', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 GET /api/sections ВЫЗВАН!");
  console.log("=".repeat(60) + "\n");

  try {
    const { conferenceId } = req.query;

    let query = `
      SELECT 
        id_sections as id,
        conference_id,
        name_section,
        user_id,
        creater
      FROM sections
    `;
    
    const params = [];
    
    if (conferenceId) {
      query += ` WHERE conference_id = $1`;
      params.push(conferenceId);
    }
    
    query += ` ORDER BY id_sections`;

    const result = await pool.query(query, params);

    console.log(`✅ Загружено секций: ${result.rows.length}`);

    // Преобразуем результат для удобства использования на фронтенде
    const formattedSections = result.rows.map(row => ({
      id: row.id,
      conference_id: row.conference_id,
      name: row.name_section, 
      head_id: row.user_id,
      creater: row.creater
    }));

    res.json({
      success: true,
      sections: formattedSections
    });

  } catch (error) {
    console.error('❌ Ошибка при загрузке секций:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при загрузке секций',
      details: error.message
    });
  }
});

// ============================================
// НАЗНАЧЕНИЕ РУКОВОДИТЕЛЯ СЕКЦИИ - http://localhost:5000/api/sections/:id/head
// ============================================
app.put('/api/sections/:id/head', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 PUT /api/sections/:id/head ВЫЗВАН!");
  console.log("=".repeat(60) + "\n");

  try {
    const { id } = req.params;
    const { headId } = req.body;

    // Проверяем, что секция существует
    const sectionCheck = await pool.query(
      'SELECT * FROM sections WHERE id_sections = $1',
      [id]
    );

    if (sectionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Секция не найдена'
      });
    }

    // Обновляем руководителя секции
    const result = await pool.query(
      `UPDATE sections 
       SET user_id = $1
       WHERE id_sections = $2
       RETURNING *`,
      [headId, id]
    );

    console.log(`✅ Руководитель назначен для секции ${id}`);

    res.json({
      success: true,
      message: 'Руководитель успешно назначен',
      section: {
        id: result.rows[0].id_sections,
        name: result.rows[0].name_section,
        head_id: result.rows[0].user_id
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при назначении руководителя:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при назначении руководителя',
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
    
    // Сначала получаем пользователей
    const usersQuery = `
      SELECT 
        user_id,
        login,
        email,
        name
      FROM users
      ORDER BY user_id DESC
    `;
    
    const usersResult = await pool.query(usersQuery);
    
    // Для каждого пользователя получаем его роли
    const usersWithRoles = [];
    
    for (const user of usersResult.rows) {
      const rolesQuery = `
        SELECT r.role_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = $1
      `;
      
      const rolesResult = await pool.query(rolesQuery, [user.user_id]);
      const roles = rolesResult.rows.map(row => row.role_name);
      
      usersWithRoles.push({
        ...user,
        roles: roles
      });
    }

    console.log(`✅ Загружено пользователей: ${usersWithRoles.length}`);

    res.json({
      success: true,
      users: usersWithRoles
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
// ПОЛУЧЕНИЕ РУКОВОДИТЕЛЕЙ СЕКЦИЙ - http://localhost:5000/api/users/section-heads
// ============================================
app.get('/api/users/section-heads', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 GET /api/users/section-heads ВЫЗВАН!");
  console.log("=".repeat(60) + "\n");

  try {
    // ИСПРАВЛЕНО: получаем пользователей с ролью "Руководитель секции" через user_roles
    const query = `
      SELECT 
        u.user_id as id,
        u.login,
        u.email,
        u.name
      FROM users u
      JOIN user_roles ur ON u.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.role_id
      WHERE r.role_name = 'Руководитель секции'
      ORDER BY u.name
    `;

    const result = await pool.query(query);

    console.log(`✅ Загружено руководителей: ${result.rows.length}`);

    res.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('❌ Ошибка при загрузке руководителей:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при загрузке руководителей',
      details: error.message
    });
  }
});

// ============================================
// ПОЛУЧЕНИЕ СПИСКА КОНФЕРЕНЦИЙ
// ============================================
app.get('/api/conferences', async (req, res) => {
  try {
    console.log('📥 Запрос на получение конференций');
    
    const result = await pool.query(`
      SELECT  
        name, 
        description
      FROM conferences 
      ORDER BY deadline DESC
    `);
    
    console.log(`📦 Найдено конференций: ${result.rows.length}`);
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка при получении конференций:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});






// ============================================
// СМЕНА EMAIL ПОЛЬЗОВАТЕЛЯ
// ============================================
app.post('/api/user/change-email', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId, newEmail, password } = req.body;
    
    console.log('📦 Запрос на смену email для пользователя ID:', userId);
    console.log('📧 Новый email:', newEmail);
    
    // Валидация
    if (!userId || !newEmail || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Все поля обязательны' 
      });
    }

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Введите корректный email' 
      });
    }
    
    // Получаем данные пользователя
    const userResult = await client.query(
      'SELECT user_id, login, email, name, password_hash FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }

    const user = userResult.rows[0];
    
    // Проверяем пароль (с bcrypt)
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный пароль' 
      });
    }
    
    // Проверяем, не занят ли новый email другим пользователем
    const emailCheck = await client.query(
      'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
      [newEmail, userId]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Этот email уже используется другим пользователем' 
      });
    }

    // Проверяем, не совпадает ли новый email со старым
    if (user.email === newEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Новый email совпадает с текущим' 
      });
    }
    
    // Обновляем email в базе данных (только email)
    const updateResult = await client.query(
      `UPDATE users 
       SET email = $1
       WHERE user_id = $2 
       RETURNING user_id, login, email, name`,
      [newEmail, userId]
    );

    console.log('✅ Email успешно обновлен в БД для пользователя:', userId);
    console.log('📧 Старый email:', user.email);
    console.log('📧 Новый email:', newEmail);
    console.log('👤 Обновленные данные:', updateResult.rows[0]);
    
    res.json({ 
      success: true, 
      message: 'Email успешно изменен',
      user: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Ошибка при смене email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера при смене email' 
    });
  } finally {
    client.release();
  }
});

// ============================================
// ПРОВЕРКА ТЕКУЩЕГО EMAIL (для отладки)
// ============================================
app.get('/api/user/:userId/check-email', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await client.query(
      'SELECT user_id, login, email FROM users WHERE user_id = $1',
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
    
  } catch (error) {
    console.error('❌ Ошибка при проверке email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера' 
    });
  }
});






// ============================================
// СМЕНА ПАРОЛЯ ПОЛЬЗОВАТЕЛЯ
// ============================================
app.post('/api/user/change-password', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    console.log('📦 Запрос на смену пароля для пользователя ID:', userId);
    console.log('📦 Полученные данные:', { 
      userId, 
      currentPassword: currentPassword ? '***' : 'не указан', 
      newPassword: newPassword ? '***' : 'не указан' 
    });
    
    // Валидация
    if (!userId) {
      console.log('❌ userId не указан');
      return res.status(400).json({ 
        success: false, 
        error: 'ID пользователя не указан' 
      });
    }
    
    if (!currentPassword) {
      console.log('❌ currentPassword не указан');
      return res.status(400).json({ 
        success: false, 
        error: 'Введите текущий пароль' 
      });
    }
    
    if (!newPassword) {
      console.log('❌ newPassword не указан');
      return res.status(400).json({ 
        success: false, 
        error: 'Введите новый пароль' 
      });
    }

    // Проверка сложности пароля
    if (newPassword.length < 8) {
      console.log('❌ Пароль слишком короткий');
      return res.status(400).json({ 
        success: false, 
        error: 'Пароль должен содержать минимум 8 символов' 
      });
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      console.log('❌ Нет заглавной буквы');
      return res.status(400).json({ 
        success: false, 
        error: 'Пароль должен содержать хотя бы одну заглавную букву' 
      });
    }
    
    if (!/[0-9]/.test(newPassword)) {
      console.log('❌ Нет цифры');
      return res.status(400).json({ 
        success: false, 
        error: 'Пароль должен содержать хотя бы одну цифру' 
      });
    }
    
    // Проверяем, что новый пароль отличается от старого
    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Новый пароль должен отличаться от текущего' 
      });
    }
    
    // Получаем данные пользователя
    console.log('🔍 Поиск пользователя с ID:', userId);
    const userResult = await client.query(
      'SELECT user_id, password_hash FROM users WHERE user_id = $1',
      [userId]
    );
    
    console.log('📊 Результат запроса:', userResult.rows.length ? 'Пользователь найден' : 'Пользователь не найден');
    
    if (userResult.rows.length === 0) {
      console.log('❌ Пользователь не найден');
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }

    const user = userResult.rows[0];
    console.log('👤 Найден пользователь:', { userId: user.user_id });
    
    // Проверяем текущий пароль
    console.log('🔐 Проверка текущего пароля...');
    let validPassword = false;
    
    try {
      validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      console.log('✅ Результат проверки пароля:', validPassword ? 'верный' : 'неверный');
    } catch (bcryptError) {
      console.error('❌ Ошибка при сравнении паролей:', bcryptError);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка при проверке пароля' 
      });
    }
    
    if (!validPassword) {
      console.log('❌ Неверный текущий пароль');
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный текущий пароль' 
      });
    }
    
    // Хешируем новый пароль
    console.log('🔐 Хеширование нового пароля...');
    const saltRounds = 10;
    let newPasswordHash;
    
    try {
      newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      console.log('✅ Новый пароль захеширован');
    } catch (hashError) {
      console.error('❌ Ошибка при хешировании пароля:', hashError);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка при обработке пароля' 
      });
    }
    
    // Обновляем пароль в базе данных
    console.log('💾 Обновление пароля в БД...');
    try {
      await client.query(
        `UPDATE users 
         SET password_hash = $1
         WHERE user_id = $2`,
        [newPasswordHash, userId]
      );
      console.log('✅ Пароль обновлен в БД');
    } catch (dbError) {
      console.error('❌ Ошибка при обновлении БД:', dbError);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка при сохранении нового пароля' 
      });
    }

    console.log('✅ Пароль успешно изменен для пользователя:', userId);
    
    res.json({ 
      success: true, 
      message: 'Пароль успешно изменен'
    });
    
  } catch (error) {
    console.error('❌ Общая ошибка при смене пароля:', error);
    console.error('❌ Стек ошибки:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера при смене пароля',
      details: error.message 
    });
  } finally {
    client.release();
    console.log('📌 Соединение с БД освобождено');
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


