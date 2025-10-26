'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Building2,
  Mail,
  Image,
  Save,
  X,
  Upload,
  Trash2,
  AlertCircle,
  RotateCcw,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'

interface Setting {
  setting_key: string
  setting_value: string
  setting_type: string
  description: string
  category: string
}

interface EmailSettings {
  email_notifications_enabled: boolean
  email_notifications_calendar_events: boolean
  email_notifications_viewings: boolean
  email_notifications_properties: boolean
  email_notifications_leads: boolean
  email_notifications_users: boolean
}

interface ReminderSettings {
  reminder_1_day_before: boolean
  reminder_same_day: boolean
  reminder_1_hour_before: boolean
}

interface Toast {
  id: number
  type: 'success' | 'error' | 'warning'
  message: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000'
const DEFAULT_PRIMARY_COLOR = '#3B82F6'

export default function SettingsPageContent() {
  const { token } = useAuth()
  const { refreshSettings } = useSettings()
  const [activeTab, setActiveTab] = useState('company')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  
  // Settings state
  const [companyName, setCompanyName] = useState('')
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [companyFavicon, setCompanyFavicon] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  
  // Email settings
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    email_notifications_enabled: true,
    email_notifications_calendar_events: true,
    email_notifications_viewings: true,
    email_notifications_properties: true,
    email_notifications_leads: true,
    email_notifications_users: true
  })
  
  // Reminder settings
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    reminder_1_day_before: true,
    reminder_same_day: true,
    reminder_1_hour_before: true
  })

  // Email configuration
  const [emailFromName, setEmailFromName] = useState('Finders CRM')
  const [emailFromAddress, setEmailFromAddress] = useState('noreply@finderscrm.com')

  const tabs = [
    { id: 'company', name: 'Company & Branding', icon: Building2 },
    { id: 'email', name: 'Email Automation', icon: Mail },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ]

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  // Toast notification functions
  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to load settings')
      }

      const data = await response.json()
      const settings = data.settings as Setting[]
      
      // Convert settings array to object
      const settingsObj: Record<string, any> = {}
      settings.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value
      })
      
      // Set company settings
      setCompanyName(settingsObj.company_name || '')
      setPrimaryColor(settingsObj.primary_color || DEFAULT_PRIMARY_COLOR)
      
      // Set logo and favicon with full URL
      const logoUrl = settingsObj.company_logo ? `${API_BASE_URL}${settingsObj.company_logo}` : null
      const faviconUrl = settingsObj.company_favicon ? `${API_BASE_URL}${settingsObj.company_favicon}` : null
      setCompanyLogo(logoUrl)
      setCompanyFavicon(faviconUrl)
      setLogoPreview(logoUrl)
      setFaviconPreview(faviconUrl)
      
      // Set email settings
      setEmailSettings({
        email_notifications_enabled: settingsObj.email_notifications_enabled === 'true',
        email_notifications_calendar_events: settingsObj.email_notifications_calendar_events === 'true',
        email_notifications_viewings: settingsObj.email_notifications_viewings === 'true',
        email_notifications_properties: settingsObj.email_notifications_properties === 'true',
        email_notifications_leads: settingsObj.email_notifications_leads === 'true',
        email_notifications_users: settingsObj.email_notifications_users === 'true'
      })
      
      // Set reminder settings
      setReminderSettings({
        reminder_1_day_before: settingsObj.reminder_1_day_before === 'true',
        reminder_same_day: settingsObj.reminder_same_day === 'true',
        reminder_1_hour_before: settingsObj.reminder_1_hour_before === 'true'
      })
      
      // Set email config
      setEmailFromName(settingsObj.email_from_name || 'Finders CRM')
      setEmailFromAddress(settingsObj.email_from_address || 'noreply@finderscrm.com')
    } catch (error) {
      console.error('Error loading settings:', error)
      showToast('error', 'Failed to load settings. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      
      // Validate inputs
      if (!companyName.trim()) {
        showToast('error', 'Company name is required')
        return
      }

      if (emailFromAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFromAddress)) {
        showToast('error', 'Invalid email address format')
        return
      }

      // Validate color format
      if (!/^#[0-9A-F]{6}$/i.test(primaryColor)) {
        showToast('error', 'Invalid color format. Use hex format like #3B82F6')
        return
      }
      
      // Prepare settings to update
      const settingsToUpdate = [
        { key: 'company_name', value: companyName },
        { key: 'primary_color', value: primaryColor },
        { key: 'email_from_name', value: emailFromName },
        { key: 'email_from_address', value: emailFromAddress },
        ...Object.entries(emailSettings).map(([key, value]) => ({ key, value: value.toString() })),
        ...Object.entries(reminderSettings).map(([key, value]) => ({ key, value: value.toString() }))
      ]
      
      // Update settings via API
      const response = await fetch(`${API_BASE_URL}/api/settings/bulk/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ settings: settingsToUpdate })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to save settings')
      }

      // Upload logo if selected
      if (logoFile) {
        try {
          await uploadLogo(logoFile)
          setLogoFile(null) // Clear file after upload
        } catch (error) {
          showToast('error', 'Failed to upload logo')
          throw error
        }
      }
      
      // Upload favicon if selected
      if (faviconFile) {
        try {
          await uploadFavicon(faviconFile)
          setFaviconFile(null) // Clear file after upload
        } catch (error) {
          showToast('error', 'Failed to upload favicon')
          throw error
        }
      }
      
      showToast('success', 'Settings saved successfully!')
      
      // Reload settings to get updated values
      await loadSettings()
      
      // Refresh global settings context
      await refreshSettings()
    } catch (error: any) {
      console.error('Error saving settings:', error)
      showToast('error', error.message || 'Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (file: File) => {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Logo file size must be less than 5MB')
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Logo must be an image file (JPEG, PNG, GIF, SVG, WEBP)')
    }

    const formData = new FormData()
    formData.append('logo', file)
    
    const response = await fetch(`${API_BASE_URL}/api/settings/logo/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to upload logo')
    }

    const data = await response.json()
    return data
  }

  const uploadFavicon = async (file: File) => {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Favicon file size must be less than 5MB')
    }

    // Validate file type
    const allowedTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/gif', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.ico')) {
      throw new Error('Favicon must be an image file (ICO, PNG, GIF, JPEG, WEBP)')
    }

    const formData = new FormData()
    formData.append('favicon', file)
    
    const response = await fetch(`${API_BASE_URL}/api/settings/favicon/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to upload favicon')
    }

    const data = await response.json()
    return data
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'Logo file size must be less than 5MB')
        e.target.value = '' // Reset input
        return
      }

      setLogoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string)
      }
      reader.onerror = () => {
        showToast('error', 'Failed to read file')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'Favicon file size must be less than 5MB')
        e.target.value = '' // Reset input
        return
      }

      setFaviconFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (event) => {
        setFaviconPreview(event.target?.result as string)
      }
      reader.onerror = () => {
        showToast('error', 'Failed to read file')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDeleteLogo = async () => {
    if (!confirm('Are you sure you want to delete the company logo?')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/logo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete logo')
      }

      setCompanyLogo(null)
      setLogoFile(null)
      setLogoPreview(null)
      showToast('success', 'Logo deleted successfully')
    } catch (error: any) {
      console.error('Error deleting logo:', error)
      showToast('error', error.message || 'Failed to delete logo')
    }
  }

  const handleDeleteFavicon = async () => {
    if (!confirm('Are you sure you want to delete the favicon?')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/favicon`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete favicon')
      }

      setCompanyFavicon(null)
      setFaviconFile(null)
      setFaviconPreview(null)
      showToast('success', 'Favicon deleted successfully')
    } catch (error: any) {
      console.error('Error deleting favicon:', error)
      showToast('error', error.message || 'Failed to delete favicon')
    }
  }

  const handleResetColor = () => {
    setPrimaryColor(DEFAULT_PRIMARY_COLOR)
    showToast('success', 'Color reset to default')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 min-w-[300px] max-w-md p-4 rounded-lg shadow-lg transform transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : toast.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />}
            <p
              className={`text-sm font-medium flex-1 ${
                toast.type === 'success'
                  ? 'text-green-800'
                  : toast.type === 'error'
                  ? 'text-red-800'
                  : 'text-yellow-800'
              }`}
            >
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className={`flex-shrink-0 ${
                toast.type === 'success'
                  ? 'text-green-600 hover:text-green-800'
                  : toast.type === 'error'
                  ? 'text-red-600 hover:text-red-800'
                  : 'text-yellow-600 hover:text-yellow-800'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your system preferences and configuration</p>
        </div>

      {/* Settings tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Company & Branding Settings */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Company & Branding</h3>
                <p className="text-sm text-gray-500">Customize your company information and branding</p>
              </div>
              
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Finders CRM"
                />
              </div>

              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Brand Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#3B82F6"
                  />
                  <button
                    type="button"
                    onClick={handleResetColor}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    title="Reset to default color"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">Default: {DEFAULT_PRIMARY_COLOR}</p>
              </div>

              {/* Company Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                <div className="mt-2 flex items-start space-x-4">
                  {(logoPreview || companyLogo) ? (
                    <div className="relative">
                      <img 
                        src={logoPreview || companyLogo || ''} 
                        alt="Company Logo" 
                        className="h-20 w-auto max-w-[200px] object-contain border border-gray-300 rounded p-2 bg-white" 
                      />
                      <button
                        type="button"
                        onClick={handleDeleteLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {logoFile && (
                        <span className="absolute -bottom-6 left-0 text-xs text-blue-600">New file selected</span>
                      )}
                    </div>
                  ) : (
                    <div className="h-20 w-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No logo</span>
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                    </label>
                    <p className="mt-1 text-sm text-gray-500">PNG, JPG, SVG up to 5MB</p>
                  </div>
                </div>
              </div>

              {/* Favicon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                <div className="mt-2 flex items-start space-x-4">
                  {(faviconPreview || companyFavicon) ? (
                    <div className="relative">
                      <img 
                        src={faviconPreview || companyFavicon || ''} 
                        alt="Favicon" 
                        className="h-16 w-16 object-contain border border-gray-300 rounded p-1 bg-white" 
                      />
                      <button
                        type="button"
                        onClick={handleDeleteFavicon}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {faviconFile && (
                        <span className="absolute -bottom-6 left-0 text-xs text-blue-600">New file selected</span>
                      )}
                    </div>
                  ) : (
                    <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No favicon</span>
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Favicon
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFaviconChange}
                      />
                    </label>
                    <p className="mt-1 text-sm text-gray-500">ICO, PNG up to 5MB</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Branding Tips</h4>
                    <p className="mt-1 text-sm text-blue-700">
                      Upload a logo to replace the default Finders CRM branding. Use PNG format with transparent background for best results.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Automation Settings */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Email Automation</h3>
                <p className="text-sm text-gray-500">Control email notifications and reminders for your events</p>
              </div>

              {/* Global Email Toggle */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-500">Enable or disable all email notifications globally</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailSettings.email_notifications_enabled}
                      onChange={(e) => setEmailSettings({ ...emailSettings, email_notifications_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {!emailSettings.email_notifications_enabled && (
                  <p className="mt-2 text-sm text-yellow-600">⚠️ All email notifications are disabled</p>
                )}
              </div>

              {emailSettings.email_notifications_enabled && (
                <>
                  {/* Component-specific toggles */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Notification Types</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">Calendar Events</h5>
                          <p className="text-sm text-gray-500">Send emails for calendar events and reminders</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailSettings.email_notifications_calendar_events}
                            onChange={(e) => setEmailSettings({ ...emailSettings, email_notifications_calendar_events: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">Viewings</h5>
                          <p className="text-sm text-gray-500">Send emails for viewing schedules and updates</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailSettings.email_notifications_viewings}
                            onChange={(e) => setEmailSettings({ ...emailSettings, email_notifications_viewings: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">Properties</h5>
                          <p className="text-sm text-gray-500">Send emails for property updates and assignments</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailSettings.email_notifications_properties}
                            onChange={(e) => setEmailSettings({ ...emailSettings, email_notifications_properties: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">Leads</h5>
                          <p className="text-sm text-gray-500">Send emails for lead assignments and updates</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailSettings.email_notifications_leads}
                            onChange={(e) => setEmailSettings({ ...emailSettings, email_notifications_leads: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">Users</h5>
                          <p className="text-sm text-gray-500">Send emails for user-related notifications</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailSettings.email_notifications_users}
                            onChange={(e) => setEmailSettings({ ...emailSettings, email_notifications_users: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Email Configuration */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Email Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                        <input
                          type="text"
                          value={emailFromName}
                          onChange={(e) => setEmailFromName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Finders CRM"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                        <input
                          type="email"
                          value={emailFromAddress}
                          onChange={(e) => setEmailFromAddress(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="noreply@finderscrm.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Calendar Reminders */}
                  {emailSettings.email_notifications_calendar_events && (
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Calendar Event Reminders</h4>
                      <p className="text-sm text-gray-500 mb-4">Configure when to send reminder emails for calendar events</p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <h5 className="text-sm font-medium text-gray-900">1 Day Before</h5>
                            <p className="text-sm text-gray-500">Send reminder 24 hours before the event</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={reminderSettings.reminder_1_day_before}
                              onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_1_day_before: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <h5 className="text-sm font-medium text-gray-900">Same Day</h5>
                            <p className="text-sm text-gray-500">Send reminder on the morning of the event</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={reminderSettings.reminder_same_day}
                              onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_same_day: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <h5 className="text-sm font-medium text-gray-900">1 Hour Before</h5>
                            <p className="text-sm text-gray-500">Send reminder 1 hour before the event starts</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={reminderSettings.reminder_1_hour_before}
                              onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_1_hour_before: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Email Reminders</h4>
                    <p className="mt-1 text-sm text-blue-700">
                      Configure when to send reminder emails for calendar events. These reminders help users stay on top of their schedule.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
      </div>
    </>
  )
}
