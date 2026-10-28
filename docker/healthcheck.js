#!/usr/bin/env node

/**
 * CareLinkAI Docker Container Health Check
 * 
 * This script verifies that the application and its critical dependencies
 * are functioning properly. It checks:
 * 
 * 1. Web server connectivity
 * 2. Database connectivity
 * 3. Redis connectivity
 * 4. S3/MinIO storage connectivity
 * 
 * Exit codes:
 * - 0: All checks passed, container is healthy
 * - 1: One or more checks failed, container is unhealthy
 */

const http = require('http');
const { Client } = require('pg');
const Redis = require('ioredis');
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

// Configuration
const config = {
  app: {
    host: 'localhost',
    port: process.env.PORT || 5000,
    path: '/api/health',
    timeout: 5000,
  },
  database: {
    connectionString: process.env.DATABASE_URL,
    timeout: 5000,
  },
  redis: {
    url: process.env.REDIS_URL,
    timeout: 3000,
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET || 'carelinkai-storage',
    timeout: 5000,
  },
  logPath: '/app/logs/healthcheck.log',
};

// Logger
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console[isError ? 'error' : 'log'](logMessage);
  
  // Also write to log file if available
  try {
    fs.appendFileSync(config.logPath, logMessage + '\n');
  } catch (err) {
    // Silently fail if we can't write to the log file
  }
}

// Check web server
async function checkWebServer() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: config.app.host,
        port: config.app.port,
        path: config.app.path,
        timeout: config.app.timeout,
      },
      (res) => {
        const { statusCode } = res;
        res.resume();
        if (statusCode >= 200 && statusCode < 300) {
          log('✅ Web server check passed');
          resolve(true);
        } else {
          log(`❌ Web server check failed: Status code ${statusCode}`, true);
          resolve(false);
        }
      }
    );

    req.on('error', (err) => {
      log(`❌ Web server check failed: ${err.message}`, true);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      log(`❌ Web server check timed out after ${config.app.timeout}ms`, true);
      resolve(false);
    });

    req.end();
  });
}

// Check database
async function checkDatabase() {
  if (!config.database.connectionString) {
    log('⚠️ DATABASE_URL not set, skipping database check');
    return true;
  }

  const client = new Client({
    connectionString: config.database.connectionString,
    connectionTimeoutMillis: config.database.timeout,
  });

  try {
    await client.connect();
    const result = await client.query('SELECT 1 AS health_check');
    await client.end();
    
    if (result.rows[0].health_check === 1) {
      log('✅ Database check passed');
      return true;
    } else {
      log('❌ Database check failed: Unexpected response', true);
      return false;
    }
  } catch (err) {
    log(`❌ Database check failed: ${err.message}`, true);
    try {
      await client.end();
    } catch (e) {
      // Ignore errors when closing the client
    }
    return false;
  }
}

// Check Redis
async function checkRedis() {
  if (!config.redis.url) {
    log('⚠️ REDIS_URL not set, skipping Redis check');
    return true;
  }

  const redis = new Redis(config.redis.url, {
    connectTimeout: config.redis.timeout,
    commandTimeout: config.redis.timeout,
  });

  return new Promise((resolve) => {
    redis.on('error', (err) => {
      log(`❌ Redis check failed: ${err.message}`, true);
      redis.disconnect();
      resolve(false);
    });

    redis.ping((err, result) => {
      redis.disconnect();
      
      if (err) {
        log(`❌ Redis check failed: ${err.message}`, true);
        resolve(false);
      } else if (result === 'PONG') {
        log('✅ Redis check passed');
        resolve(true);
      } else {
        log(`❌ Redis check failed: Unexpected response: ${result}`, true);
        resolve(false);
      }
    });
  });
}

// Check S3/MinIO
async function checkS3() {
  if (!config.s3.endpoint || !config.s3.accessKeyId || !config.s3.secretAccessKey) {
    log('⚠️ S3 configuration not complete, skipping S3 check');
    return true;
  }

  const s3Client = new S3Client({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
    },
    forcePathStyle: true,
  });

  try {
    const command = new HeadBucketCommand({
      Bucket: config.s3.bucket,
    });
    
    await Promise.race([
      s3Client.send(command),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('S3 operation timed out')), config.s3.timeout)
      )
    ]);
    
    log('✅ S3 storage check passed');
    return true;
  } catch (err) {
    log(`❌ S3 storage check failed: ${err.message}`, true);
    return false;
  }
}

// Run all checks
async function runHealthChecks() {
  log('🔍 Starting health check...');
  
  try {
    // Run checks in parallel for efficiency
    const [webServerOk, databaseOk, redisOk, s3Ok] = await Promise.all([
      checkWebServer(),
      checkDatabase(),
      checkRedis(),
      checkS3(),
    ]);

    // Determine overall health status
    const isHealthy = webServerOk && databaseOk && redisOk && s3Ok;
    
    if (isHealthy) {
      log('✅ All health checks passed');
      process.exit(0); // Healthy
    } else {
      log('❌ One or more health checks failed', true);
      process.exit(1); // Unhealthy
    }
  } catch (err) {
    log(`❌ Health check error: ${err.message}`, true);
    process.exit(1); // Unhealthy
  }
}

// Execute health checks
runHealthChecks();
