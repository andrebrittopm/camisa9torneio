import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/orders_/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/orders_/"!</div>
}
