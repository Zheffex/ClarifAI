#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running comprehensive test suite...\n');

// Check if Jest is available
try {
  execSync('npx jest --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Jest is not available. Please install it first:');
  console.error('npm install --save-dev jest ts-jest @types/jest supertest mongodb-memory-server');
  process.exit(1);
}

// Run tests with coverage
try {
  console.log('📊 Running tests with coverage...\n');
  execSync('npx jest --coverage --verbose', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Tests failed. Please check the output above.');
  process.exit(1);
}

// Check coverage report
const coveragePath = path.join(__dirname, '..', 'coverage', 'lcov-report', 'index.html');
if (fs.existsSync(coveragePath)) {
  console.log('\n📈 Coverage report generated at:', coveragePath);
  console.log('Open it in your browser to view detailed coverage information.');
} else {
  console.log('\n⚠️  Coverage report not found. Check Jest configuration.');
}

console.log('\n✅ Test suite completed successfully!');
