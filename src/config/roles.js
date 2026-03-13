// src/config/roles.js

export const ROLES = {
  ADMIN: 'admin',
  SECTION_HEAD: 'section_head',  // Руководитель секции
  AUTHOR: 'author',              // Автор доклада
  REVIEWER: 'reviewer'           // Рецензент
};

export const PERMISSIONS = {
  // Права администратора
  [ROLES.ADMIN]: [
    'create_conference',
    'edit_conference',
    'delete_conference',
    'manage_users',
    'assign_roles',
    'assign_section_heads',
    'view_all_reports',
    'manage_reviewers',
    'create_sections',
    'edit_sections',
    'delete_sections',
    'view_statistics',
    'export_data'
  ],

  // Права руководителя секции
  [ROLES.SECTION_HEAD]: [
    'view_section_reports',
    'assign_reviewers',
    'review_reports',
    'manage_section_schedule',
    'view_section_participants',
    'communicate_with_authors'
  ],

  // Права автора доклада
  [ROLES.AUTHOR]: [
    'submit_report',
    'edit_own_report',
    'delete_own_report',
    'view_own_reports',
    'view_conference_schedule',
    'register_for_conference',
    'upload_presentation',
    'communicate_with_section_head'
  ],

  // Права рецензента
  [ROLES.REVIEWER]: [
    'view_assigned_reports',
    'submit_review',
    'view_review_deadlines',
    'communicate_with_section_head'
  ]
};

// Функция для проверки наличия права у пользователя
export const hasPermission = (userRole, permission) => {
  if (!userRole || !PERMISSIONS[userRole]) return false;
  return PERMISSIONS[userRole].includes(permission);
};

// Функция для получения всех доступных прав роли
export const getRolePermissions = (role) => {
  return PERMISSIONS[role] || [];
};

// Функция для получения названия роли на русском
export const getRoleName = (role) => {
  const roleNames = {
    [ROLES.ADMIN]: 'Администратор',
    [ROLES.SECTION_HEAD]: 'Руководитель секции',
    [ROLES.AUTHOR]: 'Автор доклада',
    [ROLES.REVIEWER]: 'Рецензент'
  };
  return roleNames[role] || role;
};

// Функция для получения иконки роли
export const getRoleIcon = (role) => {
  const roleIcons = {
    [ROLES.ADMIN]: '👑',
    [ROLES.SECTION_HEAD]: '📋',
    [ROLES.AUTHOR]: '✍️',
    [ROLES.REVIEWER]: '🔍'
  };
  return roleIcons[role] || '👤';
};