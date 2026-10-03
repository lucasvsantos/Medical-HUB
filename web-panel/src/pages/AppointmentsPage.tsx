import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { App, Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'
import { API } from '../config'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { apiFetch, apiJson, getPrimaryRole } from '../services/auth'
import { AppointmentStatus, appointmentStatusLabels, type Appointment, type User } from '../types'

type AppointmentForm = { patientId: string; doctorId: string; appointmentDate: Dayjs; description?: string }

const statusColors: Record<AppointmentStatus, string> = { SCHEDULED: 'blue', COMPLETED: 'green', CANCELLED: 'red' }

export function AppointmentsPage() {
  const { claims } = useAuth()
  const { message } = App.useApp()
  const role = getPrimaryRole(claims)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<User[]>([])
  const [doctors, setDoctors] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [form] = Form.useForm<AppointmentForm>()

  const loadAppointments = async () => {
    setLoading(true)
    try {
      const url = role === 'PATIENT' ? `${API.appointments}/patient/${claims?.user_id}` : API.appointments
      setAppointments(await apiJson<Appointment[]>(url))
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Não foi possível carregar os agendamentos.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadAppointments() }, [role, claims?.user_id])

  useEffect(() => {
    if (role !== 'DOCTOR' && role !== 'NURSE') return
    const loadDirectory = async () => {
      setDirectoryLoading(true)
      try {
        const [patientUsers, doctorUsers] = await Promise.all([
          apiJson<User[]>(`${API.auth}/users/directory?role=PATIENT`),
          apiJson<User[]>(`${API.auth}/users/directory?role=DOCTOR`),
        ])
        setPatients(patientUsers)
        setDoctors(doctorUsers)
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Não foi possível carregar pacientes e médicos.')
      } finally { setDirectoryLoading(false) }
    }
    void loadDirectory()
  }, [role])

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (appointment: Appointment) => {
    setEditing(appointment)
    form.setFieldsValue({
      patientId: String(appointment.patientId), doctorId: String(appointment.doctorId),
      appointmentDate: dayjs(appointment.appointmentDate), description: appointment.description,
    })
    setModalOpen(true)
  }

  const save = async (values: AppointmentForm) => {
    setSaving(true)
    try {
      const body = {
        ...values,
        patientId: Number(values.patientId),
        doctorId: Number(values.doctorId),
        appointmentDate: values.appointmentDate.format('YYYY-MM-DDTHH:mm:ss'),
      }
      await apiFetch(editing ? `${API.appointments}/${editing.id}` : API.appointments, {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      message.success(editing ? 'Agendamento atualizado.' : 'Agendamento criado.')
      setModalOpen(false); await loadAppointments()
    } catch (error) { message.error(error instanceof Error ? error.message : 'Não foi possível salvar o agendamento.') }
    finally { setSaving(false) }
  }

  const updateStatus = async (appointment: Appointment, status: AppointmentStatus) => {
    try {
      await apiFetch(`${API.appointments}/${appointment.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      message.success('Status atualizado.'); await loadAppointments()
    } catch (error) { message.error(error instanceof Error ? error.message : 'Não foi possível atualizar o status.') }
  }

  return (
    <>
      <PageHeader title="Agendamentos" subtitle="Consulte a agenda e acompanhe o status das consultas." />
      <div className="page-toolbar">
        <Space>
          {role === 'NURSE' && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Novo agendamento</Button>}
          <Button icon={<ReloadOutlined />} onClick={() => void loadAppointments()}>Atualizar</Button>
        </Space>
      </div>
      <Table<Appointment> rowKey="id" loading={loading} dataSource={appointments} scroll={{ x: 900 }} columns={[
        { title: 'Data', dataIndex: 'appointmentDate', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm') },
        { title: 'Paciente', dataIndex: 'patientId' }, { title: 'Médico', dataIndex: 'doctorId' },
        { title: 'Descrição', dataIndex: 'description', render: (value?: string) => value || '—' },
        { title: 'Status', dataIndex: 'status', render: (status: AppointmentStatus) => <Tag color={statusColors[status]}>{appointmentStatusLabels[status]}</Tag> },
        {
          title: 'Ações', key: 'actions', render: (_, appointment) => <Space>
            {(role === 'DOCTOR' || role === 'NURSE') && <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(appointment)}>Editar</Button>}
            {(role === 'DOCTOR' || role === 'NURSE') && appointment.status === AppointmentStatus.SCHEDULED && <Select size="small" placeholder="Status" onChange={(status: AppointmentStatus) => void updateStatus(appointment, status)} options={[{ value: AppointmentStatus.COMPLETED, label: 'Concluir' }, { value: AppointmentStatus.CANCELLED, label: 'Cancelar' }]} />}
          </Space>,
        },
      ]} />
      <Modal title={editing ? 'Editar agendamento' : 'Novo agendamento'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={saving} okText="Salvar" cancelText="Cancelar">
        <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
          <Form.Item label="Paciente" name="patientId" rules={[{ required: true, message: 'Selecione o paciente.' }]}>
            <Select
              showSearch
              loading={directoryLoading}
              placeholder="Selecione um paciente"
              optionFilterProp="label"
              options={patients.map((patient) => ({ value: String(patient.id), label: `${patient.name} · ${patient.email}` }))}
            />
          </Form.Item>
          <Form.Item label="Médico" name="doctorId" rules={[{ required: true, message: 'Selecione o médico.' }]}>
            <Select
              showSearch
              loading={directoryLoading}
              placeholder="Selecione um médico"
              optionFilterProp="label"
              options={doctors.map((doctor) => ({ value: String(doctor.id), label: `${doctor.name} · ${doctor.email}` }))}
            />
          </Form.Item>
          <Form.Item label="Data e hora" name="appointmentDate" rules={[{ required: true, message: 'Informe a data.' }]}><DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Descrição" name="description" rules={[{ required: true, message: 'Informe a descrição.' }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}
