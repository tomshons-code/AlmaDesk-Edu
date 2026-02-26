
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactQuill from 'react-quill-new'
import DOMPurify from 'dompurify'
import 'react-quill-new/dist/quill.snow.css'
import { useAuth } from '../contexts/AuthContext'
import Icon from '../components/Icon'
import CustomSelect from '../components/CustomSelect'
import { getArticle, createArticle, updateArticle, uploadAttachments, getAttachments, deleteAttachment } from '../api/knowledge-base'
import '../styles/pages/KnowledgeBaseEditor.css'

export default function KnowledgeBaseEditor() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(!!slug)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [preview, setPreview] = useState(false)
  const [articleId, setArticleId] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'OTHER',
    status: 'DRAFT',
    isFolder: false,
    parentId: null,
    tags: [],
    metaDescription: '',
    keywords: []
  })
  const [tagInput, setTagInput] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const autoSaveTimer = useRef(null)

  const canEdit = user && ['AGENT', 'SUPER_ADMIN'].includes(user.role)


  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: { matchVisual: false }
  }), [])

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'check', 'indent',
    'align', 'blockquote', 'code-block', 'link', 'image', 'video'
  ]


  const loadArticle = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getArticle(slug)
      setArticleId(data.id)
      setFormData({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt || '',
        category: data.category,
        status: data.status,
        isFolder: data.isFolder || false,
        parentId: data.parentId || null,
        tags: data.tags || [],
        metaDescription: data.metaDescription || '',
        keywords: data.keywords || []
      })
      try {
        const atts = await getAttachments(data.id)
        setAttachments(atts)
      } catch {}
    } catch (error) {
      console.error('Failed to load article:', error)
      navigate('/knowledge-base')
    } finally {
      setLoading(false)
    }
  }, [slug, navigate])

  useEffect(() => {
    if (!canEdit) { navigate('/'); return }
    if (slug) loadArticle()
  }, [slug, canEdit, navigate, loadArticle])


  useEffect(() => {
    if (!articleId || formData.status === 'PUBLISHED') return
    autoSaveTimer.current = setInterval(async () => {
      try {
        await updateArticle(articleId, { ...formData })
        setLastSaved(new Date())
      } catch {}
    }, 30000)
    return () => clearInterval(autoSaveTimer.current)
  }, [articleId, formData])


  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddTag = () => {
    const t = tagInput.trim()
    if (t && !formData.tags.includes(t)) {
      handleChange('tags', [...formData.tags, t])
      setTagInput('')
    }
  }
  const handleRemoveTag = (tag) => handleChange('tags', formData.tags.filter(t => t !== tag))

  const handleAddKeyword = () => {
    const k = keywordInput.trim()
    if (k && !formData.keywords.includes(k)) {
      handleChange('keywords', [...formData.keywords, k])
      setKeywordInput('')
    }
  }
  const handleRemoveKeyword = (kw) => handleChange('keywords', formData.keywords.filter(k => k !== kw))


  const handleFiles = async (files) => {
    if (!articleId) return alert('Najpierw zapisz artykuł, a potem dodaj pliki')
    if (!files.length) return
    try {
      setUploading(true)
      const result = await uploadAttachments(articleId, Array.from(files))
      setAttachments(prev => [...result.attachments, ...prev])
    } catch (error) {
      console.error('Upload error:', error)
      alert('Nie udało się przesłać plików')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)

  const handleDeleteAttachment = async (id) => {
    if (!window.confirm('Usunąć ten plik?')) return
    try {
      await deleteAttachment(id)
      setAttachments(prev => prev.filter(a => a.id !== id))
    } catch {
      alert('Nie udało się usunąć pliku')
    }
  }

  const formatFileSize = (bytes) => {
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


  const handleSave = async (publish = false) => {
    if (!formData.title.trim()) return alert('Tytuł jest wymagany')
    if (!formData.isFolder && !formData.content.trim()) return alert('Treść jest wymagana')

    try {
      setSaving(true)
      const data = { ...formData, status: publish ? 'PUBLISHED' : formData.status }

      if (slug && articleId) {
        await updateArticle(articleId, data)
      } else {
        await createArticle(data)
      }
      setLastSaved(new Date())
      navigate('/knowledge-base')
    } catch (error) {
      console.error('Failed to save article:', error)
      alert('Nie udało się zapisać artykułu')
    } finally {
      setSaving(false)
    }
  }


  const wordCount = useMemo(() => {
    const text = (formData.content || '').replace(/<[^>]*>/g, '').trim()
    return text ? text.split(/\s+/).length : 0
  }, [formData.content])

  if (loading) {
    return (
      <div className="kbe-page">
        <div className="kbe-loading">
          <div className="kbe-loading-spinner" />
          <p>Ładowanie artykułu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="kbe-page">
      {}
      <div className="kbe-header">
        <div className="kbe-header-left">
          <button className="kbe-back-btn" onClick={() => navigate('/knowledge-base')}>
            <Icon name="arrow-left" size={18} />
            Baza wiedzy
          </button>
          <h1>{slug ? 'Edytuj artykuł' : 'Nowy artykuł'}</h1>
        </div>
        <div className="kbe-header-right">
          {lastSaved && (
            <span className="kbe-autosave-indicator">
              <Icon name="check" size={14} />
              Zapisano {lastSaved.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            className={`kbe-preview-toggle ${preview ? 'active' : ''}`}
            onClick={() => setPreview(!preview)}
          >
            <Icon name={preview ? 'edit-3' : 'eye'} size={16} />
            {preview ? 'Edytor' : 'Podgląd'}
          </button>
        </div>
      </div>

      <div className="kbe-container">
        {}
        <div className="kbe-main">
          {}
          <div className="kbe-folder-toggle">
            <input
              type="checkbox"
              id="isFolder"
              checked={formData.isFolder}
              onChange={(e) => handleChange('isFolder', e.target.checked)}
            />
            <label htmlFor="isFolder">
              <Icon name="folder" size={18} />
              To jest folder (bez treści, tylko organizacja)
            </label>
          </div>

          {}
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder={formData.isFolder ? 'Nazwa folderu...' : 'Tytuł artykułu...'}
            className="kbe-title-input"
          />

          {}
          {formData.isFolder && (
            <div className="kbe-files-section">
              <div
                className={`kbe-dropzone ${dragOver ? 'drag-over' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
                />
                <Icon name="upload-cloud" size={40} className="kbe-dropzone-icon" />
                <p className="kbe-dropzone-text">
                  {uploading
                    ? 'Przesyłanie plików...'
                    : !articleId
                      ? 'Zapisz folder, aby móc dodać pliki'
                      : 'Przeciągnij pliki tutaj lub kliknij, aby wybrać'
                  }
                </p>
                <span className="kbe-dropzone-hint">
                  PDF, Word, Excel, obrazy, archiwa — maks. 10 MB / plik, do 5 naraz
                </span>
              </div>

              {}
              {attachments.length > 0 && (
                <div className="kbe-file-list">
                  <h4 className="kbe-file-list-title">
                    <Icon name="paperclip" size={16} />
                    Pliki ({attachments.length})
                  </h4>
                  {attachments.map(att => (
                    <div key={att.id} className="kbe-file-item">
                      <div className="kbe-file-icon">
                        <Icon name={getFileIcon(att.mimeType)} size={20} />
                      </div>
                      <div className="kbe-file-info">
                        <span className="kbe-file-name">{att.filename}</span>
                        <span className="kbe-file-meta">{formatFileSize(att.size)}</span>
                      </div>
                      <button
                        className="kbe-file-delete"
                        onClick={() => handleDeleteAttachment(att.id)}
                        title="Usuń plik"
                      >
                        <Icon name="trash-2" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {}
          {!formData.isFolder && (
            <textarea
              value={formData.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              placeholder="Krótki opis artykułu (wyświetlany na liście)..."
              className="kbe-excerpt-input"
              rows={2}
            />
          )}

          {}
          {!formData.isFolder && (
            <>
              {preview ? (
                <div className="kbe-preview-panel">
                  <div className="kbe-preview-header">
                    <Icon name="eye" size={16} />
                    <span>Podgląd artykułu</span>
                  </div>
                  <div
                    className="kbe-preview-content ql-editor"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(formData.content)
                    }}
                  />
                </div>
              ) : (
                <div className="kbe-editor-wrapper">
                  <ReactQuill
                    theme="snow"
                    value={formData.content}
                    onChange={(value) => handleChange('content', value)}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Zacznij pisać treść artykułu..."
                  />
                </div>
              )}

              {}
              <div className="kbe-status-bar">
                <span>{wordCount} słów</span>
                <span>~{Math.max(1, Math.ceil(wordCount / 200))} min czytania</span>
              </div>
            </>
          )}

          {}
          {!formData.isFolder && (
            <div className="kbe-section">
              <label className="kbe-label">Tagi</label>
              <div className="kbe-tags-input">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Dodaj tag i naciśnij Enter"
                  className="kbe-input"
                />
                <button type="button" onClick={handleAddTag} className="kbe-add-btn">
                  <Icon name="plus" size={16} />
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="kbe-tags-list">
                  {formData.tags.map(tag => (
                    <span key={tag} className="kbe-tag">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="kbe-tag-remove">
                        <Icon name="x" size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {}
        <div className="kbe-sidebar">
          {}
          <div className="kbe-sidebar-section">
            <h3 className="kbe-sidebar-title">
              <Icon name="send" size={16} />
              Publikacja
            </h3>
            <div className="kbe-form-group">
              <label className="kbe-label">Status</label>
              <CustomSelect
                value={formData.status}
                onChange={(val) => handleChange('status', val)}
                className="kbe-custom-select"
                options={[
                  { value: 'DRAFT', label: 'Szkic' },
                  { value: 'PUBLISHED', label: 'Opublikowany' },
                  { value: 'ARCHIVED', label: 'Zarchiwizowany' }
                ]}
              />
            </div>
            <div className="kbe-action-buttons">
              <button onClick={() => handleSave(false)} disabled={saving} className="kbe-save-btn">
                <Icon name="save" size={16} />
                {saving ? 'Zapisywanie...' : 'Zapisz szkic'}
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} className="kbe-publish-btn">
                <Icon name="globe" size={16} />
                {saving ? 'Publikowanie...' : 'Opublikuj'}
              </button>
            </div>
          </div>

          {}
          <div className="kbe-sidebar-section">
            <h3 className="kbe-sidebar-title">
              <Icon name="tag" size={16} />
              Kategoria
            </h3>
            <CustomSelect
              value={formData.category}
              onChange={(val) => handleChange('category', val)}
              className="kbe-custom-select"
              options={[
                { value: 'HARDWARE', label: 'Sprzęt' },
                { value: 'SOFTWARE', label: 'Oprogramowanie' },
                { value: 'NETWORK', label: 'Sieć' },
                { value: 'ACCOUNT_ACCESS', label: 'Konta i dostępy' },
                { value: 'EMAIL', label: 'Email' },
                { value: 'PRINTING', label: 'Drukowanie' },
                { value: 'SECURITY', label: 'Bezpieczeństwo' },
                { value: 'MOBILE', label: 'Urządzenia mobilne' },
                { value: 'OFFICE_APPS', label: 'Aplikacje biurowe' },
                { value: 'UNIVERSITY_SYSTEMS', label: 'Systemy uczelniane' },
                { value: 'OTHER', label: 'Inne' }
              ]}
            />
          </div>

          {}
          {!formData.isFolder && (
            <div className="kbe-sidebar-section">
              <h3 className="kbe-sidebar-title">
                <Icon name="search" size={16} />
                SEO
              </h3>
              <div className="kbe-form-group">
                <label className="kbe-label">Meta opis</label>
                <textarea
                  value={formData.metaDescription}
                  onChange={(e) => handleChange('metaDescription', e.target.value)}
                  placeholder="Krótki opis dla wyszukiwarek"
                  className="kbe-textarea"
                  rows={3}
                />
              </div>
              <div className="kbe-form-group">
                <label className="kbe-label">Słowa kluczowe</label>
                <div className="kbe-tags-input">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                    placeholder="Dodaj słowo kluczowe"
                    className="kbe-input"
                  />
                  <button type="button" onClick={handleAddKeyword} className="kbe-add-btn">
                    <Icon name="plus" size={16} />
                  </button>
                </div>
                {formData.keywords.length > 0 && (
                  <div className="kbe-tags-list">
                    {formData.keywords.map(keyword => (
                      <span key={keyword} className="kbe-tag">
                        {keyword}
                        <button onClick={() => handleRemoveKeyword(keyword)} className="kbe-tag-remove">
                          <Icon name="x" size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
