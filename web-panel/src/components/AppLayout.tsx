import {
  CalendarOutlined,
  HistoryOutlined,
  HomeOutlined,
  LogoutOutlined,
  MedicineBoxOutlined,
  NotificationOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Layout, Menu, Space, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { roleLabels } from '../config'
import { useAuth } from '../context/AuthContext'
import { getPrimaryRole } from '../services/auth'

const { Header, Sider, Content } = Layout

export function AppLayout() {
  const { claims, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const role = getPrimaryRole(claims)

  const menuItems = useMemo(() => {
    const items = [
      { key: '/', icon: <HomeOutlined />, label: 'Visão geral' },
      { key: '/appointments', icon: <CalendarOutlined />, label: 'Agendamentos' },
      { key: '/history', icon: <HistoryOutlined />, label: 'Histórico médico' },
      { key: '/notifications', icon: <NotificationOutlined />, label: 'Notificações' },
    ]
    if (role === 'ADMIN') {
      items.splice(1, items.length, { key: '/users', icon: <TeamOutlined />, label: 'Usuários e roles' })
    }
    return items
  }, [role])

  return (
    <Layout className="app-shell">
      <Sider breakpoint="lg" collapsedWidth="0" theme="light" className="app-sider">
        <div className="brand">
          <div className="brand-mark"><MedicineBoxOutlined /></div>
          <div>
            <strong>Medical HUB</strong>
            <span>Painel operacional</span>
          </div>
        </div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div className="header-title">
            <Typography.Text>Gestão clínica integrada</Typography.Text>
          </div>
          <Space size="middle">
            <Space>
              <Avatar icon={<UserOutlined />} />
              <div className="user-summary">
                <strong>{claims?.sub}</strong>
                <Tag color="blue">{role ? roleLabels[role] : 'Usuário'}</Tag>
              </div>
            </Space>
            <Button type="text" icon={<LogoutOutlined />} onClick={() => { logout(); navigate('/login') }}>
              Sair
            </Button>
          </Space>
        </Header>
        <Content className="app-content"><Outlet /></Content>
      </Layout>
    </Layout>
  )
}
