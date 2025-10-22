export interface UploadedDatasetResponse {
  success: boolean;
  message: string;
  data: {
    dataset: {
      _id: string;
      id: string;
      name: string;
      description: string;
      fileId: string;
      uploadedBy: string;
      organizationId: string;
      dataSchema: {
        fields: {
          name: string;
          type: string;
          nullable: boolean;
          unique: boolean;
          distinctValues?: number;
          sampleValues?: any[];
          minValue?: number;
          maxValue?: number;
          avgValue?: number;
          confidence?: number;
        }[];
        relationships: {
          sourceField: string;
          targetField: string;
          type: string;
          strength: number;
        }[];
        detectedAt: string;
        confidence: number;
      };
      metadata: {
        size: number;
        type: string;
        rows: number;
        columns: number;
        encoding?: string;
        delimiter?: string;
        headers: string[];
      };
      processingStatus: string;
      tags: string[];
      isPublic: boolean;
      accessPermissions: any[];
      createdAt: string;
      updatedAt: string;
    };
    schema: {
      totalRows: number;
      totalColumns: number;
      fields: {
        name: string;
        type: string;
        nullable: boolean;
        unique: boolean;
        distinctValues: number;
        sampleValues: any[];
        minValue?: number;
        maxValue?: number;
        avgValue?: number;
        confidence: number;
      }[];
      relationships: {
        sourceField: string;
        targetField: string;
        type: string;
        strength: number;
      }[];
      quality: {
        completeness: number;
        consistency: number;
        validity: number;
        duplicates: number;
      };
      recommendations: string[];
    };
    qualityReport: {
      overall: {
        score: number;
        grade?: string;
        summary?: string;
      };
      dimensions: {
        completeness: { score: number; details: string };
        consistency: { score: number; details: string };
        validity: { score: number; details: string };
        uniqueness: { score: number; details: string };
      };
      recommendations: string[];
    };
  };
}
