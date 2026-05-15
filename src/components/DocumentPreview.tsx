import React, { useState, useCallback, useRef } from 'react'
import { Button } from './Button'

interface DocumentPreviewProps {
  fileUrl: string
  fileType: 'image' | 'pdf'
  fileName?: string
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  fileUrl,
  fileType,
  fileName = 'Document',
}) => {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const ZOOM_STEP = 0.25
  const MIN_ZOOM = 0.25
  const MAX_ZOOM = 5

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM))
  }, [])

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
  }, [])

  const handleReset = useCallback(() => {
    setZoom(1)
    setRotation(0)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } catch {
        // Fullscreen not supported or denied
        setIsZoomModalOpen(true)
      }
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Listen for fullscreen change events
  React.useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const imageControls = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Zoom controls */}
      <div className="flex items-center gap-1 rounded-xl border border-brand-100 bg-white p-1">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50 disabled:opacity-40"
          title="Zoom out"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="min-w-[3rem] text-center text-xs font-medium text-brand-700">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50 disabled:opacity-40"
          title="Zoom in"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Rotate */}
      <button
        onClick={handleRotate}
        className="rounded-xl border border-brand-100 bg-white p-1.5 text-brand-600 hover:bg-brand-50"
        title="Rotate 90°"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {/* Reset */}
      {(zoom !== 1 || rotation !== 0) && (
        <button
          onClick={handleReset}
          className="rounded-xl border border-brand-100 bg-white p-1.5 text-brand-600 hover:bg-brand-50"
          title="Reset view"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* Fullscreen */}
      <button
        onClick={toggleFullscreen}
        className="rounded-xl border border-brand-100 bg-white p-1.5 text-brand-600 hover:bg-brand-50"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>
    </div>
  )

  const renderImage = (isModal = false) => (
    <img
      ref={imgRef}
      src={fileUrl}
      alt={fileName}
      className="max-w-full transition-transform duration-200 ease-out"
      style={{
        transform: `scale(${zoom}) rotate(${rotation}deg)`,
        maxHeight: isModal ? '80vh' : '24rem',
        objectFit: 'contain',
      }}
      onError={(e) => {
        // If image fails to load, show fallback
        const target = e.currentTarget
        target.style.display = 'none'
        const fallback = target.nextElementSibling as HTMLElement
        if (fallback) fallback.style.display = 'flex'
      }}
    />
  )

  const imageErrorFallback = (
    <div className="hidden flex-col items-center justify-center p-8 text-center">
      <svg className="mb-3 h-16 w-16 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p className="text-sm font-medium text-red-700">Failed to load image</p>
      <p className="mt-1 text-xs text-red-500">The document may not be accessible at the provided URL.</p>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        Open in new tab →
      </a>
    </div>
  )

  return (
    <>
      <div ref={containerRef} className="space-y-4">
        {fileType === 'image' ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              {imageControls}
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </a>
            </div>

            {/* Image container */}
            <div
              className="flex min-h-80 items-center justify-center overflow-hidden rounded-xl border border-brand-100 bg-brand-50/50"
              onDoubleClick={handleZoomIn}
            >
              {renderImage()}
              {imageErrorFallback}
            </div>
          </>
        ) : (
          /* PDF fallback */
          <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-xl border border-brand-100 bg-brand-50/50">
            <div className="text-center">
              <svg className="mx-auto mb-3 h-16 w-16 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-semibold text-brand-700">PDF Document</p>
              <p className="mt-1 text-sm text-brand-500">{fileName}</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block"
              >
                <Button variant="primary" size="sm">
                  Open PDF
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* Download link for non-image types */}
        {fileType !== 'image' && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download File
          </a>
        )}
      </div>

      {/* Zoom Modal (fallback when fullscreen not available) */}
      {isZoomModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsZoomModalOpen(false)}
        >
          <div
            className="relative max-h-[95vh] max-w-[95vw] overflow-auto rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal toolbar */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {imageControls}
              </div>
              <button
                onClick={() => setIsZoomModalOpen(false)}
                className="rounded-lg p-1.5 text-brand-500 hover:bg-brand-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-center">
              {fileType === 'image' ? (
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="max-w-full transition-transform duration-200 ease-out"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    maxHeight: '80vh',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <iframe
                  src={fileUrl}
                  title={fileName}
                  className="h-[80vh] w-full rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
