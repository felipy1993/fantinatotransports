import React, { useState, useEffect, useRef } from 'react';

interface LocationAutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  name: string;
  value: string;
  onChange: (e: any) => void;
  required?: boolean;
}

export const LocationAutocompleteInput: React.FC<LocationAutocompleteInputProps> = ({
  label,
  id,
  name,
  value,
  onChange,
  required,
  ...props
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    
    setIsLoading(true);
    try {
      // Usando Nominatim (OpenStreetMap) para busca de locais gratuita
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=br&addressdetails=1`, {
          headers: {
              'Accept': 'application/json',
              'User-Agent': 'FantinatoTransportsApp/1.0'
          }
      });
      if (response.ok) {
        const data = await response.json();
        
        let newSuggestions = data.map((item: any) => {
          const addr = item.address;
          if (!addr) return item.display_name;
          
          const parts = [];
          if (addr.road) parts.push(addr.road);
          
          let city = addr.city || addr.town || addr.village || addr.municipality || '';
          if (city) parts.push(city);
          
          if (addr.state) parts.push(addr.state);
          
          if (parts.length > 0) {
              return parts.join(', ');
          }
          return item.display_name;
        });

        // Remove duplicatas
        newSuggestions = newSuggestions.filter((item: string, pos: number) => newSuggestions.indexOf(item) === pos);
        
        setSuggestions(newSuggestions);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error('Erro ao buscar locais:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Dispara a alteração original para manter o form em sync
    onChange(e);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (val.length < 3) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
    }

    // Debounce de 500ms
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 500);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    const syntheticEvent = {
        target: { name, value: suggestion.toUpperCase() }
    };
    onChange(syntheticEvent);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name={name}
          value={value}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          required={required}
          autoComplete="off"
          className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          {...props}
        />
        {isLoading && (
           <div className="absolute right-3 top-3">
               <span className="flex h-3 w-3 relative">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
               </span>
           </div>
        )}
      </div>
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="cursor-pointer select-none py-2 px-3 text-sm text-slate-200 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700 last:border-0"
            >
              <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  <span className="truncate">{suggestion.toUpperCase()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
