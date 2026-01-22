// Utility to convert Base64 images to files
// This can be used for migration or on-demand conversion

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Convert Base64 string to file
 * @param {string} base64String - The Base64 string (with or without data URL prefix)
 * @param {string} filename - The filename to save
 * @param {string} directory - The directory to save the file
 * @returns {Promise<string>} - The file path
 */
async function base64ToFile(base64String, filename, directory) {
  try {
    // Validate inputs
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('Invalid base64String: must be a non-empty string');
    }
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename: must be a non-empty string');
    }
    if (!directory || typeof directory !== 'string') {
      throw new Error('Invalid directory: must be a non-empty string');
    }

    // Ensure directory exists
    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
    } catch (dirError) {
      logger.error('Error creating directory', { directory, error: dirError });
      throw new Error(`Failed to create directory: ${directory}`);
    }

    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Validate base64 data
    if (!base64Data || base64Data.length === 0) {
      throw new Error('Invalid base64 data: empty after removing data URL prefix');
    }
    
    // Convert to buffer
    let buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch (bufferError) {
      logger.error('Error converting base64 to buffer', { error: bufferError });
      throw new Error('Invalid base64 string: failed to decode');
    }
    
    // Generate full file path
    const filePath = path.join(directory, filename);
    
    // Write file
    try {
      fs.writeFileSync(filePath, buffer);
      logger.debug('Converted Base64 to file', { filePath, filename });
      return filePath;
    } catch (writeError) {
      logger.error('Error writing file', { filePath, error: writeError });
      throw new Error(`Failed to write file: ${filePath}`);
    }
    
  } catch (error) {
    logger.error('Error converting Base64 to file', error);
    throw error;
  }
}

/**
 * Generate a unique filename for an image
 * @param {string} prefix - Prefix for the filename
 * @param {string} extension - File extension (default: jpg)
 * @returns {string} - Unique filename
 */
function generateUniqueFilename(prefix = 'property', extension = 'jpg') {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  return `${prefix}_${timestamp}_${random}.${extension}`;
}

/**
 * Detect image format from Base64 string
 * @param {string} base64String - The Base64 string
 * @returns {string} - File extension
 */
function detectImageFormat(base64String) {
  if (base64String.startsWith('data:image/')) {
    const match = base64String.match(/data:image\/([a-z]+);base64,/);
    if (match) {
      const format = match[1];
      // Map common formats
      switch (format) {
        case 'jpeg':
        case 'jpg':
          return 'jpg';
        case 'png':
          return 'png';
        case 'gif':
          return 'gif';
        case 'webp':
          return 'webp';
        default:
          return 'jpg'; // Default fallback
      }
    }
  }
  return 'jpg'; // Default fallback
}

/**
 * Convert property images from Base64 to files
 * @param {Object} property - Property object with Base64 images
 * @param {string} outputDirectory - Directory to save files
 * @returns {Object} - Updated property object with file URLs
 */
async function convertPropertyImages(property, outputDirectory) {
  const updatedProperty = { ...property };
  
  try {
    // Convert main image if it's Base64
    if (property.main_image && property.main_image.startsWith('data:image/')) {
      const extension = detectImageFormat(property.main_image);
      const filename = generateUniqueFilename('main', extension);
      
      await base64ToFile(property.main_image, filename, outputDirectory);
      
      // Update property with file URL
      updatedProperty.main_image = `/assets/properties/${filename}`;
      logger.debug('Converted main image for property', { propertyId: property.id, filename });
    }
    
    // Convert gallery images if they're Base64
    if (property.image_gallery && Array.isArray(property.image_gallery)) {
      const convertedGallery = [];
      
      for (let i = 0; i < property.image_gallery.length; i++) {
        const image = property.image_gallery[i];
        
        if (image && image.startsWith('data:image/')) {
          const extension = detectImageFormat(image);
          const filename = generateUniqueFilename(`gallery_${i}`, extension);
          
          await base64ToFile(image, filename, outputDirectory);
          
          // Add file URL to gallery
          convertedGallery.push(`/assets/properties/${filename}`);
          logger.debug('Converted gallery image for property', { propertyId: property.id, imageIndex: i + 1, filename });
        } else {
          // Keep existing URL/path
          convertedGallery.push(image);
        }
      }
      
      updatedProperty.image_gallery = convertedGallery;
    }
    
    return updatedProperty;
    
  } catch (error) {
    logger.error('Error converting images for property', { propertyId: property?.id, error });
    throw error;
  }
}

module.exports = {
  base64ToFile,
  generateUniqueFilename,
  detectImageFormat,
  convertPropertyImages
};
