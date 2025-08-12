#!/usr/bin/env node

/**
 * CareLink AI - Database Connection Tester
 * 
 * This script tests PostgreSQL connections with various credentials
 * to identify which combination works correctly.
 * 
 * Usage: node test-db-connection.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

// Connection configurations to test
const connectionConfigs = [
  {
    name: "Current .env configuration",
    url: "postgresql://postgres:postgres@localhost:5433/carelinkai?schema=public",
    description: "Using 'postgres' as password"
  },
  {
    name: "Empty password",
    url: "postgresql://postgres:@localhost:5433/carelinkai?schema=public",
    description: "Using empty password"
  },
  {
    name: "Default PostgreSQL password",
    url: "postgresql://postgres:secure_password_change_me@localhost:5433/carelinkai?schema=public",
    description: "Using 'secure_password_change_me' as password"
  },
  {
    name: "Default PostgreSQL password (no schema)",
    url: "postgresql://postgres:secure_password_change_me@localhost:5433/carelinkai",
    description: "Using 'secure_password_change_me' without schema parameter"
  },
  {
    name: "Trust authentication",
    url: "postgresql://postgres@localhost:5433/carelinkai?schema=public",
    description: "Using trust authentication (no password)"
  },
  {
    name: "Different port (5432)",
    url: "postgresql://postgres:postgres@localhost:5432/carelinkai?schema=public",
    description: "Using standard PostgreSQL port 5432"
  },
  {
    name: "Different port (5432) with empty password",
    url: "postgresql://postgres:@localhost:5432/carelinkai?schema=public",
    description: "Using standard PostgreSQL port 5432 with empty password"
  }
];

/**
 * Test a single database connection
 */
