import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  nullable: boolean;
  unique?: boolean;
  pattern?: string;
  minValue?: number;
  maxValue?: number;
  avgValue?: number;
  distinctValues?: number;
  sampleValues: any[];
  confidence: number;
}

export interface DatasetSchema {
  totalRows: number;
  totalColumns: number;
  fields: FieldSchema[];
  relationships?: Array<{
    sourceField: string;
    targetField: string;
    type: 'foreign_key' | 'correlation' | 'dependency';
    strength: number;
  }>;
  quality: {
    completeness: number;
    consistency: number;
    validity: number;
    duplicates: number;
  };
  recommendations: string[];
}

export class SchemaDetectionService {
  private gridFSBucket?: GridFSBucket;

  // Lazy initialization of GridFSBucket
  private getGridFSBucket(): GridFSBucket {
    if (!this.gridFSBucket) {
      if (!mongoose.connection.db) {
        throw new Error('Database connection not established. Please ensure MongoDB is connected.');
      }
      this.gridFSBucket = new GridFSBucket(mongoose.connection.db!, {
        bucketName: 'datasets'
      });
    }
    return this.gridFSBucket;
  }

  /**
   * Analyze data and detect schema
   */
  async detectSchema(data: any[]): Promise<DatasetSchema> {
    if (!data || data.length === 0) {
      throw new Error('No data provided for schema detection');
    }

    const fields = await this.analyzeFields(data);
    const relationships = await this.detectRelationships(data, fields);
    const quality = await this.assessDataQuality(data, fields);
    const recommendations = this.generateRecommendations(fields, quality);

    return {
      totalRows: data.length,
      totalColumns: fields.length,
      fields,
      relationships: relationships || [],
      quality,
      recommendations
    };
  }

  /**
   * Analyze individual fields and detect their types and characteristics
   */
  private async analyzeFields(data: any[]): Promise<FieldSchema[]> {
    if (data.length === 0) return [];

    // Get all unique field names from the data
    const fieldNames = new Set<string>();
    data.forEach(row => {
      if (typeof row === 'object' && row !== null) {
        Object.keys(row).forEach(key => fieldNames.add(key));
      }
    });

    const fields: FieldSchema[] = [];

    for (const fieldName of fieldNames) {
      const values = data
        .map(row => row?.[fieldName])
        .filter(val => val !== undefined);

      const field = await this.analyzeField(fieldName, values);
      fields.push(field);
    }

    return fields;
  }

  /**
   * Analyze a single field
   */
  private async analyzeField(name: string, values: any[]): Promise<FieldSchema> {
    const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
    const nullCount = values.length - nonNullValues.length;
    const nullable = nullCount > 0;

    // Get sample values for analysis
    const sampleValues = this.getSampleValues(nonNullValues, 10);
    
    // Detect data type
    const typeDetection = this.detectFieldType(nonNullValues);
    
    // Calculate statistics
    const uniqueValues = new Set(nonNullValues.map(val => String(val).toLowerCase()));
    const distinctValues = uniqueValues.size;
    const unique = distinctValues === nonNullValues.length && nonNullValues.length > 1;

    let minValue: number | undefined;
    let maxValue: number | undefined;
    let avgValue: number | undefined;
    let pattern: string | undefined;

    if (typeDetection.type === 'number') {
      const numericValues = nonNullValues.filter(val => !isNaN(Number(val))).map(val => Number(val));
      if (numericValues.length > 0) {
        minValue = Math.min(...numericValues);
        maxValue = Math.max(...numericValues);
        avgValue = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
      }
    }

    if (typeDetection.type === 'string') {
      pattern = this.detectStringPattern(nonNullValues);
    }

    return {
      name,
      type: typeDetection.type,
      nullable,
      unique,
      ...(pattern && { pattern }),
      ...(minValue !== undefined && { minValue }),
      ...(maxValue !== undefined && { maxValue }),
      ...(avgValue !== undefined && { avgValue }),
      distinctValues,
      sampleValues,
      confidence: typeDetection.confidence
    };
  }

  /**
   * Detect the data type of a field
   */
  private detectFieldType(values: any[]): { type: FieldSchema['type']; confidence: number } {
    if (values.length === 0) {
      return { type: 'string', confidence: 0 };
    }

    const typeScores = {
      number: 0,
      date: 0,
      boolean: 0,
      array: 0,
      object: 0,
      string: 0
    };

    values.forEach(value => {
      // Check for number
      if (!isNaN(Number(value)) && isFinite(Number(value))) {
        typeScores.number++;
      }
      
      // Check for date
      if (this.isDateLike(value)) {
        typeScores.date++;
      }
      
      // Check for boolean
      if (this.isBooleanLike(value)) {
        typeScores.boolean++;
      }
      
      // Check for array
      if (Array.isArray(value)) {
        typeScores.array++;
      }
      
      // Check for object
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        typeScores.object++;
      }
      
      // Everything can be a string
      typeScores.string++;
    });

