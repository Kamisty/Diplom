// src/components/common/Button.js
import React from 'react';
import './Button.css';

// Это функция, которая возвращает кусочек интерфейса
const Button = ({ text, onClick, type = 'button' }) => {
  return (
    <button 
      className="my-button" 
      type={type}
      onClick={onClick}
    >
      {text}
    </button>
  );
};

// Не забудьте экспортировать компонент!
export default Button;