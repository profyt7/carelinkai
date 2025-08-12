"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiX, 
  FiMaximize, 
  FiMinimize,
  FiCamera,
  FiGrid
} from 'react-icons/fi';

export interface Photo {
  id: string;
  url: string;
  caption: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  initialIndex?: number;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  photos, 
  initialIndex = 0 
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
  }, [lightboxOpen, activeIndex]);

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

  // Navigation functions
  const navigateNext = useCallback(() => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % photos.length);
  }, [photos.length]);

  const navigatePrev = useCallback(() => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  }, [photos.length]);

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
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
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

  // If no photos, show placeholder
  if (!photos.length) {
    return (
      <div className="relative h-64 w-full rounded-lg bg-neutral-200 md:h-96">
        <div className="flex h-full w-full flex-col items-center justify-center">
          <FiCamera className="mb-2 h-10 w-10 text-neutral-400" />
          <p className="text-sm text-neutral-500">No photos available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="photo-gallery">
      {/* Main gallery display */}
      <div className="relative h-64 w-full overflow-hidden rounded-lg bg-neutral-100 md:h-96">
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
          
          {/* Caption overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-sm text-white">{currentPhoto.caption}</p>
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

        {/* Photo count and view all button */}
        <div className="absolute bottom-4 left-4 z-10 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
          {activeIndex + 1} / {photos.length}
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            openLightbox(activeIndex);
          }}
          className="absolute bottom-4 right-4 z-10 flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-md transition-all hover:bg-neutral-50"
        >
          <FiGrid className="mr-1.5 h-4 w-4" />
          View All
        </button>
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="mt-2 flex w-full items-center overflow-x-auto pb-2">
          <div className="flex space-x-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setActiveIndex(index)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                  index === activeIndex 
                    ? "border-primary-500" 
                    : "border-transparent hover:border-neutral-300"
                }`}
              >
                <Image
                  src={photo.url}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  sizes="96px"
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
                      : "border-transparent opacity-60 hover:border-gray-400 hover:opacity-100"
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
