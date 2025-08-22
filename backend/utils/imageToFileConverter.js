// Utility to convert Base64 images to files
// This can be used for migration or on-demand conversion

const fs = require('fs');
const path = require('path');

/**
 * Convert Base64 string to file
 * @param {string} base64String - The Base64 string (with or without data URL prefix)
 * @param {string} filename - The filename to save
 * @param {string} directory - The directory to save the file
 * @returns {Promise<string>} - The file path
 */
async function base64ToFile(base64String, filename, directory) {
  try {
    // Ensure directory exists
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate full file path
    const filePath = path.join(directory, filename);
    
    // Write file
    fs.writeFileSync(filePath, buffer);
    
    console.log(`✅ Converted Base64 to file: ${filePath}`);
    return filePath;
    
  } catch (error) {
    console.error('❌ Error converting Base64 to file:', error);
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
      console.log(`✅ Converted main image for property ${property.id}`);
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
          console.log(`✅ Converted gallery image ${i + 1} for property ${property.id}`);
        } else {
          // Keep existing URL/path
          convertedGallery.push(image);
        }
      }
      
      updatedProperty.image_gallery = convertedGallery;
    }
    
    return updatedProperty;
    
  } catch (error) {
    console.error(`❌ Error converting images for property ${property.id}:`, error);
    throw error;
  }
}

module.exports = {
  base64ToFile,
  generateUniqueFilename,
  detectImageFormat,
  convertPropertyImages
};
