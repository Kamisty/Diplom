const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcryptjs");

const db = require('./db');  // <-- ДОБАВЬТЕ ЭТУ СТРОКУ
// Настройка CORS для React
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
// ПОЛУЧЕНИЕ РОЛЕЙ ПОЛЬЗОВАТЕЛЯ ПО ЛОГИНУ (НОВЫЙ!)
// ============================================
app.post('/api/user-roles', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 POST /api/user-roles ВЫЗВАН!");
  console.log("📦 Тело запроса:", JSON.stringify(req.body, null, 2));
  console.log("=".repeat(60) + "\n");

  try {
    const { login } = req.body;

    // Проверка обязательных полей
    if (!login) {
      return res.status(400).json({
        success: false,
        error: "Логин (email) обязателен"
      });
    }

    console.log(`🔍 Поиск пользователя с логином: ${login}`);

    // Поиск пользователя в БД (таблица users)
    const userResult = await pool.query(
      "SELECT user_id, login, name, email FROM users WHERE login = $1 OR email = $1",
      [login]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ Пользователь с логином ${login} не найден`);
      return res.status(404).json({
        success: false,
        error: "Пользователь не найден"
      });
    }

    const user = userResult.rows[0];
    console.log(`✅ Пользователь найден: ID=${user.user_id}, Login=${user.login}`);

    // Получаем роли пользователя из таблицы user_roles
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
      console.log(`✅ Роли пользователя:`, userRoles);
    } catch (rolesErr) {
      console.log("⚠️ Ошибка при загрузке ролей:", rolesErr.message);
    }

    if (userRoles.length === 0) {
      console.log(`⚠️ У пользователя ${user.login} нет ролей`);
      return res.status(404).json({
        success: false,
        error: "У пользователя не найдены роли"
      });
    }

    // Отправляем ответ с ролями
   res.json({
      success: true,
      roles: userRoles,  // ✅ Массив ролей: ['Автор', 'Рецензент']
      user: {
        id: user.user_id,
        login: user.login,
        name: user.name,
        email: user.email,
        roles: userRoles  // ✅ Дублируем для удобства фронтенда
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
// ДОБАВЛЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЮ (ИСПРАВЛЕНО)
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

    console.log(`🔍 Получен role: ${role}`);

    // Маппинг: ID фронтенда → название в БД
    const idToDbMapping = {
      'author': 'Автор',
      'reviewer': 'Рецензент',
      'section_head': 'Руководитель секции',
      'admin': 'Администратор конференции'
    };

    let roleName; // Название роли для БД

    // Определяем, что пришло: ID или название из БД
    if (role in idToDbMapping) {
      roleName = idToDbMapping[role];
      console.log(`✅ ID роли "${role}" преобразован в название БД: "${roleName}"`);
    } else if (Object.values(idToDbMapping).includes(role)) {
      roleName = role;
      console.log(`✅ Получено название роли из БД: "${roleName}"`);
    } else {
      return res.status(400).json({
        success: false,
        error: `Некорректная роль: ${role}. Доступно: author, reviewer, section_head, admin или Автор, Рецензент, Руководитель секции, Администратор конференции`
      });
    }

    // Проверяем существование пользователя
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

    // Находим ID роли в таблице roles
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

    // Проверяем, не добавлена ли роль уже
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

    // Добавляем роль
    await pool.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
      [userId, roleDbId]
    );

    // Специальная обработка для рецензента
    if (roleName === 'Рецензент') {
      console.log(`📝 Пользователь ${userId} становится рецензентом...`);
      
      const nameParts = (user.name || '').trim().split(' ');
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
          [userId, fullName || user.name || user.login, user.email || user.login]
        );
        console.log(`✅ Рецензент добавлен: ${fullName || user.name || user.login}`);
      }
    }

    // ✅ ГЛАВНОЕ: Возвращаем роли в формате БД (не конвертируем в ID!)
    const updatedRolesResult = await pool.query(
      `SELECT r.role_name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = $1`,
      [userId]
    );

    // ✅ Возвращаем role_name как есть: ['Автор', 'Рецензент']
    const updatedRoles = updatedRolesResult.rows.map(row => row.role_name);

    console.log(`✅ Роль "${roleName}" добавлена пользователю ${userId}`);
    console.log(`📋 Обновлённые роли (БД-формат):`, updatedRoles);

    res.json({
      success: true,
      message: `Роль "${roleName}" успешно добавлена`,
      userRoles: updatedRoles,  // ✅ Теперь: ['Автор'], а не ['author']
      user: {
        id: user.user_id,
        login: user.login,
        name: user.name,
        email: user.email,
        roles: updatedRoles  // ✅ Для удобства фронтенда
      }
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
// УДАЛЕНИЕ РОЛИ У ПОЛЬЗОВАТЕЛЯ (ИСПРАВЛЕНО)
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

    // Маппинг ID роли -> название в БД
    const idToDbMapping = {
      'author': 'Автор',
      'reviewer': 'Рецензент',
      'section_head': 'Руководитель секции',
      'admin': 'Администратор конференции'
    };

    // Обратный маппинг (название БД -> ID)
    const dbToIdMapping = {
      'Автор': 'author',
      'Рецензент': 'reviewer',
      'Руководитель секции': 'section_head',
      'Администратор конференции': 'admin'
    };

    let roleName;

    // Определяем название роли для БД
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

    // Находим ID роли
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

    // Удаляем роль у пользователя
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

    // ========== ОБРАБОТКА УДАЛЕНИЯ РЕЦЕНЗЕНТА ==========
    if (roleName === 'Рецензент') {
      console.log(`🗑️ Пользователь ${userId} больше не рецензент...`);
      
      await pool.query(
        `DELETE FROM resensent WHERE user_id = $1`,
        [userId]
      );
      console.log(`✅ Рецензент удален из таблицы resensent`);
    }

    // Получаем обновленный список ролей (в формате БД!)
    const updatedRolesResult = await pool.query(
      `SELECT r.role_name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = $1`,
      [userId]
    );

    // ✅ Возвращаем названия из БД, а не ID
    const updatedRoles = updatedRolesResult.rows.map(row => row.role_name);

    console.log(`✅ Роль "${roleName}" удалена у пользователя ${userId}`);

    // ✅ ОТВЕТ СЕРВЕРА
    res.json({
      success: true,
      message: `Роль "${roleName}" успешно удалена`,
      userRoles: updatedRoles  // ✅ ['Автор'], а не ['author']
    });

  } catch (error) {  // ← ✅ Закрывающий catch для try
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

    // Начинаем транзакцию
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // ✅ Убрали created_at и updated_at
      const query = `
        INSERT INTO conferences 
        (title, description, start_date, end_date, submission_deadline, 
         location, format, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
        created_by
      ];

      const result = await client.query(query, values);
      const conferenceId = result.rows[0].id;

      console.log(`✅ Конференция создана с ID: ${conferenceId}`);
      console.log(`👤 Создатель: ${userCheck.rows[0].login} (ID: ${created_by})`);

      // Сохраняем секции в таблицу sections
      for (const sectionName of nonEmptySections) {
        await client.query(
          `INSERT INTO sections (conference_id, name_section, user_id) 
           VALUES ($1, $2, $3)`,
          [conferenceId, sectionName.trim(), created_by]
        );
      }
      console.log(`✅ Добавлено ${nonEmptySections.length} секций для конференции ${conferenceId}`);

      await client.query('COMMIT');

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
          }
        },
        sections_count: nonEmptySections.length
      });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Ошибка в транзакции:', err);
      throw err;
    } finally {
      client.release();
    }

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

    if (error.code === '23502') {
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
      SELECT 
        c.*, 
        u.login as creator_login, 
        u.name as creator_name,
        u.email as creator_email,
        COALESCE(
          (SELECT json_agg(json_build_object('id', s.id_sections, 'name', s.name_section))
           FROM sections s
           WHERE s.conference_id = c.id),
          '[]'::json
        ) as sections
      FROM conferences c
      LEFT JOIN users u ON c.created_by = u.user_id
      GROUP BY c.id, u.login, u.name, u.email
      ORDER BY c.start_date DESC
    `;
    
    const result = await pool.query(query);
    
    console.log(`📊 Получено конференций: ${result.rows.length}`);

    res.json({
      success: true,
      conferences: result.rows
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

    // Получаем секции для этой конференции
    const sectionsQuery = `
      SELECT 
        s.id_sections as id,
        s.name_section as name
      FROM sections s
      WHERE s.conference_id = $1
      ORDER BY s.name_section
    `;
    
    const sectionsResult = await pool.query(sectionsQuery, [id]);

    const conference = {
      ...result.rows[0],
      sections: sectionsResult.rows
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
    const { title, description, start_date, end_date, submission_deadline, location, format } = req.body;

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

    const query = `
      UPDATE conferences 
      SET title = $1, 
          description = $2, 
          start_date = $3, 
          end_date = $4, 
          submission_deadline = $5, 
          location = $6, 
          format = $7
      WHERE id = $8
      RETURNING *
    `;

    const result = await pool.query(query, [
      title, description, start_date, end_date, 
      submission_deadline, location, format, id
    ]);
    
    console.log(`✅ Конференция ${id} обновлена`);

    res.json({
      success: true,
      message: 'Конференция успешно обновлена',
      conference: result.rows[0]
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
// ПОЛУЧЕНИЕ СЕКЦИЙ КОНФЕРЕНЦИИ - http://localhost:5000/api/conferences/:id/sections
// ============================================
app.get('/api/conferences/:id/sections', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 GET /api/conferences/:id/sections ВЫЗВАН!");
  console.log(`📦 ID конференции: ${req.params.id}`);
  console.log("=".repeat(60) + "\n");

  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.title,
        s.id_sections as id,
        s.name_section as name,
        s.conference_id,
        s.user_id as head_id,
        u.name as head_name
      FROM sections s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN conferences c ON c.id = s.conference_id
      WHERE s.conference_id = $1
      ORDER BY s.name_section
    `;

    const result = await pool.query(query, [id]);

    console.log(`✅ Загружено секций: ${result.rows.length}`);

    res.json({
      success: true,
      sections: result.rows
    });

  } catch (error) {
    console.error('❌ Ошибка при получении секций конференции:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при загрузке секций',
      details: error.message
    });
  }
});


