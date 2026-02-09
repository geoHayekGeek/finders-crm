// __tests__/utils/imageToFileConverter.test.js
const imageConverter = require('../../utils/imageToFileConverter');
const fs = require('fs');
const path = require('path');

// Mock fs
jest.mock('fs');

describe('Image To File Converter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('base64ToFile', () => {
    it('should convert base64 string to file', async () => {
      const base64String = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const filename = 'test.jpg';
      const directory = '/test/dir';

      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      const result = await imageConverter.base64ToFile(base64String, filename, directory);

      expect(fs.existsSync).toHaveBeenCalledWith(directory);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toBe(path.join(directory, filename));
    });

    it('should create directory if it does not exist', async () => {
      const base64String = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const filename = 'test.jpg';
      const directory = '/test/dir';

      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => {});

      await imageConverter.base64ToFile(base64String, filename, directory);

      expect(fs.mkdirSync).toHaveBeenCalledWith(directory, { recursive: true });
    });

    it('should remove data URL prefix from base64 string', async () => {
      const base64String = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const filename = 'test.jpg';
      const directory = '/test/dir';

      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      await imageConverter.base64ToFile(base64String, filename, directory);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = fs.writeFileSync.mock.calls[0];
      expect(writeCall[0]).toBe(path.join(directory, filename));
    });

    it('should handle base64 string without data URL prefix', async () => {
      const base64String = '/9j/4AAQSkZJRg==';
      const filename = 'test.jpg';
      const directory = '/test/dir';

      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      await imageConverter.base64ToFile(base64String, filename, directory);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const base64String = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const filename = 'test.jpg';
      const directory = '/test/dir';

      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      await expect(imageConverter.base64ToFile(base64String, filename, directory)).rejects.toThrow(/Failed to write file:/);
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate unique filename with default prefix', () => {
      const filename = imageConverter.generateUniqueFilename();

      expect(filename).toMatch(/^property_\d+_\d+\.jpg$/);
    });

    it('should generate unique filename with custom prefix', () => {
      const filename = imageConverter.generateUniqueFilename('custom');

      expect(filename).toMatch(/^custom_\d+_\d+\.jpg$/);
    });

    it('should generate unique filename with custom extension', () => {
      const filename = imageConverter.generateUniqueFilename('test', 'png');

      expect(filename).toMatch(/^test_\d+_\d+\.png$/);
    });

    it('should generate different filenames on each call', () => {
      const filename1 = imageConverter.generateUniqueFilename();
      const filename2 = imageConverter.generateUniqueFilename();

      expect(filename1).not.toBe(filename2);
    });
  });

  describe('detectImageFormat', () => {
    it('should detect JPEG format', () => {
      const base64String = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const format = imageConverter.detectImageFormat(base64String);

      expect(format).toBe('jpg');
    });

    it('should detect JPG format', () => {
      const base64String = 'data:image/jpg;base64,/9j/4AAQSkZJRg==';
      const format = imageConverter.detectImageFormat(base64String);

      expect(format).toBe('jpg');
    });

    it('should detect PNG format', () => {
      const base64String = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
      const format = imageConverter.detectImageFormat(base64String);

      expect(format).toBe('png');
    });

    it('should detect GIF format', () => {
      const base64String = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      const format = imageConverter.detectImageFormat(base64String);

      expect(format).toBe('gif');
    });

    it('should detect WebP format', () => {
      const base64String = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
      const format = imageConverter.detectImageFormat(base64String);

      expect(format).toBe('webp');
    });

    it('should return default jpg for unknown format', () => {
      const base64String = 'data:image/unknown;base64,test';
      const format = imageConverter.detectImageFormat(base64String);

      expect(format).toBe('jpg');
    });

    it('should return default jpg for string without data URL', () => {
      const base64String = '/9j/4AAQSkZJRg==';
      const format = imageConverter.detectImageFormat(base64String);

      expect(format).toBe('jpg');
    });
  });

  describe('convertPropertyImages', () => {
    it('should convert main image from base64 to file', async () => {
      const property = {
        id: 1,
        main_image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
      };
      const outputDirectory = '/test/dir';

      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      jest.spyOn(imageConverter, 'base64ToFile').mockResolvedValue('/test/dir/main_123_456.jpg');
      jest.spyOn(imageConverter, 'detectImageFormat').mockReturnValue('jpg');
      jest.spyOn(imageConverter, 'generateUniqueFilename').mockReturnValue('main_123_456.jpg');

      const result = await imageConverter.convertPropertyImages(property, outputDirectory);

      expect(result.main_image).toMatch(/\/assets\/properties\/main_\d+_\d+\.jpg/);
    });

    it('should convert gallery images from base64 to files', async () => {
      const property = {
        id: 1,
        image_gallery: [
          'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
        ]
      };
      const outputDirectory = '/test/dir';

      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      jest.spyOn(imageConverter, 'base64ToFile').mockResolvedValue('/test/dir/gallery_0_123_456.jpg');
      jest.spyOn(imageConverter, 'detectImageFormat').mockReturnValueOnce('jpg').mockReturnValueOnce('png');
      jest.spyOn(imageConverter, 'generateUniqueFilename').mockReturnValueOnce('gallery_0_123_456.jpg').mockReturnValueOnce('gallery_1_789_012.png');

      const result = await imageConverter.convertPropertyImages(property, outputDirectory);

      expect(result.image_gallery).toHaveLength(2);
      expect(result.image_gallery[0]).toMatch(/\/assets\/properties\/gallery_0_\d+_\d+\.jpg/);
      expect(result.image_gallery[1]).toMatch(/\/assets\/properties\/gallery_1_\d+_\d+\.png/);
    });

    it('should keep existing URLs in gallery', async () => {
      const property = {
        id: 1,
        image_gallery: [
          '/assets/properties/existing.jpg',
          'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
        ]
      };
      const outputDirectory = '/test/dir';

      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      jest.spyOn(imageConverter, 'base64ToFile').mockResolvedValue('/test/dir/gallery_1_123_456.jpg');
      jest.spyOn(imageConverter, 'detectImageFormat').mockReturnValue('jpg');
      jest.spyOn(imageConverter, 'generateUniqueFilename').mockReturnValue('gallery_1_123_456.jpg');

      const result = await imageConverter.convertPropertyImages(property, outputDirectory);

      expect(result.image_gallery[0]).toBe('/assets/properties/existing.jpg');
      expect(result.image_gallery[1]).toMatch(/\/assets\/properties\/gallery_1_\d+_\d+\.jpg/);
    });

    it('should handle property without images', async () => {
      const property = {
        id: 1
      };
      const outputDirectory = '/test/dir';

      const result = await imageConverter.convertPropertyImages(property, outputDirectory);

      expect(result).toEqual(property);
    });

    it('should handle errors during conversion', async () => {
      const property = {
        id: 1,
        main_image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
      };
      const outputDirectory = '/test/dir';

      // Mock fs.writeFileSync to throw an error, which will cause base64ToFile to throw
      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Conversion error');
      });

      await expect(imageConverter.convertPropertyImages(property, outputDirectory)).rejects.toThrow(/Failed to write file:/);
    });
  });
});

