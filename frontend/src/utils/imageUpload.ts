// File-based image upload utilities
// This replaces the Base64 approach with proper file uploads

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:10000'
const API_BASE_URL = `${BACKEND_URL}/api`
// Backend base URL (without /api) for serving static files like images
const BACKEND_BASE_URL = BACKEND_URL

/**
 * Upload main property image using FormData
 * @param propertyId - The property ID to associate the image with
 * @param imageFile - The image file to upload
 * @returns Promise with upload result
 */
export async function uploadMainPropertyImage(propertyId: number, imageFile: File): Promise<{ success: boolean; imageUrl?: string; message?: string }> {
  try {
    const formData = new FormData()
    formData.append('main_image', imageFile)

    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication token not found')
    }

    // Get CSRF token first from the specific property endpoint (same as property update)
    const csrfResponse = await fetch(`${API_BASE_URL}/properties/${propertyId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (!csrfResponse.ok) {
      throw new Error('Failed to get CSRF token')
    }
    
    const csrfToken = csrfResponse.headers.get('X-CSRF-Token')
    
    if (!csrfToken) {
      throw new Error('CSRF token not received from backend')
    }

    const response = await fetch(`${API_BASE_URL}/properties/${propertyId}/upload-main-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      
      // Handle CSRF token errors specifically
      if (response.status === 403 && errorData.message?.includes('CSRF')) {
        throw new Error('Security token expired. Please refresh the page and try again.')
      }
      
      throw new Error(errorData.message || 'Failed to upload main image')
    }

    const result = await response.json()
    return {
      success: true,
      imageUrl: result.data?.main_image,
      message: result.message
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Upload multiple gallery images using FormData
 * @param propertyId - The property ID to associate the images with
 * @param imageFiles - Array of image files to upload
 * @returns Promise with upload result
 */
export async function uploadGalleryImages(propertyId: number, imageFiles: File[]): Promise<{ success: boolean; imageUrls?: string[]; message?: string }> {
  try {
    const formData = new FormData()
    imageFiles.forEach((file, index) => {
      formData.append('gallery_images', file)
    })

    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication token not found')
    }

    // Get CSRF token first from the specific property endpoint
    const csrfResponse = await fetch(`${API_BASE_URL}/properties/${propertyId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (!csrfResponse.ok) {
      throw new Error('Failed to get CSRF token')
    }
    
    const csrfToken = csrfResponse.headers.get('X-CSRF-Token')
    
    if (!csrfToken) {
      throw new Error('CSRF token not received from backend')
    }

    const response = await fetch(`${API_BASE_URL}/properties/${propertyId}/upload-gallery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      
      // Handle CSRF token errors specifically
      if (response.status === 403 && errorData.message?.includes('CSRF')) {
        throw new Error('Security token expired. Please refresh the page and try again.')
      }
      
      throw new Error(errorData.message || 'Failed to upload gallery images')
    }

    const result = await response.json()
    return {
      success: true,
      imageUrls: result.data?.image_gallery,
      message: result.message
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Validate image file before upload
 * @param file - The file to validate
 * @returns Validation result
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
    }
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 5MB.'
    }
  }

  return { valid: true }
}

/**
 * Validate multiple image files
 * @param files - Array of files to validate
 * @returns Validation result
 */
export function validateImageFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (files.length > 10) {
    errors.push('Too many files. Maximum is 10 images.')
  }

  files.forEach((file, index) => {
    const validation = validateImageFile(file)
    if (!validation.valid) {
      errors.push(`File ${index + 1}: ${validation.error}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Create a preview URL for an image file (for display purposes only)
 * @param file - The image file
 * @returns Promise with preview URL
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(e.target?.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Convert backend image URL to full URL
 * @param imageUrl - Relative image URL from backend
 * @returns Full image URL
 */
export function getFullImageUrl(imageUrl: string): string {
  if (!imageUrl) return ''
  
  // If it's already a full URL or Base64, return as is
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) {
    return imageUrl
  }
  
  // Convert relative URL to full URL
  return `${BACKEND_BASE_URL}${imageUrl}`
}
