"use client";

import { useState } from "react";

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
  min?: number;
  max?: number;
  placeholder?: string;
}

export default function NumberInput({
  label,
  value,
  onChange,
  step,
  min,
  max,
  placeholder,
}: NumberInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-white tracking-tight">{label}</span>
      <div
        className={`relative rounded-lg border transition-all duration-200 ${
          focused 
            ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]" 
            : "border-white/10"
        } bg-gradient-to-br from-white/[0.02] to-transparent overflow-hidden`}
        style={{
          boxShadow: focused
            ? "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)"
            : "0 1px 2px rgba(0,0,0,0.3)",
        }}
      >
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full px-3 py-3 bg-transparent text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none"
          style={{
            appearance: "textfield",
          }}
        />
        
        <style jsx>{`
          input[type="number"]::-webkit-inner-spin-button,
          input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}</style>
      </div>
    </label>
  );
}
