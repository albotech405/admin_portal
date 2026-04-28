import React from 'react'
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
  return (
    <div className="space-y-4">
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center min-h-96">
        {fileType === 'image' ? (
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-96 object-contain"
          />
        ) : (
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-700">PDF Document</p>
            <p className="text-gray-500 text-sm">{fileName}</p>
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
        )}
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-700 text-sm"
      >
        Download File
      </a>
    </div>
  )
}
