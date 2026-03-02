
import React, { useState } from 'react';
import { ICONS } from '../../constants';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, id, showPasswordToggle = true, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = props.type === 'password';
  const type = isPasswordField && showPasswordToggle ? (showPassword ? 'text' : 'password') : props.type;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="mt-1 relative">
        <input
          id={id}
          {...props}
          type={type}
          className={`block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isPasswordField && showPasswordToggle ? 'pr-10' : ''} ${props.className || ''}`}
        />
        {isPasswordField && showPasswordToggle && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <ICONS.eyeSlash className="h-5 w-5" />
            ) : (
              <ICONS.eye className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

