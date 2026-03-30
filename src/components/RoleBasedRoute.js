// src/components/RoleBasedRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext/Auth';
import { hasPermission } from '../config/roles';

const RoleBasedRoute = ({ children, requiredPermission }) => {
  const { user, loading } = useContext(AuthContext);
  
  // Если загрузка, показываем индикатор (опционально)
  if (loading) {
    return <div>Загрузка...</div>;
  }
  
  // Если пользователь не авторизован
  if (!user) {
    return <Navigate to="/input" replace />;
  }

  // Получаем роли пользователя (массив)
  const userRoles = user.roles || [];
  
  // Проверяем наличие прав доступа
  const hasAccess = hasPermission(userRoles, requiredPermission);
  
  console.log('RoleBasedRoute проверка:', {
    userRoles,
    requiredPermission,
    hasAccess
  });

  if (!hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
};

export default RoleBasedRoute;