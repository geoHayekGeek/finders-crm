'use client'

import { useEffect, useRef, useState } from 'react'
import { Share2, MessageCircle, Link as LinkIcon, Instagram, Mail, Send } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Property } from '@/types/property'
import { useAuth } from '@/contexts/AuthContext'

interface PropertyShareMenuProps {
  property: Property
  variant?: 'button' | 'icon'
  align?: 'left' | 'right'
  label?: string
  className?: string
  triggerClassName?: string
}

export function PropertyShareMenu({
  property,
  variant = 'button',
  align = 'right',
  label = 'Share',
  className = '',
  triggerClassName = ''
}: PropertyShareMenuProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const shareLink = property.property_url?.trim()
  
  // Check if user can share this property (agents/team leaders can only share assigned properties)
  const canShare = () => {
    // Admin, operations manager, operations, agent manager can always share
    if (['admin', 'operations manager', 'operations', 'agent manager'].includes(user?.role || '')) {
      return true
    }
    
    // Agents and team leaders can only share properties assigned to them
    if (user?.role === 'agent' || user?.role === 'team_leader') {
      return property.agent_id === user?.id
    }
    
    // Default: allow sharing
    return true
  }
  
  const isShareDisabled = !canShare()
  
  // Generate share message with simple format
  const generateShareMessage = () => {
    let message = `Check out this property at ${property.location}`
    
    // Add URL if available
    if (shareLink) {
      message += `\n\n${shareLink}`
    }
    
    return message
  }
  
  const shareMessage = generateShareMessage()
  const canUseNativeShare =
    typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const menuWidth = 256
  const estimatedMenuHeight = 320

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedInContainer = containerRef.current?.contains(target)
      const clickedInMenu = menuRef.current?.contains(target)
      
      // Close if clicked outside both the container and the menu
      if (!clickedInContainer && !clickedInMenu) {
        setIsOpen(false)
      }
    }
    // Use a small delay to avoid closing immediately when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 10)
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      setMenuPosition(null)
      return
    }

    const updatePosition = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const spacing = 8
      const viewportPadding = 16

      let left = align === 'left' ? rect.left : rect.right - menuWidth
      const maxLeft = window.innerWidth - viewportPadding - menuWidth
      const minLeft = viewportPadding
      left = Math.min(Math.max(left, minLeft), maxLeft)

      const spaceBelow = window.innerHeight - rect.bottom - spacing - viewportPadding
      const spaceAbove = rect.top - spacing - viewportPadding
      const openAbove = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow
      let top = openAbove
        ? rect.top - spacing - estimatedMenuHeight
        : rect.bottom + spacing

      const maxTop = window.innerHeight - viewportPadding - estimatedMenuHeight
      const minTop = viewportPadding
      top = Math.min(Math.max(top, minTop), maxTop)

      setMenuPosition({ top, left, placement: openAbove ? 'top' : 'bottom' })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, align])

  useEffect(() => {
    if (!feedback) return
    const timeout = setTimeout(() => setFeedback(null), 2200)
    return () => clearTimeout(timeout)
  }, [feedback])

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareMessage)
        setFeedback(shareLink ? 'Link copied to clipboard' : 'Property details copied to clipboard')
      } else {
        setFeedback('Copy unavailable in this browser')
      }
    } catch (error) {
      console.error('Failed to copy', error)
      setFeedback('Unable to copy')
    }
  }

  const handleNativeShare = async () => {
    if (!navigator?.share) return
    try {
      const shareData: ShareData = {
        title: `Property ${property.reference_number} - Finders CRM`,
        text: shareMessage
      }
      
      // Only include URL if available
      if (shareLink) {
        shareData.url = shareLink
      }
      
      await navigator.share(shareData)
      setIsOpen(false)
    } catch (error) {
      // User cancelled or error occurred - ignore
      console.error('Native share cancelled', error)
    }
  }

  const handleShareOption = async (option: 'whatsapp' | 'instagram' | 'email' | 'copy' | 'more') => {
    if (isShareDisabled) return
    
    console.log('Share option clicked:', option) // Debug log
    
    try {
      switch (option) {
        case 'whatsapp': {
          const encodedMessage = encodeURIComponent(shareMessage)
          const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
          console.log('Opening WhatsApp:', whatsappUrl) // Debug log
          const whatsappWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
          if (!whatsappWindow) {
            setFeedback('Popup blocked. Please allow popups for this site.')
          }
          setIsOpen(false)
          break
        }
        case 'instagram': {
          console.log('Copying to clipboard for Instagram') // Debug log
          await handleCopyLink()
          // Small delay to ensure clipboard is ready
          setTimeout(() => {
            const instagramWindow = window.open('https://www.instagram.com/direct/new/', '_blank', 'noopener,noreferrer')
            if (!instagramWindow) {
              setFeedback('Popup blocked. Please allow popups for this site.')
            }
          }, 100)
          setIsOpen(false)
          break
        }
        case 'email': {
          const subject = `Property ${property.reference_number}`
          const body = shareMessage
          const encodedSubject = encodeURIComponent(subject)
          const encodedBody = encodeURIComponent(body)
          console.log('Opening email client') // Debug log
          window.location.href = `mailto:?subject=${encodedSubject}&body=${encodedBody}`
          setIsOpen(false)
          break
        }
        case 'copy': {
          console.log('Copying to clipboard') // Debug log
          await handleCopyLink()
          break
        }
        case 'more': {
          console.log('Opening native share') // Debug log
          await handleNativeShare()
          break
        }
        default:
          return
      }
    } catch (error) {
      console.error('Error sharing property:', error)
      setFeedback('Failed to share. Please try again.')
    }
  }

  const baseTriggerClasses =
    variant === 'icon'
      ? 'h-8 w-8 rounded-full border flex items-center justify-center shadow-sm'
      : 'px-3 py-2 rounded-lg border flex items-center space-x-2 font-medium'

  const enabledClasses =
    variant === 'icon'
      ? 'border-purple-200 text-purple-600 hover:bg-purple-50 bg-white'
      : 'border-purple-200 text-purple-700 hover:bg-purple-50 bg-white'

  const disabledClasses =
    variant === 'icon'
      ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
      : 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'

  return (
    <div
      className={`relative inline-block ${isOpen ? 'z-40' : 'z-10'} ${className}`}
      ref={containerRef}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (!isShareDisabled) {
            setIsOpen((prev) => !prev)
          }
        }}
        disabled={isShareDisabled}
        aria-label="Share property"
        className={`${baseTriggerClasses} ${
          isShareDisabled ? disabledClasses : enabledClasses
        } transition-colors ${triggerClassName}`}
      >
        <Share2 className="h-4 w-4" />
        {variant !== 'icon' && <span className="text-sm">{label}</span>}
      </button>

      {isOpen && menuPosition && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuWidth
            }}
            className="fixed z-[70] rounded-xl border border-gray-100 bg-white shadow-2xl p-3 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col space-y-1">
              <p className="text-xs text-gray-500 px-1">
                Share <span className="font-semibold">{property.reference_number}</span> with clients
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleShareOption('whatsapp')
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-50 text-left transition-colors cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-gray-800">WhatsApp</div>
                  <div className="text-xs text-gray-500">Send via WhatsApp</div>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleShareOption('instagram')
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-pink-50 text-left transition-colors cursor-pointer"
              >
                <Instagram className="h-4 w-4 text-pink-500" />
                <div>
                  <div className="text-sm font-medium text-gray-800">Instagram</div>
                  <div className="text-xs text-gray-500">Copy link & open IG Direct</div>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleShareOption('email')
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 text-left transition-colors cursor-pointer"
              >
                <Mail className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium text-gray-800">Email</div>
                  <div className="text-xs text-gray-500">Send as email update</div>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleShareOption('copy')
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors cursor-pointer"
              >
                <LinkIcon className="h-4 w-4 text-gray-700" />
                <div>
                  <div className="text-sm font-medium text-gray-800">Copy details</div>
                  <div className="text-xs text-gray-500">{shareLink ? 'Copy link & details' : 'Copy property details'}</div>
                </div>
              </button>
              {canUseNativeShare && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleShareOption('more')
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-50 text-left transition-colors cursor-pointer"
                >
                  <Send className="h-4 w-4 text-indigo-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">More options</div>
                    <div className="text-xs text-gray-500">Open device share sheet</div>
                  </div>
                </button>
              )}
              {feedback && (
                <div className="px-2 py-1 text-xs text-green-600 bg-green-50 rounded-lg">
                  {feedback}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

