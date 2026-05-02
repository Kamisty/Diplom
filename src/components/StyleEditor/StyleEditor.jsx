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
    const [activeTab, setActiveTab] = useState('general'); // Добавляем состояние для активной вкладки
    
    console.log('StyleEditor рендерится, conferenceId:', conferenceId);
    
    useEffect(() => {
        if (conferenceId) {
            loadStyles();
        }
    }, [conferenceId]);
    
    const loadStyles = async () => {
        setLoading(true);
        try {
            const response = await fetch(`https://diplom-j6uo.onrender.com/api/conferences/${conferenceId}/styles`);
            if (!response.ok) {
                console.warn('Стили не найдены, используем стандартные');
                return;
            }
            const data = await response.json();
            if (data.success && data.styles) {
                setStyles(prev => ({ ...prev, ...data.styles }));
            }
        } catch (error) {
            console.warn('Ошибка загрузки стилей (используем стандартные):', error);
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
            
            // Проверяем, что данные для отправки корректны
            const stylesToSave = {
                conference_id: conferenceId,
                ...styles
            };
            
            console.log('Отправка стилей:', stylesToSave);
            
            const response = await fetch(`https://diplom-j6uo.onrender.com/api/conferences/${conferenceId}/styles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(stylesToSave)
            });
            
            // Проверяем, что ответ - JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Сервер вернул не JSON:', text.substring(0, 200));
                throw new Error('Сервер временно недоступен. Попробуйте позже.');
            }
            
            const data = await response.json();
            
            if (data.success) {
                alert('Стили успешно сохранены!');
                if (onSave) onSave();
            } else {
                throw new Error(data.error || 'Ошибка сохранения');
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка при сохранении стилей. Сервер временно недоступен, но стили сохранены локально.');
            // Временно сохраняем в localStorage
            localStorage.setItem(`styles_${conferenceId}`, JSON.stringify(styles));
            if (onSave) onSave();
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
    
    // Рендер содержимого в зависимости от активной вкладки
    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
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
                    </div>
                );
                
            case 'title':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
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
                                Насыщенность шрифта
                            </label>
                            <select
                                value={styles.title_font_weight}
                                onChange={(e) => handleStyleChange('title_font_weight', e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            >
                                <option value="400">Обычный (400)</option>
                                <option value="500">Средний (500)</option>
                                <option value="600">Полужирный (600)</option>
                                <option value="700">Жирный (700)</option>
                            </select>
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
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Отступ снизу (px)
                            </label>
                            <input
                                type="number"
                                value={styles.title_margin_bottom}
                                onChange={(e) => handleStyleChange('title_margin_bottom', parseInt(e.target.value))}
                                min="0"
                                max="100"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>
                );
                
            case 'authors':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Размер шрифта авторов (px)
                            </label>
                            <input
                                type="number"
                                value={styles.authors_font_size}
                                onChange={(e) => handleStyleChange('authors_font_size', parseInt(e.target.value))}
                                min="10"
                                max="48"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Цвет авторов
                            </label>
                            <input
                                type="color"
                                value={styles.authors_color}
                                onChange={(e) => handleStyleChange('authors_color', e.target.value)}
                                style={{ width: '80px', height: '40px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ddd' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Выравнивание
                            </label>
                            <select
                                value={styles.authors_text_align}
                                onChange={(e) => handleStyleChange('authors_text_align', e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            >
                                <option value="left">По левому краю</option>
                                <option value="center">По центру</option>
                                <option value="right">По правому краю</option>
                            </select>
                        </div>
                    </div>
                );
                
            case 'abstract':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Размер шрифта аннотации (px)
                            </label>
                            <input
                                type="number"
                                value={styles.abstract_font_size}
                                onChange={(e) => handleStyleChange('abstract_font_size', parseInt(e.target.value))}
                                min="10"
                                max="24"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Межстрочный интервал
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={styles.abstract_line_height}
                                onChange={(e) => handleStyleChange('abstract_line_height', parseFloat(e.target.value))}
                                min="1"
                                max="2.5"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Цвет текста
                            </label>
                            <input
                                type="color"
                                value={styles.abstract_color}
                                onChange={(e) => handleStyleChange('abstract_color', e.target.value)}
                                style={{ width: '80px', height: '40px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>
                );
                
            case 'text':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Размер основного текста (px)
                            </label>
                            <input
                                type="number"
                                value={styles.text_font_size}
                                onChange={(e) => handleStyleChange('text_font_size', parseInt(e.target.value))}
                                min="10"
                                max="24"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Межстрочный интервал
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={styles.text_line_height}
                                onChange={(e) => handleStyleChange('text_line_height', parseFloat(e.target.value))}
                                min="1"
                                max="2.5"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Цвет текста
                            </label>
                            <input
                                type="color"
                                value={styles.text_color}
                                onChange={(e) => handleStyleChange('text_color', e.target.value)}
                                style={{ width: '80px', height: '40px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>
                );
                
            case 'tables':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Цвет границ таблицы
                            </label>
                            <input
                                type="color"
                                value={styles.table_border_color}
                                onChange={(e) => handleStyleChange('table_border_color', e.target.value)}
                                style={{ width: '80px', height: '40px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ddd' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Цвет фона заголовка
                            </label>
                            <input
                                type="color"
                                value={styles.table_header_bg}
                                onChange={(e) => handleStyleChange('table_header_bg', e.target.value)}
                                style={{ width: '80px', height: '40px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ddd' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Отступ в ячейках (px)
                            </label>
                            <input
                                type="number"
                                value={styles.table_cell_padding}
                                onChange={(e) => handleStyleChange('table_cell_padding', parseInt(e.target.value))}
                                min="2"
                                max="20"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>
                );
                
            default:
                return null;
        }
    };
    
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '15px',
            padding: '25px',
            marginTop: '20px',
            marginBottom: '40px',
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
                borderBottom: '2px solid #e0e0e0',
                paddingBottom: '10px',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => setActiveTab('general')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'general' ? '#f39c12' : '#f8f9fa',
                        color: activeTab === 'general' ? 'white' : '#333',
                        border: '1px solid #dee2e6',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'general' ? '500' : 'normal'
                    }}
                >
                    🎨 Общие
                </button>
                <button
                    onClick={() => setActiveTab('title')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'title' ? '#f39c12' : '#f8f9fa',
                        color: activeTab === 'title' ? 'white' : '#333',
                        border: '1px solid #dee2e6',
                        borderRadius: '25px',
                        cursor: 'pointer'
                    }}
                >
                    📝 Заголовок
                </button>
                <button
                    onClick={() => setActiveTab('authors')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'authors' ? '#f39c12' : '#f8f9fa',
                        color: activeTab === 'authors' ? 'white' : '#333',
                        border: '1px solid #dee2e6',
                        borderRadius: '25px',
                        cursor: 'pointer'
                    }}
                >
                    👥 Авторы
                </button>
                <button
                    onClick={() => setActiveTab('abstract')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'abstract' ? '#f39c12' : '#f8f9fa',
                        color: activeTab === 'abstract' ? 'white' : '#333',
                        border: '1px solid #dee2e6',
                        borderRadius: '25px',
                        cursor: 'pointer'
                    }}
                >
                    📄 Аннотация
                </button>
                <button
                    onClick={() => setActiveTab('text')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'text' ? '#f39c12' : '#f8f9fa',
                        color: activeTab === 'text' ? 'white' : '#333',
                        border: '1px solid #dee2e6',
                        borderRadius: '25px',
                        cursor: 'pointer'
                    }}
                >
                    📖 Текст
                </button>
                <button
                    onClick={() => setActiveTab('tables')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'tables' ? '#f39c12' : '#f8f9fa',
                        color: activeTab === 'tables' ? 'white' : '#333',
                        border: '1px solid #dee2e6',
                        borderRadius: '25px',
                        cursor: 'pointer'
                    }}
                >
                    📊 Таблицы
                </button>
            </div>
            
            {/* Содержимое активной вкладки */}
            {renderTabContent()}
            
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