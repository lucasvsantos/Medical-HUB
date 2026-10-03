import { SearchOutlined } from '@ant-design/icons'
import { App, Button, Card, Drawer, Empty, Form, Input, Segmented, Space, Table, Tag, Timeline } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { API } from '../config'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { apiJson, getPrimaryRole } from '../services/auth'
import { AppointmentEventStatus, appointmentEventStatusLabels, type MedicalRecord } from '../types'

type SearchMode = 'id' | 'email'
type SearchForm = { value: string }

const fields = `id appointmentId patientId patientEmail patientName doctorId doctorEmail doctorName description appointmentDate eventStatus occurredAt`

export function HistoryPage() {
  const { claims } = useAuth()
  const { message } = App.useApp()
  const role = getPrimaryRole(claims)
  const [mode, setMode] = useState<SearchMode>('id')
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [timeline, setTimeline] = useState<MedicalRecord[]>([])
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm<SearchForm>()

  const query = async (values: SearchForm) => {
    setLoading(true)
    try {
      const field = mode === 'id' ? 'patientHistory' : 'patientHistoryByEmail'
      const variable = mode === 'id' ? 'patientId: ID!' : 'patientEmail: String!'
      const response = await apiJson<{ data?: { patientHistory?: MedicalRecord[]; patientHistoryByEmail?: MedicalRecord[] }; errors?: { message: string }[] }>(API.history, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query Search($value: ${mode === 'id' ? 'ID!' : 'String!'}) { ${field}(${variable.split(':')[0]}: $value) { ${fields} } }`, variables: { value: values.value } }),
      })
      if (response.errors?.length) throw new Error(response.errors[0].message)
      setRecords(mode === 'id' ? response.data?.patientHistory ?? [] : response.data?.patientHistoryByEmail ?? [])
    } catch (error) { message.error(error instanceof Error ? error.message : 'Não foi possível consultar o histórico.') }
    finally { setLoading(false) }
  }

  const loadTimeline = async (appointmentId: string) => {
    try {
      const response = await apiJson<{ data?: { appointmentTimeline: MedicalRecord[] }; errors?: { message: string }[] }>(API.history, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query Timeline($appointmentId: ID!) { appointmentTimeline(appointmentId: $appointmentId) { ${fields} } }`, variables: { appointmentId } }),
      })
      if (response.errors?.length) throw new Error(response.errors[0].message)
      setTimeline(response.data?.appointmentTimeline ?? []); setTimelineOpen(true)
    } catch (error) { message.error(error instanceof Error ? error.message : 'Não foi possível carregar a timeline.') }
  }

  const patientMode = role === 'PATIENT'
  return (
    <>
      <PageHeader title="Histórico médico" subtitle="Consulte o histórico por ID ou e-mail e acompanhe a linha do tempo da consulta." />
      {patientMode ? <Card className="search-card"><Space direction="vertical"><strong>Seu histórico</strong><Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => void query({ value: String(claims?.user_id ?? '') })}>Consultar meu histórico</Button></Space></Card> : (
        <Card className="search-card">
          <Form form={form} layout="inline" onFinish={query}>
            <Form.Item label="Buscar por"><Segmented value={mode} onChange={(value) => setMode(value as SearchMode)} options={[{ label: 'ID do paciente', value: 'id' }, { label: 'E-mail', value: 'email' }]} /></Form.Item>
            <Form.Item name="value" rules={[{ required: true, message: 'Informe o valor.' }]}><Input placeholder={mode === 'id' ? 'Ex.: 4' : 'paciente@email.com'} /></Form.Item>
            <Form.Item><Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>Consultar</Button></Form.Item>
          </Form>
        </Card>
      )}
      <Table<MedicalRecord> className="content-table" rowKey="id" dataSource={records} locale={{ emptyText: <Empty description="Nenhum registro encontrado" /> }} scroll={{ x: 1100 }} columns={[
        { title: 'Consulta', dataIndex: 'appointmentId' }, { title: 'Paciente', dataIndex: 'patientName', render: (value, row) => value || row.patientEmail || row.patientId },
        { title: 'Médico', dataIndex: 'doctorName', render: (value, row) => value || row.doctorEmail || row.doctorId },
        { title: 'Data', dataIndex: 'appointmentDate', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm') },
        { title: 'Evento', dataIndex: 'eventStatus', render: (value: AppointmentEventStatus) => <Tag color="blue">{appointmentEventStatusLabels[value]}</Tag> },
        { title: 'Ação', key: 'action', render: (_, row) => <Button type="link" onClick={() => void loadTimeline(row.appointmentId)}>Ver timeline</Button> },
      ]} />
      <Drawer title="Timeline da consulta" open={timelineOpen} onClose={() => setTimelineOpen(false)} width={520}>
        {timeline.length ? <Timeline items={timeline.map((item) => ({ color: item.eventStatus === AppointmentEventStatus.COMPLETED ? 'green' : 'blue', children: <div><strong>{appointmentEventStatusLabels[item.eventStatus]}</strong><div>{dayjs(item.occurredAt).format('DD/MM/YYYY HH:mm')}</div><span>{item.description || 'Atualização de consulta'}</span></div> }))} /> : <Empty description="Sem eventos" />}
      </Drawer>
    </>
  )
}
