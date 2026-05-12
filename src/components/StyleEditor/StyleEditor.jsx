// src/components/StyleEditor/StyleEditor.jsx
import React, { useState, useEffect } from 'react';

const StyleEditor = ({ conferenceId, onSave, onClose, embedded = true }) => {
    const [styles, setStyles] = useState({
        page_background: '#ffffff',
        container_padding: 40,
        font_family: 'Arial, sans-serif',
        title_font_size: 32,
        title_font_weight: '600',
        title_color: '#f39c12',
        title_text_align: 'center',
        title_margin_bottom: 30,
        authors_font_size: 16,
        authors_font_weight: '400',
        authors_color: '#e67e22',
        authors_text_align: 'center',
        authors_margin_bottom: 20,
        abstract_font_size: 14,
        abstract_font_weight: '400',
        abstract_color: '#333333',
        abstract_line_height: 1.6,
        abstract_margin_bottom: 30,
        text_font_size: 14,
        text_line_height: 1.6,
        text_color: '#333333',
        text_margin_bottom: 15,
        table_border_color: '#000000',
        table_header_bg: '#f8f9fa',
        table_cell_padding: 8,
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    console.log('StyleEditor рендерится, conferenceId:', conferenceId);
    
    useEffect(() => {
        if (conferenceId) {
            loadStyles();
        }
    }, [conferenceId]);
    
    const loadStyles = async () => {
        setLoading(true);
        try {
            // Пытаемся загрузить стили с сервера
            const response = await fetch(`https://diplom-j6uo.onrender.com/api/conferences/${conferenceId}/styles`);
            const data = await response.json();
            if (data.success && data.styles) {
                setStyles(prev => ({ ...prev, ...data.styles }));
            }
        } catch (error) {
            console.error('Ошибка загрузки стилей:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleStyleChange = (key, value) => {
        setStyles(prev => ({
            ...prev,
            [key]: value
        }));
    };
    
    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://diplom-j6uo.onrender.com/api/conferences/${conferenceId}/styles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify(styles)
            });
            const data = await response.json();
            if (data.success) {
                alert('Стили успешно сохранены!');
                if (onSave) onSave();
            } else {
                throw new Error(data.error || 'Ошибка сохранения');
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка при сохранении стилей: ' + error.message);
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <div>⏳ Загрузка стилей...</div>
            </div>
        );
    }
    
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '15px',
            padding: '25px',
            marginTop: '20px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
        }}>
            <h2 style={{ color: '#e67e22', marginTop: 0, marginBottom: '10px' }}>
                🎨 Настройка внешнего вида конференции
            </h2>
            <p style={{ color: '#666', marginBottom: '25px' }}>
                Настройте стили для статей, которые будут подаваться на эту конференцию
            </p>
            
            {/* Вкладки */}
            <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '25px',
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '10px',
                flexWrap: 'wrap'
            }}>
                {['general', 'title', 'authors', 'abstract', 'text', 'tables'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => {/* переключение вкладок */}}
                        style={{
                            padding: '8px 16px',
                            background: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '20px',
                            cursor: 'pointer'
                        }}
                    >
                        {tab === 'general' && 'Общие'}
                        {tab === 'title' && 'Заголовок'}
                        {tab === 'authors' && 'Авторы'}
                        {tab === 'abstract' && 'Аннотация'}
                        {tab === 'text' && 'Текст'}
                        {tab === 'tables' && 'Таблицы'}
                    </button>
                ))}
            </div>
            
            {/* Содержание вкладок - общие стили */}
            <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Цвет фона страницы
                    </label>
                    <input
                        type="color"
                        value={styles.page_background}
                        onChange={(e) => handleStyleChange('page_background', e.target.value)}
                        style={{ width: '80px', height: '40px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ddd' }}
                    />
                </div>
                
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Отступ контейнера (px)
                    </label>
                    <input
                        type="number"
                        value={styles.container_padding}
                        onChange={(e) => handleStyleChange('container_padding', parseInt(e.target.value))}
                        min="0"
                        max="100"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                </div>
                
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Основной шрифт
                    </label>
                    <select
                        value={styles.font_family}
                        onChange={(e) => handleStyleChange('font_family', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                    >
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="Times New Roman, serif">Times New Roman</option>
                        <option value="Futura PT, sans-serif">Futura PT</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="Verdana, sans-serif">Verdana</option>
                    </select>
                </div>
                
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Размер шрифта заголовка (px)
                    </label>
                    <input
                        type="number"
                        value={styles.title_font_size}
                        onChange={(e) => handleStyleChange('title_font_size', parseInt(e.target.value))}
                        min="12"
                        max="72"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                </div>
                
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Цвет заголовка
                    </label>
                    <input
                        type="color"
                        value={styles.title_color}
                        onChange={(e) => handleStyleChange('title_color', e.target.value)}
                        style={{ width: '80px', height: '40px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ddd' }}
                    />
                </div>
                
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Выравнивание заголовка
                    </label>
                    <select
                        value={styles.title_text_align}
                        onChange={(e) => handleStyleChange('title_text_align', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                    >
                        <option value="left">По левому краю</option>
                        <option value="center">По центру</option>
                        <option value="right">По правому краю</option>
                    </select>
                </div>
            </div>
            
            {/* Кнопки действий */}
            <div style={{
                marginTop: '30px',
                display: 'flex',
                gap: '15px',
                justifyContent: 'flex-end',
                paddingTop: '20px',
                borderTop: '1px solid #e0e0e0'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    ← Назад к редактированию
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#f39c12',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        opacity: saving ? 0.6 : 1
                    }}
                >
                    {saving ? 'Сохранение...' : 'Сохранить стили и завершить'}
                </button>
            </div>
        </div>
    );
};

export default StyleEditor;