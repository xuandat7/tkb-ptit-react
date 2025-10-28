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
}

// Faculty Types
export interface Faculty {
  id: string
  name: string
  description?: string
  code?: string
}

export interface FacultyRequest {
  name: string
  description?: string
  code?: string
}

// Major Types
export interface Major {
  id: string
  majorName: string
  numberOfStudents: number
  classYear: string
  facultyId: string
  facultyName?: string
}

export interface MajorRequest {
  majorName: string
  numberOfStudents: number
  classYear: string
  facultyId: string
}

// Subject Types
export interface Subject {
  id: string
  subjectCode: string
  subjectName: string
  studentsPerClass: number
  numberOfClasses: number
  credits: number
  theoryHours: number
  exerciseHours: number
  projectHours: number
  labHours: number
  selfStudyHours: number
  department: string
  examFormat: string
  majorId: string
  majorName?: string
}

export interface SubjectRequest {
  subjectCode: string
  subjectName: string
  studentsPerClass: number
  numberOfClasses: number
  credits: number
  theoryHours: number
  exerciseHours: number
  projectHours: number
  labHours: number
  selfStudyHours: number
  department: string
  examFormat: string
  majorId: string
  facultyId: string
  majorName?: string
  numberOfStudents?: number
  classYear?: string
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
export const facultyService = {
  getAll: () => api.get<Faculty[]>('/faculties'),
  getById: (id: string) => api.get<Faculty>(`/faculties/${id}`),
  create: (data: FacultyRequest) => api.post<Faculty>('/faculties', data),
  update: (id: string, data: FacultyRequest) => api.put<Faculty>(`/faculties/${id}`, data),
  delete: (id: string) => api.delete(`/faculties/${id}`),
}

export const majorService = {
  getAll: () => api.get<Major[]>('/majors'),
  getById: (id: string) => api.get<Major>(`/majors/${id}`),
  getByFaculty: (facultyId: string) => api.get<Major[]>(`/majors/faculty/${facultyId}`),
  create: (data: MajorRequest) => api.post<Major>('/majors', data),
  update: (id: string, data: MajorRequest) => api.put<Major>(`/majors/${id}`, data),
  delete: (id: string) => api.delete(`/majors/${id}`),
}

export const subjectService = {
  getAll: () => api.get<Subject[]>('/subjects'),
  getById: (id: string) => api.get<Subject>(`/subjects/${id}`),
  getByMajor: (majorId: string) => api.get<Subject[]>(`/subjects/major/${majorId}`),
  search: (name: string) => api.get<Subject[]>(`/subjects/search?name=${name}`),
  create: (data: SubjectRequest) => api.post<Subject>('/subjects', data),
  update: (id: string, data: SubjectRequest) => api.put<Subject>(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
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

