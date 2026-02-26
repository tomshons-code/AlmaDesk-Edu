

import { useState, useEffect, useRef, useReducer } from 'react'
import templatesAPI from '../api/templates'
import Icon from './Icon'
import '../styles/components/TemplateSuggestions.css'

function fetchReducer(state, action) {
  switch (action.type) {
    case 'FETCHING': return { loading: true, suggestions: [] }
    case 'SUCCESS':  return { loading: false, suggestions: action.data }
    case 'ERROR':    return { loading: false, suggestions: [] }
    default:         return state
  }
}

export default function TemplateSuggestions({ category, keywords, onInsert }) {
  const [{ loading, suggestions }, dispatch] = useReducer(fetchReducer, { loading: false, suggestions: [] })
  const [collapsed, setCollapsed] = useState(false)
  const [previewId, setPreviewId] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!category && !keywords) return

    abortRef.current = false

    const run = async () => {
      try {
        const data = await templatesAPI.suggest({ category, keywords, limit: 4 })
        if (!abortRef.current) dispatch({ type: 'SUCCESS', data: data || [] })
      } catch {
        if (!abortRef.current) dispatch({ type: 'ERROR' })
      }
    }

    dispatch({ type: 'FETCHING' })
    run()

    return () => { abortRef.current = true }
  }, [category, keywords])

  if (!loading && suggestions.length === 0) return null

  return (
    <div className="ts-wrapper">
      <button
        type="button"
        className="ts-header"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
      >
        <span className="ts-header-left">
          <Icon name="zap" size={15} />
          <span>Sugerowane szablony</span>
          {!loading && <span className="ts-count">{suggestions.length}</span>}
        </span>
        <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={15} />
      </button>

      {!collapsed && (
        <div className="ts-body">
          {loading && (
            <div className="ts-loading">
              <Icon name="loader" size={14} />
              <span>Szukam pasujących szablonów…</span>
            </div>
          )}

          {!loading && suggestions.map(t => (
            <div
              key={t.id}
              className={`ts-item ${previewId === t.id ? 'ts-item-preview' : ''}`}
            >
              <div className="ts-item-header">
                <span className="ts-item-title">{t.title}</span>
                {t.category && <span className="ts-item-cat">{t.category}</span>}
                <div className="ts-item-actions">
                  <button
                    type="button"
                    className="ts-btn ts-btn-preview"
                    onClick={() => setPreviewId(previewId === t.id ? null : t.id)}
                    title="Podgląd"
                  >
                    <Icon name="eye" size={13} />
                  </button>
                  <button
                    type="button"
                    className="ts-btn ts-btn-insert"
                    onClick={() => onInsert(t.content)}
                    title="Wstaw szablon"
                  >
                    <Icon name="plus" size={13} />
                    Wstaw
                  </button>
                </div>
              </div>

              {previewId === t.id && (
                <pre className="ts-item-content">{t.content}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
