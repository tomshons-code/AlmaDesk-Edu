import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from './Icon'
import '../styles/components/SearchBar.css'


export default function SearchBar({ onSearch, placeholder = 'Szukaj zgłoszeń...' }) {
  const [query, setQuery] = useState('')
  const debounceRef = useRef(null)

  const onSearchRef = useRef(onSearch)
  useEffect(() => { onSearchRef.current = onSearch }, [onSearch])

  const debouncedSearch = useCallback((value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim()
      if (trimmed.length >= 1) {
        onSearchRef.current(trimmed)
      } else if (trimmed.length === 0) {
        onSearchRef.current('')
      }
    }, 350)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = (e) => {
    const value = e.target.value
    setQuery(value)
    debouncedSearch(value)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (trimmed.length >= 1) {
      onSearch(trimmed)
    }
  }

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setQuery('')
    onSearch('')
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-bar-input-wrapper">
        <Icon name="search" className="search-bar-icon" />
        <input
          type="text"
          className="search-bar-input"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
        />
        {query && (
          <button
            type="button"
            className="search-bar-clear"
            onClick={handleClear}
            aria-label="Wyczyść"
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      <button type="submit" className="search-bar-button" disabled={query.trim().length < 1}>
        Szukaj
      </button>
    </form>
  )
}