// ============================================
// СОЗДАНИЕ СЕКЦИИ ДЛЯ КОНФЕРЕНЦИИ - http://localhost:5000/api/conferences/:id/sections
// ============================================
app.post('/api/conferences/:id/sections', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 POST /api/conferences/:id/sections ВЫЗВАН!");
  console.log("📦 Тело запроса:", req.body);
  console.log("=".repeat(60) + "\n");

  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // ✅ Получаем реального пользователя из тела запроса
    let userId = req.body.user_id;
    
    // Если user_id не передан, пытаемся получить из сессии или берем первого существующего
    if (!userId) {
      const userResult = await pool.query(
        "SELECT user_id FROM users ORDER BY user_id LIMIT 1"
      );
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].user_id;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Нет пользователей в системе'
        });
      }
    }

    // Проверяем, существует ли пользователь
    const userCheck = await pool.query(
      "SELECT user_id FROM users WHERE user_id = $1",
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Пользователь с ID ${userId} не существует`
      });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Название секции обязательно'
      });
    }

    // ✅ Вставляем секцию с правильным user_id
    const query = `
      INSERT INTO sections (conference_id, name_section, user_id)
      VALUES ($1, $2, $3)
      RETURNING id_sections as id, name_section as name
    `;

    const result = await pool.query(query, [id, name.trim(), userId]);

    console.log(`✅ Секция "${name}" добавлена к конференции ${id} пользователем ${userId}`);

    res.json({
      success: true,
      section: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Ошибка при создании секции:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании секции',
      details: error.message
    });
  }
});


// ============================================
// УДАЛЕНИЕ СЕКЦИИ - http://localhost:5000/api/sections/:id
// ============================================
app.delete('/api/sections/:id', async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 DELETE /api/sections/:id ВЫЗВАН!");
  console.log(`📦 ID секции: ${req.params.id}`);
  console.log("=".repeat(60) + "\n");

  try {
    const { id } = req.params;

    // Проверяем, существует ли секция
    const checkQuery = 'SELECT id_sections FROM sections WHERE id_sections = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Секция не найдена'
      });
    }

    // Удаляем секцию
    const deleteQuery = 'DELETE FROM sections WHERE id_sections = $1';
    await pool.query(deleteQuery, [id]);

    console.log(`✅ Секция ${id} удалена`);

    res.json({
      success: true,
      message: 'Секция успешно удалена'
    });

  } catch (error) {
    console.error('❌ Ошибка при удалении секции:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении секции',
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
// ОБНОВЛЕНИЕ РОЛЕЙ ПОЛЬЗОВАТЕЛЯ (ИСПРАВЛЕНО)
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

    // ✅ Маппинг: ID фронтенда → название в БД
    const idToDbMapping = {
      'author': 'Автор',
      'reviewer': 'Рецензент',
      'section_head': 'Руководитель секции',
      'admin': 'Администратор конференции'
    };

    // ✅ Нормализуем роли: конвертируем ID в названия БД
    const normalizedRoles = roles.map(role => {
      // Если это ID (author, reviewer...) → конвертируем в название БД
      if (role in idToDbMapping) {
        return idToDbMapping[role];
      }
      // Если уже название из БД → оставляем как есть
      return role;
    });

    // ✅ Проверка: нельзя удалить все роли
    if (normalizedRoles.length === 0) {
      return res.status(400).json({
        success: false,
        error: "У пользователя должна быть хотя бы одна роль"
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Получаем информацию о пользователе
      const userInfo = await client.query(
        "SELECT name, login, email FROM users WHERE user_id = $1",
        [userId]
      );
      
      if (userInfo.rows.length === 0) {
        throw new Error("Пользователь не найден");
      }
      
      const user = userInfo.rows[0];

      // Получаем текущие роли пользователя (для сравнения)
      const currentRolesResult = await client.query(
        `SELECT r.role_name 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.role_id 
         WHERE ur.user_id = $1`,
        [userId]
      );
      
      const currentRoles = currentRolesResult.rows.map(row => row.role_name);
      
      // Проверяем изменение роли "Рецензент" для таблицы resensent
      const wasReviewer = currentRoles.includes('Рецензент');
      const isReviewer = normalizedRoles.includes('Рецензент');
      
      // Удаляем все существующие роли пользователя
      await client.query(
        "DELETE FROM user_roles WHERE user_id = $1",
        [userId]
      );

      // ✅ Добавляем новые роли с валидацией
      const successfullyAddedRoles = [];
      const failedRoles = [];

      for (const roleName of normalizedRoles) {
        // Находим роль в таблице roles
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
          successfullyAddedRoles.push(roleName);
        } else {
          // ❌ Роль не найдена в БД — запоминаем для отчёта
          failedRoles.push(roleName);
          console.warn(`⚠️ Роль "${roleName}" не найдена в таблице roles`);
        }
      }

      // ✅ Если какие-то роли не удалось добавить — предупреждаем (но не откатываем)
      if (failedRoles.length > 0) {
        console.warn(`⚠️ Не удалось добавить роли: ${failedRoles.join(', ')}`);
      }

      // ✅ Если ни одна роль не добавлена — ошибка
      if (successfullyAddedRoles.length === 0) {
        throw new Error("Не удалось добавить ни одной роли (проверьте названия в таблице roles)");
      }

      // ========== ОБРАБОТКА ТАБЛИЦЫ resensent ==========
      if (!wasReviewer && isReviewer) {
        // Роль "Рецензент" была ДОБАВЛЕНА
        console.log(`📝 Добавляем пользователя ${userId} в таблицу resensent...`);
        
        const nameParts = (user.name || '').trim().split(' ');
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
            [userId, fullName || user.name || user.login, user.email || user.login]
          );
          console.log(`✅ Рецензент добавлен в таблицу resensent: ${fullName || user.name}`);
        }
      } else if (wasReviewer && !isReviewer) {
        // Роль "Рецензент" была УДАЛЕНА
        console.log(`🗑️ Удаляем пользователя ${userId} из таблицы resensent...`);
        
        await client.query(
          `DELETE FROM resensent WHERE user_id = $1`,
          [userId]
        );
        console.log(`✅ Рецензент удален из таблицы resensent`);
      }

      await client.query('COMMIT');

      // ✅ ГЛАВНОЕ: Возвращаем роли, которые РЕАЛЬНО сохранились в БД
      // (а не то, что пришло в запросе)
      const finalRolesResult = await client.query(
        `SELECT r.role_name 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.role_id 
         WHERE ur.user_id = $1`,
        [userId]
      );
      
      const finalRoles = finalRolesResult.rows.map(row => row.role_name);

      console.log(`✅ Роли пользователя ${userId} обновлены:`, finalRoles);

      res.json({
        success: true,
        message: "Роли успешно обновлены",
        roles: finalRoles,  // ✅ Авторитетный список из БД
        warnings: failedRoles.length > 0 
          ? `Не найдены роли: ${failedRoles.join(', ')}` 
          : null
      });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error("❌ Ошибка в транзакции:", err);
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("❌ Ошибка при обновлении ролей:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка сервера при обновлении ролей",
      details: error.message
    });
  }
});


// // ============================================
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










// // ============================================
// НАЗНАЧЕНИЕ РУКОВОДИТЕЛЕЙ СЕКЦИЙ - http://localhost:5000/api/users/section-heads
// ============================================
// server/index.js

// Получение назначений руководителей для конференции
app.get('/api/section-assignments', async (req, res) => {
  try {
    const { conferenceId } = req.query;
    
    if (!conferenceId) {
      return res.status(400).json({ success: false, error: 'Не указан ID конференции' });
    }

    const query = `
      SELECT 
        s.name_section as section_name,
        hs.user_id as head_id,
        u.name as head_name
      FROM sections s
      LEFT JOIN header_section hs ON s.id_sections = hs.id_section
      LEFT JOIN users u ON hs.user_id = u.user_id
      WHERE s.conference_id = $1
    `;
    
    const result = await db.query(query, [conferenceId]);
    
    res.json({
      success: true,
      assignments: result.rows
    });
  } catch (error) {
    console.error('Ошибка при получении назначений:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Сохранение назначения руководителя
app.post('/api/section-assignments', async (req, res) => {
  try {
    const { conferenceId, sectionName, headId } = req.body;
    
    if (!conferenceId || !sectionName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Не указаны ID конференции или название секции' 
      });
    }

    // 1. Найти секцию
    const findSectionQuery = `
      SELECT id_sections 
      FROM sections 
      WHERE conference_id = $1 AND name_section = $2
    `;
    
    const sectionResult = await db.query(findSectionQuery, [conferenceId, sectionName]);
    
    if (sectionResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Секция не найдена' 
      });
    }
    
    const sectionId = sectionResult.rows[0].id_sections;
    
    // 2. Проверить существующее назначение
    const checkQuery = `
      SELECT id_header_section 
      FROM header_section 
      WHERE id_section = $1
    `;
    
    const existingResult = await db.query(checkQuery, [sectionId]);
    
    if (existingResult.rows.length > 0) {
      // Обновить
      const updateQuery = `
        UPDATE header_section 
        SET user_id = $1 
        WHERE id_section = $2
        RETURNING *
      `;
      
      const updateResult = await db.query(updateQuery, [headId || null, sectionId]);
      
      res.json({
        success: true,
        message: 'Назначение обновлено',
        assignment: updateResult.rows[0]
      });
    } else {
      // Создать новое назначение
      const insertQuery = `
        INSERT INTO header_section (user_id, id_section)
        VALUES ($1, $2)
        RETURNING *
      `;
      
      const insertResult = await db.query(insertQuery, [headId || null, sectionId]);
      
      res.json({
        success: true,
        message: 'Руководитель назначен',
        assignment: insertResult.rows[0]
      });
    }
    
  } catch (error) {
    console.error('Ошибка при сохранении назначения:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});




// ===== СЕКЦИИ РУКОВОДИТЕЛЯ =====
app.get('/api/sections/head/:userId', (req, res) => {
  const { userId } = req.params;
  
   const query = `
    SELECT 
      s.id_sections as id,
      s.name_section as name,
      s.conference_id,
      c.title as conference_title,
      COUNT(r.report_id) as reports_count
    FROM sections s
    LEFT JOIN conferences c ON c.id = s.conference_id
    LEFT JOIN reports r ON r.id_sections = s.id_sections
    WHERE s.user_id = $1
    GROUP BY 
      s.id_sections, 
      s.name_section, 
      s.conference_id,
      c.title
    ORDER BY s.name_section
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Ошибка:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, sections: results.rows });
  });
});



