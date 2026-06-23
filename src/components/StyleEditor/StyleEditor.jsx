// src/components/StyleEditor/StyleEditor.jsx
import React, { useState, useEffect } from 'react';
import './StyleEditor.css';

const StyleEditor = ({ conferenceId, onSave, onClose, embedded = false }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [styles, setStyles] = useState({
    // Страница
    page_background: '#ffffff',
    container_padding: 60,
    font_family: 'Futura PT, -apple-system, BlinkMacSystemFont, sans-serif',
    
    // Заголовок
    title_font_size: 28,
    title_font_weight: '600',
    title_color: '#2c3e50',
    title_text_align: 'center',
    title_margin_bottom: 30,
    
    // Авторы
    authors_font_size: 16,
    authors_font_weight: '400',
    authors_color: '#34495e',
    authors_text_align: 'center',
    authors_margin_bottom: 20,
    
    // Аннотация
    abstract_font_size: 14,
    abstract_font_weight: '400',
    abstract_color: '#333333',
    abstract_line_height: 1.6,
    abstract_margin_bottom: 25,
    
    // Ключевые слова
    keywords_font_size: 14,
    keywords_font_weight: '600',
    keywords_color: '#34495e',
    keywords_margin_bottom: 25,
    
    // Заголовки секций
    section_title_font_size: 22,
    section_title_font_weight: '600',
    section_title_color: '#2c3e50',
    section_title_margin_top: 25,
    section_title_margin_bottom: 15,
    
    // Текст
    text_font_size: 14,
    text_line_height: 1.6,
    text_color: '#333333',
    text_margin_bottom: 15,
    
    // Таблицы
    table_border_color: '#000000',
    table_header_bg: '#f8f9fa',
    table_cell_padding: 8,
    
    // Изображения
    image_max_width: '100%',
    image_margin_top: 20,
    image_margin_bottom: 20,
    
    // Формулы
    formula_font_size: 18,
    formula_color: '#333333',
    formula_text_align: 'center',
    
    // Литература
    references_font_size: 12,
    references_line_height: 1.4,
    references_color: '#666666'
  });

  // Загрузка существующих стилей
  useEffect(() => {
    const loadStyles = async () => {
      try {
        console.log(`🔍 Загрузка стилей для конференции ${conferenceId}...`);
        const response = await fetch(`https://diplom-j6uo.onrender.com/api/conferences/${conferenceId}/styles`);
        const data = await response.json();
        
        console.log('📦 Получены стили:', data);
        
        if (data.success && data.styles) {
          const loadedStyles = { ...data.styles };
          
          const colorFields = [
            'page_background', 'title_color', 'authors_color', 
            'abstract_color', 'keywords_color', 'section_title_color',
            'text_color', 'table_border_color', 'table_header_bg',
            'formula_color', 'references_color'
          ];
          
          for (const field of colorFields) {
            if (!loadedStyles[field] || loadedStyles[field] === '' || !loadedStyles[field].startsWith('#')) {
              const defaultStyles = {
                page_background: '#ffffff',
                title_color: '#2c3e50',
                authors_color: '#34495e',
                abstract_color: '#333333',
                keywords_color: '#34495e',
                section_title_color: '#2c3e50',
                text_color: '#333333',
                table_border_color: '#000000',
                table_header_bg: '#f8f9fa',
                formula_color: '#333333',
                references_color: '#666666'
              };
              loadedStyles[field] = defaultStyles[field] || '#000000';
            }
          }
          
          setStyles(loadedStyles);
          console.log('✅ Стили загружены и исправлены');
        } else {
          console.log('⚠️ Стили не найдены, используем стандартные');
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки стилей:', error);
        setError('Ошибка загрузки стилей');
      } finally {
        setLoading(false);
      }
    };
    
    if (conferenceId) {
      loadStyles();
    }
  }, [conferenceId]);

  const handleChange = (field, value) => {
    setStyles(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const cleanStyles = { ...styles };
      
      delete cleanStyles.updated_at;
      delete cleanStyles.created_at;
      delete cleanStyles.id;
      
      const colorFields = [
        'page_background', 'title_color', 'authors_color', 
        'abstract_color', 'keywords_color', 'section_title_color',
        'text_color', 'table_border_color', 'table_header_bg',
        'formula_color', 'references_color'
      ];
      
      for (const field of colorFields) {
        if (!cleanStyles[field] || cleanStyles[field] === '' || !cleanStyles[field].startsWith('#')) {
          const defaults = {
            page_background: '#ffffff',
            title_color: '#2c3e50',
            authors_color: '#34495e',
            abstract_color: '#333333',
            keywords_color: '#34495e',
            section_title_color: '#2c3e50',
            text_color: '#333333',
            table_border_color: '#000000',
            table_header_bg: '#f8f9fa',
            formula_color: '#333333',
            references_color: '#666666'
          };
          cleanStyles[field] = defaults[field] || '#000000';
        }
      }
      
      console.log('💾 Сохранение стилей:', cleanStyles);
      
      const response = await fetch(`https://diplom-j6uo.onrender.com/api/conferences/${conferenceId}/styles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanStyles)
      });
      
      const data = await response.json();
      console.log('📦 Ответ сервера:', data);
      
      if (response.ok && data.success) {
        setSuccess('✅ Стили успешно сохранены!');
        if (onSave) onSave(data.styles);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error || 'Ошибка при сохранении стилей');
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Сбросить все стили к значениям по умолчанию?')) {
      setStyles({
        page_background: '#ffffff',
        container_padding: 60,
        font_family: 'Futura PT, -apple-system, BlinkMacSystemFont, sans-serif',
        title_font_size: 28,
        title_font_weight: '600',
        title_color: '#2c3e50',
        title_text_align: 'center',
        title_margin_bottom: 30,
        authors_font_size: 16,
        authors_font_weight: '400',
        authors_color: '#34495e',
        authors_text_align: 'center',
        authors_margin_bottom: 20,
        abstract_font_size: 14,
        abstract_font_weight: '400',
        abstract_color: '#333333',
        abstract_line_height: 1.6,
        abstract_margin_bottom: 25,
        keywords_font_size: 14,
        keywords_font_weight: '600',
        keywords_color: '#34495e',
        keywords_margin_bottom: 25,
        section_title_font_size: 22,
        section_title_font_weight: '600',
        section_title_color: '#2c3e50',
        section_title_margin_top: 25,
        section_title_margin_bottom: 15,
        text_font_size: 14,
        text_line_height: 1.6,
        text_color: '#333333',
        text_margin_bottom: 15,
        table_border_color: '#000000',
        table_header_bg: '#f8f9fa',
        table_cell_padding: 8,
        image_max_width: '100%',
        image_margin_top: 20,
        image_margin_bottom: 20,
        formula_font_size: 18,
        formula_color: '#333333',
        formula_text_align: 'center',
        references_font_size: 12,
        references_line_height: 1.4,
        references_color: '#666666'
      });
    }
  };

  if (loading) {
    return (
      <div className="style-editor-overlay" onClick={embedded ? undefined : onClose}>
        <div className="style-editor-modal" onClick={e => e.stopPropagation()}>
          <div className="loading">Загрузка стилей...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="style-editor-overlay" onClick={embedded ? undefined : onClose}>
      <div className="style-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="style-editor-header">
          <h2>🎨 Редактор стилей конференции</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <div className="style-editor-body">
          {/* Страница */}
          <div className="style-group">
            <h3>Страница</h3>
            <div className="style-row">
              <label>Фон страницы</label>
              <input
                type="color"
                value={styles.page_background || '#ffffff'}
                onChange={(e) => handleChange('page_background', e.target.value)}
              />
            </div>
            <div className="style-row">
              <label>Отступы страницы (px)</label>
              <input
                type="number"
                value={styles.container_padding}
                onChange={(e) => handleChange('container_padding', parseInt(e.target.value) || 60)}
                min="20"
                max="120"
              />
            </div>
            <div className="style-row">
              <label>Шрифт</label>
              <select
                value={styles.font_family}
                onChange={(e) => handleChange('font_family', e.target.value)}
              >
                <option value="Futura PT, -apple-system, BlinkMacSystemFont, sans-serif">Futura PT</option>
                <option value="Arial, Helvetica, sans-serif">Arial</option>
                <option value="Times New Roman, serif">Times New Roman</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Verdana, Geneva, sans-serif">Verdana</option>
                <option value="Roboto, sans-serif">Roboto</option>
                <option value="Open Sans, sans-serif">Open Sans</option>
              </select>
            </div>
          </div>

          {/* Заголовок */}
          <div className="style-group">
            <h3>Заголовок статьи</h3>
            <div className="style-row">
              <label>Размер шрифта (px)</label>
              <input
                type="number"
                value={styles.title_font_size}
                onChange={(e) => handleChange('title_font_size', parseInt(e.target.value) || 28)}
                min="18"
                max="48"
              />
            </div>
            <div className="style-row">
              <label>Жирность</label>
              <select
                value={styles.title_font_weight}
                onChange={(e) => handleChange('title_font_weight', e.target.value)}
              >
                <option value="300">Light</option>
                <option value="400">Normal</option>
                <option value="500">Medium</option>
                <option value="600">Semi-bold</option>
                <option value="700">Bold</option>
              </select>
            </div>
            <div className="style-row">
              <label>Цвет</label>
              <input
                type="color"
                value={styles.title_color || '#2c3e50'}
                onChange={(e) => handleChange('title_color', e.target.value)}
              />
            </div>
            <div className="style-row">
              <label>Выравнивание</label>
              <select
                value={styles.title_text_align}
                onChange={(e) => handleChange('title_text_align', e.target.value)}
              >
                <option value="center">По центру</option>
                <option value="left">По левому краю</option>
                <option value="right">По правому краю</option>
              </select>
            </div>
            <div className="style-row">
              <label>Отступ снизу (px)</label>
              <input
                type="number"
                value={styles.title_margin_bottom}
                onChange={(e) => handleChange('title_margin_bottom', parseInt(e.target.value) || 30)}
                min="10"
                max="60"
              />
            </div>
          </div>

          {/* Авторы */}
          <div className="style-group">
            <h3>Авторы</h3>
            <div className="style-row">
              <label>Размер шрифта (px)</label>
              <input
                type="number"
                value={styles.authors_font_size}
                onChange={(e) => handleChange('authors_font_size', parseInt(e.target.value) || 16)}
                min="12"
                max="32"
              />
            </div>
            <div className="style-row">
              <label>Цвет</label>
              <input
                type="color"
                value={styles.authors_color || '#34495e'}
                onChange={(e) => handleChange('authors_color', e.target.value)}
              />
            </div>
          </div>

          {/* Аннотация */}
          <div className="style-group">
            <h3>Аннотация</h3>
            <div className="style-row">
              <label>Размер шрифта (px)</label>
              <input
                type="number"
                value={styles.abstract_font_size}
                onChange={(e) => handleChange('abstract_font_size', parseInt(e.target.value) || 14)}
                min="10"
                max="28"
              />
            </div>
            <div className="style-row">
              <label>Цвет</label>
              <input
                type="color"
                value={styles.abstract_color || '#333333'}
                onChange={(e) => handleChange('abstract_color', e.target.value)}
              />
            </div>
          </div>

          {/* Ключевые слова */}
          <div className="style-group">
            <h3>Ключевые слова</h3>
            <div className="style-row">
              <label>Размер шрифта (px)</label>
              <input
                type="number"
                value={styles.keywords_font_size}
                onChange={(e) => handleChange('keywords_font_size', parseInt(e.target.value) || 14)}
                min="10"
                max="28"
              />
            </div>
            <div className="style-row">
              <label>Цвет</label>
              <input
                type="color"
                value={styles.keywords_color || '#34495e'}
                onChange={(e) => handleChange('keywords_color', e.target.value)}
              />
            </div>
          </div>

          {/* Текст */}
          <div className="style-group">
            <h3>Основной текст</h3>
            <div className="style-row">
              <label>Размер шрифта (px)</label>
              <input
                type="number"
                value={styles.text_font_size}
                onChange={(e) => handleChange('text_font_size', parseInt(e.target.value) || 14)}
                min="10"
                max="30"
              />
            </div>
            <div className="style-row">
              <label>Межстрочный интервал</label>
              <input
                type="number"
                step="0.1"
                value={styles.text_line_height}
                onChange={(e) => handleChange('text_line_height', parseFloat(e.target.value) || 1.6)}
                min="1.0"
                max="2.5"
              />
            </div>
            <div className="style-row">
              <label>Цвет</label>
              <input
                type="color"
                value={styles.text_color || '#333333'}
                onChange={(e) => handleChange('text_color', e.target.value)}
              />
            </div>
            <div className="style-row">
              <label>Отступ снизу (px)</label>
              <input
                type="number"
                value={styles.text_margin_bottom}
                onChange={(e) => handleChange('text_margin_bottom', parseInt(e.target.value) || 15)}
                min="5"
                max="40"
              />
            </div>
          </div>

          {/* Заголовки секций */}
          <div className="style-group">
            <h3>Заголовки секций</h3>
            <div className="style-row">
              <label>Размер шрифта (px)</label>
              <input
                type="number"
                value={styles.section_title_font_size}
                onChange={(e) => handleChange('section_title_font_size', parseInt(e.target.value) || 22)}
                min="16"
                max="36"
              />
            </div>
            <div className="style-row">
              <label>Цвет</label>
              <input
                type="color"
                value={styles.section_title_color || '#2c3e50'}
                onChange={(e) => handleChange('section_title_color', e.target.value)}
              />
            </div>
          </div>

          {/* Таблицы */}
          <div className="style-group">
            <h3>Таблицы</h3>
            <div className="style-row">
              <label>Цвет границ</label>
              <input
                type="color"
                value={styles.table_border_color || '#000000'}
                onChange={(e) => handleChange('table_border_color', e.target.value)}
              />
            </div>
            <div className="style-row">
              <label>Фон заголовков</label>
              <input
                type="color"
                value={styles.table_header_bg || '#f8f9fa'}
                onChange={(e) => handleChange('table_header_bg', e.target.value)}
              />
            </div>
            <div className="style-row">
              <label>Отступ в ячейках (px)</label>
              <input
                type="number"
                value={styles.table_cell_padding}
                onChange={(e) => handleChange('table_cell_padding', parseInt(e.target.value) || 8)}
                min="4"
                max="20"
              />
            </div>
          </div>

          {/* Формулы */}
          <div className="style-group">
            <h3>Формулы</h3>
            <div className="style-row">
              <label>Размер шрифта (px)</label>
              <input
                type="number"
                value={styles.formula_font_size}
                onChange={(e) => handleChange('formula_font_size', parseInt(e.target.value) || 18)}
                min="12"
                max="36"
              />
            </div>
            <div className="style-row">
              <label>Цвет</label>
              <input
                type="color"
                value={styles.formula_color || '#333333'}
                onChange={(e) => handleChange('formula_color', e.target.value)}
              />
            </div>
          </div>

          {/* Литература */}
          <div className="style-group">
            <h3>Литература</h3>
            <div className="style-row">
              <label>Размер шрифта (px)</label>
              <input
                type="number"
                value={styles.references_font_size}
                onChange={(e) => handleChange('references_font_size', parseInt(e.target.value) || 12)}
                min="8"
                max="24"
              />
            </div>
            <div className="style-row">
              <label>Цвет</label>
              <input
                type="color"
                value={styles.references_color || '#666666'}
                onChange={(e) => handleChange('references_color', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="style-editor-footer">
          <button 
            className="btn-reset" 
            onClick={handleReset}
            type="button"
          >
            Сбросить
          </button>
          <button 
            className="btn-save" 
            onClick={handleSave} 
            disabled={saving}
            type="button"
          >
            {saving ? 'Сохранение...' : '💾 Сохранить стили'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StyleEditor;