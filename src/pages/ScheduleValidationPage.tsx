import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, UserCheck, Home, Download, RefreshCw } from 'lucide-react';
import { scheduleValidationService, type ScheduleValidationResult, type ScheduleEntry, type RoomConflict, type TeacherConflict } from '../services/api';

const ScheduleValidationPage: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ScheduleValidationResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Vui lòng chọn file Excel (.xlsx)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    setSuccess('');
    setResult(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn file Excel');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setSuccess('');

    try {
      const response = await scheduleValidationService.analyzeSchedule(selectedFile);

      if (response.data.success) {
        setResult(response.data.data);
        setSuccess('Phân tích thành công!');
      } else {
        setError(response.data.message || 'Có lỗi xảy ra khi phân tích file');
      }
    } catch (err: any) {
      setError('Lỗi kết nối. Vui lòng thử lại sau.');
      console.error('Error analyzing schedule:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadSample = () => {
    try {
      const link = document.createElement('a');
      link.href = '/template/file/mau_hau_kiem_tkb.xlsx';
      link.download = 'mau_hau_kiem_tkb.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccess('Đã tải file mẫu thành công!');
    } catch (error) {
      console.error('Error downloading sample file:', error);
      setError('Không thể tải file mẫu. Vui lòng thử lại!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    alert('Tính năng xuất báo cáo đang được phát triển');
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg flex justify-between items-center">
              <h1 className="text-base font-bold flex items-center">
                <CheckCircle className="mr-2" size={20} />
                Kết quả kiểm tra thời khóa biểu
              </h1>
              <button
                onClick={handleReset}
                className="bg-white text-red-600 px-3 py-1 rounded-md text-xs font-medium hover:bg-gray-50 flex items-center gap-1"
              >
                <RefreshCw className="mr-1" size={12} />
                Kiểm tra file khác
              </button>
            </div>
            
            <div className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">{result.totalEntries}</div>
                  <div className="text-2xs text-gray-600">Tổng số lịch học</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">{result.conflictResult.totalConflicts}</div>
                  <div className="text-2xs text-gray-600">Tổng số xung đột</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">{result.roomConflictCount}</div>
                  <div className="text-2xs text-gray-600">Xung đột phòng</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">{result.teacherConflictCount}</div>
                  <div className="text-2xs text-gray-600">Xung đột giảng viên</div>
                </div>
              </div>
              
              <hr className="mb-2" />
              
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium">File: </span>
                  <span className="text-gray-700">{result.fileName}</span>
                  {result.conflictResult.totalConflicts === 0 ? (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="mr-0.5" size={12} />
                      Không có xung đột
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-red-100 text-red-800">
                      <AlertTriangle className="mr-0.5" size={12} />
                      Có xung đột
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* No conflicts message */}
          {result.conflictResult.totalConflicts === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500">
              <div className="p-4 text-center">
                <CheckCircle className="mx-auto text-green-500 mb-2" size={40} />
                <h3 className="text-base font-bold text-green-700 mb-1">Tuyệt vời! Không phát hiện xung đột nào</h3>
                <p className="text-xs text-gray-600">Thời khóa biểu của bạn không có xung đột về phòng học và giảng viên.</p>
              </div>
            </div>
          )}

          {/* Conflicts */}
          {result.conflictResult.totalConflicts > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Room Conflicts */}
              {result.roomConflictCount > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="bg-red-600 text-white px-3 py-2 rounded-t-lg">
                    <h3 className="text-sm font-bold flex items-center">
                      <Home className="mr-2" size={16} />
                      Xung đột phòng học ({result.roomConflictCount})
                    </h3>
                  </div>
                  <div className="p-3 space-y-2">
                    {result.conflictResult.roomConflicts.map((conflict: RoomConflict, index: number) => (
                      <div key={index} className="border border-red-200 rounded-lg border-l-4 border-l-red-500">
                        <div className="p-4">
                          <h6 className="font-semibold text-red-700 flex items-center mb-3">
                            <AlertTriangle className="mr-2" size={18} />
                            {conflict.conflictDescription}
                          </h6>
                          
                          {/* Không hiển thị thông tin thời gian nữa vì đã có trong conflictDescription */}
                          
                          <div>
                            <strong className="text-gray-700">Chi tiết xung đột:</strong>
                            <div className="space-y-2 mt-2">
                              {conflict.conflictingSchedules.map((schedule: ScheduleEntry, scheduleIndex: number) => (
                                <div key={scheduleIndex} className="bg-gray-50 rounded-md p-3">
                                  <div className="flex justify-between items-start">
                                    <span className="font-medium">
                                      <strong>{schedule.subjectCode}</strong> - {schedule.subjectName}
                                    </span>
                                    <span className="text-sm text-gray-600">{schedule.classGroup}</span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    GV: {schedule.teacherName} ({schedule.teacherId}) | 
                                    SV: {schedule.studentCount}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teacher Conflicts */}
              {result.teacherConflictCount > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="bg-orange-600 text-white px-6 py-4 rounded-t-lg">
                    <h3 className="text-xl font-bold flex items-center">
                      <UserCheck className="mr-3" size={24} />
                      Xung đột giảng viên ({result.teacherConflictCount})
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {result.conflictResult.teacherConflicts.map((conflict: TeacherConflict, index: number) => (
                      <div key={index} className="border border-orange-200 rounded-lg border-l-4 border-l-orange-500">
                        <div className="p-4">
                          <h6 className="font-semibold text-orange-700 flex items-center mb-3">
                            <AlertTriangle className="mr-2" size={18} />
                            {conflict.conflictDescription}
                          </h6>
                          
                          {/* Không hiển thị thông tin thời gian nữa vì đã có trong conflictDescription */}
                          
                          <div>
                            <strong className="text-gray-700">Chi tiết xung đột:</strong>
                            <div className="space-y-2 mt-2">
                              {conflict.conflictingSchedules.map((schedule: ScheduleEntry, scheduleIndex: number) => (
                                <div key={scheduleIndex} className="bg-gray-50 rounded-md p-3">
                                  <div className="flex justify-between items-start">
                                    <span className="font-medium">
                                      <strong>{schedule.subjectCode}</strong> - {schedule.subjectName}
                                    </span>
                                    <span className="text-sm text-gray-600">{schedule.room}</span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Nhóm: {schedule.classGroup} | SV: {schedule.studentCount}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-8 text-center space-x-4">
            <button
              onClick={handleReset}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 inline-flex items-center"
            >
              <Upload className="mr-2" size={20} />
              Kiểm tra file khác
            </button>
            <button
              onClick={handlePrint}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 inline-flex items-center"
            >
              <FileText className="mr-2" size={20} />
              In báo cáo
            </button>
            <button
              onClick={handleExport}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 inline-flex items-center"
            >
              <Download className="mr-2" size={20} />
              Xuất báo cáo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 4rem)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 min-h-0">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-xl font-bold flex items-center text-gray-900">
            <CheckCircle className="mr-3 text-red-600" size={24} />
            Hậu kiểm thời khóa biểu
          </h1>
        </div>

        {/* Alert messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
            <AlertTriangle className="mr-2" size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
            <CheckCircle className="mr-2" size={18} />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Upload */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col">
            <h2 className="text-sm font-semibold mb-3 flex items-center">
              <Upload className="mr-2 text-red-600" size={16} />
              Upload file kiểm tra
            </h2>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Instructions */}
              <div className="mb-3">
                <h5 className="text-xs font-semibold mb-2">Hướng dẫn sử dụng:</h5>
                <ul className="space-y-1">
                  <li className="flex items-center text-gray-700 text-2xs">
                    <CheckCircle className="text-red-500 mr-2" size={12} />
                    Upload file Excel thời khóa biểu (.xlsx)
                  </li>
                  <li className="flex items-center text-gray-700 text-2xs">
                    <CheckCircle className="text-red-500 mr-2" size={12} />
                    Hệ thống sẽ tự động phát hiện xung đột phòng học và giảng viên
                  </li>
                  <li className="flex items-center text-gray-700 text-2xs">
                    <CheckCircle className="text-red-500 mr-2" size={12} />
                    Xem kết quả và download báo cáo chi tiết
                  </li>
                </ul>
              </div>

              {/* Upload form */}
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${ isDragOver
                  ? 'border-red-400 bg-red-50'
                  : 'border-red-300 bg-red-50'
                } hover:border-red-400 hover:bg-red-100`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="mb-2">
                  <Upload className="mx-auto text-red-600 mb-2" size={32} />
                  <h5 className="text-sm font-semibold text-gray-700 mb-1">
                    Chọn hoặc kéo thả file Excel vào đây
                  </h5>
                  <p className="text-2xs text-gray-500">Hỗ trợ file .xlsx (tối đa 10MB)</p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-red-600 text-white px-4 py-1.5 rounded-md text-xs font-medium hover:bg-red-700 inline-flex items-center gap-1"
                >
                  <FileText className="mr-1" size={12} />
                  Chọn file
                </button>
              </div>

              {selectedFile && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-2">
                  <div className="flex items-center text-red-800 text-2xs gap-2">
                    <FileText className="mr-1" size={16} />
                    <div>
                      <div className="font-medium">File đã chọn: {selectedFile.name}</div>
                      <div className="text-2xs">Kích thước: {formatFileSize(selectedFile.size)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center mt-3 space-x-2 flex-shrink-0">
              <button
                onClick={handleDownloadSample}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 inline-flex items-center gap-1"
              >
                <Download className="mr-0.5" size={12} />
                Tải file mẫu
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!selectedFile || isAnalyzing}
                className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-0.5"></div>
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-0.5" size={12} />
                    Kiểm tra xung đột
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right column - Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center">
              <AlertTriangle className="mr-2 text-red-600" size={16} />
              Thông tin về tính năng
            </h2>
            <div className="space-y-3">
              <div className="border border-red-200 rounded-lg p-3 bg-red-50">
                <h6 className="text-2xs font-bold text-red-600 mb-1 flex items-center">
                  <Home className="mr-1" size={12} />
                  Phát hiện xung đột phòng
                </h6>
                <p className="text-2xs text-gray-600">
                  Kiểm tra các môn học khác nhau sử dụng cùng một phòng tại cùng thời điểm
                </p>
              </div>
              <div className="border border-purple-200 rounded-lg p-3 bg-purple-50">
                <h6 className="text-2xs font-bold text-purple-600 mb-1 flex items-center">
                  <UserCheck className="mr-1" size={12} />
                  Phát hiện xung đột giảng viên
                </h6>
                <p className="text-2xs text-gray-600">
                  Kiểm tra giảng viên có lịch dạy trùng lặp tại cùng thời điểm
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleValidationPage;