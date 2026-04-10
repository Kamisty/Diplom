// src/components/TableManager.js
import React, { useState, useEffect } from 'react';

const TableManager = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingBlock = null,
  tableCounter = 1 
}) => {
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableCaption, setTableCaption] = useState('');
  const [tableData, setTableData] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [mergedCells, setMergedCells] = useState({});
  const [rotatedCells, setRotatedCells] = useState({});
  const [showDraftMessage, setShowDraftMessage] = useState(false);

  // Инициализация при редактировании
  useEffect(() => {
    if (editingBlock) {
      setTableRows(editingBlock.data.length);
      setTableCols(editingBlock.data[0]?.length || 3);
      setTableCaption(editingBlock.caption?.replace(`Таблица ${editingBlock.number} — `, '') || '');
      setTableData(editingBlock.data.map(row => [...row]));
      setMergedCells(editingBlock.mergedCells || {});
      setRotatedCells(editingBlock.rotatedCells || {});
    } else {
      createTable();
    }
  }, [editingBlock]);

  // Создание таблицы с заданными размерами
  const createTable = () => {
    const newData = Array(tableRows).fill().map(() => Array(tableCols).fill(''));
    setTableData(newData);
  };

  // Обновление при изменении размеров
  useEffect(() => {
    if (tableData.length > 0) {
      const newData = Array(tableRows).fill().map((_, i) => 
        Array(tableCols).fill('').map((_, j) => tableData[i]?.[j] || '')
      );
      setTableData(newData);
    } else {
      createTable();
    }
  }, [tableRows, tableCols]);

  // Получение реальных координат с учетом объединенных ячеек
  const getActualCell = (row, col) => {
    for (const [key, info] of Object.entries(mergedCells)) {
      const [startRow, startCol] = key.split('-').map(Number);
      if (row >= startRow && row < startRow + info.rowspan &&
          col >= startCol && col < startCol + info.colspan) {
        return { row: startRow, col: startCol, merged: true, info };
      }
    }
    return { row, col, merged: false };
  };

  // Обновление данных ячейки с учетом объединений
  const updateTableCell = (rowIndex, colIndex, value) => {
    const actual = getActualCell(rowIndex, colIndex);
    
    if (actual.merged) {
      const newMergedCells = { ...mergedCells };
      const key = `${actual.row}-${actual.col}`;
      newMergedCells[key] = { ...newMergedCells[key], value };
      setMergedCells(newMergedCells);
    } else {
      const newData = [...tableData];
      newData[rowIndex][colIndex] = value;
      setTableData(newData);
    }
  };

  // Функции для выделения ячеек
  const handleMouseDown = (row, col) => {
    setIsSelecting(true);
    setStartCell({ row, col });
    setSelectedCells([{ row, col }]);
  };

  const handleMouseEnter = (row, col) => {
    if (!isSelecting || !startCell) return;

    const minRow = Math.min(startCell.row, row);
    const maxRow = Math.max(startCell.row, row);
    const minCol = Math.min(startCell.col, col);
    const maxCol = Math.max(startCell.col, col);

    const newSelected = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        newSelected.push({ row: r, col: c });
      }
    }
    setSelectedCells(newSelected);
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const isCellSelected = (row, col) => {
    return selectedCells.some(cell => cell.row === row && cell.col === col);
  };

  // Очистка выделения
  const clearSelection = () => {
    setSelectedCells([]);
  };

  // Функции для вставки строк и столбцов
  const insertRowAbove = () => {
    if (selectedCells.length === 0) {
      alert('Сначала выделите ячейку или область');
      return;
    }
    const targetRow = Math.min(...selectedCells.map(cell => cell.row));
    const newRow = Array(tableCols).fill('');
    const newData = [...tableData];
    newData.splice(targetRow, 0, newRow);
    setTableData(newData);
    setTableRows(tableRows + 1);
    setSelectedCells([]);
  };

  const insertRowBelow = () => {
    if (selectedCells.length === 0) {
      alert('Сначала выделите ячейку или область');
      return;
    }
    const targetRow = Math.max(...selectedCells.map(cell => cell.row));
    const newRow = Array(tableCols).fill('');
    const newData = [...tableData];
    newData.splice(targetRow + 1, 0, newRow);
    setTableData(newData);
    setTableRows(tableRows + 1);
    setSelectedCells([]);
  };

  const insertColumnLeft = () => {
    if (selectedCells.length === 0) {
      alert('Сначала выделите ячейку или область');
      return;
    }
    const targetCol = Math.min(...selectedCells.map(cell => cell.col));
    const newData = tableData.map(row => {
      const newRow = [...row];
      newRow.splice(targetCol, 0, '');
      return newRow;
    });
    setTableData(newData);
    setTableCols(tableCols + 1);
    setSelectedCells([]);
  };

  const insertColumnRight = () => {
    if (selectedCells.length === 0) {
      alert('Сначала выделите ячейку или область');
      return;
    }
    const targetCol = Math.max(...selectedCells.map(cell => cell.col));
    const newData = tableData.map(row => {
      const newRow = [...row];
      newRow.splice(targetCol + 1, 0, '');
      return newRow;
    });
    setTableData(newData);
    setTableCols(tableCols + 1);
    setSelectedCells([]);
  };

  // Функции для удаления строк и столбцов
  const deleteRows = () => {
    if (selectedCells.length === 0) {
      alert('Сначала выделите ячейку или область');
      return;
    }
    if (tableRows <= 1) {
      alert('Нельзя удалить все строки');
      return;
    }
    const rowsToDelete = [...new Set(selectedCells.map(cell => cell.row))].sort((a, b) => b - a);
    let newData = [...tableData];
    rowsToDelete.forEach(row => {
      newData.splice(row, 1);
    });
    setTableData(newData);
    setTableRows(tableRows - rowsToDelete.length);
    setSelectedCells([]);
  };

  const deleteColumns = () => {
    if (selectedCells.length === 0) {
      alert('Сначала выделите ячейку или область');
      return;
    }
    if (tableCols <= 1) {
      alert('Нельзя удалить все колонки');
      return;
    }
    const colsToDelete = [...new Set(selectedCells.map(cell => cell.col))].sort((a, b) => b - a);
    let newData = tableData.map(row => {
      let newRow = [...row];
      colsToDelete.forEach(col => {
        newRow.splice(col, 1);
      });
      return newRow;
    });
    setTableData(newData);
    setTableCols(tableCols - colsToDelete.length);
    setSelectedCells([]);
  };

  // Поворот текста в ячейке
  const rotateCell = () => {
    if (selectedCells.length === 0) {
      alert('Сначала выделите ячейку или область');
      return;
    }
    
    const newRotatedCells = { ...rotatedCells };
    
    selectedCells.forEach(({ row, col }) => {
      const actual = getActualCell(row, col);
      const key = `${actual.row}-${actual.col}`;
      newRotatedCells[key] = !newRotatedCells[key];
    });
    
    setRotatedCells(newRotatedCells);
  };

  // Объединение ячеек
  const mergeCells = () => {
    if (selectedCells.length < 2) {
      alert('Выделите минимум 2 ячейки для объединения');
      return;
    }

    const rows = selectedCells.map(cell => cell.row);
    const cols = selectedCells.map(cell => cell.col);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    const isRectangular = (maxRow - minRow + 1) * (maxCol - minCol + 1) === selectedCells.length;
    if (!isRectangular) {
      alert('Можно объединять только прямоугольные области');
      return;
    }

    const newMergedCells = { ...mergedCells };
    const newData = [...tableData];
    
    // Собираем значения
    const mergedValue = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const actual = getActualCell(r, c);
        if (actual.merged) {
          const key = `${actual.row}-${actual.col}`;
          if (mergedCells[key]?.value) {
            mergedValue.push(mergedCells[key].value);
          }
        } else {
          if (newData[r][c]?.trim()) {
            mergedValue.push(newData[r][c]);
          }
        }
      }
    }

    // Удаляем старые объединения
    const cellsToRemove = [];
    for (const key of Object.keys(newMergedCells)) {
      const [r, c] = key.split('-').map(Number);
      if (r >= minRow && r <= maxRow && c >= minCol && c <= maxCol) {
        cellsToRemove.push(key);
      }
    }
    cellsToRemove.forEach(key => delete newMergedCells[key]);

    // Создаем новую объединенную ячейку
    const mainKey = `${minRow}-${minCol}`;
    newMergedCells[mainKey] = {
      rowspan: maxRow - minRow + 1,
      colspan: maxCol - minCol + 1,
      value: mergedValue.join(' ')
    };

    // Очищаем данные
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (r === minRow && c === minCol) {
          newData[r][c] = '';
        } else {
          newData[r][c] = '__MERGED__';
        }
      }
    }

    setMergedCells(newMergedCells);
    setTableData(newData);
    setSelectedCells([]);
  };

  // Разъединение ячеек
  const splitCell = (row, col) => {
    const actual = getActualCell(row, col);
    if (!actual.merged) return;

    const key = `${actual.row}-${actual.col}`;
    const info = mergedCells[key];
    
    const newMergedCells = { ...mergedCells };
    delete newMergedCells[key];
    
    const newData = [...tableData];
    for (let r = actual.row; r < actual.row + info.rowspan; r++) {
      for (let c = actual.col; c < actual.col + info.colspan; c++) {
        if (newData[r] && newData[r][c] === '__MERGED__') {
          newData[r][c] = '';
        }
      }
    }
    
    setMergedCells(newMergedCells);
    setTableData(newData);
  };

  // Форматирование текста
  const applyFormatting = (format) => {
    if (selectedCells.length === 0) {
      alert('Сначала выделите ячейку или область');
      return;
    }
    
    const newData = [...tableData];
    const newMergedCells = { ...mergedCells };
    
    selectedCells.forEach(({ row, col }) => {
      const actual = getActualCell(row, col);
      
      if (actual.merged) {
        const key = `${actual.row}-${actual.col}`;
        const cellValue = mergedCells[key]?.value || '';
        
        switch(format) {
          case 'bold':
            newMergedCells[key].value = cellValue ? `**${cellValue}**` : '** **';
            break;
          case 'italic':
            newMergedCells[key].value = cellValue ? `*${cellValue}*` : '* *';
            break;
        }
      } else {
        const cellValue = newData[row][col] || '';
        
        switch(format) {
          case 'bold':
            newData[row][col] = cellValue ? `**${cellValue}**` : '** **';
            break;
          case 'italic':
            newData[row][col] = cellValue ? `*${cellValue}*` : '* *';
            break;
        }
      }
    });
    
    setTableData(newData);
    setMergedCells(newMergedCells);
  };

  // Проверка заполненности таблицы
  const isTableValid = () => {
    for (let r = 0; r < tableRows; r++) {
      for (let c = 0; c < tableCols; c++) {
        if (tableData[r] && tableData[r][c] === '__MERGED__') continue;
        
        const actual = getActualCell(r, c);
        if (actual.merged) {
          const key = `${actual.row}-${actual.col}`;
          if (!mergedCells[key]?.value?.trim()) {
            return false;
          }
        } else {
          if (!tableData[r]?.[c]?.trim()) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Сохранение черновика
  const saveDraft = () => {
    const cleanData = tableData.map(row => 
      row.map(cell => cell === '__MERGED__' ? '' : cell)
    );
    
    const draft = {
      caption: tableCaption,
      data: cleanData,
      rows: tableRows,
      cols: tableCols,
      mergedCells: mergedCells,
      rotatedCells: rotatedCells,
      timestamp: new Date().toLocaleString()
    };
    localStorage.setItem('tableDraft', JSON.stringify(draft));
    setShowDraftMessage(true);
    setTimeout(() => setShowDraftMessage(false), 3000);
  };

  // Загрузка черновика
  const loadDraft = () => {
    const savedDraft = localStorage.getItem('tableDraft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setTableRows(draft.rows);
        setTableCols(draft.cols);
        setTableCaption(draft.caption || '');
        setRotatedCells(draft.rotatedCells || {});
        
        const newData = draft.data.map(row => [...row]);
        
        if (draft.mergedCells) {
          const newMergedCells = {};
          Object.entries(draft.mergedCells).forEach(([key, info]) => {
            newMergedCells[key] = { ...info };
            
            const [startRow, startCol] = key.split('-').map(Number);
            for (let r = startRow; r < startRow + info.rowspan; r++) {
              for (let c = startCol; c < startCol + info.colspan; c++) {
                if (r !== startRow || c !== startCol) {
                  if (!newData[r]) newData[r] = [];
                  newData[r][c] = '__MERGED__';
                }
              }
            }
          });
          setMergedCells(newMergedCells);
        }
        
        setTableData(newData);
        alert('✅ Черновик загружен');
      } catch (error) {
        alert('❌ Ошибка при загрузке черновика');
      }
    } else {
      alert('❌ Нет сохраненного черновика');
    }
  };

  const handleSave = () => {
    if (!isTableValid()) {
      alert('❌ Заполните все ячейки таблицы перед сохранением');
      return;
    }

    const cleanData = tableData.map(row => 
      row.map(cell => cell === '__MERGED__' ? '' : cell)
    );
    
    // Пустые заголовки, чтобы они не отображались в предпросмотре
    const headers = Array(tableCols).fill('');
    
    const tableDataToSave = {
      caption: tableCaption.trim() || `Таблица ${editingBlock?.number || tableCounter}`,
      headers: headers,
      data: cleanData,
      rows: tableRows,
      cols: tableCols,
      mergedCells: mergedCells,
      rotatedCells: rotatedCells
    };
    onSave(tableDataToSave);
    handleClose();
  };

  const handleClose = () => {
    setTableData([]);
    setSelectedCells([]);
    setMergedCells({});
    setRotatedCells({});
    setShowDraftMessage(false);
    onClose();
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
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '900px',
      width: '95%',
      maxHeight: '90vh',
      overflow: 'auto',
      border: '1px solid #000',
      position: 'relative'
    },
    title: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '15px',
      textAlign: 'center',
      fontFamily: 'Times New Roman, serif'
    },
    captionInput: {
      width: '100%',
      padding: '8px',
      border: '1px solid #000',
      fontSize: '14px',
      fontFamily: 'Times New Roman, serif',
      marginBottom: '15px',
      borderRadius: '4px'
    },
    controlsRow: {
      display: 'flex',
      gap: '15px',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginBottom: '15px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px'
    },
    controlGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    label: {
      fontFamily: 'Times New Roman, serif',
      fontSize: '14px'
    },
    numberInput: {
      width: '60px',
      padding: '4px',
      border: '1px solid #000',
      fontSize: '14px',
      fontFamily: 'Times New Roman, serif',
      textAlign: 'center'
    },
    toolbar: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      marginBottom: '15px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #000',
      borderRadius: '4px',
      justifyContent: 'center'
    },
    toolGroup: {
      display: 'flex',
      gap: '5px',
      alignItems: 'center',
      padding: '0 10px',
      borderRight: '1px solid #ccc'
    },
    toolButton: {
      padding: '5px 10px',
      backgroundColor: '#fff',
      border: '1px solid #000',
      cursor: 'pointer',
      fontSize: '12px',
      fontFamily: 'Times New Roman, serif',
      borderRadius: '3px',
      minWidth: '60px',
      ':hover': {
        backgroundColor: '#e9ecef'
      }
    },
    toolButtonSmall: {
      padding: '5px 10px',
      backgroundColor: '#fff',
      border: '1px solid #000',
      cursor: 'pointer',
      fontSize: '12px',
      fontFamily: 'Times New Roman, serif',
      borderRadius: '3px',
      minWidth: '30px',
      ':hover': {
        backgroundColor: '#e9ecef'
      }
    },
    dataTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '15px',
      tableLayout: 'fixed'
    },
    td: (isSelected, isEmpty, isRotated) => ({
      padding: isRotated ? '2px' : '6px',
      border: '1px solid #000',
      fontFamily: 'Times New Roman, serif',
      fontSize: '14px',
      backgroundColor: isSelected ? '#e6f2ff' : isEmpty ? '#fff3f3' : 'transparent',
      cursor: 'pointer',
      height: isRotated ? '60px' : '40px',
      width: isRotated ? '40px' : 'auto',
      ...(isRotated && {
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        whiteSpace: 'nowrap'
      })
    }),
    cellInput: {
      width: '100%',
      height: '100%',
      padding: '4px',
      border: '1px solid transparent',
      textAlign: 'center',
      fontFamily: 'Times New Roman, serif',
      fontSize: '14px',
      backgroundColor: 'transparent',
      outline: 'none',
      boxSizing: 'border-box',
      ':focus': {
        border: '1px solid #007bff'
      }
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'center',
      marginTop: '15px',
      flexWrap: 'wrap'
    },
    primaryButton: {
      padding: '8px 25px',
      backgroundColor: '#28a745',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontFamily: 'Times New Roman, serif',
      borderRadius: '4px',
      ':hover': {
        backgroundColor: '#218838'
      }
    },
    draftButton: {
      padding: '8px 25px',
      backgroundColor: '#ffc107',
      color: '#000',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontFamily: 'Times New Roman, serif',
      borderRadius: '4px',
      ':hover': {
        backgroundColor: '#e0a800'
      }
    },
    cancelButton: {
      padding: '8px 25px',
      backgroundColor: '#dc3545',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontFamily: 'Times New Roman, serif',
      borderRadius: '4px',
      ':hover': {
        backgroundColor: '#c82333'
      }
    },
    infoText: {
      fontSize: '12px',
      color: '#666',
      marginBottom: '8px',
      fontFamily: 'Times New Roman, serif',
      textAlign: 'center'
    },
    draftMessage: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      backgroundColor: '#28a745',
      color: '#fff',
      padding: '8px 15px',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'Times New Roman, serif',
      animation: 'fadeInOut 3s ease'
    }
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {showDraftMessage && (
          <div style={styles.draftMessage}>
            ✅ Черновик сохранен
          </div>
        )}
        
        <h3 style={styles.title}>
          {editingBlock ? '✏️ Редактирование таблицы' : '📊 Создание таблицы'}
        </h3>

        {/* Название таблицы */}
        <input
          type="text"
          value={tableCaption}
          onChange={(e) => setTableCaption(e.target.value)}
          style={styles.captionInput}
          placeholder={`Название таблицы (например: Таблица ${editingBlock?.number || tableCounter})`}
        />

        {/* Настройки размеров таблицы */}
        <div style={styles.controlsRow}>
          <div style={styles.controlGroup}>
            <span style={styles.label}>Строки:</span>
            <input
              type="number"
              min="1"
              max="15"
              value={tableRows}
              onChange={(e) => {
                const newRows = parseInt(e.target.value) || 1;
                setTableRows(newRows);
              }}
              style={styles.numberInput}
            />
          </div>
          
          <div style={styles.controlGroup}>
            <span style={styles.label}>Колонки:</span>
            <input
              type="number"
              min="1"
              max="8"
              value={tableCols}
              onChange={(e) => {
                const newCols = parseInt(e.target.value) || 1;
                setTableCols(newCols);
              }}
              style={styles.numberInput}
            />
          </div>
        </div>

        {/* Панель инструментов */}
        {tableData.length > 0 && (
          <>
            <div style={styles.infoText}>
              {selectedCells.length > 0 
                ? `Выделено ячеек: ${selectedCells.length} (Shift + перетаскивание для области)` 
                : 'Кликните на ячейку, зажмите Shift и тяните для выделения области'}
            </div>
            
            <div style={styles.toolbar}>
              <div style={styles.toolGroup}>
                <button onClick={() => applyFormatting('bold')} style={styles.toolButtonSmall} title="Жирный">B</button>
                <button onClick={() => applyFormatting('italic')} style={styles.toolButtonSmall} title="Курсив">I</button>
                <button onClick={rotateCell} style={styles.toolButtonSmall} title="Повернуть текст">↻</button>
              </div>
              
              <div style={styles.toolGroup}>
                <button onClick={insertRowAbove} style={styles.toolButton} title="Вставить строку сверху">↑ Строка</button>
                <button onClick={insertRowBelow} style={styles.toolButton} title="Вставить строку снизу">↓ Строка</button>
              </div>
              
              <div style={styles.toolGroup}>
                <button onClick={insertColumnLeft} style={styles.toolButton} title="Вставить колонку слева">← Колонка</button>
                <button onClick={insertColumnRight} style={styles.toolButton} title="Вставить колонку справа">→ Колонка</button>
              </div>
              
              <div style={styles.toolGroup}>
                <button onClick={deleteRows} style={styles.toolButton} title="Удалить выделенные строки">🗑 Строки</button>
                <button onClick={deleteColumns} style={styles.toolButton} title="Удалить выделенные колонки">🗑 Колонки</button>
              </div>
              
              <div style={styles.toolGroup}>
                <button onClick={mergeCells} style={styles.toolButton} title="Объединить ячейки">🔗 Объединить</button>
                <button onClick={clearSelection} style={styles.toolButton} title="Снять выделение">✕ Снять</button>
              </div>
            </div>
          </>
        )}

        {/* Таблица */}
        {tableData.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.dataTable}>
              <tbody>
                {Array.from({ length: tableRows }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: tableCols }).map((_, colIndex) => {
                      if (tableData[rowIndex] && tableData[rowIndex][colIndex] === '__MERGED__') {
                        return null;
                      }

                      const actual = getActualCell(rowIndex, colIndex);
                      const isMainMergedCell = actual.merged && actual.row === rowIndex && actual.col === colIndex;
                      
                      if (!isMainMergedCell && actual.merged) {
                        return null;
                      }

                      const isSelected = isCellSelected(rowIndex, colIndex);
                      const cellValue = isMainMergedCell 
                        ? mergedCells[`${actual.row}-${actual.col}`]?.value || ''
                        : (tableData[rowIndex]?.[colIndex] || '');
                      
                      const isEmpty = !cellValue.trim();
                      const mergedInfo = isMainMergedCell ? mergedCells[`${actual.row}-${actual.col}`] : null;
                      const isRotated = rotatedCells[`${actual.row}-${actual.col}`];

                      return (
                        <td
                          key={`${rowIndex}-${colIndex}`}
                          style={styles.td(isSelected, isEmpty, isRotated)}
                          rowSpan={mergedInfo?.rowspan || 1}
                          colSpan={mergedInfo?.colspan || 1}
                          onMouseDown={(e) => {
                            if (e.shiftKey) {
                              if (!isSelecting) {
                                handleMouseDown(rowIndex, colIndex);
                              }
                            } else {
                              setSelectedCells([{ row: rowIndex, col: colIndex }]);
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (e.shiftKey && isSelecting) {
                              handleMouseEnter(rowIndex, colIndex);
                            }
                          }}
                          onMouseUp={handleMouseUp}
                          onDoubleClick={() => splitCell(rowIndex, colIndex)}
                        >
                          <input
                            value={cellValue}
                            onChange={(e) => updateTableCell(rowIndex, colIndex, e.target.value)}
                            style={styles.cellInput}
                            placeholder=""
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Кнопки действий */}
        <div style={styles.buttonGroup}>
          <button onClick={saveDraft} style={styles.draftButton}>
            💾 Черновик
          </button>
          <button onClick={loadDraft} style={styles.draftButton}>
            📂 Загрузить
          </button>
          {editingBlock ? (
            <button onClick={handleSave} style={styles.primaryButton}>
              💾 Сохранить изменения
            </button>
          ) : (
            <button onClick={handleSave} style={styles.primaryButton}>
              + Вставить таблицу {tableCounter}
            </button>
          )}
          <button onClick={handleClose} style={styles.cancelButton}>
            ✕ Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableManager;