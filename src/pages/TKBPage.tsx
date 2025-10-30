import { useState, useEffect } from 'react'
import { Play, Loader, RefreshCw } from 'lucide-react'
import { subjectService, type SubjectByMajor } from '../services/api'
import api from '../services/api'
import toast from 'react-hot-toast'

interface BatchRow {
  mmh: string
  tmh: string
  sotiet: number
  solop: number
  siso: number
  siso_mot_lop: number
  nganh: string
  khoa: string
  he_dac_thu?: string
  subject_type?: string
  student_year?: string
}

interface TKBResultRow {
  lop?: string
  ma_mon?: string
  ten_mon?: string
  khoa?: string
  nganh?: string
  he_dac_thu?: string
  thu?: string
  kip?: string
  tiet_bd?: string
  l?: string
  phong?: string
  O_to_AG?: string[]
  ah?: string
}

interface SavedResult {
  id: number
  timestamp: string
  department: string
  data: TKBResultRow[]
  title: string
}

const TKBPage = () => {
  const [systemType, setSystemType] = useState('chinh_quy')
  const [classYear, setClassYear] = useState('2022') // Default khóa
  const [majorGroups, setMajorGroups] = useState<string[]>([])
  const [selectedMajorGroup, setSelectedMajorGroup] = useState('')
  const [batchRows, setBatchRows] = useState<BatchRow[]>([])
  const [results, setResults] = useState<TKBResultRow[]>([])
  const [savedResults, setSavedResults] = useState<SavedResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load major groups when systemType and classYear change
    if (systemType && classYear) {
      loadMajorGroups()
    }
  }, [systemType, classYear])

  const loadMajorGroups = async () => {
    try {
      setLoading(true)
      
      // Map systemType to programType for API
      let programType = ''
      if (systemType === 'chinh_quy') {
        programType = 'Chính quy'
      } else if (systemType === 'he_dac_thu') {
        programType = 'Đặc thù'
      } else if (systemType === 'chung') {
        programType = 'Chung'
      } else {
        // Default fallback
        programType = 'Chính quy'
      }
      
      // Call API to get major groups
      const response = await subjectService.getGroupMajors(classYear, programType)
      
      if (response.data.success) {
        // Convert array of arrays to string array (join with dash)
        const groups = response.data.data.map((group: string[]) => group.join('-'))
        setMajorGroups(groups)
        toast.success(`Đã tải ${groups.length} nhóm ngành từ API`)
      } else {
        toast.error('API trả về lỗi: ' + (response.data.message || 'Không xác định'))
      }
    } catch (error) {
      toast.error('Không thể tải danh sách nhóm ngành từ API')
      console.error('Error loading major groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSubjectsByMajorGroup = async () => {
    if (!classYear || !selectedMajorGroup || !systemType) {
      toast.error('Vui lòng chọn đầy đủ thông tin trước')
      return
    }

    try {
      setLoading(true)
      
      // Map systemType to programType for API
      let programType = ''
      if (systemType === 'chinh_quy') {
        programType = 'Chính quy'
      } else if (systemType === 'he_dac_thu') {
        programType = 'Đặc thù'
      } else if (systemType === 'chung') {
        programType = 'Chung'
      } else {
        programType = 'Chính quy'
      }
      
      // Split selected major group back to individual majors
      const majorCodes = selectedMajorGroup.split('-')
      
      // Call API to get subjects by majors
      const response = await subjectService.getByMajors(classYear, programType, majorCodes)
      
      if (response.data.success) {
        const subjects = response.data.data
        
        // Map to batch row format
        const newRows = subjects.map((subject: SubjectByMajor) => ({
          mmh: subject.subjectCode,
          tmh: subject.subjectName,
          sotiet: 0, // Will need to be calculated or provided by API
          solop: 0, // Will need to be calculated based on numberOfStudents
          siso: subject.numberOfStudents,
          siso_mot_lop: subject.studentPerClass || 60, // Default to 60 if null
          nganh: subject.majorCode,
          khoa: subject.classYear,
          he_dac_thu: programType,
        }))
        
        setBatchRows(newRows)
        toast.success(`Đã tải ${subjects.length} môn học từ API`)
      } else {
        toast.error('API trả về lỗi: ' + (response.data.message || 'Không xác định'))
      }
    } catch (error: any) {
      toast.error('Không thể tải danh sách môn học từ API')
      console.error('Error loading subjects by major:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateBatchRow = (index: number, field: keyof BatchRow, value: any) => {
    const updated = [...batchRows]
    updated[index] = { ...updated[index], [field]: value }
    setBatchRows(updated)
  }

  const removeBatchRow = (index: number) => {
    setBatchRows(batchRows.filter((_, i) => i !== index))
  }

  const generateTKB = async () => {
    if (batchRows.length === 0) {
      toast.error('Vui lòng thêm ít nhất một môn học')
      return
    }

    try {
      setLoading(true)
      
      const items = batchRows.map((row) => ({
        ma_mon: row.mmh,
        ten_mon: row.tmh,
        sotiet: row.sotiet,
        solop: Math.ceil(row.siso / row.siso_mot_lop),
        siso: row.siso_mot_lop,
        siso_mot_lop: row.siso_mot_lop,
        nganh: row.nganh,
        subject_type: row.subject_type,
        student_year: row.khoa,
        he_dac_thu: row.he_dac_thu,
      }))

      const response = await api.post('/tkb/generate-batch', { items })
      
      if (response.data?.items && response.data.items.length > 0) {
        const allRows = response.data.items.flatMap((item: any) => item.rows || [])
        setResults(allRows)
        toast.success('Tạo thời khóa biểu thành công!')
      } else {
        toast.error('Không có dữ liệu trả về')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo TKB')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const resetTKB = async () => {
    if (!confirm('Bạn có chắc muốn reset thời khóa biểu? Tất cả dữ liệu sẽ bị xóa.')) return

    try {
      await api.post('/rooms/reset')
      toast.success('Đã reset thời khóa biểu')
      setResults([])
    } catch (error) {
      toast.error('Không thể reset thời khóa biểu')
    }
  }

  const saveToResults = async () => {
    if (results.length === 0) {
      toast.error('Không có dữ liệu TKB để lưu')
      return
    }

    const timestamp = new Date().toLocaleString('vi-VN')
    const resultId = Date.now()
    
    const savedResult: SavedResult = {
      id: resultId,
      timestamp: timestamp,
      department: selectedMajorGroup || 'Không xác định',
      data: results,
      title: `${selectedMajorGroup} - ${timestamp}`,
    }

    setSavedResults([...savedResults, savedResult])
    toast.success('Đã thêm TKB vào kết quả!')
    
    // Call API to update occupied rooms
    try {
      await api.post('/rooms/save-results', {})
      console.log('Occupied rooms updated')
    } catch (error) {
      console.error('Error updating occupied rooms:', error)
    }
    
    // Trigger room schedule update event
    window.dispatchEvent(new Event('roomScheduleUpdate'))
    localStorage.setItem('roomScheduleNeedsReload', Date.now().toString())
  }

  const viewResult = (id: number) => {
    const result = savedResults.find(r => r.id === id)
    if (result) {
      setResults(result.data)
      toast.success('Đã tải lại TKB từ kết quả đã lưu')
    }
  }

  const removeResult = (id: number) => {
    if (confirm('Bạn có chắc muốn xóa kết quả này?')) {
      setSavedResults(savedResults.filter(r => r.id !== id))
      toast.success('Đã xóa kết quả')
    }
  }

  const clearAllResults = () => {
    if (confirm('Bạn có chắc muốn xóa tất cả kết quả đã lưu?')) {
      setSavedResults([])
      toast.success('Đã xóa tất cả kết quả')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📅 Tạo Thời khóa biểu</h1>
          <p className="text-gray-600 mt-2">Quản lý và tạo thời khóa biểu tự động</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={resetTKB}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-5 h-5" />
            Reset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Nhập nhiều môn học (bảng)</h2>
        
        {/* System Type and Class Year Selection */}
        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại hệ đào tạo:</label>
            <select
              value={systemType}
              onChange={(e) => {
                setSystemType(e.target.value)
                setBatchRows([])
                setSelectedMajorGroup('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="chinh_quy">Hệ thường</option>
              <option value="he_dac_thu">Hệ đặc thù</option>
              <option value="chung">Chung</option>
            </select>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn khóa:</label>
            <select
              value={classYear}
              onChange={(e) => setClassYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="2022">Khóa 2022</option>
              <option value="2023">Khóa 2023</option>
              <option value="2024">Khóa 2024</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn ngành:</label>
            <select
              value={selectedMajorGroup}
              onChange={(e) => setSelectedMajorGroup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={!majorGroups.length}
            >
              <option value="">-- Chọn ngành --</option>
              {majorGroups.map((group, idx) => (
                <option key={idx} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={loadSubjectsByMajorGroup}
              disabled={!selectedMajorGroup || loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? 'Đang tải...' : 'Tải môn học'}
            </button>
          </div>
        </div>

        {/* Batch Table */}
        {batchRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-purple-600 text-white">
                  <th className="px-4 py-2 border">Mã môn</th>
                  <th className="px-4 py-2 border">Tên môn</th>
                  <th className="px-4 py-2 border">Sĩ số</th>
                  <th className="px-4 py-2 border">Sĩ số một lớp</th>
                  <th className="px-4 py-2 border">Khóa</th>
                  <th className="px-4 py-2 border">Ngành</th>
                  <th className="px-4 py-2 border">Gộp ngành</th>
                  <th className="px-4 py-2 border">Đăng ký chung</th>
                  <th className="px-4 py-2 border">Xóa</th>
                </tr>
              </thead>
              <tbody>
                {batchRows.map((row, index) => (
                  <tr key={index} className="border">
                    <td className="px-4 py-2 border">
                      <input
                        type="text"
                        value={row.mmh}
                        readOnly
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      <textarea
                        value={row.tmh}
                        readOnly
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      <input
                        type="number"
                        value={row.siso}
                        readOnly
                        className="w-full px-2 py-1 border rounded text-center"
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      <input
                        type="number"
                        value={row.siso_mot_lop}
                        onChange={(e) => updateBatchRow(index, 'siso_mot_lop', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border rounded text-center"
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      <input
                        type="text"
                        value={row.khoa}
                        readOnly
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      <input
                        type="text"
                        value={row.nganh}
                        readOnly
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <input type="checkbox" disabled />
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <input type="checkbox" disabled />
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <button
                        onClick={() => removeBatchRow(index)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={generateTKB}
            disabled={loading || batchRows.length === 0}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            🚀 Sinh TKB Batch
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Kết quả Thời khóa biểu</h2>
            <button
              onClick={saveToResults}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              💾 Thêm vào kết quả
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-purple-50">
                  <th className="px-4 py-2 border">Lớp</th>
                  <th className="px-4 py-2 border">Mã môn</th>
                  <th className="px-4 py-2 border">Tên môn</th>
                  <th className="px-4 py-2 border">Khóa</th>
                  <th className="px-4 py-2 border">Ngành</th>
                  <th className="px-4 py-2 border">Hệ đặc thù</th>
                  <th className="px-4 py-2 border">Thứ</th>
                  <th className="px-4 py-2 border">Kíp</th>
                  <th className="px-4 py-2 border">Tiết BD</th>
                  <th className="px-4 py-2 border">L</th>
                  <th className="px-4 py-2 border">Mã phòng</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border text-center">{row.lop || ''}</td>
                    <td className="px-4 py-2 border">{row.ma_mon || ''}</td>
                    <td className="px-4 py-2 border">{row.ten_mon || ''}</td>
                    <td className="px-4 py-2 border text-center">{row.khoa || ''}</td>
                    <td className="px-4 py-2 border">{row.nganh || ''}</td>
                    <td className="px-4 py-2 border">{row.he_dac_thu || ''}</td>
                    <td className="px-4 py-2 border text-center">{row.thu || ''}</td>
                    <td className="px-4 py-2 border text-center">{row.kip || ''}</td>
                    <td className="px-4 py-2 border text-center">{row.tiet_bd || ''}</td>
                    <td className="px-4 py-2 border text-center">{row.l || ''}</td>
                    <td className="px-4 py-2 border">{row.phong || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Saved Results */}
      {savedResults.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-green-800 mb-4">📚 Kết quả TKB đã lưu</h3>
          <div className="space-y-3">
            {savedResults.map((result) => (
              <div
                key={result.id}
                className="bg-white border border-green-200 rounded-lg p-4 flex justify-between items-center"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{result.title}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Ngành: {result.department} | Thời gian: {result.timestamp} | Số lớp: {result.data.length}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => viewResult(result.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    👁️ Xem
                  </button>
                  <button
                    onClick={() => removeResult(result.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={clearAllResults}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              🗑️ Xóa tất cả
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TKBPage

