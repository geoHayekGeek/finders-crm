'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Check, AlertCircle, Info, Star, Calendar, User, Building2 } from 'lucide-react'
import { notificationsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface Notification {
  id: number
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'urgent'
  entity_type: string
  entity_id: number | null
  is_read: boolean
  created_at: string
  user_name?: string
  user_role?: string
}

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { token } = useAuth()
  const router = useRouter()

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      console.log('🔔 Fetching notifications with token:', token ? 'present' : 'missing')
      const response = await notificationsApi.getAll()

      if (response.success) {
        setNotifications(response.data)
        setUnreadCount(response.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications()
  }, [])

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Auto-refresh notifications every 1 minute
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications()
    }, 2000) // 60000ms = 1 minute

    // Cleanup interval on component unmount
    return () => clearInterval(interval)
  }, []) // Empty dependency array means this runs once on mount

  const markAsRead = async (id: number) => {
    try {
      console.log('🔔 Marking notification as read:', id, 'with token:', token ? 'present' : 'missing')
      
      // Use direct API call with explicit token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api'}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('token')}`
        }
      })
      
      const data = await response.json()
      console.log('📤 Mark as read response:', data)

      if (data.success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, is_read: true }
              : notification
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        console.log('✅ Notification marked as read successfully')
      } else {
        console.error('❌ Mark as read failed:', data.message)
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      console.log('🔔 Marking all notifications as read with token:', token ? 'present' : 'missing')
      
      // Use direct API call with explicit token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api'}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('token')}`
        }
      })
      
      const data = await response.json()
      console.log('📤 Mark all as read response:', data)

      if (data.success) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, is_read: true }))
        )
        setUnreadCount(0)
        console.log('✅ All notifications marked as read successfully')
      } else {
        console.error('❌ Mark all as read failed:', data.message)
      }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error)
    }
  }

  const handleViewAllNotifications = () => {
    setIsOpen(false) // Close the dropdown
    router.push('/notifications') // Navigate to the notifications page
  }

  const getNotificationIcon = (type: string, entityType: string) => {
    // Choose icon based on entity type first, then notification type
    switch (entityType) {
      case 'property':
        return Building2
      case 'lead':
        return User
      case 'user':
        return User
      case 'system':
        return AlertCircle
      default:
        switch (type) {
          case 'success':
            return Check
          case 'warning':
            return AlertCircle
          case 'urgent':
            return AlertCircle
          default:
            return Info
        }
    }
  }

  const getNotificationIconColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'urgent':
        return 'text-red-500'
      default:
        return 'text-blue-500'
    }
  }

  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'urgent':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const notificationDate = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {/* Badge with unread count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20 transform transition-all duration-200 ease-out">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => {
                    const IconComponent = getNotificationIcon(notification.type, notification.entity_type)
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors duration-150 ${
                          !notification.is_read ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 p-2 rounded-full ${getNotificationBg(notification.type)}`}>
                            <IconComponent className={`h-4 w-4 ${getNotificationIconColor(notification.type)}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium ${
                                !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">{formatTimeAgo(notification.created_at)}</p>
                              {!notification.is_read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Mark as read</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button 
                  onClick={handleViewAllNotifications}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50 py-2 px-4 rounded-lg transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell
