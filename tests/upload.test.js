const request = require('supertest');
const app = require('../src/app');
const uploadConfig = require('../src/upload/multer');

describe('File upload handling and validation tests', () => {
  describe('Successful file uploads', () => {
    it('should upload an image file successfully', async () => {
      const response = await request(app)
        .post('/upload')
        .attach('file', './test-assets/image.jpg', 'image.jpg');
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('file');
      expect(response.body.file).toHaveProperty('filename');
      expect(response.body.file).toHaveProperty('mimetype');
    });

    it('should upload a video file successfully', async () => {
      const response = await request(app)
        .post('/upload')
        .attach('file', './test-assets/video.mp4', 'video.mp4');
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('file');
      expect(response.body.file).toHaveProperty('filename');
      expect(response.body.file).toHaveProperty('mimetype');
    });
  });

  describe('Failed file uploads due to validation errors', () => {
    it('should reject a non-file request', async () => {
      const response = await request(app)
        .post('/upload')
        .send({ foo: 'bar' });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject an empty file request', async () => {
      const response = await request(app)
        .post('/upload')
        .attach('file', '');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject a file with an invalid mimetype', async () => {
      const response = await request(app)
        .post('/upload')
        .attach('file', './test-assets/text.txt', 'text.txt');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject a file larger than the size limit', async () => {
      const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const response = await request(app)
        .post('/upload')
        .attach('file', largeFile, 'large-file.bin');
      expect(response.status).toBe(413);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('File upload handling edge cases', () => {
    it('should handle a file with a very long filename', async () => {
      const longFilename = 'a'.repeat(1000) + '.jpg';
      const response = await request(app)
        .post('/upload')
        .attach('file', './test-assets/image.jpg', longFilename);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('file');
    });

    it('should handle a file with a filename containing special characters', async () => {
      const response = await request(app)
        .post('/upload')
        .attach('file', './test-assets/image.jpg', 'image!@#$%^&*().jpg');
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('file');
    });
  });
});