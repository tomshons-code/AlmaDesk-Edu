import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import Icon from './Icon'
import '../styles/components/ThemeSelector.css'

export default function ThemeSelector() {
  const { currentTheme, availableThemes, applyTheme, applyCustomColors, resetToDefault } = useTheme()
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [customColors, setCustomColors] = useState({
    primaryColor: '#667eea',
    primaryDark: '#764ba2',
    accentColor: '#48bb78',
    gradientStart: '#667eea',
    gradientEnd: '#764ba2'
  })

  const handleCustomColorChange = (key, value) => {
    setCustomColors(prev => ({ ...prev, [key]: value }))
  }

  const applyCustomTheme = () => {
    applyCustomColors(customColors)
    setShowCustomizer(false)
  }

  return (
    <div className="theme-selector">
      <h3 className="theme-selector-title"><Icon name="settings" size={20} /> Motyw kolorystyczny</h3>

      {}
      <div className="theme-grid">
        {availableThemes.map(theme => (
          <div
            key={theme.id}
            className={`theme-card ${currentTheme === theme.id ? 'active' : ''}`}
            onClick={() => applyTheme(theme.id)}
          >
            <div className="theme-preview">
              <div
                className="theme-preview-color"
                style={{ background: `linear-gradient(135deg, ${theme.preview.primary}, ${theme.preview.secondary})` }}
              />
            </div>
            <div className="theme-info">
              <div className="theme-name">{theme.name}</div>
              <div className="theme-description">{theme.description}</div>
            </div>
            {currentTheme === theme.id && (
              <div className="theme-active-badge"><Icon name="check" size={16} /></div>
            )}
          </div>
        ))}
      </div>

      {}
      <div className="theme-custom-section">
        <button
          className="theme-custom-toggle"
          onClick={() => setShowCustomizer(!showCustomizer)}
        >
          {showCustomizer ? '▼' : '▶'} Zaawansowane - własne kolory
        </button>

        {showCustomizer && (
          <div className="theme-customizer">
            <div className="theme-custom-field">
              <label>Kolor główny:</label>
              <input
                type="color"
                value={customColors.primaryColor}
                onChange={(e) => handleCustomColorChange('primaryColor', e.target.value)}
              />
              <span>{customColors.primaryColor}</span>
            </div>

            <div className="theme-custom-field">
              <label>Kolor główny (ciemny):</label>
              <input
                type="color"
                value={customColors.primaryDark}
                onChange={(e) => handleCustomColorChange('primaryDark', e.target.value)}
              />
              <span>{customColors.primaryDark}</span>
            </div>

            <div className="theme-custom-field">
              <label>Kolor akcentu:</label>
              <input
                type="color"
                value={customColors.accentColor}
                onChange={(e) => handleCustomColorChange('accentColor', e.target.value)}
              />
              <span>{customColors.accentColor}</span>
            </div>

            <div className="theme-custom-field">
              <label>Gradient - początek:</label>
              <input
                type="color"
                value={customColors.gradientStart}
                onChange={(e) => handleCustomColorChange('gradientStart', e.target.value)}
              />
              <span>{customColors.gradientStart}</span>
            </div>

            <div className="theme-custom-field">
              <label>Gradient - koniec:</label>
              <input
                type="color"
                value={customColors.gradientEnd}
                onChange={(e) => handleCustomColorChange('gradientEnd', e.target.value)}
              />
              <span>{customColors.gradientEnd}</span>
            </div>

            <div className="theme-custom-actions">
              <button className="theme-apply-btn" onClick={applyCustomTheme}>
                Zastosuj własne kolory
              </button>
              <button className="theme-reset-btn" onClick={resetToDefault}>
                Resetuj do domyślnego
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
