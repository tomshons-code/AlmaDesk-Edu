
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { useAuth } from '../contexts/AuthContext'
import Icon from '../components/Icon'
import { getArticle, submitFeedback, getAttachments, downloadAttachment } from '../api/knowledge-base'
import '../styles/pages/KnowledgeBaseArticle.css'


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


const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('pl-PL', {
    year: 'numeric', month: 'long', day: 'numeric'
  })


function buildTOC(html) {
  if (!html) return []
  const div = document.createElement('div')
  div.innerHTML = html
  const headings = div.querySelectorAll('h1, h2, h3')
  return Array.from(headings).map((h, i) => ({
    id: `heading-${i}`,
    text: h.textContent,
    level: parseInt(h.tagName.charAt(1))
  }))
}


function injectHeadingIds(html) {
  if (!html) return ''
  let index = 0
  return html.replace(/<(h[1-3])([^>]*)>/gi, (match, tag, attrs) => {
    const id = `heading-${index++}`
    return `<${tag}${attrs} id="${id}">`
  })
}

export default function KnowledgeBaseArticle() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [activeTocId, setActiveTocId] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)

  const canEdit = user && ['AGENT', 'SUPER_ADMIN'].includes(user.role)


  const loadArticle = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getArticle(slug)
      setArticle(data)
    } catch (error) {
      console.error('Failed to load article:', error)
      navigate('/knowledge-base')
    } finally {
      setLoading(false)
    }
  }, [slug, navigate])

  useEffect(() => { loadArticle() }, [loadArticle])


  useEffect(() => {
    if (!article?.isFolder || !article?.id) return
    const loadAttachments = async () => {
      try {
        setAttachmentsLoading(true)
        const data = await getAttachments(article.id)
        setAttachments(data)
      } catch (error) {
        console.error('Failed to load attachments:', error)
      } finally {
        setAttachmentsLoading(false)
      }
    }
    loadAttachments()
  }, [article?.id, article?.isFolder])


  const handleDownload = async (att) => {
    try {
      const blob = await downloadAttachment(att.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = att.filename || 'file'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Nie udało się pobrać pliku')
    }
  }


  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return 'image'
    if (mimeType?.includes('pdf')) return 'file-text'
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('7z')) return 'archive'
    if (mimeType?.includes('word') || mimeType?.includes('document')) return 'file-text'
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return 'table'
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return 'monitor'
    return 'file'
  }


  const sanitizedContent = useMemo(() => {
    if (!article?.content) return ''
    const clean = DOMPurify.sanitize(article.content, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['target', 'rel', 'allowfullscreen', 'frameborder'],
      ALLOW_DATA_ATTR: false
    })
    return injectHeadingIds(clean)
  }, [article?.content])

  const toc = useMemo(() => buildTOC(article?.content || ''), [article?.content])


  useEffect(() => {
    if (toc.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTocId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    )
    toc.forEach(item => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [toc, sanitizedContent])


  const handleFeedback = async (helpful) => {
    try {
      const updated = await submitFeedback(article.id, helpful)
      setArticle(prev => ({
        ...prev,
        helpfulCount: updated.helpfulCount,
        notHelpfulCount: updated.notHelpfulCount
      }))
      setFeedbackSubmitted(true)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }


  const scrollToHeading = (id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveTocId(id)
    }
  }


  if (loading) {
    return (
      <div className="kba-page">
        <div className="kba-loading">
          <div className="kba-loading-spinner" />
          <p>Ładowanie artykułu...</p>
        </div>
      </div>
    )
  }
  if (!article) return null

  const helpfulPercentage =
    article.helpfulCount + article.notHelpfulCount > 0
      ? Math.round((article.helpfulCount / (article.helpfulCount + article.notHelpfulCount)) * 100)
      : null

  const readingTime = Math.max(1, Math.ceil((article.content || '').replace(/<[^>]*>/g, '').split(/\s+/).length / 200))

  return (
    <div className="kba-page">
      {}
      <nav className="kba-breadcrumb">
        <button className="kba-breadcrumb-link" onClick={() => navigate('/knowledge-base')}>
          <Icon name="book" size={16} />
          Baza wiedzy
        </button>
        <span className="kba-breadcrumb-sep">/</span>
        <span className="kba-breadcrumb-category">{CATEGORY_LABELS[article.category] || article.category}</span>
        <span className="kba-breadcrumb-sep">/</span>
        <span className="kba-breadcrumb-current">{article.title}</span>
      </nav>

      <div className="kba-layout">
        {}
        {!article.isFolder && toc.length > 2 && (
          <aside className="kba-toc">
            <div className="kba-toc-inner">
              <h4 className="kba-toc-title">
                <Icon name="list" size={16} />
                Spis treści
              </h4>
              <ul className="kba-toc-list">
                {toc.map(item => (
                  <li
                    key={item.id}
                    className={`kba-toc-item kba-toc-level-${item.level}${activeTocId === item.id ? ' active' : ''}`}
                  >
                    <button onClick={() => scrollToHeading(item.id)}>{item.text}</button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        {}
        <article className={`kba-article${(!article.isFolder && toc.length <= 2) || article.isFolder ? ' kba-article--full' : ''}`}>
          {}
          <header className="kba-header">
            <div className="kba-header-top">
              <span className="kba-category-badge">
                {CATEGORY_LABELS[article.category] || article.category}
              </span>
              {article.isFolder && (
                <span className="kba-folder-badge">
                  <Icon name="folder" size={14} />
                  Folder
                </span>
              )}
              {article.status === 'DRAFT' && canEdit && (
                <span className="kba-draft-badge">Szkic</span>
              )}
            </div>

            <h1 className="kba-title">{article.title}</h1>

            {article.excerpt && (
              <p className="kba-excerpt">{article.excerpt}</p>
            )}

            <div className="kba-meta">
              <div className="kba-meta-item">
                <div className="kba-author-avatar">
                  {(article.author?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="kba-meta-text">
                  <span className="kba-meta-label">Autor</span>
                  <span className="kba-meta-value">{article.author?.name || 'Nieznany'}</span>
                </div>
              </div>
              <div className="kba-meta-item">
                <Icon name="calendar" size={16} />
                <div className="kba-meta-text">
                  <span className="kba-meta-label">Opublikowano</span>
                  <span className="kba-meta-value">{formatDate(article.publishedAt || article.createdAt)}</span>
                </div>
              </div>
              {!article.isFolder && (
                <div className="kba-meta-item">
                  <Icon name="clock" size={16} />
                  <div className="kba-meta-text">
                    <span className="kba-meta-label">Czas czytania</span>
                    <span className="kba-meta-value">{readingTime} min</span>
                  </div>
                </div>
              )}
              {article.isFolder && (
                <div className="kba-meta-item">
                  <Icon name="paperclip" size={16} />
                  <div className="kba-meta-text">
                    <span className="kba-meta-label">Pliki</span>
                    <span className="kba-meta-value">{attachments.length}</span>
                  </div>
                </div>
              )}
              <div className="kba-meta-item">
                <Icon name="eye" size={16} />
                <div className="kba-meta-text">
                  <span className="kba-meta-label">Wyświetlenia</span>
                  <span className="kba-meta-value">{article.viewCount}</span>
                </div>
              </div>
            </div>

            {article.tags && article.tags.length > 0 && (
              <div className="kba-tags">
                {article.tags.map(tag => (
                  <span key={tag} className="kba-tag">
                    <Icon name="hash" size={12} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {canEdit && (
              <div className="kba-admin-bar">
                <button
                  className="kba-edit-btn"
                  onClick={() => navigate(`/knowledge-base/${article.slug}/edit`)}
                >
                  <Icon name="edit" size={16} />
                  {article.isFolder ? 'Edytuj folder' : 'Edytuj artykuł'}
                </button>
              </div>
            )}
          </header>

          {}
          {article.isFolder ? (
            <div className="kba-files-section">
              {attachmentsLoading ? (
                <div className="kba-files-loading">
                  <div className="kba-loading-spinner" />
                  <p>Ładowanie plików...</p>
                </div>
              ) : attachments.length === 0 ? (
                <div className="kba-files-empty">
                  <Icon name="folder-minus" size={48} />
                  <p>Ten folder nie zawiera jeszcze żadnych plików.</p>
                  {canEdit && (
                    <button
                      className="kba-edit-btn"
                      onClick={() => navigate(`/knowledge-base/${article.slug}/edit`)}
                    >
                      <Icon name="upload" size={16} />
                      Dodaj pliki
                    </button>
                  )}
                </div>
              ) : (
                <div className="kba-file-list">
                  <div className="kba-file-list-header">
                    <Icon name="paperclip" size={18} />
                    <h3>Pliki w folderze ({attachments.length})</h3>
                  </div>
                  {attachments.map(att => (
                    <div key={att.id} className="kba-file-item">
                      <div className="kba-file-icon">
                        <Icon name={getFileIcon(att.mimeType)} size={22} />
                      </div>
                      <div className="kba-file-info">
                        <span className="kba-file-name">{att.filename}</span>
                        <span className="kba-file-meta">
                          {formatFileSize(att.size)}
                          {att.uploadedAt && ` · ${formatDate(att.uploadedAt)}`}
                        </span>
                      </div>
                      <button
                        className="kba-file-download"
                        onClick={() => handleDownload(att)}
                        title="Pobierz plik"
                      >
                        <Icon name="download" size={18} />
                        Pobierz
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (

            <div
              className="kba-content ql-editor"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          )}

          {}
          <footer className="kba-footer">
            {}
            {!article.isFolder && (
              <div className="kba-feedback">
                <div className="kba-feedback-header">
                  <Icon name="message-circle" size={22} />
                  <h3>Czy ten artykuł był pomocny?</h3>
                </div>
                {helpfulPercentage !== null && (
                  <div className="kba-feedback-stats">
                    <div className="kba-feedback-bar">
                      <div className="kba-feedback-bar-fill" style={{ width: `${helpfulPercentage}%` }} />
                    </div>
                    <span>{helpfulPercentage}% użytkowników uznało za pomocne</span>
                  </div>
                )}
                {!feedbackSubmitted ? (
                  <div className="kba-feedback-buttons">
                    <button className="kba-feedback-btn kba-feedback-yes" onClick={() => handleFeedback(true)}>
                      <Icon name="thumbs-up" size={18} />
                      Tak, pomocne
                    </button>
                    <button className="kba-feedback-btn kba-feedback-no" onClick={() => handleFeedback(false)}>
                      <Icon name="thumbs-down" size={18} />
                      Nie, nieprzydatne
                    </button>
                  </div>
                ) : (
                  <div className="kba-feedback-thanks">
                    <Icon name="check-circle" size={22} />
                    <span>Dziękujemy za opinię!</span>
                  </div>
                )}
              </div>
            )}

            {}
            <div className="kba-updated">
              <Icon name="refresh-cw" size={14} />
              Ostatnia aktualizacja: {formatDate(article.updatedAt)}
            </div>
          </footer>
        </article>
      </div>
    </div>
  )
}
