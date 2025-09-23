import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { logger } from '../config/logger';

interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

interface ParsedData {
  headers: string[];
  rows: any[];
  totalRows: number;
  dataTypes: Record<string, string>;
}

export class FileUploadService {
  private gridFSBucket: GridFSBucket;

  constructor() {
    this.gridFSBucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'datasets'
    });
  }

  // Upload file to GridFS
  async uploadFile(
    buffer: Buffer, 
    filename: string, 
    metadata: FileMetadata
  ): Promise<mongoose.Types.ObjectId> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.gridFSBucket.openUploadStream(filename, {
        metadata
      });

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      uploadStream.on('error', (error) => {
        logger.error('GridFS upload error:', error);
        reject(error);
      });

      uploadStream.on('finish', () => {
        logger.info(`File uploaded to GridFS: ${filename}`);
        resolve(uploadStream.id as mongoose.Types.ObjectId);
      });

      readableStream.pipe(uploadStream);
    });
  }

  // Download file from GridFS
  async downloadFile(fileId: mongoose.Types.ObjectId): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const downloadStream = this.gridFSBucket.openDownloadStream(fileId);

      downloadStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      downloadStream.on('error', (error) => {
        logger.error('GridFS download error:', error);
        reject(error);
      });

      downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    });
  }

  // Delete file from GridFS
  async deleteFile(fileId: mongoose.Types.ObjectId): Promise<void> {
    try {
      await this.gridFSBucket.delete(fileId);
      logger.info(`File deleted from GridFS: ${fileId}`);
    } catch (error) {
      logger.error('GridFS delete error:', error);
      throw error;
    }
  }

  // Get file metadata
  async getFileInfo(fileId: mongoose.Types.ObjectId): Promise<any> {
    try {
      const files = await this.gridFSBucket.find({ _id: fileId }).toArray();
      return files.length > 0 ? files[0] : null;
    } catch (error) {
      logger.error('GridFS file info error:', error);
      throw error;
    }
  }

  // Parse CSV data
  private async parseCSV(buffer: Buffer): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const rows: any[] = [];
      let headers: string[] = [];
      let isFirstRow = true;

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      readableStream
        .pipe(csvParser())
        .on('headers', (headerArray: string[]) => {
          headers = headerArray;
        })
        .on('data', (row: any) => {
          if (isFirstRow) {
            isFirstRow = false;
            if (!headers.length) {
              headers = Object.keys(row);
            }
          }
          rows.push(row);
        })
        .on('end', () => {
          const dataTypes = this.detectDataTypes(rows, headers);
          resolve({
            headers,
            rows,
            totalRows: rows.length,
            dataTypes
          });
        })
        .on('error', (error) => {
          logger.error('CSV parsing error:', error);
          reject(error);
        });
    });
  }

  // Parse Excel data
  private parseExcel(buffer: Buffer): ParsedData {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1).map(row => {
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = (row as any[])[index] || null;
        });
        return rowObj;
      });

      const dataTypes = this.detectDataTypes(rows, headers);

      return {
        headers,
        rows,
        totalRows: rows.length,
        dataTypes
      };
    } catch (error) {
      logger.error('Excel parsing error:', error);
      throw error;
    }
  }

  // Parse JSON data
  private parseJSON(buffer: Buffer): ParsedData {
    try {
      const jsonData = JSON.parse(buffer.toString());
      
      if (!Array.isArray(jsonData)) {
        throw new Error('JSON must be an array of objects');
      }

      if (jsonData.length === 0) {
        throw new Error('JSON array is empty');
      }

      const headers = Object.keys(jsonData[0]);
      const dataTypes = this.detectDataTypes(jsonData, headers);

      return {
        headers,
        rows: jsonData,
        totalRows: jsonData.length,
        dataTypes
      };
    } catch (error) {
      logger.error('JSON parsing error:', error);
      throw error;
    }
  }

  // Detect data types for columns
  private detectDataTypes(rows: any[], headers: string[]): Record<string, string> {
    const dataTypes: Record<string, string> = {};
    
    headers.forEach(header => {
      const sampleValues = rows.slice(0, 100).map(row => row[header]).filter(val => val != null);
      
      if (sampleValues.length === 0) {
        dataTypes[header] = 'unknown';
        return;
      }

      const numericCount = sampleValues.filter(val => !isNaN(Number(val))).length;
      const dateCount = sampleValues.filter(val => !isNaN(Date.parse(val))).length;
      const booleanCount = sampleValues.filter(val => 
        typeof val === 'boolean' || val === 'true' || val === 'false'
      ).length;

      if (numericCount / sampleValues.length > 0.8) {
        dataTypes[header] = 'number';
      } else if (dateCount / sampleValues.length > 0.8) {
        dataTypes[header] = 'date';
      } else if (booleanCount / sampleValues.length > 0.8) {
        dataTypes[header] = 'boolean';
      } else {
        dataTypes[header] = 'string';
      }
    });

    return dataTypes;
  }

  // Parse file based on type
  async parseFile(buffer: Buffer, mimeType: string, filename: string): Promise<ParsedData> {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    try {
      if (mimeType.includes('csv') || extension === 'csv') {
        return await this.parseCSV(buffer);
      } else if (mimeType.includes('sheet') || mimeType.includes('excel') || 
                 extension === 'xlsx' || extension === 'xls') {
        return this.parseExcel(buffer);
      } else if (mimeType.includes('json') || extension === 'json') {
        return this.parseJSON(buffer);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      logger.error('File parsing error:', error);
      throw error;
    }
  }

  // Get file preview
  async getFilePreview(
    fileId: mongoose.Types.ObjectId, 
    limit: number = 100
  ): Promise<{ rows: any[], totalRows: number, headers: string[] }> {
    try {
      const fileInfo = await this.getFileInfo(fileId);
      if (!fileInfo) {
        throw new Error('File not found');
      }

      const buffer = await this.downloadFile(fileId);
      const parsedData = await this.parseFile(
        buffer, 
        fileInfo.metadata.mimeType, 
        fileInfo.filename
      );

      return {
        rows: parsedData.rows.slice(0, limit),
        totalRows: parsedData.totalRows,
        headers: parsedData.headers
      };
    } catch (error) {
      logger.error('File preview error:', error);
      throw error;
    }
  }

  // Validate file
  validateFile(file: Express.Multer.File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB
    const allowedTypes = ['text/csv', 'application/json', 
                         'application/vnd.ms-excel',
                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const allowedExtensions = ['csv', 'json', 'xlsx', 'xls'];
    
    const extension = file.originalname.split('.').pop()?.toLowerCase();

    if (file.size > maxSize) {
      errors.push(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }

    if (!allowedTypes.includes(file.mimetype) && !allowedExtensions.includes(extension || '')) {
      errors.push('File type not supported. Please upload CSV, JSON, or Excel files.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const fileUploadService = new FileUploadService();