
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Icon from '../components/Icon'
import CustomSelect from '../components/CustomSelect'
import { getArticles, deleteArticle } from '../api/knowledge-base'
import '../styles/pages/KnowledgeBasePage.css'


const CATEGORY_LABELS = {
  HARDWARE: 'Sprzęt',
  SOFTWARE: 'Oprogramowanie',
  NETWORK: 'Sieć',
  ACCOUNT_ACCESS: 'Konta i dostępy',
  EMAIL: 'Email',
  PRINTING: 'Drukowanie',
  SECURITY: 'Bezpieczeństwo',
  MOBILE: 'Urządzenia mobilne',
  OFFICE_APPS: 'Aplikacje biurowe',
  UNIVERSITY_SYSTEMS: 'Systemy uczelniane',
  OTHER: 'Inne'
}

const STATUS_BADGES = {
  DRAFT: { label: 'Szkic', cls: 'draft' },
  PUBLISHED: { label: 'Opublikowany', cls: 'published' },
  ARCHIVED: { label: 'Zarchiwizowany', cls: 'archived' }
}

export default function KnowledgeBasePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const canEdit = user && ['AGENT', 'SUPER_ADMIN'].includes(user.role)

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (selectedCategory) params.category = selectedCategory
      if (selectedStatus) params.status = selectedStatus
      if (searchQuery) params.search = searchQuery
      const data = await getArticles(params)
      setArticles(data)
    } catch (error) {
      console.error('Failed to load articles:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, selectedStatus, searchQuery])

  useEffect(() => { loadArticles() }, [loadArticles])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Czy na pewno chcesz usunąć ten artykuł?')) return
    try {
      await deleteArticle(id)
      setArticles(prev => prev.filter(a => a.id !== id))
    } catch (error) {
      console.error('Failed to delete article:', error)
    }
  }


  const openArticle = (slug) => {
    window.open(`/knowledge-base/${slug}`, '_blank', 'noopener')
  }

  if (loading) {
    return (
      <div className="kb-page">
        <div className="kb-loading">
          <div className="kb-loading-spinner" />
          <p>Ładowanie bazy wiedzy...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="kb-page">
      {}
      <header className="kb-hero">
        <div className="kb-hero-content">
          <h1 className="kb-hero-title">
            <Icon name="book-open" size={36} />
            Baza wiedzy
          </h1>
          <p className="kb-hero-subtitle">Centrum pomocy i dokumentacji technicznej AlmaDesk</p>
        </div>
        {canEdit && (
          <button className="kb-create-btn" onClick={() => navigate('/knowledge-base/new')}>
            <Icon name="plus" size={20} />
            Nowy artykuł
          </button>
        )}
      </header>

      {}
      <div className="kb-filters">
        <div className="kb-search">
          <Icon name="search" size={18} className="kb-search-icon" />
          <input
            type="text"
            placeholder="Szukaj w bazie wiedzy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="kb-search-input"
          />
          {searchQuery && (
            <button className="kb-search-clear" onClick={() => setSearchQuery('')}>
              <Icon name="x" size={16} />
            </button>
          )}
        </div>

        <div className="kb-filter-group">
          <CustomSelect
            value={selectedCategory}
            onChange={setSelectedCategory}
            className="kb-filter-custom-select"
            options={[
              { value: '', label: 'Wszystkie kategorie' },
              ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ value: key, label }))
            ]}
          />

          {canEdit && (
            <CustomSelect
              value={selectedStatus}
              onChange={setSelectedStatus}
              className="kb-filter-custom-select"
              options={[
                { value: '', label: 'Wszystkie statusy' },
                { value: 'PUBLISHED', label: 'Opublikowane' },
                { value: 'DRAFT', label: 'Szkice' },
                { value: 'ARCHIVED', label: 'Zarchiwizowane' }
              ]}
            />
          )}
        </div>
      </div>

      {}
      <div className="kb-results-info">
        <span>{articles.length} {articles.length === 1 ? 'artykuł' : articles.length < 5 ? 'artykuły' : 'artykułów'}</span>
        {searchQuery && <span className="kb-results-query">dla „{searchQuery}"</span>}
      </div>

      {articles.length === 0 ? (
        <div className="kb-empty">
          <Icon name="search" size={56} />
          <h3>Brak artykułów</h3>
          <p>Nie znaleziono artykułów pasujących do kryteriów wyszukiwania</p>
        </div>
      ) : (
        <div className="kb-grid">
          {articles.map(article => {
            const badge = STATUS_BADGES[article.status] || STATUS_BADGES.DRAFT
            const helpful =
              article.helpfulCount + article.notHelpfulCount > 0
                ? Math.round((article.helpfulCount / (article.helpfulCount + article.notHelpfulCount)) * 100)
                : null

            return (
              <div
                key={article.id}
                className="kb-card"
                onClick={() => openArticle(article.slug)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openArticle(article.slug)}
              >
                <div className="kb-card-header">
                  <span className="kb-card-category">
                    {CATEGORY_LABELS[article.category] || article.category}
                  </span>
                  {canEdit && (
                    <span className={`kb-status-badge kb-status-${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                </div>

                <h3 className="kb-card-title">{article.title}</h3>

                {article.excerpt && (
                  <p className="kb-card-excerpt">{article.excerpt}</p>
                )}

                <div className="kb-card-meta">
                  <span className="kb-meta-item">
                    <Icon name="eye" size={14} />
                    {article.viewCount}
                  </span>
                  {helpful !== null && (
                    <span className="kb-meta-item">
                      <Icon name="thumbs-up" size={14} />
                      {helpful}%
                    </span>
                  )}
                  <span className="kb-meta-item">
                    <Icon name="user" size={14} />
                    {article.author?.name || 'Nieznany'}
                  </span>
                </div>

                {article.tags && article.tags.length > 0 && (
                  <div className="kb-card-tags">
                    {article.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="kb-tag">{tag}</span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="kb-tag kb-tag-more">+{article.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {canEdit && (
                  <div className="kb-card-actions">
                    <button
                      className="kb-action-btn kb-edit-btn"
                      onClick={(e) => { e.stopPropagation(); navigate(`/knowledge-base/${article.slug}/edit`) }}
                    >
                      <Icon name="edit" size={14} />
                      Edytuj
                    </button>
                    <button
                      className="kb-action-btn kb-delete-btn"
                      onClick={(e) => handleDelete(e, article.id)}
                    >
                      <Icon name="trash" size={14} />
                      Usuń
                    </button>
                  </div>
                )}

                <div className="kb-card-open-hint">
                  <Icon name="external-link" size={14} />
                  <span>Otwórz w nowej karcie</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
