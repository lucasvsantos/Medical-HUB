import { Breadcrumb, Typography } from 'antd'

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page-heading">
      <Breadcrumb items={[{ title: 'Medical HUB' }, { title }]} />
      <Typography.Title level={2}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">{subtitle}</Typography.Paragraph>
    </div>
  )
}
