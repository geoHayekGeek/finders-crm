# Image Functionality for Properties

This document describes the image management functionality added to the properties system in the Finders CRM backend.

## Overview

The properties system now supports:
- **Main Image**: A primary base64 encoded image for each property (optional)
- **Image Gallery**: An array of additional base64 encoded images for each property (optional)
- **Property Details**: Text-based property details instead of JSONB (optional)
- **Image Analytics**: Statistics and insights about property images
- **Image Management APIs**: CRUD operations for property images
- **No External Dependencies**: Images are stored directly in the database as base64

## Key Features

- **Base64 Storage**: Images are converted to base64 and stored directly in the database
- **Optional Images**: Properties can exist without any images
- **No External URLs**: No dependency on external image hosting services
- **Direct Display**: Images can be displayed directly in the system using base64 data
- **Size Validation**: Built-in validation and compression warnings for large images

## Database Schema Changes

### New Columns Added to `properties` table:

```sql
-- Main property image (base64 encoded, optional)
main_image TEXT

-- Array of additional property images (base64 encoded, optional)
image_gallery TEXT[]

-- Property details (text format, optional)
details TEXT
```

### Database Functions Updated:

- `get_properties_with_details()` - Now includes `main_image` and `image_gallery` fields
- New indexes created for better performance on image queries

## API Endpoints

### Property Image Management

#### 1. Update Property Images
```http
PUT /api/properties/:id/images
```

**Request Body:**
```json
{
  "main_image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
  "image_gallery": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
  ]
}
```

#### 2. Add Image to Gallery
```http
POST /api/properties/:id/gallery
```

**Request Body:**
```json
{
  "base64Image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
}
```

#### 3. Remove Image from Gallery
```http
DELETE /api/properties/:id/gallery
```

**Request Body:**
```json
{
  "base64Image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
}
```

#### 4. Get Properties with Images
```http
GET /api/properties/images/all
```

Returns all properties that have either a main image or gallery images.

#### 5. Get Image Statistics
```http
GET /api/properties/images/stats
```

Returns comprehensive statistics about property images.

### Image Analytics

#### 1. Get Image Analytics
```http
GET /api/analytics/images
```

Returns comprehensive statistics about property images including:
- Properties with/without images
- Properties with main image only
- Properties with gallery only
- Properties with both
- Average gallery size
- Recent properties without images

## Model Methods

### Property Model

The `Property` model now includes these new methods:

```javascript
// Validate base64 image format
static isValidBase64Image(base64String)

// Compress base64 image if needed
static compressBase64Image(base64String, maxSizeMB = 5)

// Update both main image and gallery
static async updatePropertyImages(id, mainImage, imageGallery)

// Add single image to gallery
static async addImageToGallery(id, base64Image)

// Remove single image from gallery
static async removeImageFromGallery(id, base64Image)

// Get properties that have images
static async getPropertiesWithImages()

// Get image statistics
static async getImageStats()
```

## Controller Methods

### Property Controller

New controller methods for image management:

```javascript
// Update property images
const updatePropertyImages = async (req, res)

// Add image to gallery
const addImageToGallery = async (req, res)

// Remove image from gallery
const removeImageFromGallery = async (req, res)

// Get properties with images
const getPropertiesWithImages = async (req, res)

// Get image statistics
const getImageStats = async (req, res)
```

## Base64 Image Format

### Supported Formats

The system supports these image formats:
- JPEG/JPG
- PNG
- GIF
- WebP

### Base64 String Format

