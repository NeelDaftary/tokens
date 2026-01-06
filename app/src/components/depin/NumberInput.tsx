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
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-300">
      {label}
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
      />
    </label>
  );
}

