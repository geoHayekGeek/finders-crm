'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import SettingsPageContent from './SettingsPageContent'

export default function SettingsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <SettingsPageContent />
    </ProtectedRoute>
  )
}
