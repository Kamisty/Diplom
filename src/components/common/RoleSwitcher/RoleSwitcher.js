import React, { useContext, useState, useMemo } from 'react';
import { AuthContext } from '../../../context/AuthContext/Auth';
import { getRoleName, getRoleIcon, ROLES, getAllRoles } from '../../../config/roles';
import './RoleSwitcher.css';

const RoleSwitcher = ({ closeDropdown }) => {
  const { user, login } = useContext(AuthContext);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addRoleMessage, setAddRoleMessage] = useState({ type: '', text: '' });

  // ✅ Все доступные роли
  const allAvailableRoles = useMemo(() => getAllRoles(), []);

  // ✅ Текущие роли пользователя
  const userCurrentRoles = useMemo(() => {
    const roles = user?.roles || user?.availableRoles || [];
    console.log('📋 [RoleSwitcher] Текущие роли:', roles);
    return roles;
  }, [user?.roles, user?.availableRoles]);
  
  // ✅ Доступные для добавления роли
  const availableNewRoles = useMemo(() => {
    const available = allAvailableRoles.filter(role => {
      const hasRole = 
        userCurrentRoles.includes(role.dbName) || 
        userCurrentRoles.includes(role.id) ||
        userCurrentRoles.includes(role.name);
      
      if (!hasRole) {
        console.log('✅ Доступна роль:', role.name);
      }
      
      return !hasRole;
    });
    
    console.log('➕ [RoleSwitcher] Доступно для добавления:', available.length, available);
    return available;
  }, [userCurrentRoles, allAvailableRoles]);

  const hasAvailableToAdd = availableNewRoles.length > 0;
  const hasCurrentRoles = userCurrentRoles.length > 0;

  console.log('🔍 [RoleSwitcher] hasAvailableToAdd:', hasAvailableToAdd);
  console.log('🔍 [RoleSwitcher] hasCurrentRoles:', hasCurrentRoles);

  if (!user) {
    return <div className="role-switcher-empty">Загрузка...</div>;
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
      [ROLES.ADMIN]: '/admin/dashboard',
      [ROLES.SECTION_HEAD]: '/section-head/dashboard',
      [ROLES.REVIEWER]: '/reviewer/dashboard',
      [ROLES.AUTHOR]: '/author/dashboard'
    };
    const redirectPath = roleRoutes[role] || '/dashboard';
    window.location.href = redirectPath;
  };

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
      const selectedRoleObj = allAvailableRoles.find(r => r.id === selectedNewRole);
      
      if (!selectedRoleObj) {
        throw new Error('Роль не найдена');
      }
      
      const response = await fetch('http://localhost:5000/api/user/add-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          role: selectedRoleObj.dbName
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const updatedRoles = data.userRoles || data.roles || userCurrentRoles;
        
        const updatedUser = {
          ...user,
          roles: updatedRoles,
          availableRoles: updatedRoles,
          activeRole: user.activeRole || updatedRoles[0]
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        if (login) {
          login(updatedUser);
        }
        
        setAddRoleMessage({ 
          type: 'success', 
          text: `Роль "${selectedRoleObj.name}" успешно добавлена!` 
        });
        
        setSelectedNewRole('');
        setShowAddRole(false);
        
        if (closeDropdown) closeDropdown();
      } else {
        setAddRoleMessage({ 
          type: 'error', 
          text: data.error || 'Ошибка при добавлении роли' 
        });
        setTimeout(() => setAddRoleMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Ошибка при добавлении роли:', error);
      setAddRoleMessage({ 
        type: 'error', 
        text: 'Ошибка подключения к серверу' 
      });
      setTimeout(() => setAddRoleMessage({ type: '', text: '' }), 3000);
    } finally {
      setIsAdding(false);
    }
  };

 return (
    <div className="role-switcher-inline">
      <div className="role-switcher-header">
        <span className="role-switcher-title">Мои роли</span>
      </div>
      
      {/* Список текущих ролей */}
      {hasCurrentRoles ? (
        userCurrentRoles.map((role) => (
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
        ))
      ) : (
        <div className="no-roles-message">
          <p>У вас пока нет назначенных ролей</p>
        </div>
      )}

      {/* ✅ КНОПКА ДОБАВИТЬ РОЛЬ */}
      {hasAvailableToAdd && (
        <>
          <div className="role-divider"></div>
          
          <button
            className="add-role-button"
            onClick={() => setShowAddRole(!showAddRole)}
          >
            <span className="add-icon">➕</span>
            <span>Добавить новую роль</span>
          </button>

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
                  onClick={() => {
                    setShowAddRole(false);
                    setAddRoleMessage({ type: '', text: '' });
                  }}
                  disabled={isAdding}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Если нет доступных ролей */}
      {!hasAvailableToAdd && hasCurrentRoles && (
        <div className="no-more-roles">
          <small>Все доступные роли уже назначены</small>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;