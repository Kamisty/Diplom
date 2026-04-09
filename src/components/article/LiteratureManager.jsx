import React, { useState } from 'react';

const LiteratureManager = ({ isOpen, onClose, onSave, initialLiterature = [] }) => {
    const [items, setItems] = useState(initialLiterature);
    const [text, setText] = useState('');

    const addItem = () => {
        if (text.trim()) {
            setItems([...items, { id: Date.now(), text: text }]);
            setText('');
        }
    };

    const deleteItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const save = () => {
        onSave(items);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'white',
                borderRadius: '10px',
                width: '400px',
                padding: '20px'
            }}>
                <h3 style={{ margin: '0 0 15px 0' }}>Список литературы</h3>
                
                <div style={{ marginBottom: '15px' }}>
                    <input
                        type="text"
                        placeholder="Введите источник литературы"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            marginBottom: '10px'
                        }}
                    />
                    <button
                        onClick={addItem}
                        style={{
                            width: '100%',
                            padding: '8px',
                            background: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        + Добавить
                    </button>
                </div>

                <div style={{ maxHeight: '300px', overflow: 'auto', marginBottom: '15px' }}>
                    {items.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#999' }}>Нет источников</div>
                    ) : (
                        items.map((item, index) => (
                            <div key={item.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px',
                                marginBottom: '5px',
                                background: '#f5f5f5',
                                borderRadius: '5px'
                            }}>
                                <span style={{ fontSize: '13px' }}>
                                    {index + 1}. {item.text}
                                </span>
                                <button
                                    onClick={() => deleteItem(item.id)}
                                    style={{
                                        background: '#e74c3c',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        padding: '2px 8px'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#95a5a6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Отмена
                    </button>
                    <button
                        onClick={save}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#f39c12',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Сохранить ({items.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiteratureManager;