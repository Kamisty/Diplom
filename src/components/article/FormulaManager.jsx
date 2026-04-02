// src/components/FormulaManager.js
import React, { useState, useEffect } from 'react';

// Функция для преобразования структуры формулы в строку для отображения
const formulaToString = (formulaParts) => {
  if (!formulaParts || !Array.isArray(formulaParts)) return '';
  
  return formulaParts.map(part => {
    switch (part.type) {
      case 'text':
      case 'number':
        return part.value;
      
      case 'fraction':
        return `(${part.numerator || '?'})/(${part.denominator || '?'})`;
      
      case 'power':
        return `${part.base || '?'}^(${part.exponent || '?'})`;
      
      case 'sqrt':
        if (part.degree) {
          return `√[${part.degree}](${part.value || '?'})`;
        }
        return `√(${part.value || '?'})`;
      
      case 'sum':
        return `∑[${part.lower || 'i=1'}]^[${part.upper || 'n'}]`;
      
      case 'integral':
        return `∫[${part.lower || 'a'}]^[${part.upper || 'b'}] ${part.expression || 'f(x)dx'}`;
      
      default:
        return '';
    }
  }).join('');
};

// Функция для преобразования структуры формулы в LaTeX
const formulaToLatex = (formulaParts) => {
  if (!formulaParts || !Array.isArray(formulaParts)) return '';
  
  return formulaParts.map(part => {
    switch (part.type) {
      case 'text':
      case 'number':
        return part.value;
      
      case 'fraction':
        return `\\frac{${part.numerator || '?'}}{${part.denominator || '?'}}`;
      
      case 'power':
        return `${part.base || '?'}^{${part.exponent || '?'}}`;
      
      case 'sqrt':
        if (part.degree) {
          return `\\sqrt[${part.degree}]{${part.value || '?'}}`;
        }
        return `\\sqrt{${part.value || '?'}}`;
      
      case 'sum':
        return `\\sum_{${part.lower || 'i=1'}}^{${part.upper || 'n'}}`;
      
      case 'integral':
        return `\\int_{${part.lower || 'a'}}^{${part.upper || 'b'}} ${part.expression || 'f(x)dx'}`;
      
      default:
        return '';
    }
  }).join('');
};

