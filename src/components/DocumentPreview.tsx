import React, { useState, useCallback } from 'react'
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
  const [isViewerOpen, setIsViewerOpen] = useState(false)

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

  const openViewer = useCallback(() => {
    setIsViewerOpen(true)
  }, [])

  const closeViewer = useCallback(() => {
    setIsViewerOpen(false)
  }, [])

  const downloadName = fileName.includes('.') ? fileName : `${fileName}.${fileType === 'pdf' ? 'pdf' : 'jpg'}`

  const imageControls = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-xl border border-brand-100 bg-white p-1">
        <button
          type="button"
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

      <button
        type="button"
        onClick={handleRotate}
        className="rounded-xl border border-brand-100 bg-white p-1.5 text-brand-600 hover:bg-brand-50"
        title="Rotate 90°"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {(zoom !== 1 || rotation !== 0) && (
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-brand-100 bg-white p-1.5 text-brand-600 hover:bg-brand-50"
          title="Reset view"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  )

  const renderImage = (isViewer = false) => (
    <img
      src={fileUrl}
      alt={fileName}
      className="max-w-full transition-transform duration-200 ease-out"
      style={{
        transform: `scale(${zoom}) rotate(${rotation}deg)`,
        maxHeight: isViewer ? '86vh' : '44rem',
        objectFit: 'contain',
      }}
      onError={(e) => {
        const target = e.currentTarget
        target.style.display = 'none'
        const fallback = target.nextElementSibling as HTMLElement
        if (fallback) fallback.style.display = 'flex'
      }}
    />
  )

  const actionLinks = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={openViewer}
        className="inline-flex items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
        Full screen
      </button>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14h14" />
        </svg>
        Open tab
      </a>
      <a
        href={fileUrl}
        download={downloadName}
        className="inline-flex items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download
      </a>
    </div>
  )

  const renderPdfFrame = (isViewer = false) => (
    <iframe
      src={fileUrl}
      title={fileName}
      className={`w-full rounded-xl border-0 bg-white ${isViewer ? 'h-[86vh]' : 'h-[28rem] sm:h-[38rem] lg:h-[52rem]'}`}
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
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-900">{fileName}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-500">{fileType === 'pdf' ? 'PDF preview' : 'Image preview'}</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            {fileType === 'image' && imageControls}
            {actionLinks}
          </div>
        </div>

        {fileType === 'image' ? (
          <>
            <div
              className="flex min-h-[22rem] items-center justify-center overflow-auto rounded-2xl border border-brand-100 bg-white p-4 sm:p-6"
              onDoubleClick={handleZoomIn}
            >
              {renderImage()}
              {imageErrorFallback}
            </div>
          </>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white p-2 sm:p-3">
            {renderPdfFrame()}
          </div>
        )}
      </div>

      {isViewerOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm"
          onClick={closeViewer}
        >
          <div
            className="relative flex h-full w-full flex-col px-3 py-3 sm:px-6 sm:py-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{fileName}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Full screen viewer</p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                {fileType === 'image' && imageControls}
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Open tab
                  </a>
                  <a
                    href={fileUrl}
                    download={downloadName}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={closeViewer}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-3 sm:p-5">
              {fileType === 'image' ? (
                <>
                  {renderImage(true)}
                  {imageErrorFallback}
                </>
              ) : (
                <div className="h-full w-full overflow-hidden rounded-xl bg-white">
                  {renderPdfFrame(true)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
