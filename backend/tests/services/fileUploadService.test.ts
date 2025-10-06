import mongoose from 'mongoose';
import { FileUploadService } from '../../src/services/fileUploadService';
import { GridFSBucket } from 'mongodb';

// Mock external dependencies
jest.mock('csv-parser', () => {
  const mockParser = jest.fn(() => ({
    on: jest.fn().mockImplementation((event, callback) => {
      if (event === 'headers') {
        callback(['name', 'age', 'city']);
      } else if (event === 'data') {
        callback({ name: 'John', age: '25', city: 'New York' });
        callback({ name: 'Jane', age: '30', city: 'London' });
      } else if (event === 'end') {
        callback();
      }
    }),
    once: jest.fn(),
    pipe: jest.fn().mockReturnThis(),
    end: jest.fn(),
    destroy: jest.fn(),
    emit: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    setMaxListeners: jest.fn(),
    getMaxListeners: jest.fn(),
    listeners: jest.fn(),
    rawListeners: jest.fn(),
    listenerCount: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
    eventNames: jest.fn()
  }));
  
  // Return the mock function as default export
  return mockParser;
});
jest.mock('xlsx');
jest.mock('../../src/config/environment', () => ({
  env: {
    fileUpload: {
      maxSize: 50 * 1024 * 1024 // 50MB
    }
  }
}));

