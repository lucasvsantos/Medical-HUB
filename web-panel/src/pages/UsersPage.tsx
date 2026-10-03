import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { API, roleLabels } from '../config'
import { PageHeader } from '../components/PageHeader'
import { apiFetch, apiJson } from '../services/auth'
import type { Role, User } from '../types'

type UserForm = { name: string; email: string; password?: string; role: Role }

export function UsersPage() {
  const { message } = App.useApp()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form] = Form.useForm<UserForm>()

  const loadUsers = async () => {
    setLoading(true)
    try {
      setUsers(await apiJson<User[]>(`${API.auth}/users`))
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Não foi possível carregar os usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadUsers() }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldValue('role', 'PATIENT')
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    form.setFieldsValue({ name: user.name, email: user.email, role: user.role, password: undefined })
    setModalOpen(true)
  }

  const save = async (values: UserForm) => {
    setSaving(true)
    try {
      const body = { ...values }
      if (!body.password) delete body.password
      await apiFetch(editing ? `${API.auth}/users/${editing.id}` : `${API.auth}/users`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      message.success(editing ? 'Usuário atualizado.' : 'Usuário criado.')
      setModalOpen(false)
      await loadUsers()
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Não foi possível salvar o usuário.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (user: User) => {
    try {
      await apiFetch(`${API.auth}/users/${user.id}`, { method: 'DELETE' })
      message.success('Usuário removido.')
      await loadUsers()
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Não foi possível remover o usuário.')
    }
  }

  return (
    <>
      <PageHeader title="Usuários e roles" subtitle="Crie contas, altere permissões e mantenha os acessos do painel." />
      <div className="page-toolbar"><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Novo usuário</Button></div>
      <Table<User>
        rowKey="id"
        loading={loading}
        dataSource={users}
        scroll={{ x: 700 }}
        columns={[
          { title: 'Nome', dataIndex: 'name', key: 'name' },
          { title: 'E-mail', dataIndex: 'email', key: 'email' },
          { title: 'Role', dataIndex: 'role', key: 'role', render: (role: Role) => <Tag color="blue">{roleLabels[role]}</Tag> },
          {
            title: 'Ações', key: 'actions', width: 150,
            render: (_, user) => <Space>
              <Button type="text" icon={<EditOutlined />} aria-label={`Editar ${user.name}`} onClick={() => openEdit(user)} />
              <Popconfirm title="Remover este usuário?" description="A ação não pode ser desfeita." onConfirm={() => void remove(user)} okText="Remover" cancelText="Cancelar">
                <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Remover ${user.name}`} />
              </Popconfirm>
            </Space>,
          },
        ]}
      />
      <Modal title={editing ? 'Editar usuário' : 'Novo usuário'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={saving} okText="Salvar" cancelText="Cancelar">
        <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
          <Form.Item label="Nome" name="name" rules={[{ required: true, message: 'Informe o nome.' }]}><Input /></Form.Item>
          <Form.Item label="E-mail" name="email" rules={[{ required: true, type: 'email', message: 'Informe um e-mail válido.' }]}><Input /></Form.Item>
          <Form.Item label={editing ? 'Nova senha (opcional)' : 'Senha'} name="password" rules={editing ? [] : [{ required: true, min: 8, message: 'Use pelo menos 8 caracteres.' }]}><Input.Password /></Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Selecione a role.' }]}><Select options={Object.entries(roleLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}
