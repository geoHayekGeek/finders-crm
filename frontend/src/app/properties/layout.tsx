'use client'

import { ReactNode } from 'react'
import DashboardLayout from '../dashboard/layout'

export default function PropertiesLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}

