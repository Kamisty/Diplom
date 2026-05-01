// src/components/article/FormulaManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const FormulaManager = ({ isOpen, onClose, onSave, editingBlock, formulaCounter }) => {
  const [latex, setLatex] = useState('');
  const [align, setAlign] = useState('center');
  const [size, setSize] = useState(16);
  const [formulaNumber, setFormulaNumber] = useState('');
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editingBlock) {
      setLatex(editingBlock.latexString || editingBlock.content || '');
      setAlign(editingBlock.align || 'center');
      setSize(editingBlock.size || 16);
      setFormulaNumber(editingBlock.number || '');
    } else {
      setLatex('');
      setAlign('center');
      setSize(16);
      setFormulaNumber('');
    }
    setError(null);
  }, [editingBlock]);

  const insertTemplate = (templateLatex) => {
    setLatex(prev => prev + templateLatex);
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSave = () => {
    if (!latex.trim()) {
      alert('❌ Введите формулу');
      return;
    }

    const formulaData = {
      content: latex,
      formulaString: latex,
      latexString: latex,
      align: align,
      size: size,
      number: formulaNumber || formulaCounter
    };
    onSave(formulaData);
    handleClose();
  };

  const handleClose = () => {
    setLatex('');
    setAlign('center');
    setSize(16);
    setFormulaNumber('');
    setError(null);
    onClose();
  };

  // Категории шаблонов
  const templateCategories = {
    'Дроби и корни': [
      { name: 'Дробь', latex: '\\frac{}{}', display: 'a/b', preview: '\\frac{a}{b}' },
      { name: 'Квадратный корень', latex: '\\sqrt{}', display: '√x', preview: '\\sqrt{x}' },
      { name: 'Корень n-степени', latex: '\\sqrt[n]{}', display: '∛x', preview: '\\sqrt[3]{x}' },
      { name: 'Кубический корень', latex: '\\sqrt[3]{}', display: '∛', preview: '\\sqrt[3]{x}' }
    ],
    'Степени и индексы': [
      { name: 'Степень', latex: '^{}', display: 'xⁿ', preview: 'x^{2}' },
      { name: 'Индекс', latex: '_{}', display: 'x₂', preview: 'x_{1}' },
      { name: 'Степень+индекс', latex: '_{}^{}', display: 'x₂ⁿ', preview: 'x_{1}^{2}' }
    ],
    'Интегралы и суммы': [
      { name: 'Сумма', latex: '\\sum_{}^{}', display: '∑', preview: '\\sum_{i=1}^{n}' },
      { name: 'Интеграл', latex: '\\int_{}^{}', display: '∫', preview: '\\int_{a}^{b}' },
      { name: 'Двойной интеграл', latex: '\\iint_{}^{}', display: '∬', preview: '\\iint_{D}' },
      { name: 'Тройной интеграл', latex: '\\iiint_{}^{}', display: '∭', preview: '\\iiint_{V}' },
      { name: 'Контурный интеграл', latex: '\\oint_{}^{}', display: '∮', preview: '\\oint_{C}' }
    ],
    'Пределы и производные': [
      { name: 'Предел', latex: '\\lim_{}', display: 'lim', preview: '\\lim_{x \\to 0}' },
      { name: 'Производная', latex: '\\frac{d}{dx}', display: 'd/dx', preview: '\\frac{d}{dx}' },
      { name: 'Частная производная', latex: '\\frac{\\partial}{\\partial x}', display: '∂/∂x', preview: '\\frac{\\partial f}{\\partial x}' }
    ],
    'Греческие буквы': [
      { name: 'альфа', latex: '\\alpha', display: 'α', preview: '\\alpha' },
      { name: 'бета', latex: '\\beta', display: 'β', preview: '\\beta' },
      { name: 'гамма', latex: '\\gamma', display: 'γ', preview: '\\gamma' },
      { name: 'дельта', latex: '\\delta', display: 'δ', preview: '\\delta' },
      { name: 'эпсилон', latex: '\\epsilon', display: 'ε', preview: '\\epsilon' },
      { name: 'дзета', latex: '\\zeta', display: 'ζ', preview: '\\zeta' },
      { name: 'эта', latex: '\\eta', display: 'η', preview: '\\eta' },
      { name: 'тета', latex: '\\theta', display: 'θ', preview: '\\theta' },
      { name: 'йота', latex: '\\iota', display: 'ι', preview: '\\iota' },
      { name: 'каппа', latex: '\\kappa', display: 'κ', preview: '\\kappa' },
      { name: 'лямбда', latex: '\\lambda', display: 'λ', preview: '\\lambda' },
      { name: 'мю', latex: '\\mu', display: 'μ', preview: '\\mu' },
      { name: 'ню', latex: '\\nu', display: 'ν', preview: '\\nu' },
      { name: 'кси', latex: '\\xi', display: 'ξ', preview: '\\xi' },
      { name: 'пи', latex: '\\pi', display: 'π', preview: '\\pi' },
      { name: 'ро', latex: '\\rho', display: 'ρ', preview: '\\rho' },
      { name: 'сигма', latex: '\\sigma', display: 'σ', preview: '\\sigma' },
      { name: 'тау', latex: '\\tau', display: 'τ', preview: '\\tau' },
      { name: 'ипсилон', latex: '\\upsilon', display: 'υ', preview: '\\upsilon' },
      { name: 'фи', latex: '\\phi', display: 'φ', preview: '\\phi' },
      { name: 'хи', latex: '\\chi', display: 'χ', preview: '\\chi' },
      { name: 'пси', latex: '\\psi', display: 'ψ', preview: '\\psi' },
      { name: 'омега', latex: '\\omega', display: 'ω', preview: '\\omega' }
    ],
    'Скобки и операторы': [
      { name: 'Круглые скобки', latex: '()', display: '( )', preview: '(x)' },
      { name: 'Квадратные скобки', latex: '[]', display: '[ ]', preview: '[x]' },
      { name: 'Фигурные скобки', latex: '\\{\\}', display: '{ }', preview: '\\{x\\}' },
      { name: 'Умножение', latex: '\\times', display: '×', preview: 'a \\times b' },
      { name: 'Деление', latex: '\\div', display: '÷', preview: 'a \\div b' },
      { name: 'Плюс-минус', latex: '\\pm', display: '±', preview: '\\pm' },
      { name: 'Бесконечность', latex: '\\infty', display: '∞', preview: '\\infty' }
    ]
  };

  const [activeCategory, setActiveCategory] = useState('Дроби и корни');

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    },
    modal: {
      backgroundColor: '#fff',
      borderRadius: '20px',
      width: '950px',
      maxWidth: '95%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    modalHeader: {
      padding: '24px 28px 0 28px',
      borderBottom: '1px solid #eef2f6'
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      marginBottom: '8px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    subtitle: {
      fontSize: '14px',
      color: '#64748b',
      marginBottom: '20px'
    },
    content: {
      padding: '24px 28px'
    },
    previewCard: {
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      border: '1px solid #e2e8f0'
    },
    previewLabel: {
      fontSize: '13px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: '#64748b',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    previewContent: {
      minHeight: '120px',
      display: 'flex',
      justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      padding: '16px',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      overflowX: 'auto'
    },
    errorPreview: {
      color: '#ef4444',
      fontSize: '14px',
      textAlign: 'center',
      padding: '20px'
    },
    textarea: {
      width: '100%',
      padding: '14px 16px',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '14px',
      fontFamily: 'monospace',
      resize: 'vertical',
      minHeight: '100px',
      transition: 'all 0.2s',
      outline: 'none'
    },
    textareaFocus: {
      borderColor: '#667eea',
      boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
    },
    categoryTabs: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '20px',
      borderBottom: '1px solid #e2e8f0',
      paddingBottom: '12px'
    },
    categoryTab: {
      padding: '8px 18px',
      borderRadius: '30px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.2s',
      backgroundColor: '#f1f5f9',
      color: '#475569'
    },
    activeCategoryTab: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    },
    templateGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
      gap: '10px',
      marginBottom: '24px',
      maxHeight: '280px',
      overflowY: 'auto',
      padding: '4px'
    },
    templateButton: {
      padding: '12px 8px',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '18px',
      fontFamily: 'monospace',
      transition: 'all 0.2s',
      textAlign: 'center'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      fontSize: '14px',
      color: '#334155'
    },
    select: {
      width: '100%',
      padding: '12px 14px',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '14px',
      backgroundColor: '#fff',
      cursor: 'pointer',
      outline: 'none'
    },
    sizeControl: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    },
    rangeInput: {
      flex: 1,
      height: '4px',
      borderRadius: '2px',
      background: '#e2e8f0',
      accentColor: '#667eea'
    },
    numberInput: {
      width: '80px',
      padding: '10px 12px',
      border: '2px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: '14px',
      marginLeft: '10px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '28px',
      paddingTop: '20px',
      borderTop: '1px solid #eef2f6'
    },
    saveButton: {
      flex: 1,
      padding: '14px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '600',
      transition: 'transform 0.2s, box-shadow 0.2s'
    },
    cancelButton: {
      flex: 1,
      padding: '14px',
      backgroundColor: '#f1f5f9',
      color: '#475569',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '600',
      transition: 'all 0.2s'
    },
    infoText: {
      fontSize: '12px',
      color: '#94a3b8',
      marginTop: '12px',
      textAlign: 'center'
    },
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      backgroundColor: '#eef2ff',
      color: '#4f46e5',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500'
    }
  };

  const [isTextareaFocused, setIsTextareaFocused] = useState(false);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.title}>
            {editingBlock ? '✏️ Редактирование формулы' : '🧮 Конструктор формул'}
          </h3>
          <p style={styles.subtitle}>
            Вводите LaTeX-код вручную или используйте готовые шаблоны
          </p>
        </div>

        <div style={styles.content}>
          {/* Предпросмотр с KaTeX */}
          <div style={styles.previewCard}>
            <div style={styles.previewLabel}>
              <span>🔍</span> Живой предпросмотр
            </div>
            <div style={styles.previewContent}>
              {latex ? (
                error ? (
                  <div style={styles.errorPreview}>
                    ⚠️ Ошибка в формуле: {error}
                  </div>
                ) : (
                  <BlockMath math={latex} />
                )
              ) : (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                  Введите формулу в поле ниже или выберите шаблон
                </div>
              )}
            </div>
          </div>

          {/* Поле ввода LaTeX */}
          <div style={styles.formGroup}>
            <label style={styles.label}>✏️ LaTeX код:</label>
            <textarea
              ref={textareaRef}
              value={latex}
              onChange={(e) => {
                setLatex(e.target.value);
                setError(null);
              }}
              onFocus={() => setIsTextareaFocused(true)}
              onBlur={() => setIsTextareaFocused(false)}
              placeholder='Пример: \frac{1}{2} + \sqrt{x} = \int_{0}^{\infty} f(x) \, dx'
              style={{
                ...styles.textarea,
                ...(isTextareaFocused ? styles.textareaFocus : {})
              }}
            />
          </div>

          {/* Вкладки категорий */}
          <div style={styles.categoryTabs}>
            {Object.keys(templateCategories).map((category) => (
              <div
                key={category}
                style={{
                  ...styles.categoryTab,
                  ...(activeCategory === category ? styles.activeCategoryTab : {})
                }}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </div>
            ))}
          </div>

          {/* Шаблоны */}
          <div style={styles.templateGrid}>
            {templateCategories[activeCategory].map((tpl, idx) => (
              <button
                key={idx}
                style={styles.templateButton}
                onClick={() => insertTemplate(tpl.latex)}
                title={tpl.name}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ede9fe';
                  e.currentTarget.style.borderColor = '#c4b5fd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{tpl.display}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{tpl.name}</div>
              </button>
            ))}
          </div>

          {/* Номер формулы */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Номер формулы:
              <input
                type="text"
                value={formulaNumber}
                onChange={(e) => setFormulaNumber(e.target.value)}
                placeholder={`${formulaCounter}`}
                style={styles.numberInput}
              />
            </label>
            <div style={styles.infoText}>
              <span style={styles.badge}>💡</span> Номер будет отображаться в круглых скобках: ({formulaNumber || formulaCounter})
            </div>
          </div>

          {/* Настройки отображения */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Выравнивание:</label>
            <select value={align} onChange={(e) => setAlign(e.target.value)} style={styles.select}>
              <option value="left">По левому краю</option>
              <option value="center">По центру</option>
              <option value="right">По правому краю</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Размер: {size}px</label>
            <div style={styles.sizeControl}>
              <span style={{ fontSize: '12px' }}>12px</span>
              <input
                type="range"
                min="12"
                max="48"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value))}
                style={styles.rangeInput}
              />
              <span style={{ fontSize: '14px' }}>48px</span>
            </div>
          </div>

          <div style={styles.infoText}>
            🎨 Поддерживается полный синтаксис LaTeX. Используйте вкладки для быстрого добавления шаблонов.
          </div>

          <div style={styles.buttonGroup}>
            <button onClick={handleSave} style={styles.saveButton}>
              {editingBlock ? '💾 Сохранить изменения' : '➕ Добавить формулу'}
            </button>
            <button onClick={handleClose} style={styles.cancelButton}>
              ✕ Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormulaManager;