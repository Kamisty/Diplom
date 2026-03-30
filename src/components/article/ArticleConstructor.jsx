// src/components/ArticleConstructor/ArticleConstructor.jsx
import React, { useState } from 'react';
import TextEditor from '../TextEditor';
import TableManager from '../TableManager';
import ImageManager from '../ImageManager';
import FormulaManager from '../FormulaManager';
import './ArticleConstructor.css';

const ArticleConstructor = ({ 
  initialContent = [], 
  onContentChange,
  readOnly = false,
  showHeader = true 
}) => {
  const [contentBlocks, setContentBlocks] = useState(initialContent);
  const [activeModal, setActiveModal] = useState(null); // 'table', 'image', 'formula'
  const [editingBlock, setEditingBlock] = useState(null);
  
  // Счетчики для нумерации
  const [counters, setCounters] = useState({
    table: initialContent.filter(b => b.type === 'table').length + 1,
    image: initialContent.filter(b => b.type === 'image').length + 1,
    formula: initialContent.filter(b => b.type === 'formula').length + 1
  });

  // Обновление контента с уведомлением родителя
  const updateContent = (newBlocks) => {
    setContentBlocks(newBlocks);
    if (onContentChange) {
      onContentChange(newBlocks);
    }
  };

  // Обработчики сохранения из менеджеров
  const handleSaveTable = (tableData) => {
    if (editingBlock?.type === 'table') {
      // Обновление существующей таблицы
      const updatedBlocks = contentBlocks.map(block =>
        block.id === editingBlock.id
          ? { ...block, ...tableData, type: 'table' }
          : block
      );
      updateContent(updatedBlocks);
      setEditingBlock(null);
    } else {
      // Создание новой таблицы
      const newBlock = {
        id: Date.now(),
        type: 'table',
        number: counters.table,
        ...tableData,
        createdAt: new Date().toISOString()
      };
      updateContent([...contentBlocks, newBlock]);
      setCounters({ ...counters, table: counters.table + 1 });
    }
    setActiveModal(null);
  };

  const handleSaveImage = (imageData) => {
    if (editingBlock?.type === 'image') {
      const updatedBlocks = contentBlocks.map(block =>
        block.id === editingBlock.id
          ? { ...block, ...imageData, type: 'image' }
          : block
      );
      updateContent(updatedBlocks);
      setEditingBlock(null);
    } else {
      const newBlock = {
        id: Date.now(),
        type: 'image',
        number: counters.image,
        ...imageData,
        createdAt: new Date().toISOString()
      };
      updateContent([...contentBlocks, newBlock]);
      setCounters({ ...counters, image: counters.image + 1 });
    }
    setActiveModal(null);
  };

  const handleSaveFormula = (formulaData) => {
    if (editingBlock?.type === 'formula') {
      const updatedBlocks = contentBlocks.map(block =>
        block.id === editingBlock.id
          ? { ...block, ...formulaData, type: 'formula' }
          : block
      );
      updateContent(updatedBlocks);
      setEditingBlock(null);
    } else {
      const newBlock = {
        id: Date.now(),
        type: 'formula',
        number: counters.formula,
        ...formulaData,
        createdAt: new Date().toISOString()
      };
      updateContent([...contentBlocks, newBlock]);
      setCounters({ ...counters, formula: counters.formula + 1 });
    }
    setActiveModal(null);
  };

  // Обработчик сохранения текста из TextEditor
  const handleSaveText = (content) => {
    if (!content || content === '<p><br></p>') {
      alert('Введите текст перед добавлением');
      return;
    }

    if (editingBlock?.type === 'text') {
      const updatedBlocks = contentBlocks.map(block =>
        block.id === editingBlock.id
          ? { ...block, content: content }
          : block
      );
      updateContent(updatedBlocks);
      setEditingBlock(null);
    } else {
      const newBlock = {
        id: Date.now(),
        type: 'text',
        content: content,
        createdAt: new Date().toISOString()
      };
      updateContent([...contentBlocks, newBlock]);
    }
  };

  // Редактирование блока
  const editBlock = (block) => {
    setEditingBlock(block);
    switch (block.type) {
      case 'text':
        // TextEditor будет показан с уже заполненным контентом
        break;
      case 'table':
        setActiveModal('table');
        break;
      case 'image':
        setActiveModal('image');
        break;
      case 'formula':
        setActiveModal('formula');
        break;
      default:
        break;
    }
  };

  // Удаление блока
  const deleteBlock = (id) => {
    if (window.confirm('Удалить этот блок?')) {
      const newBlocks = contentBlocks.filter(block => block.id !== id);
      updateContent(newBlocks);
      if (editingBlock?.id === id) {
        setEditingBlock(null);
        setActiveModal(null);
      }
    }
  };

  // Перемещение блока
  const moveBlock = (index, direction) => {
    const newBlocks = [...contentBlocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < contentBlocks.length) {
      [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
      updateContent(newBlocks);
    }
  };

  // Рендер блока в зависимости от типа
  const renderBlock = (block, index) => {
    const blockClass = `content-block ${editingBlock?.id === block.id ? 'editing' : ''}`;
    
    return (
      <div key={block.id} className={blockClass}>
        <div className="block-header">
          <div className="block-type">
            {block.type === 'text' && '📝 Текст'}
            {block.type === 'table' && `📊 Таблица ${block.number}`}
            {block.type === 'image' && `🖼️ Рисунок ${block.number}`}
            {block.type === 'formula' && `🧮 Формула ${block.number}`}
            <span className="block-index"> • Блок {index + 1}</span>
          </div>
          
          {!readOnly && (
            <div className="block-actions">
              <button 
                className="move-up" 
                onClick={() => moveBlock(index, 'up')}
                disabled={index === 0}
                title="Переместить вверх"
              >
                ↑
              </button>
              <button 
                className="move-down" 
                onClick={() => moveBlock(index, 'down')}
                disabled={index === contentBlocks.length - 1}
                title="Переместить вниз"
              >
                ↓
              </button>
              <button 
                className="edit" 
                onClick={() => editBlock(block)}
                title="Редактировать"
              >
                ✏️
              </button>
              <button 
                className="delete" 
                onClick={() => deleteBlock(block.id)}
                title="Удалить"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        
        <div className="block-content">
          {block.type === 'text' && (
            <div 
              className="text-preview"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          )}
          
          {block.type === 'table' && (
            <div className="table-preview">
              <div className="table-caption">{block.caption}</div>
              <div className="table-info">
                Размер: {block.data?.length} × {block.data?.[0]?.length || 0}
              </div>
              <div className="table-mini-preview">
                {block.data?.slice(0, 3).map((row, i) => (
                  <div key={i} className="mini-row">
                    {row.slice(0, 3).map((cell, j) => (
                      <span key={j} className="mini-cell">{cell || '—'}</span>
                    ))}
                    {row.length > 3 && <span>...</span>}
                  </div>
                ))}
                {block.data?.length > 3 && <div>...</div>}
              </div>
            </div>
          )}
          
          {block.type === 'image' && (
            <div className="image-preview">
              <img src={block.src} alt={block.caption} />
              <div className="image-caption">{block.caption}</div>
            </div>
          )}
          
          {block.type === 'formula' && (
            <div className="formula-preview">
              <div className="formula-number">Формула {block.number}:</div>
              <div className="formula-content">{block.formulaString || block.content}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="article-constructor">
      {/* Панель добавления элементов */}
      {!readOnly && (
        <div className="constructor-panel">
          {showHeader && <h3>✏️ Конструктор статьи</h3>}
          
          <div className="elements-toolbar">
            {/* Текстовый редактор всегда виден */}
            <div className="text-editor-wrapper">
              <TextEditor
                onSave={handleSaveText}
                initialValue={editingBlock?.type === 'text' ? editingBlock.content : ''}
                isEditing={editingBlock?.type === 'text'}
                onCancel={() => {
                  setEditingBlock(null);
                }}
              />
            </div>
            
            {/* Кнопки для других элементов */}
            <div className="elements-grid">
              <button 
                className="element-btn table-btn"
                onClick={() => setActiveModal('table')}
              >
                📊 Добавить таблицу
              </button>
              <button 
                className="element-btn image-btn"
                onClick={() => setActiveModal('image')}
              >
                🖼️ Добавить рисунок
              </button>
              <button 
                className="element-btn formula-btn"
                onClick={() => setActiveModal('formula')}
              >
                🧮 Добавить формулу
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Список блоков */}
      <div className="blocks-list">
        {contentBlocks.length > 0 ? (
          <>
            <div className="blocks-header">
              <h4>📄 Содержание статьи</h4>
              <span className="blocks-count">Всего: {contentBlocks.length}</span>
            </div>
            {contentBlocks.map((block, index) => renderBlock(block, index))}
          </>
        ) : (
          <div className="empty-blocks">
            {readOnly 
              ? 'Статья не содержит контента' 
              : 'Добавьте текст, таблицы, изображения или формулы, используя панель выше'}
          </div>
        )}
      </div>
      
      {/* Модальные окна для менеджеров */}
      <TableManager
        isOpen={activeModal === 'table'}
        onClose={() => {
          setActiveModal(null);
          if (editingBlock?.type === 'table') setEditingBlock(null);
        }}
        onSave={handleSaveTable}
        editingBlock={editingBlock?.type === 'table' ? editingBlock : null}
        tableCounter={counters.table}
      />
      
      <ImageManager
        isOpen={activeModal === 'image'}
        onClose={() => {
          setActiveModal(null);
          if (editingBlock?.type === 'image') setEditingBlock(null);
        }}
        onSave={handleSaveImage}
        editingBlock={editingBlock?.type === 'image' ? editingBlock : null}
        imageCounter={counters.image}
      />
      
      <FormulaManager
        isOpen={activeModal === 'formula'}
        onClose={() => {
          setActiveModal(null);
          if (editingBlock?.type === 'formula') setEditingBlock(null);
        }}
        onSave={handleSaveFormula}
        editingBlock={editingBlock?.type === 'formula' ? editingBlock : null}
        formulaCounter={counters.formula}
      />
    </div>
  );
};

export default ArticleConstructor;