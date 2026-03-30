// src/config/roles.js

// Определение ролей (соответствуют таблице roles в БД)
export const ROLES = {
  ADMIN: 'Администратор конференции',
  SECTION_HEAD: 'Руководитель секции',
  REVIEWER: 'Рецензент',
  AUTHOR: 'Автор'
};

// ID ролей для фронтенда (используются в API запросах)
export const ROLE_IDS = {
  ADMIN: 'admin',
  SECTION_HEAD: 'section_head',
  REVIEWER: 'reviewer',
  AUTHOR: 'author'
};

// Маппинг между ID роли (для фронтенда) и названием (для БД)
export const ROLE_MAPPING = {
  [ROLE_IDS.ADMIN]: ROLES.ADMIN,
  [ROLE_IDS.SECTION_HEAD]: ROLES.SECTION_HEAD,
  [ROLE_IDS.REVIEWER]: ROLES.REVIEWER,
  [ROLE_IDS.AUTHOR]: ROLES.AUTHOR
};

// Обратный маппинг (из названия в ID)
export const REVERSE_ROLE_MAPPING = {
  [ROLES.ADMIN]: ROLE_IDS.ADMIN,
  [ROLES.SECTION_HEAD]: ROLE_IDS.SECTION_HEAD,
  [ROLES.REVIEWER]: ROLE_IDS.REVIEWER,
  [ROLES.AUTHOR]: ROLE_IDS.AUTHOR
};

// Права доступа для каждой роли
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

// Получить название роли для отображения (принимает ID роли или название)
export const getRoleName = (role) => {
  // Если передан ID роли (admin, author и т.д.)
  if (role === ROLE_IDS.ADMIN) return 'Администратор';
  if (role === ROLE_IDS.SECTION_HEAD) return 'Руководитель секции';
  if (role === ROLE_IDS.REVIEWER) return 'Рецензент';
  if (role === ROLE_IDS.AUTHOR) return 'Автор';
  
  // Если передано название роли из БД
  if (role === ROLES.ADMIN) return 'Администратор';
  if (role === ROLES.SECTION_HEAD) return 'Руководитель секции';
  if (role === ROLES.REVIEWER) return 'Рецензент';
  if (role === ROLES.AUTHOR) return 'Автор';
  
  return role;
};

// Получить иконку для роли (принимает ID роли или название)
export const getRoleIcon = (role) => {
  // Если передан ID роли (admin, author и т.д.)
  if (role === ROLE_IDS.ADMIN) return '👑';
  if (role === ROLE_IDS.SECTION_HEAD) return '🎯';
  if (role === ROLE_IDS.REVIEWER) return '⭐';
  if (role === ROLE_IDS.AUTHOR) return '✍️';
  
  // Если передано название роли из БД
  if (role === ROLES.ADMIN) return '👑';
  if (role === ROLES.SECTION_HEAD) return '🎯';
  if (role === ROLES.REVIEWER) return '⭐';
  if (role === ROLES.AUTHOR) return '✍️';
  
  return '👤';
};

// Получить ID роли для API (из названия)
export const getRoleId = (roleName) => {
  return REVERSE_ROLE_MAPPING[roleName] || roleName;
};

// Получить название роли для БД (из ID)
export const getRoleDbName = (roleId) => {
  return ROLE_MAPPING[roleId] || roleId;
};

// Проверка наличия разрешения (если у пользователя есть хотя бы одна роль с этим правом)
export const hasPermission = (userRoles, permission) => {
  if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
    return false;
  }
  
  return userRoles.some(role => {
    // Проверяем, что role может быть как ID, так и названием
    const roleName = ROLE_MAPPING[role] || role;
    const permissions = PERMISSIONS[roleName] || [];
    return permissions.includes(permission);
  });
};

// Получить все доступные для добавления роли (кроме уже имеющихся)
export const getAvailableRolesToAdd = (currentRoles) => {
  const allRoles = [
    { 
      id: ROLE_IDS.ADMIN, 
      name: 'Администратор'
    },
    { 
      id: ROLE_IDS.SECTION_HEAD, 
      name: 'Руководитель секции'
    },
    { 
      id: ROLE_IDS.REVIEWER, 
      name: 'Рецензент'
    },
    { 
      id: ROLE_IDS.AUTHOR, 
      name: 'Автор'
    }
  ];
  
  // Фильтруем роли, которых еще нет у пользователя
  return allRoles.filter(role => !currentRoles.includes(role.id));
};

// Получить список всех ролей (для отображения в интерфейсе)
export const getAllRoles = () => {
  return [
    { id: ROLE_IDS.ADMIN, name: 'Администратор', dbName: ROLES.ADMIN, icon: '👑', description: 'Полный доступ к системе' },
    { id: ROLE_IDS.SECTION_HEAD, name: 'Руководитель секции', dbName: ROLES.SECTION_HEAD, icon: '🎯', description: 'Управление секцией' },
    { id: ROLE_IDS.REVIEWER, name: 'Рецензент', dbName: ROLES.REVIEWER, icon: '⭐', description: 'Рецензирование докладов' },
    { id: ROLE_IDS.AUTHOR, name: 'Автор', dbName: ROLES.AUTHOR, icon: '✍️', description: 'Подача докладов' }
  ];
};