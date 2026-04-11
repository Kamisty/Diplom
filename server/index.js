const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");


// Настройка CORS для React
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json());

// Создаем папку для загрузок, если её нет
const uploadDir = 'uploads/reports';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый тип файла. Разрешены: PDF, DOC, DOCX'));
        }
    }
});

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
            return res.status(400).json({
                success: false,
                error: "Заполните все обязательные поля"
            });
        }

        // Проверка наличия роли
        if (!role || typeof role !== 'string' || role.trim() === '') {
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

        // Проверка пароля
        if (password_hash.length < 8) {
            return res.status(400).json({
                success: false,
                error: "Пароль должен быть минимум 8 символов"
            });
        }
        
        if (!/[A-Z]/.test(password_hash)) {
            return res.status(400).json({
                success: false,
                error: "Пароль должен содержать хотя бы одну заглавную букву"
            });
        }
        
        if (!/[0-9]/.test(password_hash)) {
            return res.status(400).json({
                success: false,
                error: "Пароль должен содержать хотя бы одну цифру"
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

        // Начинаем транзакцию
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Сохранение в таблицу users
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
                
                // Ищем роль в таблице roles
                let roleResult = await client.query(
                    `SELECT role_id, role_name FROM roles WHERE role_name = $1`,
                    [dbRoleName]
                );
                
                if (roleResult.rows.length === 0) {
                    const fuzzyRoleResult = await client.query(
                        `SELECT role_id, role_name FROM roles WHERE role_name ILIKE $1`,
                        [`%${userRole}%`]
                    );
                    
                    if (fuzzyRoleResult.rows.length === 0) {
                        throw new Error(`Роль "${dbRoleName}" не найдена в базе данных`);
                    }
                    
                    roleResult = fuzzyRoleResult;
                }
                
                const roleId = roleResult.rows[0].role_id;
                const roleName = roleResult.rows[0].role_name;
                
                // Создаем запись в таблице user_roles
                await client.query(
                    `INSERT INTO user_roles (user_id, role_id) 
                     VALUES ($1, $2)`,
                    [userId, roleId]
                );
                assignedRoles.push(roleName);
                console.log(`✅ Назначена роль "${roleName}" пользователю ${userId}`);

                // 4. ЕСЛИ РОЛЬ = РЕЦЕНЗЕНТ, ДОБАВЛЯЕМ В ТАБЛИЦУ resensent
                if (roleName === 'Рецензент') {
                    console.log(`📝 Пользователь ${userId} является рецензентом, добавляем запись в таблицу resensent...`);
                    
                    // Разбиваем ФИО для таблицы рецензентов
                    const nameParts = name.trim().split(' ');
                    const lastName = nameParts[0] || '';
                    const firstName = nameParts[1] || '';
                    const middleName = nameParts.slice(2).join(' ') || '';
                    
                    // Формируем полное имя рецензента
                    const fullName = `${lastName} ${firstName} ${middleName}`.trim();
                    
                    // Проверяем, существует ли уже запись для этого пользователя
                    const existingResensent = await client.query(
                        `SELECT * FROM resensent WHERE user_id = $1`,
                        [userId]
                    );
                    
                    if (existingResensent.rows.length === 0) {
                        // Добавляем запись в таблицу resensent
                        await client.query(
                            `INSERT INTO resensent (user_id, name_resensent, email, created_at) 
                             VALUES ($1, $2, $3, NOW())`,
                            [userId, fullName, email || login]
                        );
                        console.log(`✅ Рецензент добавлен в таблицу resensent: ${fullName}`);
                    } else {
                        console.log(`⚠️ Рецензент с user_id ${userId} уже существует в таблице resensent`);
                    }
                }
            }

            if (assignedRoles.length === 0) {
                throw new Error(`Не удалось назначить ни одной роли`);
            }

            // 5. Разбиваем ФИО для профиля
            const nameParts = name.trim().split(' ');
            let lastName = '';
            let firstName = '';
            let middleName = '';

            if (nameParts.length >= 1) lastName = nameParts[0];
            if (nameParts.length >= 2) firstName = nameParts[1];
            if (nameParts.length >= 3) middleName = nameParts.slice(2).join(' ');

            // 6. Создаем запись в таблице user_profiles
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
        roles: userRoles,
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
// ПОЛУЧЕНИЕ РОЛЕЙ ПОЛЬЗОВАТЕЛЯ ПО ЛОГИНУ
// ============================================
app.post('/api/user-roles', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 POST /api/user-roles ВЫЗВАН!");
  console.log("📦 Тело запроса:", JSON.stringify(req.body, null, 2));
  console.log("=".repeat(60) + "\n");

  try {
    const { login } = req.body;

    if (!login) {
      return res.status(400).json({
        success: false,
        error: "Логин (email) обязателен"
      });
    }

    const userResult = await pool.query(
      "SELECT user_id, login, name, email FROM users WHERE login = $1 OR email = $1",
      [login]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Пользователь не найден"
      });
    }

    const user = userResult.rows[0];

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
    } catch (rolesErr) {
      console.log("⚠️ Ошибка при загрузке ролей:", rolesErr.message);
    }

    if (userRoles.length === 0) {
      return res.status(404).json({
        success: false,
        error: "У пользователя не найдены роли"
      });
    }

    res.json({
      success: true,
      roles: userRoles,
      user: {
        id: user.user_id,
        login: user.login,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error("❌ Ошибка при получении ролей пользователя:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка сервера при получении ролей",
      details: error.message
    });
  }
});

// ============================================
// ПОЛУЧЕНИЕ РОЛЕЙ ПОЛЬЗОВАТЕЛЯ ПО ID
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
// ДОБАВЛЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЮ
// ============================================
app.post('/api/user/add-role', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 POST /api/user/add-role ВЫЗВАН!");
  console.log("📦 Тело запроса:", JSON.stringify(req.body, null, 2));
  console.log("=".repeat(60) + "\n");

  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        error: "Не указан ID пользователя или роль"
      });
    }

    const idToDbMapping = {
      'author': 'Автор',
      'reviewer': 'Рецензент',
      'section_head': 'Руководитель секции',
      'admin': 'Администратор конференции'
    };

    const dbToIdMapping = {
      'Автор': 'author',
      'Рецензент': 'reviewer',
      'Руководитель секции': 'section_head',
      'Администратор конференции': 'admin'
    };

    let roleName;
    let roleId;

    if (role in idToDbMapping) {
      roleName = idToDbMapping[role];
      roleId = role;
    } else if (role in dbToIdMapping) {
      roleName = role;
      roleId = dbToIdMapping[role];
    } else {
      return res.status(400).json({
        success: false,
        error: `Некорректное название роли: ${role}. Доступные роли: author, reviewer, section_head, admin`
      });
    }

    const userCheck = await pool.query(
      "SELECT user_id, name, login, email FROM users WHERE user_id = $1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Пользователь не найден"
      });
    }

    const user = userCheck.rows[0];

    const roleResult = await pool.query(
      "SELECT role_id FROM roles WHERE role_name = $1",
      [roleName]
    );

    if (roleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Роль "${roleName}" не найдена в системе`
      });
    }

    const roleDbId = roleResult.rows[0].role_id;

    const existingRole = await pool.query(
      "SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2",
      [userId, roleDbId]
    );

    if (existingRole.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "У пользователя уже есть эта роль"
      });
    }

    await pool.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
      [userId, roleDbId]
    );

    if (roleName === 'Рецензент') {
      const nameParts = user.name.trim().split(' ');
      const lastName = nameParts[0] || '';
      const firstName = nameParts[1] || '';
      const middleName = nameParts.slice(2).join(' ') || '';
      const fullName = `${lastName} ${firstName} ${middleName}`.trim();
      
      const existingResensent = await pool.query(
        `SELECT * FROM resensent WHERE user_id = $1`,
        [userId]
      );
      
      if (existingResensent.rows.length === 0) {
        await pool.query(
          `INSERT INTO resensent (user_id, name_resensent, email, created_at) 
           VALUES ($1, $2, $3, NOW())`,
          [userId, fullName || user.name, user.email || user.login]
        );
      }
    }

    const updatedRolesResult = await pool.query(
      `SELECT r.role_name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = $1`,
      [userId]
    );

    const updatedRoles = updatedRolesResult.rows.map(row => {
      return dbToIdMapping[row.role_name] || row.role_name;
    });

    res.json({
      success: true,
      message: `Роль "${roleName}" успешно добавлена`,
      userRoles: updatedRoles
    });

  } catch (error) {
    console.error("❌ Ошибка при добавлении роли:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка сервера при добавлении роли",
      details: error.message
    });
  }
});

// ============================================
// УДАЛЕНИЕ РОЛИ У ПОЛЬЗОВАТЕЛЯ
// ============================================
app.delete('/api/user/remove-role', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 DELETE /api/user/remove-role ВЫЗВАН!");
  console.log("📦 Тело запроса:", JSON.stringify(req.body, null, 2));
  console.log("=".repeat(60) + "\n");

  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        error: "Не указан ID пользователя или роль"
      });
    }

    const idToDbMapping = {
      'author': 'Автор',
      'reviewer': 'Рецензент',
      'section_head': 'Руководитель секции',
      'admin': 'Администратор конференции'
    };

    const dbToIdMapping = {
      'Автор': 'author',
      'Рецензент': 'reviewer',
      'Руководитель секции': 'section_head',
      'Администратор конференции': 'admin'
    };

    let roleName;

    if (role in idToDbMapping) {
      roleName = idToDbMapping[role];
    } else if (role in dbToIdMapping) {
      roleName = role;
    } else {
      return res.status(400).json({
        success: false,
        error: `Некорректное название роли: ${role}`
      });
    }

    const roleResult = await pool.query(
      "SELECT role_id FROM roles WHERE role_name = $1",
      [roleName]
    );

    if (roleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Роль "${roleName}" не найдена`
      });
    }

    const roleDbId = roleResult.rows[0].role_id;

    const deleteResult = await pool.query(
      "DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING *",
      [userId, roleDbId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "У пользователя нет такой роли"
      });
    }

    if (roleName === 'Рецензент') {
      await pool.query(
        `DELETE FROM resensent WHERE user_id = $1`,
        [userId]
      );
    }

    const updatedRolesResult = await pool.query(
      `SELECT r.role_name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = $1`,
      [userId]
    );

    const updatedRoles = updatedRolesResult.rows.map(row => {
      return dbToIdMapping[row.role_name] || row.role_name;
    });

    res.json({
      success: true,
      message: `Роль "${roleName}" успешно удалена`,
      userRoles: updatedRoles
    });

  } catch (error) {
    console.error("❌ Ошибка при удалении роли:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка сервера при удалении роли",
      details: error.message
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

    const existingProfile = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [user_id]
    );

    let result;

    if (existingProfile.rows.length === 0) {
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

// Получение полной информации о пользователе
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
// СОЗДАНИЕ КОНФЕРЕНЦИИ
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

    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Добавьте хотя бы одну секцию'
      });
    }

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

    const nonEmptySections = sections.filter(s => s && s.trim() !== '');
    
    if (nonEmptySections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Секции не могут быть пустыми'
      });
    }

    const sectionsJson = JSON.stringify(nonEmptySections);

    const query = `
      INSERT INTO conferences 
      (title, description, start_date, end_date, submission_deadline, 
       location, format, section, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, title, created_by, created_at
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

    for (const sectionName of nonEmptySections) {
      await pool.query(
        `INSERT INTO sections (conference_id, name_section, user_id) 
         VALUES ($1, $2, $3)`,
        [conferenceId, sectionName, created_by]
      );
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
    
    if (error.code === '42P01') {
      return res.status(500).json({
        success: false,
        error: 'Таблица conferences не существует. Проверьте базу данных.',
        details: error.message
      });
    }
    
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Указанный пользователь не существует',
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
// ПОЛУЧЕНИЕ ВСЕХ КОНФЕРЕНЦИЙ
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
// ПОЛУЧЕНИЕ КОНКРЕТНОЙ КОНФЕРЕНЦИИ
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
// ОБНОВЛЕНИЕ КОНФЕРЕНЦИИ
// ============================================
app.put('/api/conferences/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

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

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);

    if (setClause.length === 1) {
      return res.status(400).json({
        success: false,
        error: 'Нет данных для обновления'
      });
    }

    values.push(id);

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
// УДАЛЕНИЕ КОНФЕРЕНЦИИ
// ============================================
app.delete('/api/conferences/:id', async (req, res) => {
  try {
    const { id } = req.params;

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
// СОХРАНЕНИЕ СЕКЦИЙ КОНФЕРЕНЦИИ
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

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      await client.query(
        'DELETE FROM sections WHERE conference_id = $1',
        [conferenceId]
      );

      for (const sectionName of sections) {
        if (sectionName && sectionName.trim() !== '') {
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
// ПОЛУЧЕНИЕ СЕКЦИЙ КОНФЕРЕНЦИИ
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
// НАЗНАЧЕНИЕ РУКОВОДИТЕЛЯ СЕКЦИИ
// ============================================
app.put('/api/sections/:id/head', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 PUT /api/sections/:id/head ВЫЗВАН!");
  console.log("=".repeat(60) + "\n");

  try {
    const { id } = req.params;
    const { headId } = req.body;

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
// ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ
// ============================================
app.get('/api/users', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 GET /api/users ВЫЗВАН!");
  console.log("=".repeat(60) + "\n");

  try {
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
// ОБНОВЛЕНИЕ РОЛЕЙ ПОЛЬЗОВАТЕЛЯ
// ============================================
app.put('/api/user/update-roles', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 PUT /api/user/update-roles ВЫЗВАН!");
  console.log("📦 Тело запроса:", JSON.stringify(req.body, null, 2));
  console.log("=".repeat(60) + "\n");

  try {
    const { userId, roles } = req.body;

    if (!userId || !Array.isArray(roles)) {
      return res.status(400).json({
        success: false,
        error: "Не указан ID пользователя или список ролей"
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userInfo = await client.query(
        "SELECT name, login, email FROM users WHERE user_id = $1",
        [userId]
      );
      
      if (userInfo.rows.length === 0) {
        throw new Error("Пользователь не найден");
      }
      
      const user = userInfo.rows[0];

      const currentRolesResult = await client.query(
        `SELECT r.role_name 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.role_id 
         WHERE ur.user_id = $1`,
        [userId]
      );
      
      const currentRoles = currentRolesResult.rows.map(row => row.role_name);
      
      const wasReviewer = currentRoles.includes('Рецензент');
      const isReviewer = roles.includes('Рецензент');
      
      await client.query(
        "DELETE FROM user_roles WHERE user_id = $1",
        [userId]
      );

      for (const roleName of roles) {
        const roleResult = await client.query(
          "SELECT role_id FROM roles WHERE role_name = $1",
          [roleName]
        );

        if (roleResult.rows.length > 0) {
          const roleId = roleResult.rows[0].role_id;
          await client.query(
            "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
            [userId, roleId]
          );
        }
      }
      
      if (!wasReviewer && isReviewer) {
        const nameParts = user.name.trim().split(' ');
        const lastName = nameParts[0] || '';
        const firstName = nameParts[1] || '';
        const middleName = nameParts.slice(2).join(' ') || '';
        const fullName = `${lastName} ${firstName} ${middleName}`.trim();
        
        const existingResensent = await client.query(
          `SELECT * FROM resensent WHERE user_id = $1`,
          [userId]
        );
        
        if (existingResensent.rows.length === 0) {
          await client.query(
            `INSERT INTO resensent (user_id, name_resensent, email, created_at) 
             VALUES ($1, $2, $3, NOW())`,
            [userId, fullName, user.email]
          );
        }
      } else if (wasReviewer && !isReviewer) {
        await client.query(
          `DELETE FROM resensent WHERE user_id = $1`,
          [userId]
        );
      }

      await client.query('COMMIT');

      console.log(`✅ Роли пользователя ${userId} обновлены:`, roles);

      res.json({
        success: true,
        message: "Роли успешно обновлены",
        roles: roles
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("❌ Ошибка:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка сервера",
      details: error.message
    });
  }
});

// ============================================
// ПОЛУЧЕНИЕ РУКОВОДИТЕЛЕЙ СЕКЦИЙ
// ============================================
app.get('/api/users/section-heads', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 GET /api/users/section-heads ВЫЗВАН!");
  console.log("=".repeat(60) + "\n");

  try {
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
// СМЕНА EMAIL ПОЛЬЗОВАТЕЛЯ
// ============================================
app.post('/api/user/change-email', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId, newEmail, password } = req.body;
    
    console.log('📦 Запрос на смену email для пользователя ID:', userId);
    
    if (!userId || !newEmail || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Все поля обязательны' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Введите корректный email' 
      });
    }
    
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
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный пароль' 
      });
    }
    
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

    if (user.email === newEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Новый email совпадает с текущим' 
      });
    }
    
    const updateResult = await client.query(
      `UPDATE users 
       SET email = $1
       WHERE user_id = $2 
       RETURNING user_id, login, email, name`,
      [newEmail, userId]
    );

    console.log('✅ Email успешно обновлен для пользователя:', userId);
    
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
// СМЕНА ПАРОЛЯ ПОЛЬЗОВАТЕЛЯ
// ============================================
app.post('/api/user/change-password', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    console.log('📦 Запрос на смену пароля для пользователя ID:', userId);
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID пользователя не указан' 
      });
    }
    
    if (!currentPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Введите текущий пароль' 
      });
    }
    
    if (!newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Введите новый пароль' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Пароль должен содержать минимум 8 символов' 
      });
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Пароль должен содержать хотя бы одну заглавную букву' 
      });
    }
    
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Пароль должен содержать хотя бы одну цифру' 
      });
    }
    
    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Новый пароль должен отличаться от текущего' 
      });
    }
    
    const userResult = await client.query(
      'SELECT user_id, password_hash FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }

    const user = userResult.rows[0];
    
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный текущий пароль' 
      });
    }
    
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    await client.query(
      `UPDATE users 
       SET password_hash = $1
       WHERE user_id = $2`,
      [newPasswordHash, userId]
    );

    console.log('✅ Пароль успешно изменен для пользователя:', userId);
    
    res.json({ 
      success: true, 
      message: 'Пароль успешно изменен'
    });
    
  } catch (error) {
    console.error('❌ Ошибка при смене пароля:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера при смене пароля',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// РАБОТА С ДОКЛАДАМИ (REPORTS)
// ============================================

// СОХРАНЕНИЕ ДОКЛАДА - POST /api/reports
app.post('/api/reports', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('🔥 POST /api/reports ВЫЗВАН!');
  console.log('📦 Тело запроса:', req.body);
  console.log('='.repeat(60) + '\n');

  try {
    const {
      title,
      section_id,
      user_id,
      abstract,
      keywords,
      content,
      additional_info
    } = req.body;

    // Валидация
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Введите название доклада' });
    }
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'ID пользователя обязателен' });
    }
    if (!section_id) {
      return res.status(400).json({ success: false, error: 'ID секции обязателен' });
    }
    if (!abstract || !abstract.trim()) {
      return res.status(400).json({ success: false, error: 'Введите аннотацию' });
    }
    if (!keywords || !keywords.trim()) {
      return res.status(400).json({ success: false, error: 'Введите ключевые слова' });
    }

    // Проверка пользователя
    const userCheck = await pool.query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [user_id]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    // Проверка секции
    const sectionCheck = await pool.query(
      'SELECT id_sections FROM sections WHERE id_sections = $1',
      [section_id]
    );
    if (sectionCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Секция не найдена' });
    }

    // ✅ ПРАВИЛЬНОЕ ПРЕОБРАЗОВАНИЕ В JSONB
    let contentJson = null;
    if (content) {
      contentJson = typeof content === 'string' ? content : JSON.stringify(content);
    }

    const now = new Date();

    // Сохраняем в БД с приведением к jsonb
    const query = `
      INSERT INTO reports (
        title,
        abstract,
        keywords,
        additional_info,
        content,
        status,
        created_at,
        user_id,
        id_sections
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
      RETURNING report_id, title, status, created_at
    `;

    const values = [
      title.trim(),
      abstract.trim(),
      keywords.trim(),
      additional_info || null,
      contentJson,
      'pending',
      now,
      parseInt(user_id),
      parseInt(section_id)
    ];

    const result = await pool.query(query, values);
    const newReport = result.rows[0];

    console.log(`✅ Доклад сохранён с ID: ${newReport.report_id}`);

    res.status(201).json({
      success: true,
      message: 'Доклад успешно отправлен',
      report: {
        report_id: newReport.report_id,
        title: newReport.title,
        status: newReport.status,
        created_at: newReport.created_at
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при сохранении доклада:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при сохранении доклада',
      details: error.message
    });
  }
});

// ПОЛУЧЕНИЕ ДОКЛАДОВ ПОЛЬЗОВАТЕЛЯ - GET /api/reports/user/:userId
app.get('/api/reports/user/:userId', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('🔥 GET /api/reports/user/:userId ВЫЗВАН!');
  console.log(`📦 userId: ${req.params.userId}`);
  console.log('='.repeat(60) + '\n');

  try {
    const { userId } = req.params;

    const query = `
      SELECT 
        r.report_id,
        r.title,
        r.abstract,
        r.keywords,
        r.status,
        r.created_at,
        r.submitted_at,
        r.final_decision_at,
        r.final_decision_notes,
        s.name_section as section_name,
        s.conference_id,
        c.title as conference_title
      FROM reports r
      LEFT JOIN sections s ON r.id_sections = s.id_sections
      LEFT JOIN conferences c ON s.conference_id = c.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    console.log(`✅ Загружено докладов: ${result.rows.length}`);

    res.json({
      success: true,
      reports: result.rows
    });

  } catch (error) {
    console.error('❌ Ошибка при получении докладов:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка докладов',
      details: error.message
    });
  }
});

// ПОЛУЧЕНИЕ ОДНОГО ДОКЛАДА - GET /api/reports/:reportId
app.get('/api/reports/:reportId', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('🔥 GET /api/reports/:reportId ВЫЗВАН!');
  console.log(`📦 reportId: ${req.params.reportId}`);
  console.log('='.repeat(60) + '\n');

  try {
    const { reportId } = req.params;

    const query = `
      SELECT 
        r.*,
        s.name_section as section_name,
        s.conference_id,
        c.title as conference_title,
        u.name as author_name,
        u.login as author_login
      FROM reports r
      LEFT JOIN sections s ON r.id_sections = s.id_sections
      LEFT JOIN conferences c ON s.conference_id = c.id
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE r.report_id = $1
    `;

    const result = await pool.query(query, [reportId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Доклад не найден'
      });
    }

    res.json({
      success: true,
      report: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Ошибка при получении доклада:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении доклада',
      details: error.message
    });
  }
});

// ОБНОВЛЕНИЕ СТАТУСА ДОКЛАДА - PUT /api/reports/:reportId/status
app.put('/api/reports/:reportId/status', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('🔥 PUT /api/reports/:reportId/status ВЫЗВАН!');
  console.log(`📦 reportId: ${req.params.reportId}`);
  console.log('📦 Статус:', req.body.status);
  console.log('='.repeat(60) + '\n');

  try {
    const { reportId } = req.params;
    const { status, final_decision_notes } = req.body;

    const validStatuses = ['pending', 'under_review', 'accepted', 'rejected', 'revision_required'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Некорректный статус. Допустимые: ${validStatuses.join(', ')}`
      });
    }

    let finalDecisionAt = null;
    if (status === 'accepted' || status === 'rejected') {
      finalDecisionAt = new Date();
    }

    const query = `
      UPDATE reports 
      SET status = $1,
          final_decision_at = COALESCE($2, final_decision_at),
          final_decision_notes = COALESCE($3, final_decision_notes)
      WHERE report_id = $4
      RETURNING report_id, status, final_decision_at
    `;

    const result = await pool.query(query, [status, finalDecisionAt, final_decision_notes, reportId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Доклад не найден' });
    }

    console.log(`✅ Статус доклада ${reportId} изменён на "${status}"`);

    res.json({
      success: true,
      message: 'Статус доклада обновлён',
      report: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Ошибка при обновлении статуса:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении статуса',
      details: error.message
    });
  }
});

// УДАЛЕНИЕ ДОКЛАДА - DELETE /api/reports/:reportId
app.delete('/api/reports/:reportId', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('🔥 DELETE /api/reports/:reportId ВЫЗВАН!');
  console.log(`📦 reportId: ${req.params.reportId}`);
  console.log('='.repeat(60) + '\n');

  try {
    const { reportId } = req.params;

    const result = await pool.query(
      'DELETE FROM reports WHERE report_id = $1 RETURNING report_id',
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Доклад не найден' });
    }

    console.log(`✅ Доклад ${reportId} удалён`);

    res.json({
      success: true,
      message: 'Доклад успешно удалён'
    });

  } catch (error) {
    console.error('❌ Ошибка при удалении доклада:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении доклада',
      details: error.message
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
    console.log(`   POST http://localhost:${PORT}/api/input <- ВХОД`);
    console.log(`   GET  http://localhost:${PORT}/api/user-profile/:userId <- ПОЛУЧЕНИЕ ПРОФИЛЯ`);
    console.log(`   POST http://localhost:${PORT}/api/user-profile/update <- ОБНОВЛЕНИЕ ПРОФИЛЯ`);
    console.log(`   POST http://localhost:${PORT}/api/conferences <- СОЗДАНИЕ КОНФЕРЕНЦИИ`);
    console.log(`   GET  http://localhost:${PORT}/api/conferences <- СПИСОК КОНФЕРЕНЦИЙ`);
    console.log(`   GET  http://localhost:${PORT}/api/conferences/:id <- ПОЛУЧЕНИЕ КОНФЕРЕНЦИИ`);
    console.log(`   PUT  http://localhost:${PORT}/api/conferences/:id <- ОБНОВЛЕНИЕ КОНФЕРЕНЦИИ`);
    console.log(`   DELETE http://localhost:${PORT}/api/conferences/:id <- УДАЛЕНИЕ КОНФЕРЕНЦИИ`);
    console.log(`   POST http://localhost:${PORT}/api/reports <- СОХРАНЕНИЕ ДОКЛАДА (НОВЫЙ!)`);
    console.log(`   GET  http://localhost:${PORT}/api/reports/user/:userId <- ДОКЛАДЫ ПОЛЬЗОВАТЕЛЯ (НОВЫЙ!)`);
    console.log(`   GET  http://localhost:${PORT}/api/reports/:id <- ПОЛУЧЕНИЕ ДОКЛАДА (НОВЫЙ!)`);
    console.log(`   GET  http://localhost:${PORT}/api/reports/:id/download <- СКАЧИВАНИЕ ФАЙЛА (НОВЫЙ!)`);
    console.log(`   DELETE http://localhost:${PORT}/api/reports/:id <- УДАЛЕНИЕ ДОКЛАДА (НОВЫЙ!)`);
    console.log(`   POST http://localhost:${PORT}/api/drafts <- СОХРАНЕНИЕ ЧЕРНОВИКА (НОВЫЙ!)`);
    console.log(`   GET  http://localhost:${PORT}/api/drafts/user/:userId <- ЗАГРУЗКА ЧЕРНОВИКА (НОВЫЙ!)`);
    console.log("=".repeat(60) + "\n");
});