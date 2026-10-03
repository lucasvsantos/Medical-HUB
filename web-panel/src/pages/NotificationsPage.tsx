import { BellOutlined, SearchOutlined } from '@ant-design/icons'
import { App, Button, Card, Form, Input, Space, Table, Tag } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { API } from '../config'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { apiJson, getPrimaryRole } from '../services/auth'
import { appointmentEventStatusLabels, notificationStatusLabels, type Notification, type AppointmentEventStatus, type NotificationStatus } from '../types'

export function NotificationsPage() {
  const { claims } = useAuth()
  const { message } = App.useApp()
  const role = getPrimaryRole(claims)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm<{ email: string }>()
  const ownEmail = claims?.sub ?? ''

  const load = async (email: string) => {
    setLoading(true)
    try { setNotifications(await apiJson<Notification[]>(`${API.notifications}?patientEmail=${encodeURIComponent(email)}`)) }
    catch (error) { message.error(error instanceof Error ? error.message : 'Não foi possível carregar as notificações.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <PageHeader title="Notificações" subtitle="Consulte as comunicações associadas ao e-mail do paciente." />
      <Card className="search-card">
        {role === 'PATIENT' ? <Space><Button type="primary" icon={<BellOutlined />} loading={loading} onClick={() => void load(ownEmail)}>Carregar minhas notificações</Button><span className="muted">{ownEmail}</span></Space> : <Form form={form} layout="inline" onFinish={({ email }) => void load(email)}><Form.Item label="E-mail do paciente" name="email" rules={[{ required: true, type: 'email', message: 'Informe um e-mail válido.' }]}><Input placeholder="paciente@email.com" /></Form.Item><Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>Consultar</Button></Form>}
      </Card>
      <Table<Notification> rowKey="id" dataSource={notifications} loading={loading} scroll={{ x: 900 }} columns={[
        { title: 'Paciente', dataIndex: 'patientName', render: (value, row) => value || row.patientEmail || row.patientId },
        { title: 'Mensagem', dataIndex: 'message' }, { title: 'Evento', dataIndex: 'eventStatus', render: (value?: AppointmentEventStatus) => value ? <Tag color="blue">{appointmentEventStatusLabels[value]}</Tag> : '—' },
        { title: 'Status', dataIndex: 'status', render: (value: NotificationStatus) => <Tag color={value === 'SENT' ? 'green' : 'orange'}>{notificationStatusLabels[value]}</Tag> },
        { title: 'Criada em', dataIndex: 'createdAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm') },
      ]} />
    </>
  )
}
