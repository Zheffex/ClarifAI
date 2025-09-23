export interface PredictionModel {
  id: string;
  name: string;
  type: 'linear_regression' | 'polynomial_regression' | 'time_series' | 'classification' | 'clustering';
  targetField: string;
  inputFields: string[];
  accuracy?: number;
  metrics?: Record<string, number>;
  trainedAt?: Date;
  parameters?: Record<string, any>;
}

export interface PredictionResult {
  value: number | string;
  confidence: number;
  interval?: {
    lower: number;
    upper: number;
  };
  explanation?: string;
  contributingFactors?: Array<{
    field: string;
    importance: number;
    value: any;
  }>;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  strength: number; // 0-1
  seasonality?: {
    detected: boolean;
    period?: number;
    strength?: number;
  };
  changePoints?: Array<{
    index: number;
    date?: string;
    significance: number;
  }>;
  forecast?: Array<{
    value: number;
    confidence: number;
    date?: string;
  }>;
}

export interface AnomalyDetection {
  anomalies: Array<{
    index: number;
    value: any;
    score: number;
    reason: string;
    date?: string;
  }>;
  threshold: number;
  method: 'statistical' | 'isolation_forest' | 'z_score';
}

export interface CorrelationAnalysis {
  correlations: Array<{
    field1: string;
    field2: string;
    coefficient: number;
    strength: 'weak' | 'moderate' | 'strong';
    significance: number;
  }>;
  matrix?: number[][];
  fieldNames?: string[];
}

export class PredictionEngine {
  private static readonly CORRELATION_THRESHOLDS = {
    weak: 0.3,
    moderate: 0.6,
    strong: 0.8
  };

  /**
   * Create a linear regression model
   */
  static createLinearRegressionModel(
    data: any[],
    targetField: string,
    inputFields: string[]
  ): PredictionModel {
    const model: PredictionModel = {
      id: `lr_${Date.now()}`,
      name: `Linear Regression - ${targetField}`,
      type: 'linear_regression',
      targetField,
      inputFields,
      trainedAt: new Date()
    };

    try {
      const { coefficients, accuracy } = this.trainLinearRegression(data, targetField, inputFields);
      model.parameters = { coefficients };
      model.accuracy = accuracy;
      model.metrics = this.calculateRegressionMetrics(data, targetField, inputFields, coefficients);
    } catch (error) {
      console.error('Failed to train linear regression model:', error);
    }

    return model;
  }

  /**
   * Train linear regression using least squares method
   */
  private static trainLinearRegression(
    data: any[],
    targetField: string,
    inputFields: string[]
  ): { coefficients: number[]; accuracy: number } {
    // Prepare data matrices
    const X: number[][] = [];
    const y: number[] = [];

    data.forEach(row => {
      const targetValue = Number(row[targetField]);
      if (isNaN(targetValue)) return;

      const inputValues = inputFields.map(field => {
        const value = Number(row[field]);
        return isNaN(value) ? 0 : value;
      });

      X.push([1, ...inputValues]); // Add intercept term
      y.push(targetValue);
    });

    if (X.length < inputFields.length + 1) {
      throw new Error('Insufficient data for regression');
    }

    // Calculate coefficients using normal equation: β = (X'X)^(-1)X'y
    const coefficients = this.solveNormalEquation(X, y);
    
    // Calculate R-squared
    const predictions = X.map(row => 
      row.reduce((sum, val, idx) => sum + val * coefficients[idx], 0)
    );
    
    const accuracy = this.calculateRSquared(y, predictions);

    return { coefficients, accuracy };
  }

  /**
   * Solve normal equation for linear regression
   */
  private static solveNormalEquation(X: number[][], y: number[]): number[] {
    // Calculate X transpose
    const Xt = this.transpose(X);
    
    // Calculate X'X
    const XtX = this.multiplyMatrices(Xt, X);
    
    // Calculate X'y
    const Xty = this.multiplyMatrixVector(Xt, y);
    
    // Solve XtX * β = Xty using Gaussian elimination
    return this.gaussianElimination(XtX, Xty);
  }

  /**
   * Matrix transpose
   */
  private static transpose(matrix: number[][]): number[][] {
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  }

  /**
   * Matrix multiplication
   */
  private static multiplyMatrices(A: number[][], B: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < B[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < A[i].length; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  /**
   * Matrix-vector multiplication
   */
  private static multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => 
      row.reduce((sum, val, idx) => sum + val * vector[idx], 0)
    );
  }

  /**
   * Gaussian elimination for solving linear system
   */
  private static gaussianElimination(A: number[][], b: number[]): number[] {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      
      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      // Make all rows below this one 0 in current column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Back substitution
    const solution = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      solution[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        solution[i] -= augmented[i][j] * solution[j];
      }
      solution[i] /= augmented[i][i];
    }

