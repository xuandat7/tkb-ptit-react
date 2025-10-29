import { useState, useEffect, useRef } from 'react'
import { Play, Loader, RefreshCw, Upload } from 'lucide-react'
import api, { curriculumService } from '../services/api'
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
  student_year?: string
}

interface SavedResult {
  id: number
  timestamp: string
  department: string
  data: TKBResultRow[]
  title: string
}

const TKBPage = () => {
  const [systemType, setSystemType] = useState('')
  const [khoas, setKhoas] = useState<string[]>([])
  const [selectedKhoa, setSelectedKhoa] = useState('')
  const [majorGroups, setMajorGroups] = useState<string[]>([])
  const [selectedMajorGroup, setSelectedMajorGroup] = useState('')
  const [batchRows, setBatchRows] = useState<BatchRow[]>([])
  const [results, setResults] = useState<TKBResultRow[]>([])
  const [savedResults, setSavedResults] = useState<SavedResult[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (systemType === '') {
      loadKhoas()
    }
  }, [systemType])

  useEffect(() => {
    if (selectedKhoa && systemType !== 'chung') {
      loadMajorGroups()
    }
  }, [selectedKhoa, systemType])

  const loadKhoas = async () => {
    try {
      // Load from curriculum.json file
      const response = await fetch('/curriculum.json')
      const curriculum = await response.json()
      
      // Extract unique khoas and convert to string
      const khoaValues = curriculum.map((item: any) => item.khoa)
      const uniqueKhoas = Array.from(new Set(khoaValues))
        .map(k => k?.toString().replace(/\.0$/, '') || '')
        .filter(Boolean)
        .sort()
      
      setKhoas(uniqueKhoas)
      toast.success(`Đã tải ${uniqueKhoas.length} khóa học`)
    } catch (error) {
      toast.error('Không thể tải danh sách khóa')
    }
  }

  const loadMajorGroups = async () => {
    if (!selectedKhoa) return
    
    try {
      // Load from curriculum.json file
      const response = await fetch('/curriculum.json')
      const curriculum = await response.json()
      
      // Filter by selectedKhoa and extract unique ngành
      // Support both "2022" and "2022.0" format
      const selectedKhoaNormalized = selectedKhoa.includes('.') ? selectedKhoa : `${selectedKhoa}.0`
      const filteredByKhoa = curriculum.filter(
        (item: any) => {
          const itemKhoa = item.khoa?.toString()
          return itemKhoa === selectedKhoa || 
                 itemKhoa === selectedKhoaNormalized || 
                 itemKhoa === selectedKhoa + '.0'
        }
      )
      
      // Extract unique majors for this khoa
      const uniqueMajors = Array.from(
        new Set(filteredByKhoa.map((item: any) => item.nganh).filter(Boolean))
      ).sort() as string[]
      
      setMajorGroups(uniqueMajors)
      toast.success(`Đã tải ${uniqueMajors.length} ngành`)
    } catch (error) {
      toast.error('Không thể tải danh sách ngành')
    }
  }

  const loadSubjectsByMajorGroup = async () => {
    if (!selectedKhoa || !selectedMajorGroup) {
      toast.error('Vui lòng chọn khóa và ngành trước')
      return
    }

    try {
      setLoading(true)
      
      // Load from curriculum.json file
      const response = await fetch('/curriculum.json')
      const curriculum = await response.json()
      
      // Filter by khoa and nganh
      const selectedKhoaNormalized = selectedKhoa.includes('.') ? selectedKhoa : `${selectedKhoa}.0`
      const subjects = curriculum.filter((item: any) => {
        const itemKhoa = item.khoa?.toString()
        const matchesKhoa = itemKhoa === selectedKhoa || 
                           itemKhoa === selectedKhoaNormalized || 
                           itemKhoa === selectedKhoa + '.0'
        const matchesNganh = item.nganh === selectedMajorGroup
        return matchesKhoa && matchesNganh
      })
      
      // Map to batch row format
      const newRows = subjects.map((item: any) => {
        const sotiet = (item.ly_thuyet || 0) + (item.tl_bt || 0) + (item.bt_lon || 0) || item.ts_tiet || 0
        
        return {
          mmh: item.mmh,
          tmh: item.tmh,
          sotiet: sotiet,
          solop: item.so_lop || 0,
          siso: item.si_so || 0,
          siso_mot_lop: 60, // Default
          nganh: item.nganh || '',
          khoa: (item.khoa || '').toString().replace(/\.0$/, ''),
          he_dac_thu: item.he_dac_thu || '',
        }
      })
      
      setBatchRows(newRows)
      toast.success(`Đã tải ${subjects.length} môn học`)
    } catch (error: any) {
      toast.error('Không thể tải môn học: ' + error.message)
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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['.xlsx', '.xls']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!validTypes.includes(fileExtension)) {
      toast.error('Vui lòng chọn file Excel (.xlsx hoặc .xls)')
      return
    }

    try {
      setImporting(true)
      // Import với học kỳ mặc định (có thể điều chỉnh)
      const response = await curriculumService.importExcel(file, '1')
      
      if (response.data.success) {
        toast.success(response.data.message || 'Import thành công!')
        // Reload dữ liệu
        await loadKhoas()
        // Reset selections
        setSelectedKhoa('')
        setSelectedMajorGroup('')
        setBatchRows([])
      } else {
        toast.error(response.data.message || 'Import thất bại')
      }
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error(error.response?.data?.message || 'Lỗi khi import file')
    } finally {
      setImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5" />
            {importing ? 'Đang import...' : 'Import Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            className="hidden"
          />
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
        
        {/* System Type Selection */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại hệ đào tạo:</label>
            <select
              value={systemType}
              onChange={(e) => {
                setSystemType(e.target.value)
                setBatchRows([])
                setSelectedKhoa('')
                setSelectedMajorGroup('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Hệ thường</option>
              <option value="he_dac_thu">Hệ đặc thù</option>
              <option value="chung">Chung</option>
            </select>
          </div>

          {/* Khoa Selection */}
          {systemType !== 'chung' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chọn khóa:</label>
              <select
                value={selectedKhoa}
                onChange={(e) => setSelectedKhoa(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">-- Chọn khóa --</option>
                {khoas.map((khoa) => (
                  <option key={khoa} value={khoa}>
                    Khóa {khoa.toString().replace(/\.0$/, '')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Department/Major Selection */}
          {systemType !== 'chung' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {systemType === 'he_dac_thu' ? 'Chọn ngành:' : 'Chọn ngành:'}
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedMajorGroup}
                  onChange={(e) => setSelectedMajorGroup(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Chọn ngành --</option>
                  {majorGroups.map((group, idx) => (
                    <option key={idx} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadSubjectsByMajorGroup}
                  disabled={!selectedMajorGroup || loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Tải môn học
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Batch Table */}
        {batchRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-red-600 text-white">
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
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
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
                <tr className="bg-red-50">
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
                  {Array.from({ length: 18 }, (_, i) => (
                    <th key={i} className="px-2 py-2 border text-center">
                      Tuần {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let lastKey: string | null = null
                  let flip = false
                  
                  return results.map((row, idx) => {
                    const schedule = row.O_to_AG || []
                    const key = `${row.ma_mon || ''}|${row.lop || ''}`
                    if (key !== lastKey) {
                      flip = !flip
                      lastKey = key
                    }
                    const rowClass = flip ? 'bg-blue-50' : 'bg-white'
                    
                    return (
                      <tr key={idx} className={`hover:bg-gray-100 ${rowClass}`}>
                        <td className="px-4 py-2 border text-center">{row.lop || ''}</td>
                        <td className="px-4 py-2 border">{row.ma_mon || ''}</td>
                        <td className="px-4 py-2 border">{row.ten_mon || ''}</td>
                        <td className="px-4 py-2 border text-center">{row.khoa || row.student_year || ''}</td>
                        <td className="px-4 py-2 border">{row.nganh || ''}</td>
                        <td className="px-4 py-2 border">{row.he_dac_thu || ''}</td>
                        <td className="px-4 py-2 border text-center">{row.thu || ''}</td>
                        <td className="px-4 py-2 border text-center">{row.kip || ''}</td>
                        <td className="px-4 py-2 border text-center">{row.tiet_bd || ''}</td>
                        <td className="px-4 py-2 border text-center">{row.l || ''}</td>
                        <td className="px-4 py-2 border">{row.phong || ''}</td>
                        {Array.from({ length: 18 }, (_, i) => {
                          let value = ''
                          if (i === 17) {
                            // Tuần 18 hiển thị giá trị ah
                            value = row.ah || ''
                          } else {
                            // Tuần 1-17 hiển thị từ O_to_AG
                            value = schedule[i] || ''
                          }
                          const isX = value === 'x'
                          return (
                            <td
                              key={i}
                              className={`px-2 py-2 border text-center text-xs ${
                                isX ? 'x-cell' : ''
                              }`}
                            >
                              {value}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                })()}
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

