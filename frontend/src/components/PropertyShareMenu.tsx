'use client'

import { useEffect, useRef, useState } from 'react'
import { Share2, MessageCircle, Link as LinkIcon, Instagram, Mail, Send } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Property } from '@/types/property'

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
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const shareLink = property.property_url?.trim()
  const shareMessage = `Check out property ${property.reference_number} in ${property.location}`
  const canUseNativeShare =
    typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const menuWidth = 256
  const estimatedMenuHeight = 320

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
    if (!shareLink) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareMessage}\n${shareLink}`)
        setFeedback('Link copied to clipboard')
      } else {
        setFeedback('Copy unavailable in this browser')
      }
    } catch (error) {
      console.error('Failed to copy link', error)
      setFeedback('Unable to copy link')
    }
  }

  const handleNativeShare = async () => {
    if (!shareLink || !navigator?.share) return
    try {
      await navigator.share({
        title: 'Property from Finders CRM',
        text: shareMessage,
        url: shareLink
      })
      setIsOpen(false)
    } catch (error) {
      console.error('Native share cancelled', error)
    }
  }

  const handleShareOption = async (option: 'whatsapp' | 'instagram' | 'email' | 'copy' | 'more') => {
    if (!shareLink) return
    const encodedMessage = encodeURIComponent(`${shareMessage}\n${shareLink}`)

    switch (option) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank', 'noopener')
        setIsOpen(false)
        return
      case 'instagram':
        await handleCopyLink()
        window.open('https://www.instagram.com/direct/new/', '_blank', 'noopener')
        setIsOpen(false)
        return
      case 'email':
        window.open(
          `mailto:?subject=Property%20${encodeURIComponent(property.reference_number)}&body=${encodedMessage}`,
          '_self'
        )
        setIsOpen(false)
        return
      case 'copy':
        await handleCopyLink()
        return
      case 'more':
        await handleNativeShare()
        return
      default:
        return
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
        onClick={() => shareLink && setIsOpen((prev) => !prev)}
        disabled={!shareLink}
        aria-label="Share property link"
        className={`${baseTriggerClasses} ${
          shareLink ? enabledClasses : disabledClasses
        } transition-colors ${triggerClassName}`}
      >
        <Share2 className="h-4 w-4" />
        {variant !== 'icon' && <span className="text-sm">{label}</span>}
      </button>

      {isOpen && shareLink && menuPosition && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuWidth
            }}
            className="fixed z-[70] rounded-xl border border-gray-100 bg-white shadow-2xl p-3 space-y-1"
          >
            <div className="flex flex-col space-y-1">
              <p className="text-xs text-gray-500 px-1">
                Share <span className="font-semibold">{property.reference_number}</span> with clients
              </p>
              <button
                onClick={() => handleShareOption('whatsapp')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-50 text-left"
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-gray-800">WhatsApp</div>
                  <div className="text-xs text-gray-500">Send via WhatsApp</div>
                </div>
              </button>
              <button
                onClick={() => handleShareOption('instagram')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-pink-50 text-left"
              >
                <Instagram className="h-4 w-4 text-pink-500" />
                <div>
                  <div className="text-sm font-medium text-gray-800">Instagram</div>
                  <div className="text-xs text-gray-500">Copy link & open IG Direct</div>
                </div>
              </button>
              <button
                onClick={() => handleShareOption('email')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 text-left"
              >
                <Mail className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium text-gray-800">Email</div>
                  <div className="text-xs text-gray-500">Send as email update</div>
                </div>
              </button>
              <button
                onClick={() => handleShareOption('copy')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
              >
                <LinkIcon className="h-4 w-4 text-gray-700" />
                <div>
                  <div className="text-sm font-medium text-gray-800">Copy link</div>
                  <div className="text-xs text-gray-500">Perfect for Instagram or SMS</div>
                </div>
              </button>
              {canUseNativeShare && (
                <button
                  onClick={() => handleShareOption('more')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-50 text-left"
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

