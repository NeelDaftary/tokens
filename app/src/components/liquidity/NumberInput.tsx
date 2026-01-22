"use client";

import { useState, useEffect } from "react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  min?: number;
  step?: number;
};

export default function NumberInput({
  value,
  onChange,
  placeholder,
  label,
  className = "",
  min = 0,
  step,
}: Props) {
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Format number with commas
  const formatNumber = (num: number): string => {
    if (!num && num !== 0) return "";
    return num.toLocaleString("en-US", { maximumFractionDigits: 4 });
  };

  // Remove commas and parse
  const parseNumber = (str: string): number => {
    const cleaned = str.replace(/,/g, "");
    return parseFloat(cleaned) || 0;
  };

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatNumber(value));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number without commas when focused
    setDisplayValue(value.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Parse and update
    const parsed = parseNumber(displayValue);
    if (parsed !== value) {
      onChange(Math.max(min, parsed));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Allow typing numbers, decimals, and commas
    if (newValue === "" || /^[\d,\.]*$/.test(newValue)) {
      setDisplayValue(newValue);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-neutral-300">{label}</span>}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`input-glass ${className}`}
      />
    </div>
  );
}

