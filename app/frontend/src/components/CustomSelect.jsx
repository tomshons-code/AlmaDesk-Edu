import { useState, useRef, useEffect } from 'react'
import Icon from './Icon'
import '../styles/components/CustomSelect.css'

export default function CustomSelect({ value, onChange, options, className = '', maxHeight = '10rem' }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedOption = options.find(opt => opt.value === value)

  const handleSelect = (optionValue) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`custom-select ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="custom-select-value">{selectedOption?.label || 'Wybierz...'}</span>
        <Icon name="arrow" size={14} className={`custom-select-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="custom-select-dropdown" style={{ maxHeight }}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
