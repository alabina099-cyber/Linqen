"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type DropdownOption = {
  value: string;
  label: string;
  /** Optional Tailwind class for the colored dot, e.g. "bg-blue-500" */
  color?: string;
  /** Optional Lucide-style icon component (left side) */
  icon?: React.ComponentType<{ className?: string }>;
};

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** Optional left-side icon shown on the trigger button */
  leftIcon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

/**
 * Project-wide dropdown component.
 * Trigger: rounded-xl pill with optional colored dot/icon and chevron.
 * Menu:    floating panel with same dot style on each option.
 */
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  ariaLabel,
  className = "",
  leftIcon: LeftIcon,
  disabled = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const TriggerIcon = selected?.icon ?? LeftIcon;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="flex items-center gap-3 w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selected?.color && (
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selected.color}`} />
        )}
        {TriggerIcon && (
          <TriggerIcon className="w-4 h-4 text-gray-500 shrink-0" />
        )}
        <span className="truncate flex-1 text-left">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 max-h-64 overflow-auto"
        >
          {options.map((option) => {
            const ItemIcon = option.icon;
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                  isSelected
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {option.color && (
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${option.color}`} />
                )}
                {ItemIcon && (
                  <ItemIcon className="w-4 h-4 text-gray-500 shrink-0" />
                )}
                <span className="truncate flex-1">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
