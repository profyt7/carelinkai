"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiX, 
  FiMaximize, 
  FiMinimize,
  FiGrid
} from 'react-icons/fi';
import HomeImagePlaceholder from './HomeImagePlaceholder';
import { PLACEHOLDER_CAPTION } from '@/lib/placeholder-images';

export interface Photo {
  id: string;
  url: string;
  caption: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  initialIndex?: number;
  /**
   * When there are no real photos, show this representative stand-in image
   * (deterministic per home) with an honest caption, instead of the blank
   * "Photos coming soon" box. Real photos always take precedence.
   */
  placeholderImageUrl?: string;
}

/** OL-227: the hero box — 4:3 below md, the existing fixed height at ≥ md; never wider than its container. */
const HERO_BOX = 'w-full max-w-full overflow-hidden rounded-lg aspect-[4/3] md:aspect-auto md:h-96';

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  initialIndex = 0,
  placeholderImageUrl,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Navigation functions (placed before effects so they're declared when used)
  const navigateNext = useCallback(() => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % photos.length);
  }, [photos.length]);

  const navigatePrev = useCallback(() => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          navigatePrev();
          break;
        case 'ArrowRight':
          navigateNext();
          break;
        case 'Escape':
          closeLightbox();
          break;
        case 'f':
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, activeIndex, navigatePrev, navigateNext]);

  // Reset loading state when active index changes
  useEffect(() => {
    setIsLoading(true);
  }, [activeIndex]);

  // Handle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const galleryElement = document.getElementById('photo-gallery-lightbox');
      if (galleryElement?.requestFullscreen) {
        galleryElement.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => console.error(`Error attempting to enable fullscreen: ${err.message}`));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => console.error(`Error attempting to exit fullscreen: ${err.message}`));
      }
    }
  };

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden'; // Prevent scrolling when lightbox is open
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setIsFullscreen(false);
    document.body.style.overflow = ''; // Restore scrolling
  };

  // Touch event handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.targetTouches?.item(0);
    if (touch) {
      setTouchStart(touch.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches?.item(0);
    if (touch) {
      setTouchEnd(touch.clientX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      navigateNext();
    }
    
    if (isRightSwipe) {
      navigatePrev();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Get current photo
  const currentPhoto = photos[activeIndex] || { id: '', url: '', caption: 'No image available' };

  // Handle image load completion
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // If no real photos: prefer a representative stand-in image (deterministic per
  // home) with an honest caption; fall back to the branded box if none supplied.
  if (!photos.length) {
    if (placeholderImageUrl) {
      return (
        <div className={`relative ${HERO_BOX} bg-neutral-100`}>
          <Image
            src={placeholderImageUrl}
            alt="Representative senior-living photo (no operator photo yet)"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <p className="text-xs text-white/90">{PLACEHOLDER_CAPTION}</p>
          </div>
        </div>
      );
    }
    return <HomeImagePlaceholder className={HERO_BOX} />;
  }

  return (
    <div className="photo-gallery w-full min-w-0">
      {/* Main gallery display: same box on every listing, whatever the source image dimensions (object-cover). */}
      <div className={`relative ${HERO_BOX} bg-neutral-100`} data-testid="photo-gallery-hero">
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-100 bg-opacity-75">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-primary-500"></div>
          </div>
        )}

        {/* Main image */}
        <div 
          className="relative h-full w-full cursor-pointer"
          onClick={() => openLightbox(activeIndex)}
        >
          <Image
            src={currentPhoto.url}
            alt={currentPhoto.caption}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-opacity duration-300"
            priority={activeIndex === 0}
            onLoad={handleImageLoad}
            style={{ opacity: isLoading ? 0 : 1 }}
          />
          
          {/* Bottom bar over a gradient: the caption (1 line < md, 2 lines ≥ md, ellipsis) and "View All" share a
              flex row, so a long caption can never run under the button. */}
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-3 pt-10">
            <p className="line-clamp-1 min-w-0 flex-1 break-words text-sm text-white md:line-clamp-2" data-testid="photo-gallery-caption">
              {currentPhoto.caption}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(activeIndex);
              }}
              className="flex shrink-0 items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-md transition-all hover:bg-neutral-50"
              data-testid="photo-gallery-view-all"
            >
              <FiGrid className="mr-1.5 h-4 w-4" />
              View All
            </button>
          </div>
        </div>

        {/* Navigation arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigatePrev();
              }}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 text-neutral-800 shadow-md transition-all hover:bg-white hover:text-neutral-900"
              aria-label="Previous photo"
            >
              <FiChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateNext();
              }}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 text-neutral-800 shadow-md transition-all hover:bg-white hover:text-neutral-900"
              aria-label="Next photo"
            >
              <FiChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Photo count: its own top-left chip, clear of the caption bar */}
        <div className="absolute left-3 top-3 z-10 rounded-md bg-black/60 px-2 py-1 text-xs text-white" data-testid="photo-gallery-counter">
          {activeIndex + 1} / {photos.length}
        </div>
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="mt-2 w-full min-w-0 max-w-full snap-x snap-mandatory overflow-x-auto pb-2" data-testid="photo-gallery-thumbs">
          <div className="flex w-max gap-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setActiveIndex(index)}
                className={`relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-md border-2 transition-all ${
                  index === activeIndex 
                    ? "border-primary-500" 
                    : "border-transparent hover:border-neutral-300"
                }`}
              >
                <Image
                  src={photo.url}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
          id="photo-gallery-lightbox"
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70"
            aria-label="Close lightbox"
          >
            <FiX className="h-6 w-6" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="absolute right-16 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <FiMinimize className="h-6 w-6" /> : <FiMaximize className="h-6 w-6" />}
          </button>

          {/* Image counter */}
          <div className="absolute left-4 top-4 rounded-md bg-black/50 px-3 py-1.5 text-sm text-white">
            {activeIndex + 1} / {photos.length}
          </div>

          {/* Main lightbox image */}
          <div 
            className="relative h-full w-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex h-full w-full items-center justify-center p-4">
              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-600 border-t-white"></div>
                </div>
              )}
              
              <div className="relative h-full max-h-[80vh] max-w-[90vw]">
                <Image
                  src={currentPhoto.url}
                  alt={currentPhoto.caption}
                  fill
                  sizes="90vw"
                  className="object-contain transition-opacity duration-300"
                  onLoad={handleImageLoad}
                  style={{ opacity: isLoading ? 0 : 1 }}
                />
              </div>
            </div>

            {/* Caption */}
            <div className="absolute bottom-4 left-0 right-0 bg-black/50 p-4 text-center">
              <p className="text-white">{currentPhoto.caption}</p>
            </div>
          </div>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={navigatePrev}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-all hover:bg-black/70"
                aria-label="Previous photo"
              >
                <FiChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={navigateNext}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-all hover:bg-black/70"
                aria-label="Next photo"
              >
                <FiChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Thumbnail strip in lightbox */}
          <div className="absolute bottom-16 left-0 right-0 flex justify-center overflow-x-auto bg-black/50 p-2">
            <div className="flex space-x-2">
              {photos.map((photo, index) => (
                <button
                  key={`lightbox-thumb-${photo.id}`}
                  onClick={() => setActiveIndex(index)}
                  className={`relative h-12 w-16 shrink-0 overflow-hidden rounded border-2 transition-all ${
                    index === activeIndex 
                      ? "border-white" 
                      : "border-transparent opacity-60 hover:border-neutral-400 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={photo.url}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
