import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  status?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

// Subject Types
export interface Subject {
  id: number
  subjectCode: string
  subjectName: string
  credits: number
  theoryHours: number
  exerciseHours: number
  projectHours: number
  labHours: number
  selfStudyHours: number
  examFormat: string
  classYear: string
  programType: string
  numberOfStudents: number
  numberOfClasses: number
  department: string
  studentsPerClass: number | null
  majorId: number
  majorCode: string
  majorName: string | null
  facultyId: string
  facultyName: string | null
}

export interface SubjectByMajor {
  subjectCode: string
  subjectName: string
  majorCode: string
  classYear: string
  numberOfStudents: number
  studentPerClass: number | null
}

export interface SubjectRequest {
  subjectCode: string
  subjectName: string
  credits: number
  theoryHours: number
  exerciseHours: number
  projectHours: number
  labHours: number
  selfStudyHours: number
  examFormat: string
  classYear: string
  programType: string
  numberOfStudents: number
  numberOfClasses: number
  department: string
  studentsPerClass?: number
  majorId: number
}

// Room Types
export interface Room {
  id: number
  roomCode: string
  building: string
  capacity: number
  roomType: 'CLASSROOM' | 'LAB' | 'LIBRARY' | 'MEETING'
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
  equipment?: string[]
  floor?: number
}

export interface RoomRequest {
  roomCode: string
  building: string
  capacity: number
  roomType: 'CLASSROOM' | 'LAB' | 'LIBRARY' | 'MEETING'
  status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
  equipment?: string[]
  floor?: number
}

// API Services
export const subjectService = {
  getAll: (page = 1, size = 10, search?: string) => {
    const params = new URLSearchParams({ 
      page: page.toString(), 
      size: size.toString() 
    })
    if (search) params.append('search', search)
    return api.get<ApiResponse<PaginatedResponse<Subject>>>(`/subjects?${params}`)
  },
  getById: (id: number) => api.get<ApiResponse<Subject>>(`/subjects/${id}`),
  getByMajor: (majorId: number) => api.get<ApiResponse<Subject[]>>(`/subjects/major/${majorId}`),
  search: (name: string) => api.get<ApiResponse<Subject[]>>(`/subjects/search?name=${name}`),
  create: (data: SubjectRequest) => api.post<ApiResponse<Subject>>('/subjects', data),
  update: (id: number, data: SubjectRequest) => api.put<ApiResponse<Subject>>(`/subjects/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/subjects/${id}`),
  getGroupMajors: (classYear: string, programType: string) => {
    const params = new URLSearchParams({ 
      classYear: classYear,
      programType: programType
    })
    return api.get<ApiResponse<string[][]>>(`/subjects/group-majors?${params}`)
  },
  getByMajors: (classYear: string, programType: string, majorCodes: string[]) => {
    const params = new URLSearchParams({ 
      classYear: classYear,
      programType: programType
    })
    majorCodes.forEach(code => params.append('majorCodes', code))
    return api.get<ApiResponse<SubjectByMajor[]>>(`/subjects/majors?${params}`)
  },
}

export const roomService = {
  getAll: () => api.get<ApiResponse<Room[]>>('/rooms'),
  getById: (id: number) => api.get<ApiResponse<Room>>(`/rooms/${id}`),
  create: (data: RoomRequest) => api.post<ApiResponse<Room>>('/rooms', data),
  update: (id: number, data: RoomRequest) => api.put<ApiResponse<Room>>(`/rooms/${id}`, data),
  delete: (id: number) => api.delete(`/rooms/${id}`),
  getByBuilding: (building: string) => api.get<ApiResponse<Room[]>>(`/rooms/building/${building}`),
  getByStatus: (status: string) => api.get<ApiResponse<Room[]>>(`/rooms/status/${status}`),
  getByType: (type: string) => api.get<ApiResponse<Room[]>>(`/rooms/type/${type}`),
  getAvailable: (capacity: number) => api.get<ApiResponse<Room[]>>(`/rooms/available?capacity=${capacity}`),
}

export default api