    return solution;
  }

  /**
   * Calculate R-squared coefficient of determination
   */
  private static calculateRSquared(actual: number[], predicted: number[]): number {
    const actualMean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
    
    const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = actual.reduce((sum, val, idx) => 
      sum + Math.pow(val - predicted[idx], 2), 0
    );
    
    return 1 - (residualSumSquares / totalSumSquares);
  }

  /**
   * Calculate regression metrics
   */
  private static calculateRegressionMetrics(
    data: any[],
    targetField: string,
    inputFields: string[],
    coefficients: number[]
  ): Record<string, number> {
    const predictions: number[] = [];
    const actuals: number[] = [];

    data.forEach(row => {
      const targetValue = Number(row[targetField]);
      if (isNaN(targetValue)) return;

      const inputValues = [1, ...inputFields.map(field => {
        const value = Number(row[field]);
        return isNaN(value) ? 0 : value;
      })];

      const prediction = inputValues.reduce((sum, val, idx) => sum + val * coefficients[idx], 0);
      
      predictions.push(prediction);
      actuals.push(targetValue);
    });

    const mse = predictions.reduce((sum, pred, idx) => 
      sum + Math.pow(pred - actuals[idx], 2), 0
    ) / predictions.length;
    
    const rmse = Math.sqrt(mse);
    
    const mae = predictions.reduce((sum, pred, idx) => 
      sum + Math.abs(pred - actuals[idx]), 0
    ) / predictions.length;

    return { mse, rmse, mae };
  }

  /**
   * Make prediction using trained model
   */
  static predict(
    model: PredictionModel,
    input: Record<string, any>
  ): PredictionResult {
    if (model.type !== 'linear_regression' || !model.parameters?.coefficients) {
      throw new Error('Invalid or untrained model');
    }

    const coefficients = model.parameters.coefficients as number[];
    const inputs = [1, ...model.inputFields.map(field => {
      const value = Number(input[field]);
      return isNaN(value) ? 0 : value;
    })];

    const prediction = inputs.reduce((sum, val, idx) => sum + val * coefficients[idx], 0);
    
    // Simple confidence calculation based on model accuracy
    const confidence = Math.max(0.1, Math.min(0.95, model.accuracy || 0.5));
    
    // Calculate prediction interval (simplified)
    const std = Math.sqrt(model.metrics?.mse || 1);
    const margin = 1.96 * std; // 95% confidence interval

    return {
      value: prediction,
      confidence,
      interval: {
        lower: prediction - margin,
        upper: prediction + margin
      },
      explanation: `Predicted using ${model.inputFields.length} input features with ${Math.round(confidence * 100)}% confidence.`,
      contributingFactors: model.inputFields.map((field, idx) => ({
        field,
        importance: Math.abs(coefficients[idx + 1]) / Math.max(...coefficients.slice(1).map(Math.abs)),
        value: input[field]
      })).sort((a, b) => b.importance - a.importance)
    };
  }

  /**
   * Analyze trends in time series data
   */
  static analyzeTrends(
    data: any[],
    valueField: string,
    dateField?: string
  ): TrendAnalysis {
    if (data.length < 3) {
      throw new Error('Insufficient data for trend analysis');
    }

    const values = data.map(row => Number(row[valueField])).filter(val => !isNaN(val));
    if (values.length < 3) {
      throw new Error('Insufficient numeric values for trend analysis');
    }

    // Calculate trend direction using linear regression
    const indices = values.map((_, idx) => idx);
    const { coefficients } = this.trainLinearRegression(
      values.map((value, idx) => ({ x: idx, y: value })),
      'y',
      ['x']
    );

    const slope = coefficients[1];
    const direction = Math.abs(slope) < 0.01 ? 'stable' : 
                     slope > 0 ? 'increasing' : 'decreasing';
    
    // Calculate trend strength
    const predictions = indices.map(idx => coefficients[0] + coefficients[1] * idx);
    const rSquared = this.calculateRSquared(values, predictions);
    const strength = Math.max(0, rSquared);

    // Simple volatility measure
    const volatility = this.calculateVolatility(values);
    const finalDirection = volatility > 0.3 ? 'volatile' : direction;

    // Basic seasonality detection (simplified)
    const seasonality = this.detectSeasonality(values);

    // Simple forecasting (linear extrapolation)
    const forecastHorizon = Math.min(10, Math.floor(values.length * 0.2));
    const forecast = Array.from({ length: forecastHorizon }, (_, i) => {
      const futureIndex = values.length + i;
      const predictedValue = coefficients[0] + coefficients[1] * futureIndex;
      return {
        value: predictedValue,
        confidence: Math.max(0.1, strength * 0.8),
        date: dateField ? this.extrapolateDate(data, dateField, i + 1) : undefined
      };
    });

    return {
      direction: finalDirection,
      strength,
      seasonality,
      forecast
    };
  }

  /**
   * Calculate volatility (coefficient of variation)
   */
  private static calculateVolatility(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return mean !== 0 ? stdDev / Math.abs(mean) : 0;
  }

  /**
   * Simple seasonality detection
   */
  private static detectSeasonality(values: number[]): TrendAnalysis['seasonality'] {
    if (values.length < 12) {
      return { detected: false };
    }

    // Check for repeating patterns (simplified approach)
    const patterns = [7, 12, 24, 30]; // Common seasonal periods
    let bestPeriod = 0;
    let bestCorrelation = 0;

    patterns.forEach(period => {
      if (values.length >= period * 2) {
        const correlation = this.calculateAutocorrelation(values, period);
        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestPeriod = period;
        }
      }
    });

    return {
      detected: bestCorrelation > 0.3,
      period: bestPeriod > 0 ? bestPeriod : undefined,
      strength: bestCorrelation
    };
  }

  /**
   * Calculate autocorrelation for lag
   */
  private static calculateAutocorrelation(values: number[], lag: number): number {
    if (lag >= values.length) return 0;

    const n = values.length - lag;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }
    
    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }
    
    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Extrapolate future dates
   */
  private static extrapolateDate(data: any[], dateField: string, periodsAhead: number): string {
    const dates = data.map(row => new Date(row[dateField])).filter(date => !isNaN(date.getTime()));
    if (dates.length < 2) return '';

    // Calculate average time difference
    const timeDiffs = [];
    for (let i = 1; i < dates.length; i++) {
      timeDiffs.push(dates[i].getTime() - dates[i - 1].getTime());
    }
    
    const avgDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
    const lastDate = dates[dates.length - 1];
    const futureDate = new Date(lastDate.getTime() + avgDiff * periodsAhead);
    
    return futureDate.toISOString().split('T')[0];
  }

  /**
   * Detect anomalies using statistical methods
   */
  static detectAnomalies(
    data: any[],
    field: string,
    method: 'z_score' | 'iqr' = 'z_score',
    threshold: number = 2
  ): AnomalyDetection {
    const values = data.map((row, idx) => ({ value: Number(row[field]), index: idx, original: row }))
      .filter(item => !isNaN(item.value));

    if (values.length < 3) {
      throw new Error('Insufficient data for anomaly detection');
    }

    const anomalies: AnomalyDetection['anomalies'] = [];

    if (method === 'z_score') {
      const mean = values.reduce((sum, item) => sum + item.value, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, item) => sum + Math.pow(item.value - mean, 2), 0) / values.length
      );

      values.forEach(item => {
        const zScore = Math.abs((item.value - mean) / stdDev);
        if (zScore > threshold) {
          anomalies.push({
            index: item.index,
            value: item.value,
            score: zScore,
            reason: `Z-score ${zScore.toFixed(2)} exceeds threshold ${threshold}`,
            date: item.original.date || undefined
          });
        }
      });
    } else if (method === 'iqr') {
      const sortedValues = [...values].sort((a, b) => a.value - b.value);
      const q1Index = Math.floor(sortedValues.length * 0.25);
      const q3Index = Math.floor(sortedValues.length * 0.75);
      const q1 = sortedValues[q1Index].value;
      const q3 = sortedValues[q3Index].value;
      const iqr = q3 - q1;
      const lowerBound = q1 - threshold * iqr;
      const upperBound = q3 + threshold * iqr;

      values.forEach(item => {
        if (item.value < lowerBound || item.value > upperBound) {
          const score = item.value < lowerBound ? 
            (lowerBound - item.value) / iqr : 
            (item.value - upperBound) / iqr;
          
          anomalies.push({
            index: item.index,
            value: item.value,
            score,
            reason: `Value outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
            date: item.original.date || undefined
          });
        }
      });
    }

    return {
      anomalies: anomalies.sort((a, b) => b.score - a.score),
      threshold,
      method
    };
  }

  /**
   * Calculate correlation matrix
   */
  static calculateCorrelations(
    data: any[],
    fields: string[]
  ): CorrelationAnalysis {
    const numericData = data.map(row => 
      fields.map(field => {
        const value = Number(row[field]);
        return isNaN(value) ? 0 : value;
      })
    );

    const correlations: CorrelationAnalysis['correlations'] = [];
    const matrix: number[][] = [];

    for (let i = 0; i < fields.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < fields.length; j++) {
        const values1 = numericData.map(row => row[i]);
        const values2 = numericData.map(row => row[j]);
        const correlation = this.calculatePearsonCorrelation(values1, values2);
        
        matrix[i][j] = correlation;
        
        if (i < j) { // Only add unique pairs
          const absCorr = Math.abs(correlation);
          let strength: 'weak' | 'moderate' | 'strong';
          
          if (absCorr >= this.CORRELATION_THRESHOLDS.strong) {
            strength = 'strong';
          } else if (absCorr >= this.CORRELATION_THRESHOLDS.moderate) {
            strength = 'moderate';
          } else {
            strength = 'weak';
          }

          correlations.push({
            field1: fields[i],
            field2: fields[j],
            coefficient: correlation,
            strength,
            significance: absCorr // Simplified significance measure
          });
        }
      }
    }

    return {
      correlations: correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)),
      matrix,
      fieldNames: fields
    };
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private static calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      
      numerator += diffX * diffY;
      sumXSquared += diffX * diffX;
      sumYSquared += diffY * diffY;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }
}", "original_text": "", "replace_all": false}]