export const API = {
  auth: '/api/auth',
  appointments: '/api/appointments',
  history: '/api/history/graphql',
  notifications: '/api/notifications',
} as const

export const roleLabels = {
  ADMIN: 'Administrador',
  DOCTOR: 'Médico',
  NURSE: 'Enfermagem',
  PATIENT: 'Paciente',
} as const
