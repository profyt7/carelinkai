import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

// Initialize Prisma client
const prisma = new PrismaClient();

// ------------------------------------------------------
// Typed helpers for service health checks
// ------------------------------------------------------
type HealthStatus = "unknown" | "healthy" | "unhealthy" | "skipped";
interface ServiceCheck {
  status: HealthStatus;
  message: string | null;
}

/**
 * Health check endpoint for CareLinkAI
 * Used by Docker health checks and monitoring systems
 * 
 * Checks:
 * - Application status
 * - Database connectivity
 * - Redis connectivity (if configured)
 * - S3/MinIO storage (if configured)
 */
export async function GET() {
  const startTime = Date.now();
  const checks: {
    status: "healthy" | "unhealthy";
    database: ServiceCheck;
    redis: ServiceCheck;
    storage: ServiceCheck;
    uptime: number;
    timestamp: string;
    environment: string;
  } = {
    status: "healthy",
    database: { status: "unknown", message: null },
    redis: { status: "unknown", message: null },
    storage: { status: "unknown", message: null },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  };

  // Check database connectivity
  try {
    // Simple query to check database connection
    await prisma.$queryRaw`SELECT 1 as health_check`;
    checks.database = { status: "healthy", message: "Connected successfully" };
  } catch (error) {
    checks.database = { 
      status: "unhealthy", 
      message: process.env.NODE_ENV === "production" 
        ? "Database connection failed" 
        : `Database error: ${(error as Error).message}` 
    };
    checks.status = "unhealthy";
  }

  // Check Redis if configured
  if (process.env.REDIS_URL) {
    try {
      const redis = new Redis(process.env.REDIS_URL, {
        connectTimeout: 3000,
        commandTimeout: 3000,
      });
      
      const pingResult = await redis.ping();
      await redis.quit();
      
      checks.redis = { 
        status: pingResult === "PONG" ? "healthy" : "unhealthy", 
        message: pingResult === "PONG" ? "Connected successfully" : `Unexpected response: ${pingResult}` 
      };
      
      if (checks.redis.status === "unhealthy") {
        checks.status = "unhealthy";
      }
    } catch (error) {
      checks.redis = { 
        status: "unhealthy", 
        message: process.env.NODE_ENV === "production" 
          ? "Redis connection failed" 
          : `Redis error: ${(error as Error).message}` 
      };
      checks.status = "unhealthy";
    }
  } else {
    checks.redis = { status: "skipped", message: "Redis not configured" };
  }

  // Check S3/MinIO storage if configured
  if (process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY) {
    try {
      const s3Client = new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_KEY,
        },
        forcePathStyle: true,
      });

      const command = new HeadBucketCommand({
        Bucket: process.env.S3_BUCKET || "carelinkai-storage",
      });

      await s3Client.send(command);
      checks.storage = { status: "healthy", message: "Connected successfully" };
    } catch (error) {
      checks.storage = { 
        status: "unhealthy", 
        message: process.env.NODE_ENV === "production" 
          ? "Storage connection failed" 
          : `Storage error: ${(error as Error).message}` 
      };
      checks.status = "unhealthy";
    }
  } else {
    checks.storage = { status: "skipped", message: "S3/MinIO not configured" };
  }

  // Add response time
  const responseTime = Date.now() - startTime;
  
  // Determine HTTP status code based on health status
  const statusCode = checks.status === "healthy" ? 200 : 503;

  // HIPAA compliance: Don't expose sensitive information in production
  if (process.env.NODE_ENV === "production") {
    // Redact messages only for known service checks
    (["database", "redis", "storage"] as const).forEach((key) => {
      const svc = checks[key];
      if (svc.status === "unhealthy" && svc.message) {
        svc.message = `${key} check failed`;
      }
    });
  }

  // Return health check response
  return NextResponse.json({
    ...checks,
    responseTime: `${responseTime}ms`,
  }, { status: statusCode });
}
