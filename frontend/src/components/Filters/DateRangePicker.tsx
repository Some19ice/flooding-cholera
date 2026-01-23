import { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { format, subDays } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (startDate: Date | null, endDate: Date | null) => void;
  className?: string;
}

interface PresetButton {
  label: string;
  days: number;
}

const presets: PresetButton[] = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
];

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    onChange(start, end);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null, null);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!startDate && !endDate) {
      return 'Select date range';
    }
    if (startDate && endDate) {
      return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    if (startDate) {
      return `From ${format(startDate, 'MMM d, yyyy')}`;
    }
    return 'Select date range';
  };

  // Get active preset
  const getActivePreset = () => {
    if (!startDate || !endDate) return null;
    const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return presets.find(p => p.days === daysDiff)?.days || null;
  };

  const activePreset = getActivePreset();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors w-full"
        aria-label="Select date range"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-gray-700 truncate flex-1 text-left">{getDisplayText()}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4"
          role="dialog"
          aria-label="Date range picker"
        >
          {/* Preset buttons */}
          <div className="flex gap-2 mb-4">
            {presets.map((preset) => (
              <button
                key={preset.days}
                onClick={() => handlePresetClick(preset.days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activePreset === preset.days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-pressed={activePreset === preset.days}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date pickers */}
          <div className="flex gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => onChange(date, endDate)}
                selectsStart
                startDate={startDate ?? undefined}
                endDate={endDate ?? undefined}
                maxDate={endDate || new Date()}
                dateFormat="MMM d, yyyy"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholderText="Start date"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => onChange(startDate, date)}
                selectsEnd
                startDate={startDate ?? undefined}
                endDate={endDate ?? undefined}
                minDate={startDate ?? undefined}
                maxDate={new Date()}
                dateFormat="MMM d, yyyy"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholderText="End date"
              />
            </div>
          </div>

          {/* Clear button */}
          <div className="flex justify-end mt-4 pt-3 border-t">
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ml-2"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