async function testConnection(config) {
  console.log(`\n${colors.cyan}${colors.bright}Testing: ${config.name}${colors.reset}`);
  console.log(`${colors.dim}${config.description}${colors.reset}`);
  console.log(`${colors.dim}URL: ${config.url}${colors.reset}`);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: config.url
      }
    }
  });
  
  try {
    // Try to connect and run a simple query
    console.log(`${colors.yellow}Connecting to database...${colors.reset}`);
    
    // Test connection with a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    console.log(`${colors.green}${colors.bright}✓ Connection successful!${colors.reset}`);
    console.log(`${colors.green}Query result: ${JSON.stringify(result)}${colors.reset}`);
    
    // Try to query users table
    try {
      console.log(`${colors.yellow}Testing users table access...${colors.reset}`);
      const userCount = await prisma.user.count();
      console.log(`${colors.green}${colors.bright}✓ Users table accessible!${colors.reset}`);
      console.log(`${colors.green}User count: ${userCount}${colors.reset}`);
      
      // If we got here, this is the correct configuration
      console.log(`\n${colors.magenta}${colors.bright}🎉 THIS CONFIGURATION WORKS! 🎉${colors.reset}`);
      console.log(`${colors.magenta}Use this connection string in your .env and .env.local files:${colors.reset}`);
      console.log(`${colors.cyan}DATABASE_URL=${config.url}${colors.reset}`);
      
      // Try to get a sample user
      try {
        const sampleUser = await prisma.user.findFirst({
          where: {
            email: 'family1@example.com'
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            passwordHash: true
          }
        });
        
        if (sampleUser) {
          console.log(`\n${colors.yellow}${colors.bright}Sample user found:${colors.reset}`);
          console.log(`${colors.cyan}Name:${colors.reset} ${sampleUser.firstName} ${sampleUser.lastName}`);
          console.log(`${colors.cyan}Email:${colors.reset} ${sampleUser.email}`);
          console.log(`${colors.cyan}ID:${colors.reset} ${sampleUser.id}`);
          console.log(`${colors.cyan}Password Hash:${colors.reset} ${sampleUser.passwordHash}`);
          
          // Check if the password hash matches the one we know works
          const knownWorkingHash = "$2a$10$6ZN4dapC9krB65Q7sejsPu1n4LgGDLDORGoGVoioM1jf4N6jydjKO";
          if (sampleUser.passwordHash !== knownWorkingHash) {
            console.log(`\n${colors.yellow}${colors.bright}⚠️ Password hash mismatch!${colors.reset}`);
            console.log(`${colors.yellow}The database has a different password hash than the one we know works with "password123".${colors.reset}`);
            console.log(`${colors.yellow}Would you like to update the password hash? (y/n)${colors.reset}`);
            
            process.stdin.once('data', async (data) => {
              const response = data.toString().trim().toLowerCase();
              
              if (response === 'y' || response === 'yes') {
                try {
                  // Update the password hash
                  await prisma.user.update({
                    where: { id: sampleUser.id },
                    data: { passwordHash: knownWorkingHash }
                  });
                  console.log(`${colors.green}${colors.bright}✓ Password hash updated successfully!${colors.reset}`);
                } catch (error) {
                  console.error(`${colors.red}${colors.bright}Error updating password hash:${colors.reset}`, error);
                }
              } else {
                console.log(`${colors.blue}Password hash update cancelled.${colors.reset}`);
              }
              
              await prisma.$disconnect();
              process.exit(0);
            });
            return; // Wait for user input
          }
        }
      } catch (error) {
        console.error(`${colors.red}Error fetching sample user:${colors.reset}`, error.message);
      }
    } catch (error) {
      console.error(`${colors.red}Users table access failed:${colors.reset}`, error.message);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}${colors.bright}✗ Connection failed:${colors.reset}`, error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Test all connection configurations
 */
async function testAllConnections() {
  console.log(`\n${colors.cyan}${colors.bright}CareLink AI - Database Connection Tester${colors.reset}`);
  console.log(`${colors.dim}Testing various PostgreSQL connection configurations...${colors.reset}\n`);
  
  // Check environment variables
  try {
    console.log(`${colors.cyan}${colors.bright}Current Environment Variables:${colors.reset}`);
    
    // Check .env file
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
      if (dbUrlMatch) {
        console.log(`${colors.cyan}.env DATABASE_URL:${colors.reset} ${dbUrlMatch[1]}`);
      }
    }
    
    // Check .env.local file
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envLocalContent = fs.readFileSync(envLocalPath, 'utf-8');
      const dbUrlMatch = envLocalContent.match(/DATABASE_URL=(.+)/);
      if (dbUrlMatch) {
        console.log(`${colors.cyan}.env.local DATABASE_URL:${colors.reset} ${dbUrlMatch[1]}`);
      }
    }
    
    // Check process.env
    if (process.env.DATABASE_URL) {
      console.log(`${colors.cyan}process.env DATABASE_URL:${colors.reset} ${process.env.DATABASE_URL}`);
    }
    
    console.log('');
  } catch (error) {
    console.error(`${colors.red}Error checking environment variables:${colors.reset}`, error.message);
  }
  
  // Test each configuration
  let anySuccessful = false;
  for (const config of connectionConfigs) {
    const success = await testConnection(config);
    if (success) {
      anySuccessful = true;
      // Don't break here, test all configurations
    }
  }
  
  // Summary
  console.log(`\n${colors.cyan}${colors.bright}Test Summary:${colors.reset}`);
  if (anySuccessful) {
    console.log(`${colors.green}${colors.bright}✓ At least one connection configuration worked!${colors.reset}`);
    console.log(`${colors.green}Update your .env and .env.local files with the working connection string.${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}✗ All connection configurations failed.${colors.reset}`);
    console.log(`${colors.yellow}Possible issues:${colors.reset}`);
    console.log(`${colors.yellow}1. PostgreSQL is not running${colors.reset}`);
    console.log(`${colors.yellow}2. PostgreSQL is using a different password${colors.reset}`);
    console.log(`${colors.yellow}3. PostgreSQL is running on a different port${colors.reset}`);
    console.log(`${colors.yellow}4. The 'carelinkai' database doesn't exist${colors.reset}`);
    
    console.log(`\n${colors.cyan}${colors.bright}Next steps:${colors.reset}`);
    console.log(`${colors.cyan}1. Verify PostgreSQL is running: ${colors.reset}netstat -an | findstr :5433`);
    console.log(`${colors.cyan}2. Check PostgreSQL authentication settings${colors.reset}`);
    console.log(`${colors.cyan}3. Try creating the database: ${colors.reset}createdb -U postgres carelinkai`);
  }
}

// Run the tests
testAllConnections().catch(error => {
  console.error(`\n${colors.red}${colors.bright}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
