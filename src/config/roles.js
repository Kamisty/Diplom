// src/config/roles.js

// Определение ролей (соответствуют таблице roles в БД)
export const ROLES = {
  ADMIN: 'Администратор конференции',
  SECTION_HEAD: 'Руководитель секции',
  REVIEWER: 'Рецензент',
  AUTHOR: 'Автор'
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

// Получить название роли для отображения
export const getRoleName = (roleName) => {
  const roleNames = {
    [ROLES.ADMIN]: 'Администратор',
    [ROLES.SECTION_HEAD]: 'Руководитель секции',
    [ROLES.REVIEWER]: 'Рецензент',
    [ROLES.AUTHOR]: 'Автор',
    [ROLES.PARTICIPANT]: 'Участник'
  };
  return roleNames[roleName] || roleName;
};

// Получить иконку для роли
export const getRoleIcon = (roleName) => {
  const roleIcons = {
    [ROLES.ADMIN]: '👑',
    [ROLES.SECTION_HEAD]: '🎯',
    [ROLES.REVIEWER]: '⭐',
    [ROLES.AUTHOR]: '✍️',
    [ROLES.PARTICIPANT]: '👤'
  };
  return roleIcons[roleName] || '👤';
};

// Проверка наличия разрешения (если у пользователя есть хотя бы одна роль с этим правом)
export const hasPermission = (userRoles, permission) => {
  if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
    return false;
  }
  
  return userRoles.some(role => {
    const permissions = PERMISSIONS[role] || [];
    return permissions.includes(permission);
  });
};