// src/components/common/InputField/InputField.jsx
import React from 'react';
import './InputField.css';

const InputField = ({ 
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  options,
  label
}) => {
  // Если type='select', рендерим выпадающий список
  if (type === 'select') {
    return (
      <div className="input-container">
        {label && <label htmlFor={name} className="input-label">{label}</label>}
        <select
          id={name}
          name={name}
          className="input-field"
          value={value}
          onChange={onChange}
        >
          <option value="">{placeholder || 'Выберите роль'}</option>
          {options && options.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Стандартное текстовое поле
  return (
    <div className="input-container">
      {label && <label className="input-label">{label}</label>}
      <input
        type={type}
        name={name}
        className="input-field"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
};

export default InputField;