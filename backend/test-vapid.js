// Test script to verify VAPID keys are properly configured
require('dotenv').config();

console.log('Testing VAPID configuration...');
console.log('WEB_PUSH_PUBLIC_KEY:', process.env.WEB_PUSH_PUBLIC_KEY ? 'SET' : 'NOT SET');
console.log('WEB_PUSH_PRIVATE_KEY:', process.env.WEB_PUSH_PRIVATE_KEY ? 'SET' : 'NOT SET');
console.log('WEB_PUSH_CONTACT:', process.env.WEB_PUSH_CONTACT ? 'SET' : 'NOT SET');

if (process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY) {
    console.log('✅ Push notification service should be configured - VAPID keys found');
} else {
    console.log('❌ Push notification service not configured - missing VAPID keys');
}