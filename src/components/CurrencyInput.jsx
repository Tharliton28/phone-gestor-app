import React, { useEffect, useRef, useState } from 'react';
import { formatBRL, parseMoney, roundMoney } from '../utils/formatters';

/**
 * Input monetário pt-BR (centavos digitados da direita para esquerda).
 * Valor controlado em número decimal (ex.: 3500 = R$ 3.500,00).
 */
export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00',
  disabled = false,
  style = {},
  autoFocus = false,
  id,
  name,
}) {
  const inputRef = useRef(null);
  const [display, setDisplay] = useState('');
  const focusedRef = useRef(false);

  const syncDisplayFromValue = (num) => {
    if (num == null || num === '' || Number(num) === 0) {
      setDisplay('');
      return;
    }
    setDisplay(formatBRL(num));
  };

  useEffect(() => {
    if (!focusedRef.current) {
      syncDisplayFromValue(value);
    }
  }, [value]);

  const handleFocus = () => {
    focusedRef.current = true;
    if (value && Number(value) !== 0) {
      setDisplay(formatBRL(value));
    }
  };

  const handleBlur = () => {
    focusedRef.current = false;
    syncDisplayFromValue(value);
  };

  const handleChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '');
    const num = digits ? roundMoney(Number(digits) / 100) : 0;
    setDisplay(digits ? formatBRL(num) : '');
    onChange?.(num);
  };

  return (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      autoFocus={autoFocus}
      disabled={disabled}
      placeholder={placeholder}
      value={display}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      style={style}
    />
  );
}

/** Converte valor legado string/number para número ao montar estado */
export function normalizeMoneyValue(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return roundMoney(value);
  return roundMoney(parseMoney(value));
}
