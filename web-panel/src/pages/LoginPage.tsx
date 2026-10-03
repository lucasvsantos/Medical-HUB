import { LockOutlined, MedicineBoxOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type LoginForm = { email: string; password: string }

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (values: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      await login(values.email, values.password)
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      navigate(from ?? '/', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <Card className="login-card" bordered={false}>
        <div className="login-brand">
          <div className="brand-mark large"><MedicineBoxOutlined /></div>
          <Typography.Title level={2}>Medical HUB</Typography.Title>
          <Typography.Text type="secondary">Acesse o painel da sua equipe</Typography.Text>
        </div>
        {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}
        <Form layout="vertical" onFinish={submit} requiredMark={false} className="login-form">
          <Form.Item label="E-mail" name="email" rules={[{ required: true, type: 'email', message: 'Informe um e-mail válido.' }]}>
            <Input prefix={<UserOutlined />} placeholder="seu.email@hospital.com" size="large" />
          </Form.Item>
          <Form.Item label="Senha" name="password" rules={[{ required: true, message: 'Informe sua senha.' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Sua senha" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">Entrar</Button>
        </Form>
      </Card>
    </main>
  )
}