// ===== ДОКЛАДЫ СЕКЦИИ =====
app.get('/api/reports/section/:sectionId', (req, res) => {
  const { sectionId } = req.params;
  
  const query = `
    SELECT 
      r.report_id as id,
      r.title_report as title,
      r.abstract,
      r.keywords,
      r.status,
      r.created_at,
      u.name as author_name,
      u.login as author_login
    FROM reports r
    JOIN users u ON r.user_id = u.id
    WHERE r.id_sections = $1
    ORDER BY r.created_at DESC
  `;
  
  db.query(query, [sectionId], (err, results) => {
    if (err) {
      console.error('Ошибка:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, reports: results.rows });
  });
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
    
    // Обновляем email и логин в базе данных
    const updateResult = await client.query(
      `UPDATE users 
       SET email = $1,
           login = $1
       WHERE user_id = $2 
       RETURNING user_id, login, email, name`,
      [newEmail, userId]
    );

    console.log('✅ Email и логин успешно обновлены в БД для пользователя:', userId);
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
// ЗАПРОС НА ВОССТАНОВЛЕНИЕ ПАРОЛЯ (отправка кода)
// ============================================
app.post('/api/user/forgot-password', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email } = req.body;
    
    console.log('📧 Запрос на восстановление пароля для email:', email);
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email не указан' 
      });
    }
    
    // Находим пользователя по email
    const userResult = await client.query(
      'SELECT user_id, email, login FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      // Для безопасности не сообщаем, что пользователь не найден
      console.log('⚠️ Пользователь с email не найден:', email);
      return res.json({ 
        success: true, 
        message: 'Если пользователь существует, код отправлен на почту' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Генерируем 6-значный код
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Код действителен 15 минут
    
    // Удаляем старые коды для этого email (если есть)
    await client.query(
      'DELETE FROM password_reset_codes WHERE email = $1',
      [email]
    );
    
    // Сохраняем новый код в базу данных
    await client.query(
      `INSERT INTO password_reset_codes (email, code, created_at, expires_at, used)
       VALUES ($1, $2, NOW(), $3, false)`,
      [email, resetCode, expiresAt]
    );
    
    // Отправляем email с кодом
    await sendResetCodeEmail(email, resetCode);
    
    console.log('✅ Код восстановления отправлен на:', email);
    
    res.json({ 
      success: true, 
      message: 'Код подтверждения отправлен на вашу почту' 
    });
    
  } catch (error) {
    console.error('❌ Ошибка при отправке кода:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при отправке кода восстановления' 
    });
  } finally {
    client.release();
  }
});

