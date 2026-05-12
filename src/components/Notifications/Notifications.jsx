import React, { useState, useEffect, useCallback } from 'react';
import './Notifications.css';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    
    const userId = localStorage.getItem('userId');
    
    const loadNotifications = useCallback(async () => {
        if (!userId) return;
        
        try {
            const response = await fetch(`https://diplom-j6uo.onrender.com/api/notifications?userId=${userId}`);
            const data = await response.json();
            
            if (data.success) {
                setNotifications(data.notifications);
                const unread = data.notifications.filter(n => !n.is_read).length;
                setUnreadCount(unread);
            }
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
        }
    }, [userId]);
    
    const loadUnreadCount = useCallback(async () => {
        if (!userId) return;
        
        try {
            const response = await fetch(`https://diplom-j6uo.onrender.com/api/notifications/unread-count?userId=${userId}`);
            const data = await response.json();
            
            if (data.success) {
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }, [userId]);
    
    const markAsRead = async (id) => {
        try {
            await fetch(`https://diplom-j6uo.onrender.com/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Ошибка:', error);
        }
    };
    
    const markAllAsRead = async () => {
        try {
            await fetch(`https://diplom-j6uo.onrender.com/api/notifications/read-all`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Ошибка:', error);
        }
    };
    
    useEffect(() => {
        loadNotifications();
        loadUnreadCount();
        
        const interval = setInterval(() => {
            loadUnreadCount();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [loadNotifications, loadUnreadCount]);
    
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
        return date.toLocaleDateString('ru-RU');
    };
    
    const getIcon = (type) => {
        const icons = {
            role_added: '👑',
            review_assigned: '📋',
            review_received: '⭐',
            report_accepted: '✅',
            report_rejected: '❌'
        };
        return icons[type] || '🔔';
    };
    
    return (
        <div className="notifications-container">
            <button className="notifications-bell" onClick={() => {
                setIsOpen(!isOpen);
                if (!isOpen) loadNotifications();
            }}>
                🔔
                {unreadCount > 0 && (
                    <span className="notifications-badge">{unreadCount}</span>
                )}
            </button>
            
            {isOpen && (
                <div className="notifications-dropdown">
                    <div className="notifications-header">
                        <h3>Уведомления</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="mark-all-read">
                                Отметить все
                            </button>
                        )}
                    </div>
                    
                    <div className="notifications-list">
                        {notifications.length === 0 ? (
                            <div className="notifications-empty">
                                <span>🔔</span>
                                <p>У вас нет уведомлений</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div 
                                    key={notif.id}
                                    className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                                    onClick={() => markAsRead(notif.id)}
                                >
                                    <div className="notification-icon">{getIcon(notif.type)}</div>
                                    <div className="notification-content">
                                        <div className="notification-title">{notif.title}</div>
                                        <div className="notification-message">{notif.message}</div>
                                        <div className="notification-time">{formatDate(notif.created_at)}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;