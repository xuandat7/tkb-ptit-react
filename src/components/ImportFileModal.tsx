import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, FileText, X, Download, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface ImportFileModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (file: File, semester?: string) => void
  title?: string
  accept?: string
  maxSizeMB?: number
  sampleFileName?: string
  sampleFileUrl?: string
  showSemesterSelect?: boolean
  semester?: string
  onSemesterChange?: (semester: string) => void
  isLoading?: boolean
}

const ImportFileModal: React.FC<ImportFileModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Import File',
  accept = '.xlsx,.xls',
  maxSizeMB = 10,
  sampleFileName = 'file_mau.xlsx',
  sampleFileUrl,
  showSemesterSelect = false,
  semester = '',
  onSemesterChange,
  isLoading = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [localSemester, setLocalSemester] = useState(semester)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileSelect = useCallback((file: File) => {
    const fileExtension = file.name.toLowerCase().split('.').pop()
    const validExtensions = accept.split(',').map(ext => ext.trim().replace('.', '').toLowerCase())

    if (!validExtensions.includes(fileExtension || '')) {
      toast.error(`Vui lòng chọn file ${accept}`)
      return
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File quá lớn. Vui lòng chọn file nhỏ hơn ${maxSizeMB}MB`)
      return
    }

    setSelectedFile(file)
  }, [accept, maxSizeMB])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDownloadSample = () => {
    if (sampleFileUrl) {
      window.open(sampleFileUrl, '_blank')
      return
    }

    // Tải file mẫu từ public/template/file folder
    try {
      const link = document.createElement('a')
      link.href = `/template/file/${sampleFileName}`
      link.download = sampleFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Đã tải file mẫu thành công!')
    } catch (error) {
      console.error('Error downloading sample file:', error)
      toast.error('Không thể tải file mẫu. Vui lòng thử lại!')
    }
  }

  const handleConfirm = () => {
    if (selectedFile) {
      if (showSemesterSelect && !localSemester) {
        toast.error('Vui lòng chọn học kỳ trước khi import')
        return
      }
      onConfirm(selectedFile, showSemesterSelect ? localSemester : undefined)
      // Không reset và đóng modal ngay - để parent component xử lý sau khi upload xong
      // Modal sẽ hiển thị trạng thái loading trong lúc upload
    }
  }

  const handleSemesterChange = (value: string) => {
    setLocalSemester(value)
    if (onSemesterChange) {
      onSemesterChange(value)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setLocalSemester('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  useEffect(() => {
    if (isOpen) {
      setLocalSemester(semester)
    } else {
      // Reset khi modal đóng
      setSelectedFile(null)
      setLocalSemester('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [isOpen, semester])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-6 flex justify-between items-center rounded-t-lg">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Semester Select */}
          {showSemesterSelect && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn học kỳ *
              </label>
              <select
                value={localSemester}
                onChange={(e) => handleSemesterChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">-- Chọn học kỳ --</option>
                <option value="Học kỳ 1">Học kỳ 1</option>
                <option value="Học kỳ 2">Học kỳ 2</option>
              </select>
            </div>
          )}

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-red-400 bg-red-50'
                : 'border-red-300 bg-red-50'
            } hover:border-red-400 hover:bg-red-100`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-4">
              <Upload className="mx-auto text-red-600 mb-3" size={48} />
              <h5 className="text-xl font-semibold text-gray-700 mb-2">
                Chọn hoặc kéo thả file vào đây
              </h5>
              <p className="text-gray-500">
                Hỗ trợ file {accept} (tối đa {maxSizeMB}MB)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-red-600 text-white px-6 py-2 rounded-md font-medium hover:bg-red-700 inline-flex items-center"
              >
                <FileText className="mr-2" size={16} />
                Chọn file
              </button>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                <Download className="w-5 h-5" />
                Tải file mẫu về
              </button>
            </div>
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600" size={24} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{selectedFile.name}</div>
                  <div className="text-sm text-gray-600">
                    Kích thước: {formatFileSize(selectedFile.size)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          {selectedFile && (
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Lưu / Xác nhận
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportFileModal

