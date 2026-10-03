import { CalendarOutlined, HistoryOutlined, NotificationOutlined, TeamOutlined } from '@ant-design/icons'
import { Card, Col, Row, Statistic, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { getPrimaryRole } from '../services/auth'
import { useAuth } from '../context/AuthContext'

export function DashboardPage() {
  const { claims } = useAuth()
  const navigate = useNavigate()
  const role = getPrimaryRole(claims)
  const cards = role === 'ADMIN'
    ? [{ title: 'Usuários', icon: <TeamOutlined />, path: '/users', hint: 'Gerencie contas e roles' }]
    : [
        { title: 'Agendamentos', icon: <CalendarOutlined />, path: '/appointments', hint: 'Acompanhe a agenda clínica' },
        { title: 'Histórico médico', icon: <HistoryOutlined />, path: '/history', hint: 'Consulte eventos clínicos' },
        { title: 'Notificações', icon: <NotificationOutlined />, path: '/notifications', hint: 'Acompanhe comunicações' },
      ]

  return (
    <>
      <PageHeader title="Visão geral" subtitle={`Olá! Este é o painel de ${role === 'ADMIN' ? 'administração' : 'atendimento'} do Medical HUB.`} />
      <Row gutter={[20, 20]}>
        {cards.map((card) => (
          <Col xs={24} sm={12} lg={8} key={card.path}>
            <Card hoverable onClick={() => navigate(card.path)}>
              <Statistic title={card.title} value="Acessar" prefix={card.icon} />
              <Typography.Text type="secondary">{card.hint}</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  )
}
