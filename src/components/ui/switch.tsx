"use client";

import * as React from "react";

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className = "", checked = false, onCheckedChange, disabled, id, ...props }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          if (!disabled && onCheckedChange) {
            onCheckedChange(!checked);
          }
        }}
        className={`w-11 h-6 shrink-0 inline-flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? "bg-primary" : "bg-gray-300 dark:bg-zinc-700"
        } ${className}`}
        {...props}
      >
        <span
          className={`bg-white pointer-events-none block w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";
