// src/components/article/TableManager.jsx
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

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

  // Поворот текста в ячейке (вертикально)
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

    const cellsToRemove = [];
    for (const key of Object.keys(newMergedCells)) {
      const [r, c] = key.split('-').map(Number);
      if (r >= minRow && r <= maxRow && c >= minCol && c <= maxCol) {
        cellsToRemove.push(key);
      }
    }
    cellsToRemove.forEach(key => delete newMergedCells[key]);

    const mainKey = `${minRow}-${minCol}`;
    newMergedCells[mainKey] = {
      rowspan: maxRow - minRow + 1,
      colspan: maxCol - minCol + 1,
      value: mergedValue.join(' ')
    };

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

  // Импорт из Excel
  const importFromExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      if (jsonData.length > 0) {
        const newRows = Math.min(jsonData.length, 20);
        const newCols = Math.min(Math.max(...jsonData.map(row => row.length)), 10);
        
        const newData = Array(newRows).fill().map((_, i) => 
          Array(newCols).fill('').map((_, j) => jsonData[i]?.[j] || '')
        );
        
        setTableRows(newRows);
        setTableCols(newCols);
        setTableData(newData);
        alert(`✅ Импортировано ${newRows} строк и ${newCols} столбцов`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Стиль ячейки с поддержкой вертикального текста
  const getCellStyle = (isSelected, isEmpty, isRotated, cellValue) => {
    const baseStyle = {
      padding: isRotated ? '2px' : '8px',
      border: '1px solid #000',
      fontFamily: 'Times New Roman, serif',
      fontSize: '14px',
      backgroundColor: isSelected ? '#e6f2ff' : isEmpty ? '#fff3f3' : 'transparent',
      cursor: 'pointer',
      textAlign: 'center',
      verticalAlign: 'middle',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      maxWidth: '200px',
      minWidth: '60px'
    };

    if (isRotated) {
      return {
        ...baseStyle,
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        whiteSpace: 'normal',
        minWidth: '40px',
        maxWidth: '60px',
        height: 'auto',
        minHeight: '80px'
      };
    }

    const textLength = (cellValue || '').length;
    if (textLength > 50) {
      baseStyle.minWidth = '150px';
      baseStyle.maxWidth = '300px';
    } else if (textLength > 20) {
      baseStyle.minWidth = '100px';
      baseStyle.maxWidth = '200px';
    } else {
      baseStyle.minWidth = '60px';
      baseStyle.width = 'auto';
    }

    return baseStyle;
  };

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

  const handleSave = () => {
    if (!isTableValid()) {
      alert('❌ Заполните все ячейки таблицы перед сохранением');
      return;
    }

    const cleanData = tableData.map(row => 
      row.map(cell => cell === '__MERGED__' ? '' : cell)
    );
    
    const tableDataToSave = {
      caption: tableCaption.trim() || `Таблица ${editingBlock?.number || tableCounter}`,
      headers: Array(tableCols).fill(''),
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
    onClose();
  };

  if (!isOpen && !editingBlock) return null;

  const fileInputRef = React.createRef();

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>
          {editingBlock ? '✏️ Редактирование таблицы' : '📊 Создание таблицы'}
        </h3>

        <input
          type="text"
          value={tableCaption}
          onChange={(e) => setTableCaption(e.target.value)}
          style={styles.captionInput}
          placeholder={`Название таблицы (например: Таблица ${editingBlock?.number || tableCounter})`}
        />

        <div style={styles.controlsRow}>
          <div style={styles.controlGroup}>
            <span style={styles.label}>Строки:</span>
            <input
              type="number"
              min="1"
              max="20"
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
              max="10"
              value={tableCols}
              onChange={(e) => {
                const newCols = parseInt(e.target.value) || 1;
                setTableCols(newCols);
              }}
              style={styles.numberInput}
            />
          </div>

          <div style={styles.controlGroup}>
            <button onClick={() => fileInputRef.current.click()} style={styles.importButton}>
              📂 Импорт Excel
            </button>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx, .xls, .csv"
          style={{ display: 'none' }}
          onChange={importFromExcel}
        />

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
                <button onClick={rotateCell} style={styles.toolButtonSmall} title="Повернуть текст вертикально">↻</button>
              </div>
              
              <div style={styles.toolGroup}>
                <button onClick={insertRowAbove} style={styles.toolButton} title="Вставить строку сверху">↑ Строка</button>
                <button onClick={insertRowBelow} style={styles.toolButton} title="Вставить строку снизу">↓ Строка</button>
                <button onClick={deleteRows} style={styles.toolButton} title="Удалить строки">🗑 Строки</button>
              </div>
              
              <div style={styles.toolGroup}>
                <button onClick={insertColumnLeft} style={styles.toolButton} title="Вставить колонку слева">← Колонка</button>
                <button onClick={insertColumnRight} style={styles.toolButton} title="Вставить колонку справа">→ Колонка</button>
                <button onClick={deleteColumns} style={styles.toolButton} title="Удалить колонки">🗑 Колонки</button>
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
                          style={getCellStyle(isSelected, isEmpty, isRotated, cellValue)}
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
                          <textarea
                            value={cellValue}
                            onChange={(e) => updateTableCell(rowIndex, colIndex, e.target.value)}
                            style={{
                              width: '100%',
                              height: '100%',
                              minHeight: '40px',
                              padding: '4px',
                              border: '1px solid transparent',
                              textAlign: 'center',
                              fontFamily: 'Times New Roman, serif',
                              fontSize: '14px',
                              backgroundColor: 'transparent',
                              outline: 'none',
                              resize: 'vertical',
                              boxSizing: 'border-box'
                            }}
                            rows={isRotated ? 3 : 1}
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

        <div style={styles.buttonGroup}>
          <button onClick={handleSave} style={styles.primaryButton}>
            {editingBlock ? '💾 Сохранить изменения' : `+ Вставить таблицу ${tableCounter}`}
          </button>
          <button onClick={handleClose} style={styles.cancelButton}>
            ✕ Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

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
    border: '1px solid #000'
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    textAlign: 'center'
  },
  captionInput: {
    width: '100%',
    padding: '8px',
    border: '1px solid #000',
    fontSize: '14px',
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
    fontSize: '14px'
  },
  numberInput: {
    width: '60px',
    padding: '4px',
    border: '1px solid #000',
    fontSize: '14px',
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
    borderRadius: '3px'
  },
  toolButtonSmall: {
    padding: '5px 10px',
    backgroundColor: '#fff',
    border: '1px solid #000',
    cursor: 'pointer',
    fontSize: '12px',
    borderRadius: '3px',
    fontWeight: 'bold'
  },
  dataTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '15px',
    tableLayout: 'auto'
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
    borderRadius: '4px'
  },
  cancelButton: {
    padding: '8px 25px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    borderRadius: '4px'
  },
  infoText: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
    textAlign: 'center'
  },
  importButton: {
    padding: '5px 10px',
    backgroundColor: '#17a2b8',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    borderRadius: '3px'
  }
};

export default TableManager;