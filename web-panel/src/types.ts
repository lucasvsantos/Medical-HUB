export type Role = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'PATIENT'

export type JwtClaims = {
  sub: string
  user_id?: string | number
  scope?: string
  exp: number
  iat?: number
}

export type User = {
  id: string
  name: string
  email: string
  role: Role
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AppointmentEventStatus {
  SCHEDULED = 'SCHEDULED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
}

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'Agendada',
  [AppointmentStatus.COMPLETED]: 'Concluída',
  [AppointmentStatus.CANCELLED]: 'Cancelada',
}

export const appointmentEventStatusLabels: Record<AppointmentEventStatus, string> = {
  [AppointmentEventStatus.SCHEDULED]: 'Agendada',
  [AppointmentEventStatus.RESCHEDULED]: 'Reagendada',
  [AppointmentEventStatus.CANCELLED]: 'Cancelada',
  [AppointmentEventStatus.COMPLETED]: 'Concluída',
}

export const notificationStatusLabels: Record<NotificationStatus, string> = {
  [NotificationStatus.PENDING]: 'Pendente',
  [NotificationStatus.SENT]: 'Enviada',
}

export type Appointment = {
  id: string
  patientId: string
  doctorId: string
  appointmentDate: string
  description?: string
  status: AppointmentStatus
}

export type MedicalRecord = {
  id: string
  appointmentId: string
  patientId: string
  patientEmail?: string
  patientName?: string
  doctorId: string
  doctorEmail?: string
  doctorName?: string
  description?: string
  appointmentDate: string
  eventStatus: AppointmentEventStatus
  occurredAt: string
}

export type Notification = {
  id: string
  patientId: string
  patientEmail?: string
  patientName?: string
  type?: string
  eventStatus?: AppointmentEventStatus
  message: string
  status: NotificationStatus
  createdAt: string
}

export type ApiError = Error & { status?: number }
