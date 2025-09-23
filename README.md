# ClarifAI

> **Intelligent Analytics Platform** - Transform your data into actionable insights with AI-powered analytics, natural language queries, and real-time collaboration.

![ClarifAI Dashboard](https://img.shields.io/badge/Status-Active%20Development-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-ISC-green)

## 🚀 Overview

ClarifAI is a modern, full-stack analytics platform that democratizes data analysis through:

- **🤖 AI-Powered Insights**: Natural language queries that transform how you interact with data
- **📊 Automated Visualizations**: Smart chart generation based on your data characteristics
- **🔮 Predictive Analytics**: Advanced forecasting and trend analysis
- **🤝 Real-time Collaboration**: Share insights, annotate charts, and work together seamlessly
- **🔒 Enterprise Security**: Role-based access control and data protection
- **⚡ Fast Performance**: Optimized for large datasets with intelligent caching

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   React SPA     │◄──►│   Express API   │◄──►│   MongoDB       │
│                 │    │                 │    │                 │
│  • TypeScript   │    │  • TypeScript   │    │  • Data Storage │
│  • Chart.js     │    │  • JWT Auth     │    │  • Analytics    │
│  • D3.js        │    │  • Socket.IO    │    │  • User Mgmt    │
│  • Real-time    │    │  • File Upload  │    │  • Sessions     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ✨ Features

### 📈 Smart Analytics
- **Natural Language Processing**: "Show me sales trends for the last quarter"
- **Automated Data Profiling**: Instant data quality reports and schema detection
- **Statistical Analysis**: Correlation, regression, and anomaly detection
- **Custom Visualizations**: Bar, line, pie, scatter, heatmaps, and more

### 🤝 Collaboration Tools
- **Real-time Sharing**: Live collaboration on dashboards and analyses
- **Comments & Annotations**: Contextual discussions on specific data points
- **Version Control**: Track changes and maintain analysis history
- **Role-based Permissions**: Viewer, Analyst, and Admin access levels

### 🔧 Data Management
- **Multi-format Support**: CSV, Excel, JSON data imports
- **Schema Auto-detection**: Intelligent data type inference
- **Data Validation**: Quality checks and error reporting
- **Secure Upload**: File processing with validation and sanitization

### 🎯 Predictive Capabilities
- **Forecasting**: Time series predictions with confidence intervals
- **Classification**: Automated pattern recognition
- **Trend Analysis**: Historical data insights and projections
- **Anomaly Detection**: Outlier identification and alerting

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16+)
- **MongoDB** (v5+)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ProTechPh/ClarifAI.git
   cd clarifai
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend  
   cd ../frontend
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Backend environment
   cd backend
   cp .env.example .env
   # Edit .env with your MongoDB connection and JWT secret
   
   # Frontend environment (if needed)
   cd ../frontend
   cp .env.example .env
   ```

4. **Start the services**
   ```bash
   # Terminal 1 - Backend API
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend App
   cd frontend
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📚 Documentation

### API Documentation
Once running, visit http://localhost:5000/api/docs for interactive API documentation.

### Architecture Details
- [Backend Architecture](./backend/README.md) - API design, database schema, and services
- [Frontend Architecture](./frontend/README.md) - Component structure, state management, and UI patterns

### Key Concepts
- **Datasets**: Uploaded data files with metadata and schema information
- **Analysis Sessions**: Interactive data exploration with queries and visualizations
- **Collaborations**: Shared workspaces with real-time updates
- **Insights**: AI-generated findings and recommendations

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Frontend tests
cd frontend
npm test
```

## 🚢 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm run build
```

### Environment Variables

**Backend (.env)**
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/clarifai
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
FILE_UPLOAD_LIMIT=10mb
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=http://localhost:5000
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Follow existing code style and patterns

## 📊 Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcryptjs
- **Real-time**: Socket.IO
- **File Processing**: Multer, CSV-Parser, XLSX
- **Testing**: Jest with Supertest

### Frontend
- **Framework**: React 19+ with TypeScript
- **Routing**: React Router DOM
- **Charts**: Chart.js with react-chartjs-2
- **Visualizations**: D3.js for custom charts
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **Testing**: Jest with React Testing Library

### DevOps & Tools
- **Build Tool**: TypeScript Compiler
- **Package Manager**: npm
- **Linting**: ESLint
- **Testing**: Jest
- **Version Control**: Git

## 📈 Performance

- **Database Indexing**: Optimized queries with proper indexes
- **Caching Strategy**: In-memory caching for frequent operations
- **File Processing**: Streaming for large dataset uploads
- **Real-time Updates**: Efficient WebSocket connections
- **Frontend Optimization**: Code splitting and lazy loading

## 🔒 Security

- **Authentication**: JWT-based with secure headers
- **Authorization**: Role-based access control (RBAC)
- **Data Validation**: Input sanitization and validation
- **File Security**: Type checking and size limits
- **CORS Protection**: Configured origins and methods
- **Rate Limiting**: API endpoint protection

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ProTechPh/ClarifAI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ProTechPh/ClarifAI/discussions)
- **Documentation**: [Wiki](https://github.com/ProTechPh/ClarifAI/wiki)

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the need for accessible data analytics
- Community-driven development approach

---

**Ready to transform your data analysis?** [Get Started →](http://localhost:3000)