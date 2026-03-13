// src/components/RoleBasedRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext/Auth';
import { hasPermission } from '../config/roles';

const RoleBasedRoute = ({ children, requiredPermission }) => {
  const { user } = useContext(AuthContext);
  
  if (!user) {
    return <Navigate to="/input" />;
  }

  if (!hasPermission(user.role, requiredPermission)) {
    return <Navigate to="/access-denied" />;
  }

  return children;
};

export default RoleBasedRoute;