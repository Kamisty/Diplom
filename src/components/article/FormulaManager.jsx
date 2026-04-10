// src/components/article/FormulaManager.jsx
import React, { useState, useEffect } from 'react';

const FormulaManager = ({ isOpen, onClose, onSave, editingBlock, formulaCounter }) => {
  const [formula, setFormula] = useState('');
  const [latexFormula, setLatexFormula] = useState('');
  const [mode, setMode] = useState('visual'); // 'visual' or 'latex'
  const [align, setAlign] = useState('center');
  const [size, setSize] = useState(16);

  // Математические символы
  const mathSymbols = {
    'Операторы': ['+', '-', '×', '÷', '±', '∓', '=', '≠', '≈', '≡', '<', '>', '≤', '≥', '≪', '≫'],
    'Греческие буквы': ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'],
    'Заглавные греческие': ['Γ', 'Δ', 'Θ', 'Λ', 'Ξ', 'Π', 'Σ', 'Φ', 'Ψ', 'Ω'],
    'Скобки': ['(', ')', '[', ']', '{', '}', '⟨', '⟩', '|', '‖', '⌊', '⌋', '⌈', '⌉'],
    'Степени и индексы': ['x²', 'x³', 'xⁿ', 'x₁', 'x₂', 'x₃', 'xᵢ', 'xⱼ', 'xₖ', '^', '_'],
    'Интегралы': ['∫', '∬', '∭', '∮', '∯', '∰'],
    'Суммы и произведения': ['∑', '∏', '∐'],
    'Стрелки': ['→', '←', '↑', '↓', '↔', '⇒', '⇐', '⇑', '⇓', '⇔', '⟶', '⟵'],
    'Логические': ['∧', '∨', '¬', '⊕', '⊗', '⊻', '∀', '∃', '∄', '∈', '∉', '⊂', '⊃', '⊆', '⊇', '∪', '∩', '∅'],
    'Производные': ['∂', '∇', 'Δ', 'δ'],
    'Специальные': ['∞', '°', '′', '″', '‴', '∴', '∵', '∼', '∝', '∠', '⊥', '∥', 'ℕ', 'ℤ', 'ℚ', 'ℝ', 'ℂ']
  };

  // Шаблоны с квадратиками для визуального режима
  const visualTemplates = [
    { name: 'Дробь', symbol: '□/□', insert: '□/□' },
    { name: 'Квадратный корень', symbol: '√□', insert: '√□' },
    { name: 'Кубический корень', symbol: '∛□', insert: '∛□' },
    { name: 'Корень n-степени', symbol: '∜□', insert: '∜□' },
    { name: 'Степень', symbol: 'x^□', insert: '^□' },
    { name: 'Индекс', symbol: 'x_□', insert: '_□' },
    { name: 'Сумма', symbol: '∑□^□', insert: '∑□^□' },
    { name: 'Интеграл', symbol: '∫□^□', insert: '∫□^□' },
    { name: 'Предел', symbol: 'lim_{□→□}', insert: 'lim_{□→□}' }
  ];

  // LaTeX шаблоны
  const latexTemplates = [
    { name: 'Дробь', template: '\\frac{}{}' },
    { name: 'Корень', template: '\\sqrt{}' },
    { name: 'Куб. корень', template: '\\sqrt[3]{}' },
    { name: 'Степень', template: '^{}' },
    { name: 'Индекс', template: '_{}' },
    { name: 'Сумма', template: '\\sum_{}^{}' },
    { name: 'Интеграл', template: '\\int_{}^{}' },
    { name: 'Предел', template: '\\lim_{x \\to }' }
  ];

  useEffect(() => {
    if (editingBlock) {
      setFormula(editingBlock.formulaString || editingBlock.content || '');
      setLatexFormula(editingBlock.latexString || editingBlock.content || '');
      setAlign(editingBlock.align || 'center');
      setSize(editingBlock.size || 16);
    } else {
      setFormula('');
      setLatexFormula('');
      setAlign('center');
      setSize(16);
    }
  }, [editingBlock]);

  const insertSymbol = (symbol) => {
    if (mode === 'visual') {
      setFormula(prev => prev + symbol);
    } else {
      setLatexFormula(prev => prev + symbol);
    }
  };

  const insertVisualTemplate = (template) => {
    setFormula(prev => prev + template);
  };

  const insertLatexTemplate = (template) => {
    setLatexFormula(prev => prev + template);
  };

  const clearFormula = () => {
    if (mode === 'visual') {
      setFormula('');
    } else {
      setLatexFormula('');
    }
  };

  const handleSave = () => {
    const finalFormula = mode === 'visual' ? formula : latexFormula;
    
    if (!finalFormula.trim()) {
      alert('❌ Введите формулу');
      return;
    }

    const formulaData = {
      content: finalFormula,
      formulaString: finalFormula,
      latexString: mode === 'latex' ? finalFormula : '',
      align: align,
      size: size
    };
    onSave(formulaData);
    handleClose();
  };

  const handleClose = () => {
    setFormula('');
    setLatexFormula('');
    setAlign('center');
    setSize(16);
    onClose();
  };

  if (!isOpen) return null;

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
      zIndex: 1000
    },
    modal: {
      backgroundColor: '#fff',
      padding: '25px',
      borderRadius: '12px',
      width: '750px',
      maxWidth: '95%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '20px',
      textAlign: 'center',
      color: '#e67e22'
    },
    modeSwitch: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      justifyContent: 'center'
    },
    modeButton: (isActive) => ({
      padding: '8px 20px',
      backgroundColor: isActive ? '#f39c12' : '#e0e0e0',
      color: isActive ? '#fff' : '#333',
      border: 'none',
      borderRadius: '20px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: isActive ? 'bold' : 'normal'
    }),
    previewWindow: {
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '10px',
      border: '2px solid #f39c12',
      textAlign: 'center'
    },
    previewLabel: {
      fontSize: '12px',
      color: '#999',
      marginBottom: '8px',
      textAlign: 'left'
    },
    previewContent: {
      fontSize: `${size}px`,
      fontFamily: 'Times New Roman, serif',
      padding: '10px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      minHeight: '60px',
      wordBreak: 'break-all'
    },
    symbolSection: {
      marginBottom: '20px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '10px'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#e67e22'
    },
    symbolGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px'
    },
    symbolButton: {
      padding: '6px 12px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #ddd',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '16px',
      fontFamily: 'monospace',
      transition: 'all 0.2s',
      ':hover': {
        backgroundColor: '#f39c12',
        color: '#fff'
      }
    },
    templateGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '15px'
    },
    templateButton: {
      padding: '6px 12px',
      backgroundColor: '#e8f4f8',
      border: '1px solid #b8d4e3',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontFamily: 'monospace',
      transition: 'all 0.2s',
      ':hover': {
        backgroundColor: '#f39c12',
        color: '#fff',
        borderColor: '#f39c12'
      }
    },
    textarea: {
      width: '100%',
      padding: '10px',
      border: '2px solid #ffe6cc',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'monospace',
      resize: 'vertical',
      minHeight: '80px',
      marginBottom: '10px'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: 'bold',
      color: '#333'
    },
    select: {
      width: '100%',
      padding: '8px',
      border: '2px solid #ffe6cc',
      borderRadius: '8px',
      fontSize: '14px'
    },
    sizeControl: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    rangeInput: {
      flex: 1,
      margin: '0 10px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px'
    },
    saveButton: {
      flex: 1,
      padding: '10px',
      backgroundColor: '#f39c12',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    cancelButton: {
      flex: 1,
      padding: '10px',
      backgroundColor: '#95a5a6',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    clearButton: {
      padding: '6px 12px',
      backgroundColor: '#e74c3c',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      marginLeft: '10px'
    },
    infoText: {
      fontSize: '11px',
      color: '#999',
      marginTop: '5px',
      textAlign: 'center'
    }
  };

  const currentFormula = mode === 'visual' ? formula : latexFormula;

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>
          {editingBlock ? '✏️ Редактирование формулы' : '🧮 Конструктор формул'}
        </h3>

        {/* Переключатель режимов */}
        <div style={styles.modeSwitch}>
          <button style={styles.modeButton(mode === 'visual')} onClick={() => setMode('visual')}>
            🔣 Визуальный режим
          </button>
          <button style={styles.modeButton(mode === 'latex')} onClick={() => setMode('latex')}>
            📐 LaTeX режим
          </button>
        </div>

        {/* ОКНО СБОРКИ ФОРМУЛЫ (вверху) */}
        <div style={styles.previewWindow}>
          <div style={styles.previewLabel}>
            📝 Сборка формулы:
            <button onClick={clearFormula} style={styles.clearButton}>
              🗑 Очистить
            </button>
          </div>
          <div style={styles.previewContent}>
            {currentFormula || <span style={{ color: '#999' }}>Нажмите на символы или шаблоны для сборки формулы...</span>}
          </div>
        </div>

        {/* Шаблоны (только в визуальном режиме) */}
        {mode === 'visual' && (
          <>
            <div style={styles.symbolSection}>
              <div style={styles.sectionTitle}>📐 Шаблоны (вставляются с □ для заполнения):</div>
              <div style={styles.templateGrid}>
                {visualTemplates.map((tpl, idx) => (
                  <button
                    key={idx}
                    style={styles.templateButton}
                    onClick={() => insertVisualTemplate(tpl.insert)}
                    title={tpl.name}
                  >
                    {tpl.symbol}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* LaTeX шаблоны */}
    {/* LaTeX шаблоны */}
{mode === 'latex' && (
  <div style={styles.symbolSection}>
    <div style={styles.sectionTitle}>📐 LaTeX шаблоны:</div>
    <div style={styles.templateGrid}>
      {latexTemplates.map((tpl, idx) => (
        <button
          key={idx}
          style={styles.templateButton}
          onClick={() => insertLatexTemplate(tpl.template)}
          title={tpl.name}
        >
          {tpl.name}
        </button>
      ))}
    </div>
    <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
      💡 Пример: {'\\frac{1}{2}'} - дробь, {'\\sqrt{4}'} - корень, {'\\sum_{a}^{b}'} - сумма
    </div>
  </div>
)}
        

        {/* Панель символов (только в визуальном режиме) */}
        {mode === 'visual' && (
          <>
            {Object.entries(mathSymbols).map(([category, symbols]) => (
              <div key={category} style={styles.symbolSection}>
                <div style={styles.sectionTitle}>{category}:</div>
                <div style={styles.symbolGrid}>
                  {symbols.map((symbol, idx) => (
                    <button
                      key={idx}
                      style={styles.symbolButton}
                      onClick={() => insertSymbol(symbol)}
                      dangerouslySetInnerHTML={{ __html: symbol }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Поле для ручного ввода (опционально) */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            {mode === 'visual' ? '✏️ Или введите вручную:' : '✏️ Редактировать LaTeX:'}
          </label>
          <textarea
            value={currentFormula}
            onChange={(e) => mode === 'visual' ? setFormula(e.target.value) : setLatexFormula(e.target.value)}
            placeholder={mode === 'visual' ? 'Введите или соберите формулу из символов выше...' : 'Введите LaTeX формулу...'}
            style={styles.textarea}
          />
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
            <span>12px</span>
            <input
              type="range"
              min="12"
              max="48"
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value))}
              style={styles.rangeInput}
            />
            <span>48px</span>
          </div>
        </div>

        <div style={styles.infoText}>
          💡 В визуальном режиме: □ обозначают места для заполнения (например: □/□ - дробь, √□ - корень)
        </div>

        <div style={styles.buttonGroup}>
          <button onClick={handleSave} style={styles.saveButton}>
            {editingBlock ? '💾 Сохранить' : '➕ Добавить формулу'}
          </button>
          <button onClick={handleClose} style={styles.cancelButton}>
            ✕ Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormulaManager;