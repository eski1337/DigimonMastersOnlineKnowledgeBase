import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceStatus;
    cms: ServiceStatus;
  };
}

interface ServiceStatus {
  status: 'up' | 'down' | 'unknown';
  responseTime?: number;
  error?: string;
}

/**
 * Health Check Endpoint
 * 
 * GET /api/health
 * 
 * Returns application health status including:
 * - Overall health status
 * - Database connectivity
 * - CMS connectivity
 * - Uptime
 * - Version
 * 
 * Used by monitoring systems and load balancers.
 */
export async function GET(_request: NextRequest) {
  const _startTime = Date.now();
  
  // Check database connection
  const databaseStatus = await checkDatabase();
  
  // Check CMS connection
  const cmsStatus = await checkCMS();
  
  // Determine overall status
  const overallStatus = determineOverallStatus(databaseStatus, cmsStatus);
  
  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
    services: {
      database: databaseStatus,
      cms: cmsStatus,
    },
  };

  // Return appropriate HTTP status code
  const httpStatus = overallStatus === 'healthy' ? 200 : 503;

  return NextResponse.json(health, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * Check MongoDB database connectivity
 */
async function checkDatabase(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    const client = await clientPromise;
    
    // Simple ping to verify connection
    await client.db().admin().ping();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'up',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check CMS API connectivity
 */
async function checkCMS(): Promise<ServiceStatus> {
  const startTime = Date.now();
  const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';
  
  try {
    const response = await fetch(`${cmsUrl}/api/access`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Don't wait too long
      signal: AbortSignal.timeout(5000),
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok || response.status === 401) {
      // 401 means CMS is up but we're not authenticated (which is fine)
      return {
        status: 'up',
        responseTime,
      };
    }
    
    return {
      status: 'down',
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Determine overall health status based on service statuses
 */
function determineOverallStatus(
  database: ServiceStatus,
  cms: ServiceStatus
): 'healthy' | 'degraded' | 'unhealthy' {
  const servicesDown = [database, cms].filter(s => s.status === 'down').length;
  
  if (servicesDown === 0) {
    return 'healthy';
  } else if (servicesDown === 1) {
    return 'degraded';
  } else {
    return 'unhealthy';
  }
}
