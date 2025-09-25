# Advanced Security Features Implementation

This document outlines the three advanced security features that have been implemented in the ClarifAI backend:

## 🔒 1. API Rate Limiting per User/Organization

### Overview
Sophisticated rate limiting system that applies different limits based on user roles and organization tiers.

### Features
- **User-based Rate Limiting**: Different limits for viewer, analyst, and admin roles
- **Organization-based Rate Limiting**: Tier-based limits (basic, pro, enterprise)
- **Redis Backend**: Distributed rate limiting using Redis for scalability
- **Concurrent Request Tracking**: Monitors and limits concurrent requests per user
- **Configurable Thresholds**: Easily adjustable via environment variables

### Implementation Files
- `src/middleware/advancedRateLimit.ts` - Core rate limiting logic
- `src/config/environment.ts` - Configuration management

### Usage Example
```typescript
import { advancedRateLimit } from './middleware/advancedRateLimit';

// Apply user-based rate limiting
app.use('/api', advancedRateLimit.createUserRateLimit());

// Apply organization-based rate limiting
app.use('/api', advancedRateLimit.createOrganizationRateLimit());
```

### Configuration
```env
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # Base limit
```

## 📋 2. Audit Logging for Sensitive Operations

### Overview
Comprehensive audit logging system that tracks all sensitive operations with compliance tracking for GDPR, SOX, HIPAA, and ISO27001.

### Features
- **Multi-level Logging**: Authentication, data access, and security events
- **Risk Assessment**: Automatic risk level calculation (low, medium, high, critical)
- **Compliance Mapping**: Maps operations to compliance requirements
- **Detailed Context**: Captures IP, user agent, geolocation, and request details
- **MongoDB Storage**: Efficient storage with indexing for fast queries

### Implementation Files
- `src/models/AuditLog.ts` - Audit log data model
- `src/middleware/auditMiddleware.ts` - Audit logging middleware
- `src/controllers/securityController.ts` - Audit log management API

### Usage Example
```typescript
import { AuditLog } from './models/AuditLog';

// Log authentication event
await AuditLog.logAuthEvent(userId, 'login_success', { method: 'email' }, req);

// Log data access event
await AuditLog.logDataAccessEvent(userId, 'dataset_accessed', { datasetId }, req);

// Log security event
await AuditLog.logSecurityEvent(userId, 'encryption_keys_rotated', { keyId }, req);
```

### API Endpoints
- `GET /api/security/audit-logs` - Retrieve audit logs with filtering
- `GET /api/security/audit-stats` - Get audit statistics
- `GET /api/security/compliance-report` - Generate compliance reports

## 🔐 3. Data Encryption at Rest

### Overview
Advanced encryption system using AES-256-CBC for encrypting sensitive data at rest with key rotation and PII protection.

### Features
- **AES-256-CBC Encryption**: Industry-standard encryption algorithm
- **Key Derivation**: PBKDF2 with 100,000 iterations for secure key derivation
- **Key Rotation**: Automated key rotation with backward compatibility
- **PII Protection**: Automatic encryption of personally identifiable information
- **Field-level Encryption**: Granular encryption at the database field level
- **File Encryption**: Support for encrypting uploaded files

### Implementation Files
- `src/utils/encryption.ts` - Core encryption utilities
- `src/middleware/securityIntegration.ts` - Security integration helpers

### Usage Example
```typescript
import { dataEncryption, piiEncryption } from './utils/encryption';

// Encrypt general data
const encrypted = await dataEncryption.encryptData('sensitive information');
const decrypted = await dataEncryption.decryptData(encrypted);

// Encrypt PII fields automatically
const userData = { email: 'user@example.com', phone: '+1234567890' };
const encryptedUser = await piiEncryption.encryptUserPII(userData);
const decryptedUser = await piiEncryption.decryptUserPII(encryptedUser);

// Encrypt specific fields
const sensitiveData = { ssn: '123-45-6789', address: '123 Main St' };
const encrypted = await dataEncryption.encryptFields(sensitiveData, ['ssn', 'address']);
```

### Configuration
```env
ENCRYPTION_MASTER_KEY=your-base64-encoded-32-byte-key
ENCRYPTION_KEY_ID=default
```

## 🛡️ Security Integration

### Complete Security Setup
All security features are integrated through the `SecurityIntegration` class:

```typescript
import { SecurityIntegration } from './middleware/securityIntegration';

// Apply all security middleware
SecurityIntegration.applySecurityMiddleware(app);

// Initialize security services
await SecurityIntegration.initializeSecurityServices();

// Check security configuration
const config = SecurityIntegration.getSecurityConfig();
```

### Security API Endpoints
- `GET /api/security/encryption/status` - Check encryption status
- `POST /api/security/encryption/rotate-keys` - Rotate encryption keys
- `POST /api/security/encryption/cleanup-keys` - Clean up old keys
- `POST /api/security/encryption/test` - Test encryption functionality

## 🔧 Environment Configuration

### Required Environment Variables
```env
# Redis for rate limiting
REDIS_URL=redis://localhost:6379

# Rate limiting configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Encryption configuration
ENCRYPTION_MASTER_KEY=your-base64-encoded-key
ENCRYPTION_KEY_ID=default
```

### Optional Configuration
```env
# Web Push Notifications
WEB_PUSH_PUBLIC_KEY=your-public-key
WEB_PUSH_PRIVATE_KEY=your-private-key
WEB_PUSH_CONTACT=your-contact-email
```

## 📊 Monitoring & Compliance

### Audit Log Analysis
The audit logging system provides comprehensive insights:
- Risk level distribution
- Action frequency analysis
- Compliance requirement mapping
- User activity patterns
- Geographic access patterns

### Compliance Reports
Generate reports for various compliance standards:
- **GDPR**: Data processing activities
- **SOX**: Financial data access
- **HIPAA**: Healthcare information handling
- **ISO27001**: Information security management

### Security Metrics
Monitor security posture through:
- Rate limit violations
- Failed authentication attempts
- Encryption key rotations
- Sensitive data access patterns

## 🚀 Deployment Notes

### Redis Setup
For production deployment, ensure Redis is properly configured:
```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis for security
sudo nano /etc/redis/redis.conf
# Add: requirepass your-secure-password
```

### Key Management
- Store encryption keys securely (e.g., AWS KMS, Azure Key Vault)
- Implement regular key rotation policies
- Monitor key usage and access patterns

### Performance Considerations
- Rate limiting uses Redis for optimal performance
- Audit logs are indexed for fast queries
- Encryption operations are optimized with caching

## 🔍 Testing

### Security Testing Commands
```bash
# Install dependencies
npm install

# Run security tests
npm test -- --grep "security"

# Test encryption functionality
npm run test:encryption

# Verify rate limiting
npm run test:rate-limit
```

### Manual Testing
Use the provided test endpoints to verify functionality:
```bash
# Test encryption
curl -X POST http://localhost:5000/api/security/encryption/test \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"testData": "sensitive information"}'

# Check audit logs
curl -X GET "http://localhost:5000/api/security/audit-logs?limit=10" \
  -H "Authorization: Bearer your-admin-token"
```

## 📋 Security Checklist

- ✅ API rate limiting per user/organization implemented
- ✅ Audit logging for sensitive operations implemented
- ✅ Data encryption at rest implemented
- ✅ Redis backend configured for rate limiting
- ✅ Compliance tracking (GDPR, SOX, HIPAA, ISO27001)
- ✅ Key rotation mechanism implemented
- ✅ PII encryption utilities created
- ✅ Security API endpoints implemented
- ✅ Environment configuration updated
- ✅ Integration middleware created
