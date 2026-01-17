"use client";

import { useState, useEffect } from "react";

interface EnhancedInputProps {
  label: string;
  value: number | string;
  onChange: (value: number) => void;
  type?: "number" | "currency" | "percentage";
  step?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  validate?: (value: number) => { valid: boolean; message?: string };
}

export default function EnhancedInput({
  label,
  value,
  onChange,
  type = "number",
  step,
  min,
  max,
  placeholder,
  helpText,
  required = false,
  validate,
}: EnhancedInputProps) {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [validationState, setValidationState] = useState<{ valid: boolean; message?: string }>({ valid: true });

  const numValue = typeof value === "number" ? value : parseFloat(value) || 0;

  useEffect(() => {
    if (touched && validate) {
      setValidationState(validate(numValue));
    } else if (touched) {
      // Basic validation
      const isValid = 
        (min === undefined || numValue >= min) &&
        (max === undefined || numValue <= max) &&
        (!required || numValue !== 0);
      setValidationState({ valid: isValid });
    }
  }, [numValue, touched, validate, min, max, required]);

  const getPrefix = () => {
    if (type === "currency") return "$";
    return "";
  };

  const getSuffix = () => {
    if (type === "percentage") return "%";
    return "";
  };

  const getIcon = () => {
    if (!touched) return null;
    
    if (validationState.valid) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      );
    }
  };

  const getBorderColor = () => {
    if (!touched) return focused ? "border-blue-500" : "border-white/10";
    if (validationState.valid) return focused ? "border-green-500" : "border-green-500/50";
    return focused ? "border-red-500" : "border-red-500/50";
  };

  const getShadow = () => {
    if (!focused) return "";
    if (!touched) return "shadow-[0_0_0_3px_rgba(59,130,246,0.15)]";
    if (validationState.valid) return "shadow-[0_0_0_3px_rgba(34,197,94,0.15)]";
    return "shadow-[0_0_0_3px_rgba(239,68,68,0.15)]";
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label */}
      <label className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-400">*</span>}
        {helpText && (
          <div className="group relative">
            <svg className="w-4 h-4 text-neutral-500 hover:text-neutral-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {/* Tooltip */}
            <div className="absolute left-0 top-6 z-10 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
              <div className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-neutral-300 shadow-xl max-w-xs whitespace-normal">
                {helpText}
              </div>
            </div>
          </div>
        )}
      </label>

      {/* Input Container */}
      <div className="relative">
        <div
          className={`flex items-center border ${getBorderColor()} ${getShadow()} bg-gradient-to-br from-white/[0.02] to-transparent rounded-lg transition-all duration-200 overflow-hidden`}
          style={{
            boxShadow: focused 
              ? "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)"
              : "0 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          {/* Prefix */}
          {getPrefix() && (
            <span className="pl-3 text-sm font-semibold text-neutral-500">
              {getPrefix()}
            </span>
          )}

          {/* Input */}
          <input
            type="number"
            step={step}
            min={min}
            max={max}
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value) || 0;
              onChange(newValue);
              if (!touched) setTouched(true);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="flex-1 px-3 py-3 bg-transparent text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none w-full"
            style={{
              appearance: "textfield",
            }}
          />

          {/* Suffix */}
          {getSuffix() && (
            <span className="pr-3 text-sm font-semibold text-neutral-500">
              {getSuffix()}
            </span>
          )}

          {/* Validation Icon */}
          {touched && (
            <div className="pr-3 flex-shrink-0 animate-in fade-in duration-200">
              {getIcon()}
            </div>
          )}
        </div>

        {/* Hide number input arrows */}
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

      {/* Validation Message */}
      {touched && !validationState.valid && validationState.message && (
        <p className="text-xs text-red-400 font-medium animate-in slide-in-from-top-1 duration-200">
          {validationState.message}
        </p>
      )}

      {/* Helper text for valid state */}
      {touched && validationState.valid && min !== undefined && max !== undefined && (
        <p className="text-xs text-neutral-500 font-medium">
          Valid range: {min.toLocaleString()} - {max.toLocaleString()}
        </p>
      )}
    </div>
  );
}