function FormulaManager({ 
  isOpen, 
  onClose, 
  onSave, 
  editingBlock = null,
  formulaCounter = 1 
}) {
  const [formulaParts, setFormulaParts] = useState([]);
  const [formulaAlign, setFormulaAlign] = useState('center');
  const [formulaSize, setFormulaSize] = useState(16);
  const [currentCategory, setCurrentCategory] = useState('basic');
  const [cursorPosition, setCursorPosition] = useState(null);

  // Инициализация при редактировании
  useEffect(() => {
    if (editingBlock) {
      try {
        // Пытаемся распарсить content как JSON
        const parsed = JSON.parse(editingBlock.content);
        setFormulaParts(parsed);
      } catch {
        // Если не получается, создаем текстовый элемент
        setFormulaParts([{ 
          id: Date.now(), 
          type: 'text', 
          value: editingBlock.content 
        }]);
      }
      setFormulaAlign(editingBlock.align || 'center');
      setFormulaSize(editingBlock.size || 16);
    } else {
      resetFormulaCreator();
    }
  }, [editingBlock]);

  const resetFormulaCreator = () => {
    setFormulaParts([]);
    setFormulaAlign('center');
    setFormulaSize(16);
    setCurrentCategory('basic');
    setCursorPosition(null);
  };

  const handleSave = () => {
    if (formulaParts.length === 0) {
      alert('Создайте формулу');
      return;
    }

    // Создаем строковое представление для отображения
    const formulaString = formulaToString(formulaParts);
    // Создаем LaTeX представление
    const latexString = formulaToLatex(formulaParts);
    
    const formulaData = {
      content: JSON.stringify(formulaParts), // Оригинальная структура для редактирования
      formulaString: formulaString, // Строковое представление
      latexString: latexString, // LaTeX
      align: formulaAlign,
      size: formulaSize
    };
    
    console.log('FormulaManager сохраняет:', formulaData); // Для отладки
    onSave(formulaData);
    handleClose();
  };

  const handleClose = () => {
    resetFormulaCreator();
    onClose();
  };

  const addPart = (part) => {
    const newPart = {
      id: Date.now() + Math.random(),
      ...part
    };
    
    if (cursorPosition !== null) {
      const newParts = [...formulaParts];
      newParts.splice(cursorPosition, 0, newPart);
      setFormulaParts(newParts);
      setCursorPosition(cursorPosition + 1);
    } else {
      setFormulaParts([...formulaParts, newPart]);
    }
  };

  const removePart = (index) => {
    const newParts = formulaParts.filter((_, i) => i !== index);
    setFormulaParts(newParts);
    if (cursorPosition !== null && cursorPosition > index) {
      setCursorPosition(cursorPosition - 1);
    } else if (cursorPosition === index) {
      setCursorPosition(null);
    }
  };

  const moveCursor = (direction) => {
    if (cursorPosition === null && formulaParts.length > 0) {
      setCursorPosition(0);
    } else if (cursorPosition !== null) {
      let newPosition = cursorPosition + direction;
      if (newPosition >= 0 && newPosition <= formulaParts.length) {
        setCursorPosition(newPosition);
      }
    }
  };

  const updatePartValue = (index, field, value) => {
    const newParts = [...formulaParts];
    if (field === 'value' || field === 'numerator' || field === 'denominator' || 
        field === 'base' || field === 'exponent' || field === 'degree' ||
        field === 'lower' || field === 'upper' || field === 'expression') {
      newParts[index][field] = value;
    }
    setFormulaParts(newParts);
  };

  const renderFormula = () => {
    return (
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        alignItems: 'center',
        minHeight: '60px',
        padding: '10px',
        border: '1px solid #000',
        backgroundColor: '#fff',
        fontFamily: 'Times New Roman, serif',
        fontSize: `${formulaSize}px`
      }}>
        {formulaParts.length === 0 ? (
          <span style={{ color: '#999', fontStyle: 'italic' }}>
            Нажмите на кнопки ниже, чтобы создать формулу
          </span>
        ) : (
          formulaParts.map((part, index) => {
            const isSelected = cursorPosition === index;
            const partStyle = {
              margin: '2px',
              padding: '4px',
              border: isSelected ? '2px solid #007bff' : '1px solid transparent',
              borderRadius: '4px',
              backgroundColor: isSelected ? '#e6f2ff' : 'transparent',
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: 'inherit'
            };

            const renderPartContent = () => {
              switch (part.type) {
                case 'text':
                case 'number':
                  return <span>{part.value}</span>;

                case 'fraction':
                  return (
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '0 2px' }}>
                      <input
                        type="text"
                        value={part.numerator || ''}
                        onChange={(e) => updatePartValue(index, 'numerator', e.target.value)}
                        placeholder="?"
                        style={{
                          width: '40px',
                          textAlign: 'center',
                          border: '1px solid #ccc',
                          borderRadius: '2px',
                          padding: '2px',
                          fontSize: '0.9em'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span style={{ width: '100%', borderBottom: '2px solid #000', margin: '2px 0' }}></span>
                      <input
                        type="text"
                        value={part.denominator || ''}
                        onChange={(e) => updatePartValue(index, 'denominator', e.target.value)}
                        placeholder="?"
                        style={{
                          width: '40px',
                          textAlign: 'center',
                          border: '1px solid #ccc',
                          borderRadius: '2px',
                          padding: '2px',
                          fontSize: '0.9em'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </span>
                  );

                case 'power':
                  return (
                    <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                      <input
                        type="text"
                        value={part.base || ''}
                        onChange={(e) => updatePartValue(index, 'base', e.target.value)}
                        placeholder="x"
                        style={{
                          width: '40px',
                          textAlign: 'center',
                          border: '1px solid #ccc',
                          borderRadius: '2px',
                          padding: '2px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span style={{ fontSize: '0.7em', verticalAlign: 'super' }}>
                        <input
                          type="text"
                          value={part.exponent || ''}
                          onChange={(e) => updatePartValue(index, 'exponent', e.target.value)}
                          placeholder="n"
                          style={{
                            width: '30px',
                            textAlign: 'center',
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            padding: '2px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </span>
                    </span>
                  );

                case 'sqrt':
                  return (
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2em' }}>√</span>
                      {part.degree && (
                        <span style={{ fontSize: '0.7em', verticalAlign: 'super', marginRight: '-5px' }}>
                          <input
                            type="text"
                            value={part.degree}
                            onChange={(e) => updatePartValue(index, 'degree', e.target.value)}
                            placeholder="n"
                            style={{
                              width: '25px',
                              textAlign: 'center',
                              border: '1px solid #ccc',
                              borderRadius: '2px',
                              padding: '2px'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </span>
                      )}
                      <span style={{ borderTop: '1px solid #000', marginLeft: '2px' }}>
                        <input
                          type="text"
                          value={part.value || ''}
                          onChange={(e) => updatePartValue(index, 'value', e.target.value)}
                          placeholder="выражение"
                          style={{
                            width: '60px',
                            textAlign: 'center',
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            padding: '2px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </span>
                    </span>
                  );

                case 'sum':
                  return (
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px' }}>
                      <span style={{ fontSize: '1.2em' }}>∑</span>
                      <span style={{ display: 'flex', gap: '4px', fontSize: '0.8em' }}>
                        <input
                          type="text"
                          value={part.lower || ''}
                          onChange={(e) => updatePartValue(index, 'lower', e.target.value)}
                          placeholder="i=1"
                          style={{
                            width: '40px',
                            textAlign: 'center',
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            padding: '2px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>до</span>
                        <input
                          type="text"
                          value={part.upper || ''}
                          onChange={(e) => updatePartValue(index, 'upper', e.target.value)}
                          placeholder="n"
                          style={{
                            width: '40px',
                            textAlign: 'center',
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            padding: '2px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </span>
                    </span>
                  );

                case 'integral':
                  return (
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px' }}>
                      <span style={{ fontSize: '1.2em' }}>∫</span>
                      <span style={{ display: 'flex', gap: '4px', fontSize: '0.8em' }}>
                        <input
                          type="text"
                          value={part.lower || ''}
                          onChange={(e) => updatePartValue(index, 'lower', e.target.value)}
                          placeholder="a"
                          style={{
                            width: '30px',
                            textAlign: 'center',
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            padding: '2px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>до</span>
                        <input
                          type="text"
                          value={part.upper || ''}
                          onChange={(e) => updatePartValue(index, 'upper', e.target.value)}
                          placeholder="b"
                          style={{
                            width: '30px',
                            textAlign: 'center',
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            padding: '2px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </span>
                      <input
                        type="text"
                        value={part.expression || ''}
                        onChange={(e) => updatePartValue(index, 'expression', e.target.value)}
                        placeholder="f(x)dx"
                        style={{
                          width: '80px',
                          textAlign: 'center',
                          border: '1px solid #ccc',
                          borderRadius: '2px',
                          margin: '2px',
                          padding: '2px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </span>
                  );

                default:
                  return null;
              }
            };

            return (
              <span 
                key={part.id} 
                style={partStyle}
                onClick={() => setCursorPosition(index)}
              >
                {renderPartContent()}
                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePart(index);
                    }}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10
                    }}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })
        )}
      </div>
    );
  };

  if (!isOpen && !editingBlock) return null;

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
      padding: '30px',
      borderRadius: '8px',
      maxWidth: '900px',
      width: '95%',
      maxHeight: '90vh',
      overflow: 'auto',
      border: '1px solid #000'
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '20px',
      textAlign: 'center',
      fontFamily: 'Times New Roman, serif'
    },
    categoryTabs: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      borderBottom: '1px solid #000',
      paddingBottom: '10px'
    },
    categoryTab: (active) => ({
      padding: '8px 16px',
      backgroundColor: active ? '#007bff' : '#f0f0f0',
      color: active ? '#fff' : '#000',
      border: 'none',
      cursor: 'pointer',
      borderRadius: '4px',
      fontSize: '14px'
    }),
    buttonsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
      gap: '8px',
      marginBottom: '20px',
      padding: '15px',
      border: '1px solid #000',
      maxHeight: '200px',
      overflowY: 'auto'
    },
    symbolButton: {
      padding: '10px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #000',
      cursor: 'pointer',
      fontSize: '16px',
      textAlign: 'center',
      borderRadius: '4px'
    },
    controlsRow: {
      display: 'flex',
      gap: '20px',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: '15px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px'
    },
    controlGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    select: {
      padding: '5px',
      border: '1px solid #000',
      fontSize: '14px',
      marginLeft: '10px',
      fontFamily: 'Times New Roman, serif',
      borderRadius: '4px'
    },
    slider: {
      width: '200px',
      margin: '0 10px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '20px',
      flexWrap: 'wrap'
    },
    primaryButton: {
      padding: '10px 20px',
      backgroundColor: '#28a745',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      borderRadius: '4px'
    },
    updateButton: {
      padding: '10px 20px',
      backgroundColor: '#007bff',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      borderRadius: '4px'
    },
    cancelButton: {
      padding: '10px 20px',
      backgroundColor: '#dc3545',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      borderRadius: '4px'
    },
    navigationButtons: {
      display: 'flex',
      gap: '5px',
      marginLeft: 'auto'
    },
    navButton: {
      padding: '5px 10px',
      backgroundColor: '#6c757d',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      borderRadius: '4px',
      fontSize: '12px'
    }
  };

  const categories = {
    basic: {
      name: 'Базовые',
      items: [
        { type: 'text', value: 'x', label: 'x' },
        { type: 'text', value: 'y', label: 'y' },
        { type: 'text', value: 'z', label: 'z' },
        { type: 'text', value: 't', label: 't' },
        { type: 'text', value: 'a', label: 'a' },
        { type: 'text', value: 'b', label: 'b' },
        { type: 'text', value: 'c', label: 'c' },
        { type: 'text', value: 'f', label: 'f' },
        { type: 'text', value: 'g', label: 'g' },
        { type: 'text', value: 'h', label: 'h' }
      ]
    },
    numbers: {
      name: 'Цифры',
      items: [
        { type: 'number', value: '0', label: '0' },
        { type: 'number', value: '1', label: '1' },
        { type: 'number', value: '2', label: '2' },
        { type: 'number', value: '3', label: '3' },
        { type: 'number', value: '4', label: '4' },
        { type: 'number', value: '5', label: '5' },
        { type: 'number', value: '6', label: '6' },
        { type: 'number', value: '7', label: '7' },
        { type: 'number', value: '8', label: '8' },
        { type: 'number', value: '9', label: '9' },
        { type: 'text', value: '.', label: '.' },
        { type: 'text', value: ',', label: ',' }
      ]
    },
    operators: {
      name: 'Операторы',
      items: [
        { type: 'text', value: '+', label: '+' },
        { type: 'text', value: '-', label: '−' },
        { type: 'text', value: '×', label: '×' },
        { type: 'text', value: '÷', label: '÷' },
        { type: 'text', value: '=', label: '=' },
        { type: 'text', value: '≠', label: '≠' },
        { type: 'text', value: '±', label: '±' },
        { type: 'text', value: '∓', label: '∓' },
        { type: 'text', value: '<', label: '<' },
        { type: 'text', value: '>', label: '>' },
        { type: 'text', value: '≤', label: '≤' },
        { type: 'text', value: '≥', label: '≥' },
        { type: 'text', value: '≈', label: '≈' },
        { type: 'text', value: '≡', label: '≡' },
        { type: 'text', value: '∝', label: '∝' }
      ]
    },
    greek: {
      name: 'Греческие',
      items: [
        { type: 'text', value: 'α', label: 'α' },
        { type: 'text', value: 'β', label: 'β' },
        { type: 'text', value: 'γ', label: 'γ' },
        { type: 'text', value: 'δ', label: 'δ' },
        { type: 'text', value: 'ε', label: 'ε' },
        { type: 'text', value: 'ζ', label: 'ζ' },
        { type: 'text', value: 'η', label: 'η' },
        { type: 'text', value: 'θ', label: 'θ' },
        { type: 'text', value: 'ι', label: 'ι' },
        { type: 'text', value: 'κ', label: 'κ' },
        { type: 'text', value: 'λ', label: 'λ' },
        { type: 'text', value: 'μ', label: 'μ' },
        { type: 'text', value: 'ν', label: 'ν' },
        { type: 'text', value: 'ξ', label: 'ξ' },
        { type: 'text', value: 'π', label: 'π' },
        { type: 'text', value: 'ρ', label: 'ρ' },
        { type: 'text', value: 'σ', label: 'σ' },
        { type: 'text', value: 'τ', label: 'τ' },
        { type: 'text', value: 'υ', label: 'υ' },
        { type: 'text', value: 'φ', label: 'φ' },
        { type: 'text', value: 'χ', label: 'χ' },
        { type: 'text', value: 'ψ', label: 'ψ' },
        { type: 'text', value: 'ω', label: 'ω' }
      ]
    },
    functions: {
      name: 'Функции',
      items: [
        { type: 'text', value: 'sin', label: 'sin' },
        { type: 'text', value: 'cos', label: 'cos' },
        { type: 'text', value: 'tan', label: 'tan' },
        { type: 'text', value: 'cot', label: 'cot' },
        { type: 'text', value: 'sec', label: 'sec' },
        { type: 'text', value: 'csc', label: 'csc' },
        { type: 'text', value: 'arcsin', label: 'arcsin' },
        { type: 'text', value: 'arccos', label: 'arccos' },
        { type: 'text', value: 'arctan', label: 'arctan' },
        { type: 'text', value: 'log', label: 'log' },
        { type: 'text', value: 'ln', label: 'ln' },
        { type: 'text', value: 'lg', label: 'lg' },
        { type: 'text', value: 'exp', label: 'exp' },
        { type: 'text', value: 'lim', label: 'lim' }
      ]
    },
    structures: {
      name: 'Структуры',
      items: [
        { type: 'fraction', numerator: '', denominator: '', label: 'a/b' },
        { type: 'power', base: '', exponent: '', label: 'xⁿ' },
        { type: 'sqrt', value: '', degree: null, label: '√' },
        { type: 'sqrt', value: '', degree: 'n', label: 'ⁿ√' },
        { type: 'sum', lower: 'i=1', upper: 'n', label: '∑' },
        { type: 'integral', lower: 'a', upper: 'b', expression: 'f(x)dx', label: '∫' },
        { type: 'text', value: '(', label: '(' },
        { type: 'text', value: ')', label: ')' },
        { type: 'text', value: '[', label: '[' },
        { type: 'text', value: ']', label: ']' },
        { type: 'text', value: '{', label: '{' },
        { type: 'text', value: '}', label: '}' },
        { type: 'text', value: '|', label: '|' },
        { type: 'text', value: '||', label: '∥' }
      ]
    }
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>
          {editingBlock ? '✏️ Редактирование формулы' : '🧮 Конструктор формул'}
        </h3>

        {/* Область построения формулы */}
        {renderFormula()}

        {/* Панель навигации */}
        <div style={styles.controlsRow}>
          <div style={styles.controlGroup}>
            <button
              onClick={() => moveCursor(-1)}
              style={styles.navButton}
              disabled={cursorPosition === null || cursorPosition === 0}
            >
              ← Влево
            </button>
            <button
              onClick={() => moveCursor(1)}
              style={styles.navButton}
              disabled={cursorPosition === null || cursorPosition === formulaParts.length}
            >
              Вправо →
            </button>
          </div>
          <div style={styles.controlGroup}>
            <button
              onClick={() => setCursorPosition(null)}
              style={styles.navButton}
            >
              Снять выделение
            </button>
          </div>
        </div>

        {/* Категории */}
        <div style={styles.categoryTabs}>
          {Object.entries(categories).map(([key, category]) => (
            <button
              key={key}
              style={styles.categoryTab(currentCategory === key)}
              onClick={() => setCurrentCategory(key)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Кнопки элементов */}
        <div style={styles.buttonsGrid}>
          {categories[currentCategory].items.map((item, index) => (
            <button
              key={index}
              style={styles.symbolButton}
              onClick={() => addPart(item)}
              title={item.label}
            >
              {item.label || item.value}
            </button>
          ))}
        </div>

        {/* Настройки */}
        <div style={styles.controlsRow}>
          <div style={styles.controlGroup}>
            <label>Выравнивание:</label>
            <select value={formulaAlign} onChange={(e) => setFormulaAlign(e.target.value)} style={styles.select}>
              <option value="left">По левому краю</option>
              <option value="center">По центру</option>
              <option value="right">По правому краю</option>
            </select>
          </div>
          <div style={styles.controlGroup}>
            <label>Размер:</label>
            <input
              type="range"
              min="12"
              max="48"
              value={formulaSize}
              onChange={(e) => setFormulaSize(parseInt(e.target.value))}
              style={styles.slider}
            />
            <span>{formulaSize}px</span>
          </div>
          <button
            onClick={() => setFormulaParts([])}
            style={styles.navButton}
          >
            Очистить всё
          </button>
        </div>

        {/* Предпросмотр */}
        {formulaParts.length > 0 && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#f8f9fa',
            border: '1px solid #000',
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
              Предпросмотр:
            </div>
            <div style={{ 
              fontFamily: 'Times New Roman, serif',
              fontSize: '18px',
              padding: '10px',
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}>
              {formulaToString(formulaParts)}
            </div>
          </div>
        )}
        
        {/* Кнопки сохранения */}
        <div style={styles.buttonGroup}>
          {editingBlock ? (
            <button onClick={handleSave} style={styles.updateButton}>
              💾 Сохранить изменения
            </button>
          ) : (
            <button onClick={handleSave} style={styles.primaryButton}>
              + Добавить формулу {formulaCounter}
            </button>
          )}
          <button onClick={handleClose} style={styles.cancelButton}>
            ✕ Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

export default FormulaManager;