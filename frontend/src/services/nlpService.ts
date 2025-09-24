import { Dataset } from '../types/api';
import { ChartConfig } from './chartService';

export interface NLPQuery {
  text: string;
  intent?: 'visualization' | 'analysis' | 'summary' | 'comparison' | 'trend';
  entities?: {
    datasets?: string[];
    fields?: string[];
    timeRange?: string;
    chartType?: string;
    aggregation?: string;
    filters?: Record<string, any>;
  };
  confidence?: number;
}

export interface NLPResponse {
  intent: string;
  confidence: number;
  interpretation: string;
  suggestedActions: Array<{
    type: 'chart' | 'filter' | 'aggregation' | 'export';
    description: string;
    config?: any;
  }>;
  generatedQuery?: {
    dataset: string;
    fields: string[];
    filters: Record<string, any>;
    aggregation?: string;
    chartType?: string;
  };
  followUpQuestions?: string[];
}

export interface AIInsight {
  type: 'trend' | 'anomaly' | 'correlation' | 'prediction' | 'summary';
  title: string;
  description: string;
  confidence: number;
  data?: any;
  visualization?: ChartConfig;
  importance: 'high' | 'medium' | 'low';
}

export class NLPService {
  private static readonly INTENT_PATTERNS = {
    visualization: [
      /show\\s+(?:me\\s+)?(?:a\\s+)?(chart|graph|plot|visualization)/i,
      /create\\s+(?:a\\s+)?(bar|line|pie|scatter|histogram)/i,
      /visualize|plot|graph|chart/i,
      /compare\\s+.+\\s+with/i,
    ],
    analysis: [
      /analyze|analysis|examine|investigate/i,
      /what\\s+is\\s+the\\s+(correlation|relationship)/i,
      /find\\s+(patterns|trends|insights)/i,
      /how\\s+does\\s+.+\\s+affect/i,
    ],
    summary: [
      /summar(y|ize)|overview|describe/i,
      /what\\s+is\\s+the\\s+(average|mean|total|count)/i,
      /give\\s+me\\s+(?:an?\\s+)?overview/i,
      /statistics|stats/i,
    ],
    comparison: [
      /compare|comparison|versus|vs\\.?/i,
      /difference\\s+between/i,
      /which\\s+is\\s+(higher|lower|better|worse)/i,
      /rank|ranking|top|bottom/i,
    ],
    trend: [
      /trend|trending|over\\s+time/i,
      /increase|decrease|growth|decline/i,
      /historical|time\\s+series/i,
      /month|year|day|week.*pattern/i,
    ]
  };

  private static readonly ENTITY_PATTERNS = {
    chartTypes: {
      bar: /bar\\s+chart|column\\s+chart|bar\\s+graph/i,
      line: /line\\s+chart|line\\s+graph|trend\\s+line/i,
      pie: /pie\\s+chart|pie\\s+graph|donut/i,
      scatter: /scatter\\s+plot|scatter\\s+chart|correlation\\s+plot/i,
      histogram: /histogram|distribution/i,
      area: /area\\s+chart|filled\\s+chart/i
    },
    aggregations: {
      sum: /total|sum|add\\s+up/i,
      average: /average|mean|avg/i,
      count: /count|number\\s+of|how\\s+many/i,
      max: /maximum|max|highest|largest/i,
      min: /minimum|min|lowest|smallest/i
    },
    timeRanges: {
      'last week': /last\\s+week|past\\s+week/i,
      'last month': /last\\s+month|past\\s+month/i,
      'last year': /last\\s+year|past\\s+year/i,
      'this week': /this\\s+week|current\\s+week/i,
      'this month': /this\\s+month|current\\s+month/i,
      'this year': /this\\s+year|current\\s+year/i
    }
  };

  /**
   * Process natural language query and extract intent and entities
   */
  static async processQuery(query: string, availableDatasets: Dataset[] = []): Promise<NLPResponse> {
    const nlpQuery = this.parseQuery(query, availableDatasets);
    return this.generateResponse(nlpQuery, availableDatasets);
  }

  /**
   * Parse natural language query into structured format
   */
  private static parseQuery(text: string, datasets: Dataset[]): NLPQuery {
    const normalizedText = text.toLowerCase().trim();
    
    // Detect intent
    const intent = this.detectIntent(normalizedText);
    
    // Extract entities
    const entities = this.extractEntities(normalizedText, datasets);
    
    // Calculate confidence based on pattern matches
    const confidence = this.calculateConfidence(normalizedText, intent, entities);

    return {
      text,
      intent,
      entities,
      confidence
    };
  }

  /**
   * Detect query intent using pattern matching
   */
  private static detectIntent(text: string): NLPQuery['intent'] {
    let bestMatch: { intent: NLPQuery['intent']; score: number } = { intent: 'analysis', score: 0 };

    Object.entries(this.INTENT_PATTERNS).forEach(([intent, patterns]) => {
      let score = 0;
      patterns.forEach(pattern => {
        if (pattern.test(text)) {
          score += 1;
        }
      });
      
      if (score > bestMatch.score) {
        bestMatch = { intent: intent as NLPQuery['intent'], score };
      }
    });

    return bestMatch.intent;
  }

  /**
   * Extract entities from query text
   */
  private static extractEntities(text: string, datasets: Dataset[]): NLPQuery['entities'] {
    const entities: NLPQuery['entities'] = {};

    // Extract dataset names
    const mentionedDatasets = datasets.filter(dataset => 
      text.includes(dataset.name.toLowerCase()) ||
      dataset.tags?.some((tag: string) => text.includes(tag.toLowerCase()))
    );
    if (mentionedDatasets.length > 0) {
      entities.datasets = mentionedDatasets.map(d => d._id);
    }

    // Extract chart type
    Object.entries(this.ENTITY_PATTERNS.chartTypes).forEach(([type, pattern]) => {
      if (pattern.test(text)) {
        entities.chartType = type;
      }
    });

    // Extract aggregation type
    Object.entries(this.ENTITY_PATTERNS.aggregations).forEach(([type, pattern]) => {
      if (pattern.test(text)) {
        entities.aggregation = type;
      }
    });

    // Extract time range
    Object.entries(this.ENTITY_PATTERNS.timeRanges).forEach(([range, pattern]) => {
      if (pattern.test(text)) {
        entities.timeRange = range;
      }
    });

    // Extract field names (simple word matching)
    const potentialFields = text.match(/\\b[a-zA-Z_][a-zA-Z0-9_]*\\b/g) || [];
    entities.fields = potentialFields.filter(field => 
      field.length > 2 && 
      !['the', 'and', 'or', 'with', 'from', 'show', 'create', 'chart'].includes(field.toLowerCase())
    );

    return entities;
  }

  /**
   * Calculate confidence score
   */
  private static calculateConfidence(text: string, intent?: string, entities?: NLPQuery['entities']): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence for clear intent patterns
    if (intent) {
      const patterns = this.INTENT_PATTERNS[intent as keyof typeof this.INTENT_PATTERNS] || [];
      const matches = patterns.filter(pattern => pattern.test(text)).length;
      confidence += matches * 0.1;
    }

    // Boost confidence for recognized entities
    if (entities?.chartType) confidence += 0.15;
    if (entities?.aggregation) confidence += 0.1;
    if (entities?.datasets && entities.datasets.length > 0) confidence += 0.15;
    if (entities?.fields && entities.fields.length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate AI response with suggestions
   */
  private static generateResponse(query: NLPQuery, datasets: Dataset[]): NLPResponse {
    const response: NLPResponse = {
      intent: query.intent || 'analysis',
      confidence: query.confidence || 0.5,
      interpretation: this.generateInterpretation(query),
      suggestedActions: [],
      followUpQuestions: []
    };

    // Generate suggested actions based on intent
    switch (query.intent) {
      case 'visualization':
        response.suggestedActions = this.generateVisualizationActions(query, datasets);
        response.followUpQuestions = [
          'What type of chart would you prefer?',
          'Would you like to filter the data?',
          'Should I include trend lines?'
        ];
        break;
        
      case 'analysis':
        response.suggestedActions = this.generateAnalysisActions(query, datasets);
        response.followUpQuestions = [
          'What specific metrics interest you?',
          'Would you like to compare with other periods?',
          'Should I look for correlations?'
        ];
        break;
        
      case 'summary':
        response.suggestedActions = this.generateSummaryActions(query, datasets);
        response.followUpQuestions = [
          'Which fields would you like summarized?',
          'Do you need totals or averages?',
          'Should I include data quality metrics?'
        ];
        break;
        
      case 'comparison':
        response.suggestedActions = this.generateComparisonActions(query, datasets);
        response.followUpQuestions = [
          'What criteria should I use for comparison?',
          'Would you like a side-by-side chart?',
          'Should I rank the results?'
        ];
        break;
        
      case 'trend':
        response.suggestedActions = this.generateTrendActions(query, datasets);
        response.followUpQuestions = [
          'What time period interests you?',
          'Should I highlight significant changes?',
          'Would you like forecasting?'
        ];
        break;
        
      default:
        response.suggestedActions = this.generateGenericActions(query, datasets);
        response.followUpQuestions = [
          'Could you be more specific about what you want to see?',
          'Which dataset should I focus on?',
          'What type of analysis interests you?'
        ];
    }

    // Generate structured query if possible
    if (query.entities?.datasets && query.entities.datasets.length > 0) {
      response.generatedQuery = {
        dataset: query.entities.datasets[0],
        fields: query.entities.fields || [],
        filters: {},
        aggregation: query.entities.aggregation,
        chartType: query.entities.chartType
      };
    }

    return response;
  }

  /**
   * Generate human-readable interpretation
   */
  private static generateInterpretation(query: NLPQuery): string {
    const parts = [];
    
    if (query.intent) {
      parts.push(`I understand you want to ${query.intent === 'visualization' ? 'create a visualization' : query.intent}`);
    }
    
    if (query.entities?.datasets) {
      parts.push(`using dataset(s): ${query.entities.datasets.join(', ')}`);
    }
    
    if (query.entities?.fields && query.entities.fields.length > 0) {
      parts.push(`focusing on: ${query.entities.fields.join(', ')}`);
    }
    
    if (query.entities?.chartType) {
      parts.push(`as a ${query.entities.chartType} chart`);
    }
    
    if (query.entities?.aggregation) {
      parts.push(`showing ${query.entities.aggregation} values`);
    }

    return parts.length > 0 ? parts.join(' ') + '.' : 'I\'ll help you analyze your data.';
  }

  /**
   * Generate visualization-specific actions
   */
  private static generateVisualizationActions(query: NLPQuery, datasets: Dataset[]) {
    const actions = [];
    
    if (query.entities?.chartType) {
      actions.push({
        type: 'chart' as const,
        description: `Create a ${query.entities.chartType} chart`,
        config: { type: query.entities.chartType }
      });
    } else {
      actions.push({
        type: 'chart' as const,
        description: 'Open chart builder to create visualization',
        config: { type: 'bar' }
      });
    }
    
    if (query.entities?.aggregation) {
      actions.push({
        type: 'aggregation' as const,
        description: `Apply ${query.entities.aggregation} aggregation`,
        config: { aggregation: query.entities.aggregation }
      });
    }

    return actions;
  }

  /**
   * Generate analysis-specific actions
   */
  private static generateAnalysisActions(query: NLPQuery, datasets: Dataset[]) {
    return [
      {
        type: 'chart' as const,
        description: 'Generate statistical summary',
        config: { type: 'summary' }
      },
      {
        type: 'chart' as const,
        description: 'Create correlation analysis',
        config: { type: 'scatter' }
      }
    ];
  }

  /**
   * Generate summary-specific actions
   */
  private static generateSummaryActions(query: NLPQuery, datasets: Dataset[]) {
    return [
      {
        type: 'aggregation' as const,
        description: 'Generate data summary statistics',
        config: { type: 'summary' }
      },
      {
        type: 'chart' as const,
        description: 'Create overview dashboard',
        config: { type: 'dashboard' }
      }
    ];
  }

  /**
   * Generate comparison-specific actions
   */
  private static generateComparisonActions(query: NLPQuery, datasets: Dataset[]) {
    return [
      {
        type: 'chart' as const,
        description: 'Create comparison chart',
        config: { type: 'bar' }
      },
      {
        type: 'filter' as const,
        description: 'Set up comparison filters',
        config: { type: 'comparison' }
      }
    ];
  }

  /**
   * Generate trend-specific actions
   */
  private static generateTrendActions(query: NLPQuery, datasets: Dataset[]) {
    return [
      {
        type: 'chart' as const,
        description: 'Create trend line chart',
        config: { type: 'line' }
      },
      {
        type: 'filter' as const,
        description: 'Apply time-based filtering',
        config: { timeRange: query.entities?.timeRange }
      }
    ];
  }

  /**
   * Generate generic actions
   */
  private static generateGenericActions(query: NLPQuery, datasets: Dataset[]) {
    return [
      {
        type: 'chart' as const,
        description: 'Explore data with chart builder',
        config: { type: 'bar' }
      },
      {
        type: 'aggregation' as const,
        description: 'Generate basic statistics',
        config: { type: 'summary' }
      }
    ];
  }

  /**
   * Generate AI insights from data analysis
   */
  static async generateInsights(datasetId: string, fields?: string[]): Promise<AIInsight[]> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/datasets/${datasetId}/insights`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const result = await response.json();
      return result.data.insights || [];
    } catch (error) {
      console.error('Failed to generate insights:', error);
      return this.generateMockInsights();
    }
  }

  /**
   * Generate mock insights for development
   */
  private static generateMockInsights(): AIInsight[] {
    return [
      {
        type: 'trend',
        title: 'Increasing Data Quality',
        description: 'Data quality scores have improved by 15% over the last month, indicating better data collection processes.',
        confidence: 0.87,
        importance: 'high'
      },
      {
        type: 'anomaly',
        title: 'Unusual Activity Pattern',
        description: 'Detected a 40% spike in dataset uploads on Tuesdays compared to other weekdays.',
        confidence: 0.92,
        importance: 'medium'
      },
      {
        type: 'correlation',
        title: 'Strong Correlation Found',
        description: 'File size and processing time show a strong positive correlation (r=0.78).',
        confidence: 0.94,
        importance: 'medium'
      }
    ];
  }
}