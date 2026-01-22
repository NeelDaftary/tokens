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
        <svg className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      );
    }
  };

  const getBorderColor = () => {
    if (!touched) return focused ? "border-cyan-500/60" : "border-white/[0.08]";
    if (validationState.valid) return focused ? "border-emerald-400/60" : "border-emerald-400/40";
    return focused ? "border-red-400/60" : "border-red-400/40";
  };

  const getGlowShadow = () => {
    if (!focused) return "";
    if (!touched) return "shadow-[0_0_0_3px_rgba(34,211,238,0.12),0_0_20px_rgba(34,211,238,0.15)]";
    if (validationState.valid) return "shadow-[0_0_0_3px_rgba(52,211,153,0.12),0_0_20px_rgba(52,211,153,0.15)]";
    return "shadow-[0_0_0_3px_rgba(248,113,113,0.12),0_0_20px_rgba(248,113,113,0.15)]";
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Label */}
      <label className="text-sm font-semibold text-slate-200 tracking-tight flex items-center gap-2">
        {label}
        {required && <span className="text-cyan-400">*</span>}
        {helpText && (
          <div className="group relative">
            <svg className="w-4 h-4 text-slate-500 hover:text-cyan-400 cursor-help transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {/* Tooltip */}
            <div className="absolute left-0 top-7 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-1">
              <div className="glass-card px-3 py-2 text-xs text-slate-300 shadow-xl max-w-xs whitespace-normal border-cyan-500/20">
                {helpText}
              </div>
            </div>
          </div>
        )}
      </label>

      {/* Input Container */}
      <div className="relative group">
        <div
          className={`
            flex items-center 
            border ${getBorderColor()} ${getGlowShadow()}
            bg-[rgba(15,20,28,0.7)] backdrop-blur-xl
            rounded-xl 
            transition-all duration-300 
            overflow-hidden
            ${focused ? 'scale-[1.01]' : ''}
          `}
        >
          {/* Prefix */}
          {getPrefix() && (
            <span className="pl-4 text-sm font-semibold text-slate-500">
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
            className="flex-1 px-4 py-3.5 bg-transparent text-slate-100 text-sm font-medium placeholder:text-slate-600 focus:outline-none w-full"
            style={{
              appearance: "textfield",
            }}
          />

          {/* Suffix */}
          {getSuffix() && (
            <span className="pr-4 text-sm font-semibold text-slate-500">
              {getSuffix()}
            </span>
          )}

          {/* Validation Icon with micro-animation */}
          {touched && (
            <div className="pr-4 flex-shrink-0 animate-scale-in">
              {getIcon()}
            </div>
          )}
        </div>

        {/* Subtle glow effect on hover */}
        <div 
          className={`
            absolute inset-0 -z-10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500
            ${focused ? 'opacity-100' : ''}
          `}
          style={{
            background: focused 
              ? (touched 
                  ? (validationState.valid 
                      ? 'radial-gradient(ellipse at center, rgba(52,211,153,0.08) 0%, transparent 70%)'
                      : 'radial-gradient(ellipse at center, rgba(248,113,113,0.08) 0%, transparent 70%)')
                  : 'radial-gradient(ellipse at center, rgba(34,211,238,0.08) 0%, transparent 70%)')
              : 'radial-gradient(ellipse at center, rgba(34,211,238,0.05) 0%, transparent 70%)',
            filter: 'blur(8px)',
          }}
        />

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

      {/* Validation Message with micro-animation */}
      {touched && !validationState.valid && validationState.message && (
        <p className="text-xs text-red-400 font-medium animate-fade-in-up flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
          {validationState.message}
        </p>
      )}

      {/* Helper text for valid state */}
      {touched && validationState.valid && min !== undefined && max !== undefined && (
        <p className="text-xs text-slate-500 font-medium">
          Valid range: {min.toLocaleString()} - {max.toLocaleString()}
        </p>
      )}
    </div>
  );
}
