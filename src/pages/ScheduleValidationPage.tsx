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
      link.href = '/template_CTDT.xlsx';
      link.download = 'template_CTDT.xlsx';
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
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
              <h1 className="text-2xl font-bold flex items-center">
                <CheckCircle className="mr-3" size={28} />
                Kết quả kiểm tra thời khóa biểu
              </h1>
              <button
                onClick={handleReset}
                className="bg-white text-red-600 px-4 py-2 rounded-md font-medium hover:bg-gray-50 flex items-center"
              >
                <RefreshCw className="mr-2" size={16} />
                Kiểm tra file khác
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{result.totalEntries}</div>
                  <div className="text-sm text-gray-600">Tổng số lịch học</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{result.conflictResult.totalConflicts}</div>
                  <div className="text-sm text-gray-600">Tổng số xung đột</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{result.roomConflictCount}</div>
                  <div className="text-sm text-gray-600">Xung đột phòng</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{result.teacherConflictCount}</div>
                  <div className="text-sm text-gray-600">Xung đột giảng viên</div>
                </div>
              </div>
              
              <hr className="mb-4" />
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">File: </span>
                  <span className="text-gray-700">{result.fileName}</span>
                  {result.conflictResult.totalConflicts === 0 ? (
                    <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <CheckCircle className="mr-1" size={16} />
                      Không có xung đột
                    </span>
                  ) : (
                    <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      <AlertTriangle className="mr-1" size={16} />
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
              <div className="p-8 text-center">
                <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                <h3 className="text-2xl font-bold text-green-700 mb-2">Tuyệt vời! Không phát hiện xung đột nào</h3>
                <p className="text-gray-600">Thời khóa biểu của bạn không có xung đột về phòng học và giảng viên.</p>
              </div>
            </div>
          )}

          {/* Conflicts */}
          {result.conflictResult.totalConflicts > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Room Conflicts */}
              {result.roomConflictCount > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
                    <h3 className="text-xl font-bold flex items-center">
                      <Home className="mr-3" size={24} />
                      Xung đột phòng học ({result.roomConflictCount})
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Upload section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg flex-shrink-0">
              <h1 className="text-2xl font-bold flex items-center">
                <CheckCircle className="mr-3" size={28} />
                Hậu kiểm thời khóa biểu
              </h1>
            </div>
            
            <div className="p-6 flex-1 min-h-0 flex flex-col">
              {/* Alert messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center flex-shrink-0">
                  <AlertTriangle className="mr-2" size={20} />
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center flex-shrink-0">
                  <CheckCircle className="mr-2" size={20} />
                  {success}
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto">
                {/* Instructions */}
                <div className="mb-6">
                  <h5 className="text-lg font-semibold mb-3">Hướng dẫn sử dụng:</h5>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="text-red-500 mr-3" size={16} />
                      Upload file Excel thời khóa biểu (.xlsx)
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="text-red-500 mr-3" size={16} />
                      Hệ thống sẽ tự động phát hiện xung đột phòng học và giảng viên
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="text-red-500 mr-3" size={16} />
                      Xem kết quả và download báo cáo chi tiết
                    </li>
                  </ul>
                </div>

                {/* Upload form */}
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
                      Chọn hoặc kéo thả file Excel vào đây
                    </h5>
                    <p className="text-gray-500">Hỗ trợ file .xlsx (tối đa 10MB)</p>
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
                    className="bg-red-600 text-white px-6 py-2 rounded-md font-medium hover:bg-red-700 inline-flex items-center"
                  >
                    <FileText className="mr-2" size={16} />
                    Chọn file
                  </button>
                </div>

                {selectedFile && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex items-center text-red-800">
                      <FileText className="mr-3" size={20} />
                      <div>
                        <div className="font-medium">File đã chọn: {selectedFile.name}</div>
                        <div className="text-sm">Kích thước: {formatFileSize(selectedFile.size)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center mt-6 space-x-4 flex-shrink-0">
                <button
                  onClick={handleDownloadSample}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 inline-flex items-center"
                >
                  <Download className="mr-2" size={20} />
                  Tải file mẫu
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!selectedFile || isAnalyzing}
                  className="bg-red-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Đang kiểm tra...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2" size={20} />
                      Kiểm tra xung đột
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Info section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
            <div className="p-6 flex-1 min-h-0 overflow-y-auto">
              <h6 className="text-lg font-semibold mb-4 flex items-center">
                <AlertTriangle className="mr-2 text-red-600" size={20} />
                Thông tin về tính năng
              </h6>
              <div className="space-y-6">
                <div>
                  <h6 className="font-medium text-red-600 mb-2">Phát hiện xung đột phòng:</h6>
                  <p className="text-sm text-gray-600">
                    Kiểm tra các môn học khác nhau sử dụng cùng một phòng tại cùng thời điểm
                  </p>
                </div>
                <div>
                  <h6 className="font-medium text-red-600 mb-2">Phát hiện xung đột giảng viên:</h6>
                  <p className="text-sm text-gray-600">
                    Kiểm tra giảng viên có lịch dạy trùng lặp tại cùng thời điểm
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleValidationPage;