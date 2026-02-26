import { useState } from 'react'
import Icon from './Icon'
import '../styles/components/RatingWidget.css'

export default function RatingWidget({ ticketId, currentRating, onRate, readOnly = false }) {
  const [hoveredStar, setHoveredStar] = useState(0)
  const [selectedRating, setSelectedRating] = useState(currentRating || 0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCommentBox, setShowCommentBox] = useState(false)

  const handleStarClick = (rating) => {
    if (readOnly || currentRating) return

    setSelectedRating(rating)
    setShowCommentBox(true)
  }

  const handleSubmit = async () => {
    if (!selectedRating || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onRate(ticketId, selectedRating, comment)
      setShowCommentBox(false)
    } catch (error) {
      console.error('Rating failed:', error)
      alert('Nie udało się wysłać oceny')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedRating(currentRating || 0)
    setComment('')
    setShowCommentBox(false)
  }

  const displayRating = hoveredStar || selectedRating || currentRating || 0

  if (readOnly && currentRating) {
    return (
      <div className="rating-widget rating-readonly">
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <Icon
              key={star}
              name="star"
              size={20}
              className={star <= currentRating ? 'star-filled' : 'star-empty'}
            />
          ))}
        </div>
        <span className="rating-value">{currentRating}/5</span>
      </div>
    )
  }

  return (
    <div className="rating-widget">
      <div className="rating-header">
        <h4>Oceń jakość obsługi</h4>
        <p>Twoja opinia pomoże nam poprawić jakość świadczonych usług</p>
      </div>

      <div
        className="rating-stars"
        onMouseLeave={() => setHoveredStar(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-button ${star <= displayRating ? 'star-filled' : 'star-empty'}`}
            onMouseEnter={() => !readOnly && !currentRating && setHoveredStar(star)}
            onClick={() => handleStarClick(star)}
            disabled={readOnly || !!currentRating}
          >
            <Icon name="star" size={32} />
          </button>
        ))}
      </div>

      {displayRating > 0 && (
        <div className="rating-label">
          {displayRating === 1 && 'Bardzo słaba'}
          {displayRating === 2 && 'Słaba'}
          {displayRating === 3 && 'Przeciętna'}
          {displayRating === 4 && 'Dobra'}
          {displayRating === 5 && 'Doskonała'}
        </div>
      )}

      {showCommentBox && (
        <div className="rating-comment-box">
          <label htmlFor="rating-comment">Dodatkowy komentarz (opcjonalnie)</label>
          <textarea
            id="rating-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Podziel się swoimi uwagami..."
            rows={3}
            maxLength={500}
          />
          <div className="rating-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Anuluj
            </button>
            <button
              type="button"
              className="btn-submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedRating}
            >
              {isSubmitting ? 'Wysyłanie...' : 'Wyślij ocenę'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
