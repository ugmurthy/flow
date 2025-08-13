import React, { useCallback } from 'react';
import Download from '../icons/Download';

/**
 * Reusable DownloadFile component that handles file downloads
 * @param {Object} props - Component props
 * @param {string} props.content - The content to download
 * @param {string} [props.filename] - Custom filename (optional)
 * @param {string} [props.fileExtension='txt'] - File extension
 * @param {string} [props.mimeType='text/plain'] - MIME type for the file
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.title] - Button title/tooltip
 * @param {React.ReactNode} [props.children] - Custom button content (defaults to Download icon)
 * @param {Function} [props.onDownload] - Callback function called after download
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 */
function DownloadFile({
  content,
  filename,
  fileExtension = 'txt',
  mimeType = 'text/plain',
  className = 'p-1 text-gray-400 hover:text-green-600 transition-colors rounded hover:bg-gray-100',
  title = 'Download file',
  children,
  onDownload,
  disabled = false
}) {
  const handleDownload = useCallback(() => {
    if (!content || disabled) return;

    try {
      // Generate filename if not provided
      let finalFilename = filename;
      if (!finalFilename) {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        finalFilename = `download-${day}${month}${year}-${hours}${minutes}${seconds}.${fileExtension}`;
      }

      // Create blob and download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Call onDownload callback if provided
      if (onDownload) {
        onDownload(finalFilename, content);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }, [content, filename, fileExtension, mimeType, onDownload, disabled]);

  return (
    <button
      onClick={handleDownload}
      className={className}
      title={title}
      disabled={disabled || !content}
    >
      {children || <Download />}
    </button>
  );
}

export default DownloadFile;