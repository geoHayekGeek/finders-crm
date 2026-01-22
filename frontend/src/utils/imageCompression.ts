import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType?: string;
}

const defaultOptions: CompressionOptions = {
  maxSizeMB: 1, // Maximum 1MB
  maxWidthOrHeight: 1920, // Maximum 1920px width/height
  useWebWorker: true,
  fileType: 'image/jpeg'
};

/**
 * Compress an image file to reduce its size
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed image file
 */
export async function compressImage(
  file: File, 
  options: Partial<CompressionOptions> = {}
): Promise<File> {
  try {
    const compressionOptions = { ...defaultOptions, ...options };
    const compressedFile = await imageCompression(file, compressionOptions);
    return compressedFile;
  } catch (error) {
    // Return original file if compression fails
    // Error is silently handled to prevent breaking the upload flow
    return file;
  }
}

/**
 * Convert a file to base64 string
 * @param file - The file to convert
 * @returns Promise that resolves to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress and convert image to base64
 * @param file - The image file
 * @param options - Compression options
 * @returns Promise that resolves to compressed base64 string
 */
export async function compressAndConvertToBase64(
  file: File, 
  options: Partial<CompressionOptions> = {}
): Promise<string> {
  const compressedFile = await compressImage(file, options);
  return fileToBase64(compressedFile);
}

/**
 * Get recommended compression options based on file size
 * @param fileSize - File size in bytes
 * @returns Compression options
 */
export function getRecommendedCompressionOptions(fileSize: number): Partial<CompressionOptions> {
  const sizeMB = fileSize / 1024 / 1024;
  
  if (sizeMB > 5) {
    // Very large files - aggressive compression
    return {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1280,
      fileType: 'image/jpeg'
    };
  } else if (sizeMB > 2) {
    // Large files - moderate compression
    return {
      maxSizeMB: 1,
      maxWidthOrHeight: 1600,
      fileType: 'image/jpeg'
    };
  } else if (sizeMB > 1) {
    // Medium files - light compression
    return {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      fileType: 'image/jpeg'
    };
  } else {
    // Small files - no compression needed
    return {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920
    };
  }
}
