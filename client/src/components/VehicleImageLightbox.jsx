import { useEffect, useState } from 'react'

export function VehicleImageLightbox({ car, galleryItems, activeIndex, isOpen, onClose, onSelectIndex }) {
  const [touchStartX, setTouchStartX] = useState(null)
  const activeGalleryItem = galleryItems[activeIndex] || galleryItems[0]

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (!galleryItems.length) {
        return
      }

      if (event.key === 'ArrowRight') {
        onSelectIndex((activeIndex + 1) % galleryItems.length)
      }

      if (event.key === 'ArrowLeft') {
        onSelectIndex((activeIndex - 1 + galleryItems.length) % galleryItems.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, galleryItems.length, isOpen, onClose, onSelectIndex])

  if (!isOpen || !activeGalleryItem) {
    return null
  }

  const showPreviousGalleryItem = () => {
    if (!galleryItems.length) {
      return
    }

    onSelectIndex((activeIndex - 1 + galleryItems.length) % galleryItems.length)
  }

  const showNextGalleryItem = () => {
    if (!galleryItems.length) {
      return
    }

    onSelectIndex((activeIndex + 1) % galleryItems.length)
  }

  const handleLightboxTouchStart = (event) => {
    setTouchStartX(event.touches?.[0]?.clientX ?? null)
  }

  const handleLightboxTouchEnd = (event) => {
    const touchEndX = event.changedTouches?.[0]?.clientX

    if (touchStartX == null || touchEndX == null) {
      return
    }

    const deltaX = touchStartX - touchEndX

    if (Math.abs(deltaX) < 40) {
      setTouchStartX(null)
      return
    }

    if (deltaX > 0) {
      showNextGalleryItem()
    } else {
      showPreviousGalleryItem()
    }

    setTouchStartX(null)
  }

  return (
    <div
      aria-label={`${car.brand} ${car.model} gallery viewer`}
      className="gallery-lightbox"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="gallery-lightbox-panel"
        onClick={(event) => event.stopPropagation()}
        onTouchEnd={handleLightboxTouchEnd}
        onTouchStart={handleLightboxTouchStart}
      >
        <button
          aria-label="Close gallery"
          className="gallery-lightbox-close"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
        <div className="gallery-lightbox-media">
          <button
            aria-label="Previous image"
            className="gallery-lightbox-arrow gallery-lightbox-arrow-left"
            onClick={showPreviousGalleryItem}
            type="button"
          >
            ‹
          </button>
          <img
            src={activeGalleryItem.src || activeGalleryItem}
            alt={`${car.brand} ${car.model} ${activeGalleryItem.label || `view ${activeIndex + 1}`}`}
          />
          <button
            aria-label="Next image"
            className="gallery-lightbox-arrow gallery-lightbox-arrow-right"
            onClick={showNextGalleryItem}
            type="button"
          >
            ›
          </button>
        </div>
        <div className="gallery-lightbox-meta surface-card">
          <div className="gallery-caption-topline">
            <span className={`gallery-scene-pill gallery-scene-${activeGalleryItem.scene || 'detail'}`}>
              {activeGalleryItem.scene || 'detail'}
            </span>
            <span className="gallery-theme-inline">
              {activeGalleryItem.themeName || car.displayTheme?.name || 'Verified theme'}
            </span>
          </div>
          <strong>{activeGalleryItem.label || `View ${activeIndex + 1}`}</strong>
          <p>{activeGalleryItem.detail || 'Verified gallery image'}</p>
        </div>
        {galleryItems.length > 1 ? (
          <div className="gallery-lightbox-thumbs">
            {galleryItems.map((item, index) => (
              <button
                aria-label={`Show ${item.label || `view ${index + 1}`}`}
                className={`gallery-thumb ${index === activeIndex ? 'gallery-thumb-active' : ''}`}
                key={item.id || `${car.id}-thumb-${index + 1}`}
                onClick={() => onSelectIndex(index)}
                type="button"
              >
                <img src={item.src || item} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}