// ============================================
// СБРОС ПАРОЛЯ (подтверждение кода и установка нового пароля)
// ============================================
app.post('/api/user/reset-password', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, code, newPassword } = req.body;
    
    console.log('🔐 Запрос на сброс пароля для email:', email);
    
    // Валидация
    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Все поля обязательны для заполнения' 
      });
    }
    
    // Проверка сложности пароля
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
    
    // Проверяем код восстановления
    const resetResult = await client.query(
      `SELECT * FROM password_reset_codes 
       WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW()`,
      [email, code]
    );
    
    if (resetResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Неверный или просроченный код подтверждения' 
      });
    }
    
    // Находим пользователя
    const userResult = await client.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Хешируем новый пароль
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Обновляем пароль в базе данных
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2',
      [newPasswordHash, user.user_id]
    );
    
    // Помечаем код как использованный
    await client.query(
      'UPDATE password_reset_codes SET used = true WHERE email = $1 AND code = $2',
      [email, code]
    );
    
    console.log('✅ Пароль успешно изменен для пользователя:', user.user_id);
    
    res.json({ 
      success: true, 
      message: 'Пароль успешно изменен' 
    });
    
  } catch (error) {
    console.error('❌ Ошибка при сбросе пароля:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера при сбросе пароля' 
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
      additional_info,
      coauthors = [],
      literature
    } = req.body;

    console.log('👥 Получены соавторы:', coauthors);
    console.log('👥 Количество соавторов:', coauthors.length);

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
      'SELECT user_id, name, email FROM users WHERE user_id = $1',
      [user_id]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    // Проверка секции и получение conference_id
    const sectionCheck = await pool.query(
      'SELECT id_sections, conference_id FROM sections WHERE id_sections = $1',
      [section_id]
    );
    if (sectionCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Секция не найдена' });
    }

    const conference_id = sectionCheck.rows[0].conference_id;

    // Преобразование в JSONB
    let contentJson = null;
    if (content) {
      contentJson = typeof content === 'string' ? content : JSON.stringify(content);
    }

    // ✅ ФОРМИРУЕМ JSONB ДЛЯ СОАВТОРОВ
    const coauthorsJson = coauthors.length > 0 ? JSON.stringify(coauthors) : '[]';
    console.log('📦 JSONB для соавторов:', coauthorsJson);

    const now = new Date();

    // ✅ ДОБАВЛЯЕМ COAUTHORS В ЗАПРОС
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
        id_sections,
        conference_id,
        submitted_at,
        literature,
        coauthors
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
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
      parseInt(section_id),
      conference_id,
      now,
      literature || null,
      coauthorsJson  // ✅ ДОБАВЛЯЕМ СОАВТОРОВ
    ];

    const result = await pool.query(query, values);
    const newReport = result.rows[0];

    console.log(`✅ Доклад сохранён с ID: ${newReport.report_id}`);
    console.log(`✅ Сохранено соавторов: ${coauthors.length}`);

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

