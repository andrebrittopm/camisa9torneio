import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

/**
 * ETAPA 5.1A — LAYOUT ADMINISTRATIVO PROTEGIDO
 * Movendo lógica de proteção para baixo (index.tsx) para evitar loop no route layout
 */

export const Route = createFileRoute('/admin')({
  component: () => <Outlet />,
})
