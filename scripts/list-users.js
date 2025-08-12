#!/usr/bin/env node

/**
 * CareLink AI - Database User Lister
 * 
 * This script lists all users in the database to help with login testing.
 * It shows emails, roles, and status to identify valid test accounts.
 * 
 * Usage: node scripts/list-users.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

/**
 * Get all users from the database
 */
async function listUsers() {
  console.log(`\n${colors.cyan}${colors.bright}CareLink AI - Database Users${colors.reset}`);
  console.log(`${colors.dim}Listing all users for login testing${colors.reset}\n`);
  
  try {
    // Query all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true
      },
      orderBy: {
        role: 'asc'
      }
    });
    
    if (users.length === 0) {
      console.log(`${colors.yellow}No users found in the database.${colors.reset}`);
      return;
    }
    
    console.log(`${colors.bright}Found ${users.length} users:${colors.reset}\n`);
    
    // Group users by role for better organization
    const usersByRole = users.reduce((acc, user) => {
      if (!acc[user.role]) {
        acc[user.role] = [];
      }
      acc[user.role].push(user);
      return acc;
    }, {});
    
    // Display users by role
    Object.entries(usersByRole).forEach(([role, users]) => {
      console.log(`\n${colors.bright}${colors.blue}${role} USERS (${users.length})${colors.reset}`);
      console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}`);
      
      users.forEach(user => {
        const statusColor = user.status === 'ACTIVE' ? colors.green : colors.red;
        
        console.log(`${colors.bright}${user.firstName} ${user.lastName}${colors.reset}`);
        console.log(`  ${colors.cyan}Email:${colors.reset} ${user.email}`);
        console.log(`  ${colors.cyan}Status:${colors.reset} ${statusColor}${user.status}${colors.reset}`);
        console.log(`  ${colors.cyan}ID:${colors.reset} ${user.id}`);
        
        if (user.lastLoginAt) {
          console.log(`  ${colors.cyan}Last Login:${colors.reset} ${new Date(user.lastLoginAt).toLocaleString()}`);
        }
        
        console.log(`  ${colors.cyan}Created:${colors.reset} ${new Date(user.createdAt).toLocaleString()}`);
        console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}`);
      });
    });
    
    // Show login instructions
    console.log(`\n${colors.bright}${colors.green}LOGIN INSTRUCTIONS:${colors.reset}`);
    console.log(`1. Use any of the emails above with password ${colors.bright}password123${colors.reset}`);
    console.log(`2. If login fails, the password may have been changed during development`);
    console.log(`3. You can reset passwords using Prisma Studio or the database directly\n`);
    
  } catch (error) {
    console.error(`\n${colors.red}Error listing users:${colors.reset}`, error);
  } finally {
    // Close the database connection
    await prisma.$disconnect();
  }
}

// Run the function
listUsers()
  .catch(e => {
    console.error(`\n${colors.red}Unhandled error:${colors.reset}`, e);
    process.exit(1);
  });
