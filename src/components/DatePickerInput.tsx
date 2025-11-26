import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  minDate?: string
  maxDate?: string
  placeholder?: string
}

const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
]

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const DatePickerInput = ({
  label,
  value,
  onChange,
  required = false,
  minDate,
  maxDate,
  placeholder = 'dd/mm/yyyy'
}: DatePickerInputProps) => {
  const [showCalendar, setShowCalendar] = useState(false)
  const [displayMonth, setDisplayMonth] = useState(new Date())
  const calendarRef = useRef<HTMLDivElement>(null)

  // Parse value to Date
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    }
    return null
  }

  const selectedDate = parseDate(value)

  // Format date for display
  const formatDisplay = (date: Date | null): string => {
    if (!date) return ''
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Get days in month
  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days: Date[] = []
    
    // Add empty cells for days before month starts
    const startDayOfWeek = firstDay.getDay()
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(new Date(0)) // Placeholder
    }
    
    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  // Check if date is selected
  const isSelected = (date: Date): boolean => {
    if (!selectedDate || date.getTime() === 0) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  // Check if date is today
  const isToday = (date: Date): boolean => {
    if (date.getTime() === 0) return false
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Check if date is disabled
  const isDisabled = (date: Date): boolean => {
    if (date.getTime() === 0) return true
    
    if (minDate) {
      const min = parseDate(minDate)
      if (min && date < min) return true
    }
    
    if (maxDate) {
      const max = parseDate(maxDate)
      if (max && date > max) return true
    }
    
    return false
  }

  // Handle date selection
  const handleDateClick = (date: Date) => {
    if (isDisabled(date)) return
    
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    
    onChange(`${year}-${month}-${day}`)
    setShowCalendar(false)
  }

  // Navigate months
  const previousMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1))
  }

  // Today button
  const goToToday = () => {
    const today = new Date()
    setDisplayMonth(today)
    onChange(`${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`)
    setShowCalendar(false)
  }

  // Clear button
  const handleClear = () => {
    onChange('')
    setShowCalendar(false)
  }

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false)
      }
    }

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendar])

  const days = getDaysInMonth(displayMonth)

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={formatDisplay(selectedDate)}
          placeholder={placeholder}
          readOnly
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer transition-all"
        />
        <Calendar 
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
        />
      </div>

      {showCalendar && (
        <div 
          ref={calendarRef}
          className="absolute z-50 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-64"
        >
          {/* Header with month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={previousMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
            </button>
            
            <div className="text-center">
              <div className="font-semibold text-xs text-gray-900">
                {MONTHS[displayMonth.getMonth()]} {displayMonth.getFullYear()}
              </div>
            </div>
            
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-medium text-gray-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((date, index) => {
              const isEmpty = date.getTime() === 0
              const selected = isSelected(date)
              const today = isToday(date)
              const disabled = isDisabled(date)

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => !isEmpty && handleDateClick(date)}
                  disabled={isEmpty || disabled}
                  className={`
                    aspect-square flex items-center justify-center rounded text-[11px]
                    transition-all duration-150
                    ${isEmpty ? 'invisible' : ''}
                    ${selected ? 'bg-red-600 text-white font-semibold shadow-sm' : ''}
                    ${!selected && today ? 'bg-red-50 text-red-600 font-semibold border border-red-300' : ''}
                    ${!selected && !today && !disabled ? 'hover:bg-gray-100 text-gray-700' : ''}
                    ${disabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {!isEmpty && date.getDate()}
                </button>
              )
            })}
          </div>

          {/* Footer buttons */}
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 text-[11px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              Xóa
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="px-2 py-1 text-[11px] bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePickerInput
