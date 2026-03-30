// src/config/roles.js

// ✅ Определение ролей — ТОЧНОЕ СОВПАДЕНИЕ с таблицей roles в БД
export const ROLES = {
  ADMIN: 'Администратор конференции',
  SECTION_HEAD: 'Руководитель секции',
  REVIEWER: 'Рецензент',
  AUTHOR: 'Автор'
};

// ID ролей для использования в интерфейсе (опционально)
export const ROLE_IDS = {
  ADMIN: 'admin',
  SECTION_HEAD: 'section_head',
  REVIEWER: 'reviewer',
  AUTHOR: 'author'
};

// Маппинг: ID фронтенда → Название в БД
export const ROLE_MAPPING = {
  [ROLE_IDS.ADMIN]: ROLES.ADMIN,
  [ROLE_IDS.SECTION_HEAD]: ROLES.SECTION_HEAD,
  [ROLE_IDS.REVIEWER]: ROLES.REVIEWER,
  [ROLE_IDS.AUTHOR]: ROLES.AUTHOR
};

// Обратный маппинг: Название в БД → ID фронтенда
export const REVERSE_ROLE_MAPPING = {
  [ROLES.ADMIN]: ROLE_IDS.ADMIN,
  [ROLES.SECTION_HEAD]: ROLE_IDS.SECTION_HEAD,
  [ROLES.REVIEWER]: ROLE_IDS.REVIEWER,
  [ROLES.AUTHOR]: ROLE_IDS.AUTHOR
};

// ✅ Права доступа для каждой роли (ключи — названия из БД!)
export const PERMISSIONS = {
  [ROLES.ADMIN]: [
    'create_conference',
    'edit_conference',
    'delete_conference',
    'manage_users',
    'assign_section_heads',
    'view_all_reports',
    'view_assigned_reports',
    'submit_report',
    'view_own_reports',
    'edit_own_reports',
    'delete_own_reports'
  ],
  [ROLES.SECTION_HEAD]: [
    'view_section_reports',
    'assign_reviewers',
    'view_assigned_reports',
    'submit_report',
    'view_own_reports',
    'edit_own_reports',
    'delete_own_reports'
  ],
  [ROLES.REVIEWER]: [
    'view_assigned_reports',
    'submit_review',
    'submit_report',
    'view_own_reports',
    'edit_own_reports',
    'delete_own_reports'
  ],
  [ROLES.AUTHOR]: [
    'submit_report',
    'view_own_reports',
    'edit_own_reports',
    'delete_own_reports'
  ]
};

// ✅ Получить отображаемое название роли (поддерживает и ID, и название БД)
export const getRoleName = (role) => {
  const nameMap = {
    // ID → Отображаемое имя
    [ROLE_IDS.ADMIN]: 'Администратор конференции',
    [ROLE_IDS.SECTION_HEAD]: 'Руководитель секции',
    [ROLE_IDS.REVIEWER]: 'Рецензент',
    [ROLE_IDS.AUTHOR]: 'Автор',
    // Название БД → Отображаемое имя
    [ROLES.ADMIN]: 'Администратор конференции',
    [ROLES.SECTION_HEAD]: 'Руководитель секции',
    [ROLES.REVIEWER]: 'Рецензент',
    [ROLES.AUTHOR]: 'Автор'
  };
  return nameMap[role] || role;
};

// ✅ Получить иконку для роли (поддерживает оба формата)
export const getRoleIcon = (role) => {
  const iconMap = {
    [ROLE_IDS.ADMIN]: '👑',
    [ROLE_IDS.SECTION_HEAD]: '🎯',
    [ROLE_IDS.REVIEWER]: '⭐',
    [ROLE_IDS.AUTHOR]: '✍️',
    [ROLES.ADMIN]: '👑',
    [ROLES.SECTION_HEAD]: '🎯',
    [ROLES.REVIEWER]: '⭐',
    [ROLES.AUTHOR]: '✍️'
  };
  return iconMap[role] || '👤';
};

// ✅ Получить ID роли из названия БД (для отправки на сервер)
export const getRoleId = (roleName) => {
  return REVERSE_ROLE_MAPPING[roleName] || roleName;
};

// ✅ Получить название БД из ID роли (для сравнения)
export const getRoleDbName = (roleId) => {
  return ROLE_MAPPING[roleId] || roleId;
};

// ✅ Проверка наличия разрешения у пользователя
export const hasPermission = (userRoles, permission) => {
  if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
    return false;
  }
  
  return userRoles.some(role => {
    // role может быть как ID, так и названием БД — нормализуем
    const roleName = ROLE_MAPPING[role] || role;
    const permissions = PERMISSIONS[roleName] || [];
    return permissions.includes(permission);
  });
};

// ✅ Получить список ролей, доступных для добавления
export const getAvailableRolesToAdd = (currentRoles) => {
  const allRoles = [
    { id: ROLE_IDS.ADMIN, name: 'Администратор конференции', dbName: ROLES.ADMIN },
    { id: ROLE_IDS.SECTION_HEAD, name: 'Руководитель секции', dbName: ROLES.SECTION_HEAD },
    { id: ROLE_IDS.REVIEWER, name: 'Рецензент', dbName: ROLES.REVIEWER },
    { id: ROLE_IDS.AUTHOR, name: 'Автор', dbName: ROLES.AUTHOR }
  ];
  
  return allRoles.filter(role => 
    !currentRoles.includes(role.dbName) && !currentRoles.includes(role.id)
  );
};

// ✅ Получить все роли для отображения в интерфейсе
export const getAllRoles = () => {
  return [
    { 
      id: ROLE_IDS.ADMIN, 
      name: 'Администратор конференции', 
      dbName: ROLES.ADMIN, 
      icon: '👑', 
      description: 'Полный доступ к системе' 
    },
    { 
      id: ROLE_IDS.SECTION_HEAD, 
      name: 'Руководитель секции', 
      dbName: ROLES.SECTION_HEAD, 
      icon: '🎯', 
      description: 'Управление секцией' 
    },
    { 
      id: ROLE_IDS.REVIEWER, 
      name: 'Рецензент', 
      dbName: ROLES.REVIEWER, 
      icon: '⭐', 
      description: 'Рецензирование докладов' 
    },
    { 
      id: ROLE_IDS.AUTHOR, 
      name: 'Автор', 
      dbName: ROLES.AUTHOR, 
      icon: '✍️', 
      description: 'Подача докладов' 
    }
  ];
};