/// ПОЛУЧЕНИЕ ДОКЛАДОВ ПОЛЬЗОВАТЕЛЯ - GET /api/reports/user/:userId
app.get('/api/reports/user/:userId', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('🔥 GET /api/reports/user/:userId ВЫЗВАН!');
  console.log(`📦 userId: ${req.params.userId}`);
  console.log('='.repeat(60) + '\n');

  try {
    const { userId } = req.params;

    // 1. Сначала получаем имя текущего пользователя
    const userResult = await pool.query(
      'SELECT name FROM users WHERE user_id = $1',
      [userId]
    );
    
    const currentUserName = userResult.rows[0]?.name || 'Пользователь';
    console.log(`👤 Текущий пользователь: ${currentUserName}`);

    // 2. Получаем все доклады пользователя с их соавторами
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
        c.title as conference_title,
        r.coauthors
      FROM reports r
      LEFT JOIN sections s ON r.id_sections = s.id_sections
      LEFT JOIN conferences c ON r.conference_id = c.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    
    console.log(`📊 Найдено докладов: ${result.rows.length}`);

    // 3. Формируем ответ, собирая всех авторов
    const reports = result.rows.map(row => {
      // Начинаем с основного автора (текущий пользователь)
      let allAuthors = [currentUserName];
      
      // Добавляем соавторов из JSONB поля coauthors
      if (row.coauthors && Array.isArray(row.coauthors) && row.coauthors.length > 0) {
        console.log(`📝 Доклад ${row.report_id}: найдено ${row.coauthors.length} соавторов в JSONB`);
        
        const coauthorNames = row.coauthors
          .map(c => c.name)
          .filter(name => name && name.trim());
        
        allAuthors = [...allAuthors, ...coauthorNames];
      } else {
        console.log(`📝 Доклад ${row.report_id}: нет соавторов в JSONB`);
      }
      
      // Убираем возможные дубликаты
      const uniqueAuthors = [...new Set(allAuthors)];
      
      console.log(`📝 Итоговый список авторов для доклада ${row.report_id}: ${uniqueAuthors.join(', ')}`);
      
      return {
        report_id: row.report_id,
        title: row.title,
        abstract: row.abstract,
        keywords: row.keywords,
        status: row.status,
        created_at: row.created_at,
        submitted_at: row.submitted_at,
        final_decision_at: row.final_decision_at,
        final_decision_notes: row.final_decision_notes,
        section_name: row.section_name,
        conference_id: row.conference_id,
        conference_title: row.conference_title,
        authors_list: uniqueAuthors.join(', ')  // ← ЗДЕСЬ ФОРМИРУЕТСЯ authors_list
      };
    });

    console.log(`✅ Успешно сформировано ${reports.length} докладов`);

    res.json({
      success: true,
      reports: reports
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
        u.email as author_email
      FROM reports r
      LEFT JOIN sections s ON r.id_sections = s.id_sections
      LEFT JOIN conferences c ON r.conference_id = c.id
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

    const report = result.rows[0];
    
    // Формируем список всех авторов
    const allAuthors = [
      { 
        name: report.author_name, 
        email: report.author_email, 
        is_corresponding: true 
      },
      ...(report.coauthors || [])
    ];

    report.all_authors = allAuthors;

    res.json({
      success: true,
      report: report
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