import { FieldSchema, DatasetSchema } from './schemaDetectionService';

export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  params?: any;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  rowIndex?: number;
  field?: string;
  value?: any;
  error: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DataValidationSummary {
  totalRows: number;
  validRows: number;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  fieldSummary: Record<string, {
    validCount: number;
    errorCount: number;
    warningCount: number;
  }>;
}

export class DataValidationService {
  /**
   * Validate data against a schema
   */
  async validateData(data: any[], schema: DatasetSchema): Promise<DataValidationSummary> {
    const errors: ValidationResult[] = [];
    const warnings: ValidationResult[] = [];
    const fieldSummary: Record<string, { validCount: number; errorCount: number; warningCount: number }> = {};

    // Initialize field summary
    schema.fields.forEach(field => {
      fieldSummary[field.name] = { validCount: 0, errorCount: 0, warningCount: 0 };
    });

    // Validate each row
    data.forEach((row, rowIndex) => {
      schema.fields.forEach(field => {
        const value = row[field.name];
        const validationResults = this.validateFieldValue(value, field, rowIndex);
        
        validationResults.forEach(result => {
          if (result.severity === 'error') {
            errors.push(result);
            fieldSummary[field.name].errorCount++;
          } else if (result.severity === 'warning') {
            warnings.push(result);
            fieldSummary[field.name].warningCount++;
          } else {
            fieldSummary[field.name].validCount++;
          }
        });

        // If no errors or warnings, count as valid
        if (validationResults.length === 0) {
          fieldSummary[field.name].validCount++;
        }
      });
    });

    const validRows = data.length - new Set(errors.map(e => e.rowIndex)).size;

    return {
      totalRows: data.length,
      validRows,
      errors,
      warnings,
      fieldSummary
    };
  }

  /**
   * Validate a single field value
   */
  private validateFieldValue(value: any, field: FieldSchema, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Check for null/undefined values
    if (value == null || value === '') {
      if (!field.nullable) {
        results.push({
          isValid: false,
          rowIndex,
          field: field.name,
          value,
          error: `Field '${field.name}' is required but is null or empty`,
          severity: 'error'
        });
      }
      return results;
    }

    // Type validation
    if (!this.isValidType(value, field.type)) {
      results.push({
        isValid: false,
        rowIndex,
        field: field.name,
        value,
        error: `Field '${field.name}' expected type '${field.type}' but got '${typeof value}'`,
        severity: field.confidence < 0.8 ? 'warning' : 'error'
      });
    }

    // Range validation for numbers
    if (field.type === 'number' && !isNaN(Number(value))) {
      const numValue = Number(value);
      
      if (field.minValue !== undefined && numValue < field.minValue) {
        results.push({
          isValid: false,
          rowIndex,
          field: field.name,
          value,
          error: `Value ${numValue} is below minimum ${field.minValue}`,
          severity: 'warning'
        });
      }
      
      if (field.maxValue !== undefined && numValue > field.maxValue) {
        results.push({
          isValid: false,
          rowIndex,
          field: field.name,
          value,
          error: `Value ${numValue} is above maximum ${field.maxValue}`,
          severity: 'warning'
        });
      }
    }

    // Pattern validation for strings
    if (field.type === 'string' && field.pattern) {
      const patternValid = this.validatePattern(String(value), field.pattern);
      if (!patternValid) {
        results.push({
          isValid: false,
          rowIndex,
          field: field.name,
          value,
          error: `Value does not match expected pattern: ${field.pattern}`,
          severity: 'warning'
        });
      }
    }

    return results;
  }

  /**
   * Check if value matches the expected type
   */
  private isValidType(value: any, expectedType: FieldSchema['type']): boolean {
    switch (expectedType) {
      case 'string':
        return true; // Any value can be converted to string
      case 'number':
        return !isNaN(Number(value)) && isFinite(Number(value));
      case 'boolean':
        return this.isBooleanLike(value);
      case 'date':
        return this.isDateLike(value);
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Check if value looks like a boolean
   */
  private isBooleanLike(value: any): boolean {
    if (typeof value === 'boolean') return true;
    
    const stringValue = String(value).toLowerCase();
    const booleanValues = ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n', 'on', 'off'];
    
    return booleanValues.includes(stringValue);
  }

  /**
   * Check if value looks like a date
   */
  private isDateLike(value: any): boolean {
    if (typeof value !== 'string' && !(value instanceof Date)) {
      return false;
    }

    const date = new Date(String(value));
    return !isNaN(date.getTime());
  }

  /**
   * Validate string pattern
   */
  private validatePattern(value: string, pattern: string): boolean {
    switch (pattern) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^[\+]?[1-9][\d]{0,15}$/.test(value);
      case 'url':
        return /^https?:\/\/.+/.test(value);
      case 'uuid':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      case 'zipcode':
        return /^\d{5}(-\d{4})?$/.test(value);
      case 'creditcard':
        return /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(value);
      default:
        return true;
    }
  }

  /**
   * Validate data with custom rules
   */
  async validateWithRules(data: any[], rules: ValidationRule[]): Promise<DataValidationSummary> {
    const errors: ValidationResult[] = [];
    const warnings: ValidationResult[] = [];
    const fieldSummary: Record<string, { validCount: number; errorCount: number; warningCount: number }> = {};

    // Initialize field summary
    const fieldNames = new Set(rules.map(rule => rule.field));
    fieldNames.forEach(fieldName => {
      fieldSummary[fieldName] = { validCount: 0, errorCount: 0, warningCount: 0 };
    });

    // Validate each row
    data.forEach((row, rowIndex) => {
      rules.forEach(rule => {
        const value = row[rule.field];
        const result = this.validateRule(value, rule, rowIndex);
        
        if (result) {
          if (result.severity === 'error') {
            errors.push(result);
            fieldSummary[rule.field].errorCount++;
          } else if (result.severity === 'warning') {
            warnings.push(result);
            fieldSummary[rule.field].warningCount++;
          }
        } else {
          fieldSummary[rule.field].validCount++;
        }
      });
    });

    const validRows = data.length - new Set(errors.map(e => e.rowIndex)).size;

    return {
      totalRows: data.length,
      validRows,
      errors,
      warnings,
      fieldSummary
    };
  }

  /**
   * Validate a single rule
   */
  private validateRule(value: any, rule: ValidationRule, rowIndex: number): ValidationResult | null {
    let isValid = true;
    let error = '';
    let severity: 'error' | 'warning' | 'info' = 'error';

    switch (rule.type) {
      case 'required':
        isValid = value != null && value !== '';
        error = rule.message || `Field '${rule.field}' is required`;
        break;

      case 'type':
        isValid = this.isValidType(value, rule.params.expectedType);
        error = rule.message || `Field '${rule.field}' must be of type '${rule.params.expectedType}'`;
        break;

      case 'range':
        if (typeof value === 'number') {
          const { min, max } = rule.params;
          isValid = (min === undefined || value >= min) && (max === undefined || value <= max);
          error = rule.message || `Field '${rule.field}' must be between ${min} and ${max}`;
        }
        break;

      case 'pattern':
        if (typeof value === 'string') {
          const regex = new RegExp(rule.params.pattern);
          isValid = regex.test(value);
          error = rule.message || `Field '${rule.field}' does not match required pattern`;
        }
        break;

      case 'custom':
        if (typeof rule.params.validator === 'function') {
          const customResult = rule.params.validator(value);
          isValid = customResult === true;
          error = rule.message || (typeof customResult === 'string' ? customResult : `Custom validation failed for field '${rule.field}'`);
        }
        break;

      default:
        return null;
    }

    if (!isValid) {
      return {
        isValid: false,
        rowIndex,
        field: rule.field,
        value,
        error,
        severity
      };
    }

    return null;
  }

  /**
   * Generate data quality report
   */
  async generateQualityReport(data: any[], schema: DatasetSchema): Promise<{
    overall: {
      score: number;
      grade: 'A' | 'B' | 'C' | 'D' | 'F';
      summary: string;
    };
    dimensions: {
      completeness: { score: number; details: string };
      consistency: { score: number; details: string };
      validity: { score: number; details: string };
      uniqueness: { score: number; details: string };
    };
    recommendations: string[];
  }> {
    const validation = await this.validateData(data, schema);
    
    // Calculate quality scores
    const completenessScore = schema.quality.completeness;
    const consistencyScore = schema.quality.consistency;
    const validityScore = schema.quality.validity;
    const uniquenessScore = 1 - (schema.quality.duplicates / data.length);

    // Overall score (weighted average)
    const overallScore = (
      completenessScore * 0.3 +
      consistencyScore * 0.25 +
      validityScore * 0.25 +
      uniquenessScore * 0.2
    );

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 0.9) grade = 'A';
    else if (overallScore >= 0.8) grade = 'B';
    else if (overallScore >= 0.7) grade = 'C';
    else if (overallScore >= 0.6) grade = 'D';
    else grade = 'F';

    // Generate summary
    const summary = `Data quality score: ${Math.round(overallScore * 100)}/100 (Grade ${grade}). ` +
      `${validation.validRows}/${validation.totalRows} rows are valid with ${validation.errors.length} errors and ${validation.warnings.length} warnings.`;

    return {
      overall: {
        score: overallScore,
        grade,
        summary
      },
      dimensions: {
        completeness: {
          score: completenessScore,
          details: `${Math.round(completenessScore * 100)}% of fields contain non-null values`
        },
        consistency: {
          score: consistencyScore,
          details: `${schema.quality.duplicates} duplicate rows found out of ${data.length} total rows`
        },
        validity: {
          score: validityScore,
          details: `${Math.round(validityScore * 100)}% of values match their expected data types`
        },
        uniqueness: {
          score: uniquenessScore,
          details: `${Math.round(uniquenessScore * 100)}% uniqueness rate across all rows`
        }
      },
      recommendations: schema.recommendations
    };
  }

  /**
   * Clean and standardize data based on schema
   */
  async cleanData(data: any[], schema: DatasetSchema): Promise<{
    cleanedData: any[];
    changes: Array<{
      row: number;
      field: string;
      originalValue: any;
      cleanedValue: any;
      reason: string;
    }>;
  }> {
    const cleanedData = JSON.parse(JSON.stringify(data)); // Deep copy
    const changes: Array<{
      row: number;
      field: string;
      originalValue: any;
      cleanedValue: any;
      reason: string;
    }> = [];

    cleanedData.forEach((row, rowIndex) => {
      schema.fields.forEach(field => {
        const originalValue = row[field.name];
        let cleanedValue = originalValue;
        let reason = '';

        // Handle null/empty values
        if (originalValue == null || originalValue === '') {
          if (!field.nullable && field.type === 'string') {
            cleanedValue = '';
            reason = 'Filled empty required field with empty string';
          } else if (!field.nullable && field.type === 'number' && field.avgValue) {
            cleanedValue = Math.round(field.avgValue);
            reason = 'Filled missing number with average value';
          } else if (!field.nullable && field.type === 'boolean') {
            cleanedValue = false;
            reason = 'Filled missing boolean with false';
          }
        } else {
          // Type conversion and cleaning
          switch (field.type) {
            case 'number':
              if (typeof originalValue !== 'number' && !isNaN(Number(originalValue))) {
                cleanedValue = Number(originalValue);
                reason = 'Converted to number type';
              }
              break;

            case 'boolean':
              if (typeof originalValue !== 'boolean') {
                const stringValue = String(originalValue).toLowerCase();
                if (['true', 'yes', '1', 'y', 'on'].includes(stringValue)) {
                  cleanedValue = true;
                  reason = 'Converted to boolean true';
                } else if (['false', 'no', '0', 'n', 'off'].includes(stringValue)) {
                  cleanedValue = false;
                  reason = 'Converted to boolean false';
                }
              }
              break;

            case 'date':
              if (!(originalValue instanceof Date)) {
                const date = new Date(String(originalValue));
                if (!isNaN(date.getTime())) {
                  cleanedValue = date;
                  reason = 'Converted to Date object';
                }
              }
              break;

            case 'string':
              if (typeof originalValue !== 'string') {
                cleanedValue = String(originalValue);
                reason = 'Converted to string type';
              } else {
                // Trim whitespace
                const trimmed = originalValue.trim();
                if (trimmed !== originalValue) {
                  cleanedValue = trimmed;
                  reason = 'Trimmed whitespace';
                }
              }
              break;
          }
        }

        // Record changes
        if (cleanedValue !== originalValue) {
          changes.push({
            row: rowIndex,
            field: field.name,
            originalValue,
            cleanedValue,
            reason
          });
          row[field.name] = cleanedValue;
        }
      });
    });

    return { cleanedData, changes };
  }
}