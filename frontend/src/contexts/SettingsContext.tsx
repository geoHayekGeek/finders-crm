'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface SystemSettings {
  company_name: string
  company_logo: string | null
  company_favicon: string | null
  primary_color: string
  email_notifications_enabled: boolean
  email_notifications_calendar_events: boolean
  email_notifications_viewings: boolean
  email_notifications_properties: boolean
  email_notifications_leads: boolean
  email_notifications_users: boolean
  reminder_1_day_before: boolean
  reminder_same_day: boolean
  reminder_1_hour_before: boolean
  email_from_name: string
  email_from_address: string
}

interface SettingsContextType {
  settings: SystemSettings
  loading: boolean
  refreshSettings: () => Promise<void>
}

const defaultSettings: SystemSettings = {
  company_name: 'Finders CRM',
  company_logo: null,
  company_favicon: null,
  primary_color: '#3B82F6',
  email_notifications_enabled: true,
  email_notifications_calendar_events: true,
  email_notifications_viewings: true,
  email_notifications_properties: true,
  email_notifications_leads: true,
  email_notifications_users: true,
  reminder_1_day_before: true,
  reminder_same_day: true,
  reminder_1_hour_before: true,
  email_from_name: 'Finders CRM',
  email_from_address: 'noreply@finderscrm.com'
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {}
})

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000'

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      })
      
      if (!response.ok) {
        console.error('Failed to load settings, using defaults')
        return
      }

      const data = await response.json()
      const settingsArray = data.settings as Array<{
        setting_key: string
        setting_value: string
      }>
      
      // Convert settings array to object
      const settingsObj: Record<string, any> = {}
      settingsArray.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value
      })
      
      // Parse settings with proper types
      const parsedSettings: SystemSettings = {
        company_name: settingsObj.company_name || defaultSettings.company_name,
        company_logo: settingsObj.company_logo ? `${API_BASE_URL}${settingsObj.company_logo}` : null,
        company_favicon: settingsObj.company_favicon ? `${API_BASE_URL}${settingsObj.company_favicon}` : null,
        primary_color: settingsObj.primary_color || defaultSettings.primary_color,
        email_notifications_enabled: settingsObj.email_notifications_enabled === 'true',
        email_notifications_calendar_events: settingsObj.email_notifications_calendar_events === 'true',
        email_notifications_viewings: settingsObj.email_notifications_viewings === 'true',
        email_notifications_properties: settingsObj.email_notifications_properties === 'true',
        email_notifications_leads: settingsObj.email_notifications_leads === 'true',
        email_notifications_users: settingsObj.email_notifications_users === 'true',
        reminder_1_day_before: settingsObj.reminder_1_day_before === 'true',
        reminder_same_day: settingsObj.reminder_same_day === 'true',
        reminder_1_hour_before: settingsObj.reminder_1_hour_before === 'true',
        email_from_name: settingsObj.email_from_name || defaultSettings.email_from_name,
        email_from_address: settingsObj.email_from_address || defaultSettings.email_from_address
      }
      
      setSettings(parsedSettings)
      
      // Update favicon dynamically
      if (parsedSettings.company_favicon) {
        updateFavicon(parsedSettings.company_favicon)
      }
      
      // Update primary color CSS variables
      updatePrimaryColor(parsedSettings.primary_color)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateFavicon = (faviconUrl: string) => {
    // Remove existing favicon
    const existingFavicon = document.querySelector("link[rel*='icon']")
    if (existingFavicon) {
      existingFavicon.remove()
    }

    // Add new favicon
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = faviconUrl
    document.head.appendChild(link)
  }

  const updatePrimaryColor = (color: string) => {
    // Set the main primary color
    document.documentElement.style.setProperty('--primary-color', color)
    
    // Calculate darker shade for hover (reduce lightness by ~10%)
    const hoverColor = adjustColorBrightness(color, -20)
    document.documentElement.style.setProperty('--primary-hover', hoverColor)
    
    // Calculate lighter shade (increase lightness by ~10%)
    const lightColor = adjustColorBrightness(color, 20)
    document.documentElement.style.setProperty('--primary-light', lightColor)
    
    // Calculate darker shade (reduce lightness by ~20%)
    const darkColor = adjustColorBrightness(color, -40)
    document.documentElement.style.setProperty('--primary-dark', darkColor)
  }

  const adjustColorBrightness = (hex: string, percent: number): string => {
    // Remove # if present
    hex = hex.replace('#', '')
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    
    // Adjust brightness
    const adjust = (value: number) => {
      const adjusted = value + (value * percent / 100)
      return Math.max(0, Math.min(255, Math.round(adjusted)))
    }
    
    const newR = adjust(r)
    const newG = adjust(g)
    const newB = adjust(b)
    
    // Convert back to hex
    const toHex = (value: number) => value.toString(16).padStart(2, '0')
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`
  }

  useEffect(() => {
    loadSettings()
  }, [token])

  const refreshSettings = async () => {
    await loadSettings()
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