Images must be provided in this format:
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=
```

### Validation

The system validates:
- Correct MIME type format
- Valid base64 encoding
- Image size warnings (recommended max: 5MB)

## Analytics Integration

### Dashboard Statistics

The dashboard now includes image-related metrics:
- `propertiesWithImages`: Count of properties that have images
- `propertiesWithoutImages`: Count of properties without images

### Basic Analytics

Image statistics are included in basic analytics:
- Properties with main image
- Properties with gallery
- Properties with both
- Properties without images

## Migration

### Running the Migration

To add image columns and convert details column to existing properties tables:

```bash
node migrate-image-columns.js
```

This script will:
1. Add `main_image` column (TEXT, nullable)
2. Add `image_gallery` column (TEXT[], default empty array)
3. Convert `details` column from JSONB to TEXT format
4. Create appropriate indexes
5. Update the `get_properties_with_details()` function

### Verification

After migration, verify the changes:

```bash
node test-image-functionality.js
```

## Demo Data

The demo properties script (`add-demo-properties.js`) now includes sample base64 images for all properties.

## Security & Permissions

### Role-Based Access

Image management follows the same permission structure as property management:

- **Admin**: Full access to all image operations
- **Operations Manager**: Full access to all image operations
- **Operations**: Full access to all image operations
- **Agent Manager**: Full access to all image operations
- **Agent**: Can only manage images for properties assigned to them

### Validation

- Base64 images are validated for correct format
- Image size warnings are provided
- All operations check property ownership/assignment
- Images are optional - properties can exist without images

## Performance Considerations

### Indexes

- `idx_properties_main_image`: Index on main_image for non-null values
- `idx_properties_image_gallery`: GIN index on image_gallery array for efficient array operations

### Query Optimization

- Array operations use PostgreSQL's native array functions
- Gallery queries are optimized with GIN indexes
- Image statistics use efficient COUNT and aggregation queries

### Storage Optimization

- Base64 images are stored directly in the database
- No external API calls required for image retrieval
- Images can be cached at the application level

## Error Handling

The system handles various error scenarios:

- Invalid base64 image format
- Missing or malformed image data
- Permission denied errors
- Database constraint violations
- Array operation failures

## Frontend Integration

### Displaying Images

Images can be displayed directly in HTML:

```html
<!-- Main image -->
<img src="${property.main_image}" alt="Property Image" />

<!-- Gallery images -->
${property.image_gallery.map(img => `
  <img src="${img}" alt="Gallery Image" />
`).join('')}
```

### File Upload Conversion

To convert file uploads to base64:

```javascript
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Usage
const base64Image = await fileToBase64(fileInput.files[0]);
```

## Future Enhancements

Potential improvements for future versions:

1. **Image Compression**: Automatic compression of large images
2. **Thumbnail Generation**: Create smaller versions for listings
3. **Image Validation**: File type and size validation
4. **Bulk Operations**: Batch image updates
5. **Image Metadata**: EXIF data extraction and storage
6. **Image Search**: Content-based image search
7. **CDN Integration**: Optional CDN for high-traffic scenarios

## Testing

### Manual Testing

Test the image functionality using:

```bash
# Test basic functionality
node test-image-functionality.js

# Add demo properties with base64 images
node add-demo-properties.js

# Check database structure
node migrate-image-columns.js
```

### API Testing

Test the endpoints using tools like Postman or curl:

```bash
# Test image update
curl -X PUT http://localhost:10000/api/properties/1/images \
  -H "Content-Type: application/json" \
  -d '{"main_image":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=","image_gallery":[]}'

# Test adding to gallery
curl -X POST http://localhost:10000/api/properties/1/gallery \
  -H "Content-Type: application/json" \
  -d '{"base64Image":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="}'
```

## Troubleshooting

### Common Issues

1. **Migration Fails**: Ensure database connection and proper permissions
2. **Function Not Updated**: Check if `get_properties_with_details` function exists
3. **Array Operations Fail**: Verify PostgreSQL version supports array functions
4. **Permission Errors**: Check user role and property assignment
5. **Invalid Base64**: Ensure images are properly encoded in base64 format

### Debug Commands

```sql
-- Check if columns exist
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'properties' AND column_name IN ('main_image', 'image_gallery');

-- Check function definition
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_properties_with_details';

-- Test array operations
SELECT array_append(ARRAY['a', 'b'], 'c');
SELECT array_remove(ARRAY['a', 'b', 'c'], 'b');

-- Check properties with images
SELECT COUNT(*) as total_properties,
       COUNT(CASE WHEN main_image IS NOT NULL THEN 1 END) as with_main_image,
       COUNT(CASE WHEN array_length(image_gallery, 1) > 0 THEN 1 END) as with_gallery
FROM properties;
```

## Support

For issues or questions regarding the image functionality:

1. Check the logs for error messages
2. Verify database schema changes
3. Test with the provided test scripts
4. Review permission configurations
5. Check PostgreSQL version compatibility
6. Validate base64 image format
7. Check image size (recommended max: 5MB)