describe('FileUploadService', () => {
  let fileUploadService: FileUploadService;

  beforeEach(() => {
    fileUploadService = new FileUploadService();
  });

  describe('uploadFile', () => {
    it('should upload file to GridFS successfully', async () => {
      const buffer = Buffer.from('test file content');
      const filename = 'test.csv';
      const metadata = {
        originalName: 'test.csv',
        mimeType: 'text/csv',
        size: buffer.length,
        uploadedBy: 'user123',
        uploadedAt: new Date()
      };

      const fileId = await fileUploadService.uploadFile(buffer, filename, metadata);

      expect(fileId).toBeDefined();
      expect(mongoose.Types.ObjectId.isValid(fileId.toString())).toBe(true);
    });

    it('should handle upload errors', async () => {
      // Mock GridFS to throw error
      const mockUploadStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Upload failed')), 0);
          }
        }),
        once: jest.fn(),
        pipe: jest.fn().mockReturnThis(),
        end: jest.fn(),
        destroy: jest.fn(),
        emit: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        setMaxListeners: jest.fn(),
        getMaxListeners: jest.fn(),
        listeners: jest.fn(),
        rawListeners: jest.fn(),
        listenerCount: jest.fn(),
        prependListener: jest.fn(),
        prependOnceListener: jest.fn(),
        eventNames: jest.fn()
      };

      const mockGridFS = {
        openUploadStream: jest.fn().mockReturnValue(mockUploadStream)
      };

      (fileUploadService as any).gridFSBucket = mockGridFS;

      const buffer = Buffer.from('test content');
      const filename = 'test.csv';
      const metadata = {
        originalName: 'test.csv',
        mimeType: 'text/csv',
        size: buffer.length,
        uploadedBy: 'user123',
        uploadedAt: new Date()
      };

      await expect(fileUploadService.uploadFile(buffer, filename, metadata))
        .rejects.toThrow('Upload failed');
    });
  });

  describe('downloadFile', () => {
    it('should download file from GridFS successfully', async () => {
      // Mock download stream
      const mockDownloadStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('test file content'));
          } else if (event === 'end') {
            callback();
          }
        }),
        once: jest.fn(),
        pipe: jest.fn().mockReturnThis(),
        end: jest.fn(),
        destroy: jest.fn(),
        emit: jest.fn()
      };

      const mockGridFS = {
        openUploadStream: jest.fn().mockReturnValue({
          on: jest.fn().mockImplementation((event, callback) => {
            if (event === 'finish') {
              callback();
            }
          }),
          once: jest.fn(),
          pipe: jest.fn().mockReturnThis(),
          end: jest.fn(),
          destroy: jest.fn(),
          emit: jest.fn()
        }),
        openDownloadStream: jest.fn().mockReturnValue(mockDownloadStream)
      };

      (fileUploadService as any).gridFSBucket = mockGridFS;

      // First upload a file
      const buffer = Buffer.from('test file content');
      const filename = 'test.csv';
      const metadata = {
        originalName: 'test.csv',
        mimeType: 'text/csv',
        size: buffer.length,
        uploadedBy: 'user123',
        uploadedAt: new Date()
      };

      const fileId = await fileUploadService.uploadFile(buffer, filename, metadata);

      // Then download it
      const downloadedBuffer = await fileUploadService.downloadFile(fileId);

      expect(downloadedBuffer).toBeDefined();
      expect(downloadedBuffer.toString()).toBe('test file content');
    });

    it('should handle download errors', async () => {
      const mockDownloadStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Download failed')), 0);
          }
        }),
        once: jest.fn(),
        pipe: jest.fn().mockReturnThis(),
        end: jest.fn(),
        destroy: jest.fn(),
        emit: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        setMaxListeners: jest.fn(),
        getMaxListeners: jest.fn(),
        listeners: jest.fn(),
        rawListeners: jest.fn(),
        listenerCount: jest.fn(),
        prependListener: jest.fn(),
        prependOnceListener: jest.fn(),
        eventNames: jest.fn(),
        addListener: jest.fn(),
        off: jest.fn()
      };

      const mockGridFS = {
        openDownloadStream: jest.fn().mockReturnValue(mockDownloadStream)
      };

      (fileUploadService as any).gridFSBucket = mockGridFS;

      const fileId = new mongoose.Types.ObjectId();

      await expect(fileUploadService.downloadFile(fileId))
        .rejects.toThrow('Download failed');
    });
  });

  describe('deleteFile', () => {
    it('should delete file from GridFS successfully', async () => {
      // First upload a file
      const buffer = Buffer.from('test file content');
      const filename = 'test.csv';
      const metadata = {
        originalName: 'test.csv',
        mimeType: 'text/csv',
        size: buffer.length,
        uploadedBy: 'user123',
        uploadedAt: new Date()
      };

      const fileId = await fileUploadService.uploadFile(buffer, filename, metadata);

      // Then delete it
      await expect(fileUploadService.deleteFile(fileId)).resolves.not.toThrow();
    });

    it('should handle delete errors', async () => {
      const mockGridFS = {
        delete: jest.fn().mockRejectedValue(new Error('Delete failed'))
      };

      (fileUploadService as any).gridFSBucket = mockGridFS;

      const fileId = new mongoose.Types.ObjectId();

      await expect(fileUploadService.deleteFile(fileId))
        .rejects.toThrow('Delete failed');
    });
  });

  describe('getFileInfo', () => {
    it('should get file metadata successfully', async () => {
      // First upload a file
      const buffer = Buffer.from('test file content');
      const filename = 'test.csv';
      const metadata = {
        originalName: 'test.csv',
        mimeType: 'text/csv',
        size: buffer.length,
        uploadedBy: 'user123',
        uploadedAt: new Date()
      };

      const fileId = await fileUploadService.uploadFile(buffer, filename, metadata);

      // Then get file info
      const fileInfo = await fileUploadService.getFileInfo(fileId);

      expect(fileInfo).toBeDefined();
      expect(fileInfo.filename).toBe(filename);
      expect(fileInfo.metadata).toEqual(metadata);
    });

    it('should return null for non-existent file', async () => {
      const fileId = new mongoose.Types.ObjectId();
      const fileInfo = await fileUploadService.getFileInfo(fileId);

      expect(fileInfo).toBeNull();
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV data correctly', async () => {
      const csvBuffer = Buffer.from('name,age,city\nJohn,25,New York\nJane,30,London');

      const result = await (fileUploadService as any).parseCSV(csvBuffer);

      expect(result.headers).toEqual(['name', 'age', 'city']);
      expect(result.rows).toHaveLength(2);
      expect(result.totalRows).toBe(2);
      expect(result.dataTypes).toBeDefined();
    });

    it('should handle CSV parsing errors', async () => {
      const csvBuffer = Buffer.from('invalid,csv,data');
      
      // Create a mock that throws an error
      const mockCsvParser = jest.fn().mockReturnValue({
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            // Simulate error after a short delay
            setTimeout(() => callback(new Error('CSV parsing failed')), 10);
          }
        }),
        once: jest.fn(),
        pipe: jest.fn().mockReturnThis(),
        end: jest.fn(),
        destroy: jest.fn(),
        emit: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        setMaxListeners: jest.fn(),
        getMaxListeners: jest.fn(),
        listeners: jest.fn(),
        rawListeners: jest.fn(),
        listenerCount: jest.fn(),
        prependListener: jest.fn(),
        prependOnceListener: jest.fn(),
        eventNames: jest.fn()
      });

      // Mock the csv-parser module
      jest.doMock('csv-parser', () => mockCsvParser);

      // Re-import the service to get the mocked version
      const { FileUploadService: MockedFileUploadService } = await import('../../src/services/fileUploadService');
      const mockedService = new MockedFileUploadService();

      await expect((mockedService as any).parseCSV(csvBuffer))
        .rejects.toThrow('CSV parsing failed');
    });
  });

  describe('parseExcel', () => {
    it('should parse Excel data correctly', () => {
      const excelBuffer = Buffer.from('mock excel data');
      
      // Mock xlsx
      const mockXLSX = require('xlsx');
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      };
      const mockJsonData = [
        ['name', 'age', 'city'],
        ['John', 25, 'New York'],
        ['Jane', 30, 'London']
      ];
      
      mockXLSX.read.mockReturnValue(mockWorkbook);
      mockXLSX.utils.sheet_to_json.mockReturnValue(mockJsonData);

      const result = (fileUploadService as any).parseExcel(excelBuffer);

      expect(result.headers).toEqual(['name', 'age', 'city']);
      expect(result.rows).toHaveLength(2);
      expect(result.totalRows).toBe(2);
      expect(result.dataTypes).toBeDefined();
    });

    it('should handle Excel file with no sheets', () => {
      const excelBuffer = Buffer.from('mock excel data');
      
      const mockXLSX = require('xlsx');
      const mockWorkbook = {
        SheetNames: []
      };
      
      mockXLSX.read.mockReturnValue(mockWorkbook);

      expect(() => (fileUploadService as any).parseExcel(excelBuffer))
        .toThrow('Excel file has no sheets');
    });

    it('should handle empty Excel file', () => {
      const excelBuffer = Buffer.from('mock excel data');
      
      const mockXLSX = require('xlsx');
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      };
      
      mockXLSX.read.mockReturnValue(mockWorkbook);
      mockXLSX.utils.sheet_to_json.mockReturnValue([]);

      expect(() => (fileUploadService as any).parseExcel(excelBuffer))
        .toThrow('Excel file is empty');
    });
  });

  describe('parseJSON', () => {
    it('should parse JSON data correctly', () => {
      const jsonData = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 30, city: 'London' }
      ];
      const jsonBuffer = Buffer.from(JSON.stringify(jsonData));

      const result = (fileUploadService as any).parseJSON(jsonBuffer);

      expect(result.headers).toEqual(['name', 'age', 'city']);
      expect(result.rows).toEqual(jsonData);
      expect(result.totalRows).toBe(2);
      expect(result.dataTypes).toBeDefined();
    });

    it('should handle non-array JSON', () => {
      const jsonData = { name: 'John', age: 25 };
      const jsonBuffer = Buffer.from(JSON.stringify(jsonData));

      expect(() => (fileUploadService as any).parseJSON(jsonBuffer))
        .toThrow('JSON must be an array of objects');
    });

    it('should handle empty JSON array', () => {
      const jsonData: any[] = [];
      const jsonBuffer = Buffer.from(JSON.stringify(jsonData));

      expect(() => (fileUploadService as any).parseJSON(jsonBuffer))
        .toThrow('JSON array is empty');
    });

    it('should handle invalid JSON', () => {
      const jsonBuffer = Buffer.from('invalid json');

      expect(() => (fileUploadService as any).parseJSON(jsonBuffer))
        .toThrow();
    });
  });

  describe('detectDataTypes', () => {
    it('should detect numeric data types', () => {
      const rows = [
        { value: 100 },
        { value: 200 },
        { value: 300 }
      ];
      const headers = ['value'];

      const result = (fileUploadService as any).detectDataTypes(rows, headers);

      expect(result.value).toBe('number');
    });

    it('should detect date data types', () => {
      const rows = [
        { date: '2024-01-01' },
        { date: '2024-01-02' },
        { date: '2024-01-03' }
      ];
      const headers = ['date'];

      const result = (fileUploadService as any).detectDataTypes(rows, headers);

      expect(result.date).toBe('date');
    });

    it('should detect boolean data types', () => {
      const rows = [
        { active: true },
        { active: false },
        { active: true }
      ];
      const headers = ['active'];

      const result = (fileUploadService as any).detectDataTypes(rows, headers);

      expect(result.active).toBe('boolean');
    });

    it('should default to string for mixed data', () => {
      const rows = [
        { mixed: 'text' },
        { mixed: 123 },
        { mixed: 'more text' }
      ];
      const headers = ['mixed'];

      const result = (fileUploadService as any).detectDataTypes(rows, headers);

      expect(result.mixed).toBe('string');
    });

    it('should handle empty data', () => {
      const rows: any[] = [];
      const headers = ['empty'];

      const result = (fileUploadService as any).detectDataTypes(rows, headers);

      expect(result.empty).toBe('unknown');
    });
  });

  describe('parseFile', () => {
    it('should parse CSV file', async () => {
      const csvBuffer = Buffer.from('name,age\nJohn,25');
      const mimeType = 'text/csv';
      const filename = 'test.csv';

      // Mock parseCSV method
      const mockResult = {
        headers: ['name', 'age'],
        rows: [{ name: 'John', age: '25' }],
        totalRows: 1,
        dataTypes: { name: 'string', age: 'number' }
      };
      (fileUploadService as any).parseCSV = jest.fn().mockResolvedValue(mockResult);

      const result = await fileUploadService.parseFile(csvBuffer, mimeType, filename);

      expect(result).toEqual(mockResult);
      expect((fileUploadService as any).parseCSV).toHaveBeenCalledWith(csvBuffer);
    });

    it('should parse Excel file', async () => {
      const excelBuffer = Buffer.from('mock excel data');
      const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const filename = 'test.xlsx';

      // Mock parseExcel method
      const mockResult = {
        headers: ['name', 'age'],
        rows: [{ name: 'John', age: 25 }],
        totalRows: 1,
        dataTypes: { name: 'string', age: 'number' }
      };
      (fileUploadService as any).parseExcel = jest.fn().mockReturnValue(mockResult);

      const result = await fileUploadService.parseFile(excelBuffer, mimeType, filename);

      expect(result).toEqual(mockResult);
      expect((fileUploadService as any).parseExcel).toHaveBeenCalledWith(excelBuffer);
    });

    it('should parse JSON file', async () => {
      const jsonBuffer = Buffer.from('[{"name":"John","age":25}]');
      const mimeType = 'application/json';
      const filename = 'test.json';

      // Mock parseJSON method
      const mockResult = {
        headers: ['name', 'age'],
        rows: [{ name: 'John', age: 25 }],
        totalRows: 1,
        dataTypes: { name: 'string', age: 'number' }
      };
      (fileUploadService as any).parseJSON = jest.fn().mockReturnValue(mockResult);

      const result = await fileUploadService.parseFile(jsonBuffer, mimeType, filename);

      expect(result).toEqual(mockResult);
      expect((fileUploadService as any).parseJSON).toHaveBeenCalledWith(jsonBuffer);
    });

    it('should handle unsupported file type', async () => {
      const buffer = Buffer.from('unsupported content');
      const mimeType = 'application/unsupported';
      const filename = 'test.unsupported';

      await expect(fileUploadService.parseFile(buffer, mimeType, filename))
        .rejects.toThrow('Unsupported file type: application/unsupported');
    });
  });

  describe('getFullFile', () => {
    it('should get full file data', async () => {
      // Mock streams for upload and download
      const mockUploadStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        }),
        once: jest.fn(),
        pipe: jest.fn().mockReturnThis(),
        end: jest.fn(),
        destroy: jest.fn(),
        emit: jest.fn()
      };

      const mockDownloadStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('test file content'));
          } else if (event === 'end') {
            callback();
          }
        }),
        once: jest.fn(),
        pipe: jest.fn().mockReturnThis(),
        end: jest.fn(),
        destroy: jest.fn(),
        emit: jest.fn()
      };

      // First define variables
      const buffer = Buffer.from('test file content');
      const filename = 'test.csv';
      const metadata = {
        originalName: 'test.csv',
        mimeType: 'text/csv',
        size: buffer.length,
        uploadedBy: 'user123',
        uploadedAt: new Date()
      };

      const mockGridFS = {
        openUploadStream: jest.fn().mockReturnValue(mockUploadStream),
        openDownloadStream: jest.fn().mockReturnValue(mockDownloadStream),
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([{
            _id: new mongoose.Types.ObjectId(),
            filename: filename,
            metadata: metadata
          }])
        })
      };

      (fileUploadService as any).gridFSBucket = mockGridFS;

      const fileId = await fileUploadService.uploadFile(buffer, filename, metadata);

      // Then get full file
      const result = await fileUploadService.getFullFile(fileId);

      expect(result.buffer).toEqual(buffer);
      expect(result.metadata).toEqual(metadata);
      expect(result.filename).toBe(filename);
    });

    it('should handle non-existent file', async () => {
      const fileId = new mongoose.Types.ObjectId();

      await expect(fileUploadService.getFullFile(fileId))
        .rejects.toThrow('File not found');
    });
  });

  describe('getFilePreview', () => {
    it('should get file preview with limit', async () => {
      // First upload a file
      const buffer = Buffer.from('test file content');
      const filename = 'test.csv';
      const metadata = {
        originalName: 'test.csv',
        mimeType: 'text/csv',
        size: buffer.length,
        uploadedBy: 'user123',
        uploadedAt: new Date()
      };

      const fileId = await fileUploadService.uploadFile(buffer, filename, metadata);

      // Mock parseFile method
      const mockParsedData = {
        headers: ['name', 'age'],
        rows: Array.from({ length: 10 }, (_, i) => ({ name: `Person ${i}`, age: 20 + i })),
        totalRows: 10,
        dataTypes: { name: 'string', age: 'number' }
      };
      (fileUploadService as any).parseFile = jest.fn().mockResolvedValue(mockParsedData);

      const result = await fileUploadService.getFilePreview(fileId, 5);

      expect(result.rows).toHaveLength(5);
      expect(result.totalRows).toBe(10);
      expect(result.headers).toEqual(['name', 'age']);
    });

    it('should handle non-existent file for preview', async () => {
      const fileId = new mongoose.Types.ObjectId();

      await expect(fileUploadService.getFilePreview(fileId))
        .rejects.toThrow('File not found');
    });
  });

  describe('validateFile', () => {
    it('should validate file successfully', () => {
      const file = {
        originalname: 'test.csv',
        mimetype: 'text/csv',
        size: 1024
      } as Express.Multer.File;

      const result = fileUploadService.validateFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file that is too large', () => {
      const file = {
        originalname: 'large.csv',
        mimetype: 'text/csv',
        size: 100 * 1024 * 1024 // 100MB
      } as Express.Multer.File;

      const result = fileUploadService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('File size exceeds'));
    });

    it('should reject unsupported file type', () => {
      const file = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024
      } as Express.Multer.File;

      const result = fileUploadService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('File type not supported'));
    });

    it('should accept file by extension when mime type is not recognized', () => {
      const file = {
        originalname: 'test.csv',
        mimetype: 'application/octet-stream', // Generic mime type
        size: 1024
      } as Express.Multer.File;

      const result = fileUploadService.validateFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', () => {
      // Mock mongoose.connection.db to be undefined
      const originalDb = mongoose.connection.db;
      (mongoose.connection as any).db = undefined;

      expect(() => (fileUploadService as any).getGridFSBucket())
        .toThrow('Database connection not established');

      // Restore
      (mongoose.connection as any).db = originalDb;
    });

    it('should handle GridFS bucket creation errors', () => {
      // Test when database connection is not established
      const originalDb = mongoose.connection.db;
      (mongoose.connection as any).db = null;

      // Clear the cached bucket to force recreation
      (fileUploadService as any).gridFSBucket = null;

      expect(() => (fileUploadService as any).getGridFSBucket())
        .toThrow('Database connection not established');

      // Restore
      (mongoose.connection as any).db = originalDb;
    });
  });
});