    // Find the type with the highest score
    const maxScore = Math.max(...Object.values(typeScores));
    const bestType = Object.keys(typeScores).find(
      type => typeScores[type as keyof typeof typeScores] === maxScore
    ) as FieldSchema['type'];

    const confidence = maxScore / values.length;

    // If confidence is low and it's not clearly another type, default to string
    if (confidence < 0.8 && bestType !== 'array' && bestType !== 'object') {
      return { type: 'string', confidence: 1 };
    }

    return { type: bestType || 'string', confidence };
  }

  /**
   * Check if a value looks like a date
   */
  private isDateLike(value: any): boolean {
    if (typeof value !== 'string' && !(value instanceof Date)) {
      return false;
    }

    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO 8601
    ];

    const stringValue = String(value);
    const matchesPattern = datePatterns.some(pattern => pattern.test(stringValue));
    
    if (matchesPattern) {
      const date = new Date(stringValue);
      return !isNaN(date.getTime());
    }

    return false;
  }

  /**
   * Check if a value looks like a boolean
   */
  private isBooleanLike(value: any): boolean {
    if (typeof value === 'boolean') return true;
    
    const stringValue = String(value).toLowerCase();
    const booleanValues = ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n', 'on', 'off'];
    
    return booleanValues.includes(stringValue);
  }

  /**
   * Detect string patterns
   */
  private detectStringPattern(values: any[]): string | undefined {
    const stringValues = values.map(val => String(val));
    
    // Common patterns
    const patterns = [
      { name: 'email', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      { name: 'phone', regex: /^[\+]?[1-9][\d]{0,15}$/ },
      { name: 'url', regex: /^https?:\/\/.+/ },
      { name: 'uuid', regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i },
      { name: 'zipcode', regex: /^\d{5}(-\d{4})?$/ },
      { name: 'creditcard', regex: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/ }
    ];

    for (const pattern of patterns) {
      const matches = stringValues.filter(val => pattern.regex.test(val));
      if (matches.length / stringValues.length > 0.8) {
        return pattern.name;
      }
    }

    return undefined;
  }

  /**
   * Detect relationships between fields
   */
  private async detectRelationships(data: any[], fields: FieldSchema[]): Promise<DatasetSchema['relationships']> {
    const relationships: NonNullable<DatasetSchema['relationships']> = [];

    // Check for potential foreign key relationships
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const field1 = fields[i];
        const field2 = fields[j];

        if (!field1 || !field2) continue;

        // Skip if different types
        if (field1.type !== field2.type) continue;

        const values1 = data.map(row => row[field1.name]).filter(val => val != null);
        const values2 = data.map(row => row[field2.name]).filter(val => val != null);

        // Check for foreign key relationship
        const intersection = new Set(values1.filter(val => values2.includes(val)));
        const unionSize = new Set([...values1, ...values2]).size;
        const overlapRatio = intersection.size / unionSize;

        if (overlapRatio > 0.5) {
          relationships.push({
            sourceField: field1.name,
            targetField: field2.name,
            type: 'foreign_key',
            strength: overlapRatio
          });
        }

        // Check for correlation (numeric fields only)
        if (field1.type === 'number' && field2.type === 'number') {
          const correlation = this.calculateCorrelation(values1, values2);
          if (Math.abs(correlation) > 0.7) {
            relationships.push({
              sourceField: field1.name,
              targetField: field2.name,
              type: 'correlation',
              strength: Math.abs(correlation)
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Calculate correlation between two numeric arrays
   */
  private calculateCorrelation(arr1: any[], arr2: any[]): number {
    const n = Math.min(arr1.length, arr2.length);
    if (n < 2) return 0;

    const nums1 = arr1.slice(0, n).map(val => Number(val)).filter(val => !isNaN(val));
    const nums2 = arr2.slice(0, n).map(val => Number(val)).filter(val => !isNaN(val));

    if (nums1.length !== nums2.length || nums1.length < 2) return 0;

    const mean1 = nums1.reduce((sum, val) => sum + val, 0) / nums1.length;
    const mean2 = nums2.reduce((sum, val) => sum + val, 0) / nums2.length;

    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < nums1.length; i++) {
      const val1 = nums1[i];
      const val2 = nums2[i];
      if (val1 === undefined || val2 === undefined) continue;
      
      const diff1 = val1 - mean1;
      const diff2 = val2 - mean2;
      numerator += diff1 * diff2;
      sum1Sq += diff1 ** 2;
      sum2Sq += diff2 ** 2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Assess data quality
   */
  private async assessDataQuality(data: any[], fields: FieldSchema[]): Promise<DatasetSchema['quality']> {
    const totalCells = data.length * fields.length;
    let completeCells = 0;
    let validCells = 0;
    let duplicateRows = 0;

    // Check completeness and validity
    data.forEach(row => {
      fields.forEach(field => {
        const value = row[field.name];
        
        if (value != null && value !== '') {
          completeCells++;
          
          // Check validity based on detected type
          if (this.isValidValue(value, field.type)) {
            validCells++;
          }
        }
      });
    });

    // Check for duplicate rows
    const stringifiedRows = data.map(row => 
      JSON.stringify(Object.keys(row).sort().reduce((sorted: any, key) => {
        sorted[key] = row[key];
        return sorted;
      }, {}))
    );
    
    const uniqueRows = new Set(stringifiedRows);
    duplicateRows = data.length - uniqueRows.size;

    const completeness = completeCells / totalCells;
    const validity = validCells / completeCells || 0;
    const consistency = 1 - (duplicateRows / data.length);

    return {
      completeness: Math.round(completeness * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      validity: Math.round(validity * 100) / 100,
      duplicates: duplicateRows
    };
  }

  /**
   * Check if a value is valid for a given type
   */
  private isValidValue(value: any, type: FieldSchema['type']): boolean {
    switch (type) {
      case 'number':
        return !isNaN(Number(value)) && isFinite(Number(value));
      case 'date':
        return this.isDateLike(value);
      case 'boolean':
        return this.isBooleanLike(value);
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'string':
        return true; // Any value can be converted to string
      default:
        return true;
    }
  }

  /**
   * Generate recommendations based on schema analysis
   */
  private generateRecommendations(fields: FieldSchema[], quality: DatasetSchema['quality']): string[] {
    const recommendations: string[] = [];

    // Quality recommendations
    if (quality.completeness < 0.8) {
      recommendations.push('Consider data cleaning to improve completeness. Missing values detected in multiple fields.');
    }

    if (quality.validity < 0.9) {
      recommendations.push('Some data values do not match their detected types. Review and clean invalid entries.');
    }

    if (quality.duplicates > 0) {
      recommendations.push(`Found ${quality.duplicates} duplicate rows. Consider deduplication.`);
    }

    // Field-specific recommendations
    fields.forEach(field => {
      if (field.confidence < 0.8) {
        recommendations.push(`Field '${field.name}' has mixed data types. Consider data standardization.`);
      }

      if (field.type === 'string' && field.distinctValues && field.distinctValues < 10) {
        recommendations.push(`Field '${field.name}' appears to be categorical. Consider creating an enum or lookup table.`);
      }

      if (field.type === 'number' && field.distinctValues === 2) {
        recommendations.push(`Field '${field.name}' appears to be binary. Consider converting to boolean type.`);
      }
    });

    // Performance recommendations
    if (fields.some(field => field.unique)) {
      recommendations.push('Unique fields detected. Consider adding database indexes for better query performance.');
    }

    return recommendations;
  }

  /**
   * Get sample values from an array
   */
  private getSampleValues(values: any[], count: number = 10): any[] {
    if (values.length <= count) {
      return [...values];
    }

    const step = Math.floor(values.length / count);
    const samples: any[] = [];
    
    for (let i = 0; i < count && i * step < values.length; i++) {
      samples.push(values[i * step]);
    }

    return samples;
  }

  /**
   * Validate schema against existing data
   */
  async validateSchema(data: any[], expectedSchema: Partial<DatasetSchema>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const detectedSchema = await this.detectSchema(data);

      // Check field count
      if (expectedSchema.totalColumns && detectedSchema.totalColumns !== expectedSchema.totalColumns) {
        errors.push(`Expected ${expectedSchema.totalColumns} columns, found ${detectedSchema.totalColumns}`);
      }

      // Check field types
      if (expectedSchema.fields) {
        expectedSchema.fields.forEach(expectedField => {
          const detectedField = detectedSchema.fields.find(f => f.name === expectedField.name);
          
          if (!detectedField) {
            errors.push(`Expected field '${expectedField.name}' not found`);
            return;
          }

          if (detectedField.type !== expectedField.type) {
            if (detectedField.confidence < 0.7) {
              warnings.push(`Field '${expectedField.name}' type mismatch: expected ${expectedField.type}, detected ${detectedField.type} (low confidence)`);
            } else {
              errors.push(`Field '${expectedField.name}' type mismatch: expected ${expectedField.type}, detected ${detectedField.type}`);
            }
          }
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }
}