import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  id: string;
  suggestions: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectSuggestion?: (value: string) => void;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ 
  label, 
  id, 
  suggestions = [], 
  value = '', 
  onChange, 
  onSelectSuggestion,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Normalize value for filtering
  const valStr = String(value || '');
  
  // Filter suggestions based on typed value (case-insensitive)
  const filteredSuggestions = suggestions
    .filter(s => s && s.toUpperCase().includes(valStr.toUpperCase()) && s.toUpperCase() !== valStr.toUpperCase())
    .slice(0, 10); // Limit to top 10

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0) {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Tab' && highlightedIndex >= 0) {
      selectSuggestion(filteredSuggestions[highlightedIndex]);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    // Create a synthetic event for the onChange handler
    const event = {
      target: { value: suggestion, name: props.name || id, id }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(event);
    if (onSelectSuggestion) onSelectSuggestion(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
        {label}
      </label>
      <div className="relative group mt-1">
        <input
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          {...props}
          className="block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 sm:text-sm transition-all duration-200"
        />
        
        {/* Shadow Overlay */}
        <div className="absolute inset-0 rounded-md pointer-events-none group-focus-within:ring-2 ring-blue-500/10 transition-all duration-300"></div>

        {isOpen && filteredSuggestions.length > 0 && (
          <div className="absolute z-[9999] w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-60 overflow-y-auto ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-150">
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`px-4 py-2.5 cursor-pointer text-sm transition-colors flex items-center justify-between group/item ${
                  index === highlightedIndex ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectSuggestion(suggestion)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${index === highlightedIndex ? 'bg-white' : 'bg-slate-600 group-hover/item:bg-blue-400'}`}></div>
                  <span className="font-bold">{suggestion}</span>
                </div>
                {index === highlightedIndex && (
                  <span className="text-[10px] opacity-70 font-black uppercase tracking-widest bg-blue-500/20 px-1.5 py-0.5 rounded">Enter</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
