'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Check, CheckCheck, Trash2, Filter, Search, Calendar, User, Building2, AlertCircle, Info, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface Notification {
  id: number
  title: string
  message: string
  type: string
  entity_type: string
  entity_id: number | null
  is_read: boolean
  created_at: string
  user_name?: string
  user_role?: string
}

const NotificationsPage = () => {
  const router = useRouter()
  const { token } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      console.log('🔔 Fetching all notifications with token:', token ? 'present' : 'missing')
      
      const response = await fetch(`${(process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:10000')}/api/notifications?limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('token')}`
        }
      })
      
      const data = await response.json()
      console.log('📤 Notifications response:', data)

      if (data.success) {
        setNotifications(data.data)
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

  const markAsRead = async (id: number) => {
    try {
      console.log('🔔 Marking notification as read:', id)
      
      const response = await fetch(`${(process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:10000')}/api/notifications/${id}/read`, {
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
        console.log('✅ Notification marked as read successfully')
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      console.log('🔔 Marking all notifications as read')
      
      const response = await fetch(`${(process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:10000')}/api/notifications/mark-all-read`, {
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
        console.log('✅ All notifications marked as read successfully')
      }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = async (id: number) => {
    try {
      console.log('🗑️ Deleting notification:', id)
      
      const response = await fetch(`${(process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:10000')}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('token')}`
        }
      })
      
      const data = await response.json()
      console.log('📤 Delete response:', data)

      if (data.success) {
        setNotifications(prev => prev.filter(notification => notification.id !== id))
        console.log('✅ Notification deleted successfully')
      }
    } catch (error) {
      console.error('❌ Error deleting notification:', error)
    }
  }

  const getNotificationIcon = (type: string, entityType: string) => {
    switch (entityType) {
      case 'property':
        return <Building2 className="h-5 w-5 text-blue-500" />
      case 'lead':
        return <User className="h-5 w-5 text-green-500" />
      case 'system':
        return <AlertCircle className="h-5 w-5 text-gray-500" />
      default:
        switch (type) {
          case 'urgent':
            return <AlertCircle className="h-5 w-5 text-red-500" />
          case 'success':
            return <Check className="h-5 w-5 text-green-500" />
          case 'warning':
            return <AlertCircle className="h-5 w-5 text-yellow-500" />
          default:
            return <Info className="h-5 w-5 text-blue-500" />
        }
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(notification => {
      if (filter === 'unread') return !notification.is_read
      if (filter === 'read') return notification.is_read
      return true
    })
    .filter(notification => 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
    })

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm font-medium px-2 py-1 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Mark all as read</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative input-with-icon">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All notifications</option>
                <option value="unread">Unread only</option>
                <option value="read">Read only</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Loading notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm border p-4 transition-all hover:shadow-md ${
                  !notification.is_read ? 'border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type, notification.entity_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className={`mt-1 text-sm ${!notification.is_read ? 'text-gray-700' : 'text-gray-500'}`}>
                      {notification.message}
                    </p>
                    
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>Mark as read</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
