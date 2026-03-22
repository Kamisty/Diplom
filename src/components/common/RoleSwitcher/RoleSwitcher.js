// src/components/common/RoleSwitcher/RoleSwitcher.jsx
import React, { useContext, useState } from 'react';
import { AuthContext } from '../../../context/AuthContext/Auth';
import { getRoleName, getRoleIcon, ROLES } from '../../../config/roles';
import './RoleSwitcher.css';

const RoleSwitcher = ({ closeDropdown }) => {
  const { user, login } = useContext(AuthContext);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addRoleMessage, setAddRoleMessage] = useState({ type: '', text: '' });

  // Все доступные роли в системе (используем ID для фронтенда)
  const allAvailableRoles = [
    { id: 'author', name: 'Автор', dbName: ROLES.AUTHOR },
    { id: 'reviewer', name: 'Рецензент', dbName: ROLES.REVIEWER },
    { id: 'section_head', name: 'Руководитель секции', dbName: ROLES.SECTION_HEAD },
    { id: 'admin', name: 'Администратор', dbName: ROLES.ADMIN }
  ];

  // Получаем роли, которые еще не назначены пользователю
  const getAvailableNewRoles = () => {
    const userRoles = user?.availableRoles || [];
    return allAvailableRoles.filter(role => !userRoles.includes(role.id));
  };

  // Проверяем, есть ли у пользователя несколько ролей
  if (!user || !user.availableRoles || user.availableRoles.length <= 1) {
    return null;
  }

  const switchRole = (newRole) => {
    if (newRole === user.activeRole) {
      if (closeDropdown) closeDropdown();
      return;
    }

    setIsSwitching(true);
    setSwitchingRole(newRole);

    setTimeout(() => {
      try {
        const updatedUser = {
          ...user,
          activeRole: newRole,
          roleDisplayName: getRoleName(newRole)
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        if (login) {
          login(updatedUser);
        }
        
        if (closeDropdown) closeDropdown();
        
        redirectBasedOnRole(newRole);
      } catch (error) {
        console.error('Ошибка при смене роли:', error);
        alert('Ошибка при смене роли');
        setIsSwitching(false);
        setSwitchingRole(null);
      }
    }, 300);
  };

  const redirectBasedOnRole = (role) => {
    const roleRoutes = {
      'admin': '/admin/dashboard',
      'section_head': '/section-head/dashboard',
      'reviewer': '/reviewer/dashboard',
      'author': '/author/dashboard'
    };
    
    const redirectPath = roleRoutes[role] || '/dashboard';
    window.location.href = redirectPath;
  };

  // Функция для добавления новой роли
  const handleAddRole = async () => {
    if (!selectedNewRole) {
      setAddRoleMessage({ type: 'error', text: 'Выберите роль для добавления' });
      setTimeout(() => setAddRoleMessage({ type: '', text: '' }), 3000);
      return;
    }

    setIsAdding(true);
    setAddRoleMessage({ type: '', text: '' });

    try {
      const userId = user?.user_id || user?.id;
      
      // Находим выбранную роль
      const selectedRoleObj = allAvailableRoles.find(r => r.id === selectedNewRole);
      
      if (!selectedRoleObj) {
        throw new Error('Роль не найдена');
      }
      
      // Отправляем ID роли на сервер
      const response = await fetch('http://localhost:5000/api/user/add-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          role: selectedNewRole  // Отправляем ID (author, reviewer и т.д.)
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Получаем обновленный список ролей из ответа сервера
        const updatedRoles = data.userRoles;
        
        // Обновляем пользователя в localStorage
        const updatedUser = {
          ...user,
          availableRoles: updatedRoles,
          roles: updatedRoles,
          // Если это первая добавленная роль, делаем её активной
          activeRole: user.activeRole || selectedNewRole
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Обновляем контекст
        if (login) {
          login(updatedUser);
        }
        
        setAddRoleMessage({ type: 'success', text: `Роль "${selectedRoleObj.name}" успешно добавлена!` });
        
        // Сбрасываем выбор
        setSelectedNewRole('');
        setShowAddRole(false);
        
        // Закрываем дропдаун
        if (closeDropdown) closeDropdown();
        
        // Перезагружаем страницу для обновления всех компонентов
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setAddRoleMessage({ type: 'error', text: data.error || 'Ошибка при добавлении роли' });
        setTimeout(() => setAddRoleMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Ошибка при добавлении роли:', error);
      setAddRoleMessage({ type: 'error', text: 'Ошибка подключения к серверу' });
      setTimeout(() => setAddRoleMessage({ type: '', text: '' }), 3000);
    } finally {
      setIsAdding(false);
    }
  };

  const availableNewRoles = getAvailableNewRoles();

  return (
    <div className="role-switcher-inline">
      <div className="role-switcher-header">
        <span className="role-switcher-title">Мои роли</span>
      </div>
      
      {/* Список текущих ролей */}
      {user.availableRoles.map((role) => (
        <button
          key={role}
          className={`role-switcher-option ${role === user.activeRole ? 'active' : ''}`}
          onClick={() => switchRole(role)}
          disabled={isSwitching || role === user.activeRole}
        >
          <span className="role-icon">{getRoleIcon(role)}</span>
          <div className="role-info">
            <span className="role-name">{getRoleName(role)}</span>
            {role === user.activeRole && (
              <span className="active-badge">Активна</span>
            )}
          </div>
          {isSwitching && switchingRole === role && (
            <span className="switching-spinner">⏳</span>
          )}
        </button>
      ))}

      {/* Разделитель, если есть доступные роли для добавления */}
      {availableNewRoles.length > 0 && (
        <>
          <div className="role-divider"></div>
          
          {/* Кнопка "Добавить роль" */}
          <button
            className="add-role-button"
            onClick={() => setShowAddRole(!showAddRole)}
          >
            <span className="add-icon">➕</span>
            <span>Добавить новую роль</span>
          </button>

          {/* Форма добавления роли */}
          {showAddRole && (
            <div className="add-role-form">
              {addRoleMessage.text && (
                <div className={`add-role-message ${addRoleMessage.type}`}>
                  {addRoleMessage.text}
                </div>
              )}
              
              <div className="add-role-select">
                <select
                  value={selectedNewRole}
                  onChange={(e) => setSelectedNewRole(e.target.value)}
                  disabled={isAdding}
                >
                  <option value="">Выберите роль</option>
                  {availableNewRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="add-role-actions">
                <button
                  className="confirm-add-role"
                  onClick={handleAddRole}
                  disabled={isAdding || !selectedNewRole}
                >
                  {isAdding ? 'Добавление...' : 'Добавить'}
                </button>
                <button
                  className="cancel-add-role"
                  onClick={() => setShowAddRole(false)}
                  disabled={isAdding}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RoleSwitcher;