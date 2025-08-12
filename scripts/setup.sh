#!/bin/bash
# =============================================================================
# CareLinkAI Development Environment Setup Script
# =============================================================================
# This script automates the initial setup for the CareLinkAI development 
# environment, including Docker services, database initialization, and 
# dependency installation.
#
# Usage: ./scripts/setup.sh [--no-docker] [--skip-deps] [--help]
#   --no-docker: Skip Docker setup and use local services
#   --skip-deps: Skip npm dependencies installation
#   --help: Show this help message
# =============================================================================

# Set script to exit on error
set -e

# Text formatting
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RESET="\033[0m"

# Script configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_EXAMPLE_FILE="$PROJECT_ROOT/.env.example"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
SKIP_DOCKER=false
SKIP_DEPS=false

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --no-docker)
      SKIP_DOCKER=true
      shift
      ;;
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --help)
      echo -e "${BOLD}CareLinkAI Development Environment Setup${RESET}"
      echo ""
      echo "Usage: ./scripts/setup.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --no-docker    Skip Docker setup and use local services"
      echo "  --skip-deps    Skip npm dependencies installation"
      echo "  --help         Show this help message"
      exit 0
      ;;
  esac
done

# Display header
echo -e "${BOLD}${BLUE}==============================================================================${RESET}"
echo -e "${BOLD}${BLUE}                  CareLinkAI Development Environment Setup                    ${RESET}"
echo -e "${BOLD}${BLUE}==============================================================================${RESET}"
echo ""

# Check prerequisites
echo -e "${BOLD}Checking prerequisites...${RESET}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18 or later.${RESET}"
  exit 1
else
  NODE_VERSION=$(node -v | cut -d 'v' -f 2)
  echo -e "${GREEN}✅ Node.js ${NODE_VERSION} is installed.${RESET}"
  
  # Check Node.js version
  NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
  if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js version should be 18 or later. Current version: ${NODE_VERSION}${RESET}"
  fi
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm is not installed. Please install npm.${RESET}"
  exit 1
else
  NPM_VERSION=$(npm -v)
  echo -e "${GREEN}✅ npm ${NPM_VERSION} is installed.${RESET}"
fi

# Check if Docker is installed (if not skipping Docker)
if [ "$SKIP_DOCKER" = false ]; then
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker or use --no-docker option.${RESET}"
    exit 1
  else
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f 3 | sed 's/,//')
    echo -e "${GREEN}✅ Docker ${DOCKER_VERSION} is installed.${RESET}"
  fi
  
  # Check if Docker Compose is installed
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose or use --no-docker option.${RESET}"
    exit 1
  else
    if command -v docker-compose &> /dev/null; then
      DOCKER_COMPOSE_VERSION=$(docker-compose --version | cut -d ' ' -f 3 | sed 's/,//')
      echo -e "${GREEN}✅ Docker Compose ${DOCKER_COMPOSE_VERSION} is installed.${RESET}"
    else
      DOCKER_COMPOSE_VERSION=$(docker compose version --short)
      echo -e "${GREEN}✅ Docker Compose (Docker CLI plugin) ${DOCKER_COMPOSE_VERSION} is installed.${RESET}"
    fi
  fi
fi

echo ""

# Create .env file if it doesn't exist
echo -e "${BOLD}Setting up environment variables...${RESET}"
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE_FILE" ]; then
    cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
    echo -e "${GREEN}✅ Created .env file from .env.example${RESET}"
    
    # Generate random secrets for development
    if command -v openssl &> /dev/null; then
      echo -e "${BLUE}ℹ️  Generating secure random secrets for development...${RESET}"
      
      # Generate a secure random string for NEXTAUTH_SECRET
      NEXTAUTH_SECRET=$(openssl rand -base64 32)
      sed -i.bak "s/NEXTAUTH_SECRET=your_nextauth_secret_min_32_chars_here/NEXTAUTH_SECRET=${NEXTAUTH_SECRET}/g" "$ENV_FILE"
      
      # Generate a secure random string for JWT_SECRET
      JWT_SECRET=$(openssl rand -base64 32)
      sed -i.bak "s/JWT_SECRET=your_jwt_secret_min_32_chars_here/JWT_SECRET=${JWT_SECRET}/g" "$ENV_FILE"
      
      # Generate a secure random string for DATABASE_ENCRYPTION_KEY
      DATABASE_ENCRYPTION_KEY=$(openssl rand -base64 32)
      sed -i.bak "s/DATABASE_ENCRYPTION_KEY=your_secure_32_byte_key_base64_encoded_here/DATABASE_ENCRYPTION_KEY=${DATABASE_ENCRYPTION_KEY}/g" "$ENV_FILE"
      
      # Clean up backup file
      rm -f "${ENV_FILE}.bak"
      
      echo -e "${GREEN}✅ Generated secure random secrets for development environment${RESET}"
    else
      echo -e "${YELLOW}⚠️  openssl not found. Please manually update the secrets in .env file${RESET}"
    fi
  else
    echo -e "${RED}❌ .env.example file not found. Please create a .env file manually.${RESET}"
    exit 1
  fi
else
  echo -e "${BLUE}ℹ️  Using existing .env file${RESET}"
fi

echo ""

# Create necessary directories
echo -e "${BOLD}Creating necessary directories...${RESET}"
mkdir -p "$PROJECT_ROOT/logs"
mkdir -p "$PROJECT_ROOT/public/icons"
mkdir -p "$PROJECT_ROOT/public/screenshots"
mkdir -p "$PROJECT_ROOT/public/splash"
mkdir -p "$PROJECT_ROOT/docker/postgres"

echo -e "${GREEN}✅ Created necessary directories${RESET}"
echo ""

# Create PostgreSQL configuration files if they don't exist
if [ ! -f "$PROJECT_ROOT/docker/postgres/postgresql.conf" ]; then
  echo -e "${BOLD}Creating PostgreSQL configuration files...${RESET}"
  
  # Create minimal postgresql.conf for development
  cat > "$PROJECT_ROOT/docker/postgres/postgresql.conf" << EOL
# PostgreSQL configuration for CareLinkAI development
# Basic security settings for HIPAA compliance simulation

# Connection settings
listen_addresses = '*'
port = 5432
max_connections = 100

# Memory settings
shared_buffers = 128MB
dynamic_shared_memory_type = posix

# Security settings
ssl = on
ssl_prefer_server_ciphers = on
password_encryption = scram-sha-256

# Logging for development
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'all'
log_connections = on
log_disconnections = on

# For development performance
synchronous_commit = off

# Locale settings
datestyle = 'iso, mdy'
timezone = 'UTC'
lc_messages = 'en_US.UTF-8'
lc_monetary = 'en_US.UTF-8'
lc_numeric = 'en_US.UTF-8'
lc_time = 'en_US.UTF-8'
EOL

  # Create minimal pg_hba.conf for development
  cat > "$PROJECT_ROOT/docker/postgres/pg_hba.conf" << EOL
# PostgreSQL Client Authentication Configuration
# For CareLinkAI development environment

# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                trust
host    all             postgres        127.0.0.1/32            scram-sha-256
host    all             postgres        ::1/128                 scram-sha-256
host    all             postgres        172.0.0.0/8             scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
host    all             all             172.0.0.0/8             scram-sha-256
EOL

  echo -e "${GREEN}✅ Created PostgreSQL configuration files${RESET}"
  echo ""
fi

# Install npm dependencies
if [ "$SKIP_DEPS" = false ]; then
  echo -e "${BOLD}Installing npm dependencies...${RESET}"
  cd "$PROJECT_ROOT"
  npm install
  echo -e "${GREEN}✅ Installed npm dependencies${RESET}"
  echo ""
fi

# Set up Docker services
if [ "$SKIP_DOCKER" = false ]; then
  echo -e "${BOLD}Setting up Docker services...${RESET}"
  
  # Check if Docker is running
  if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${RESET}"
    exit 1
  fi
  
  # Pull Docker images
  echo -e "${BLUE}ℹ️  Pulling Docker images...${RESET}"
  cd "$PROJECT_ROOT"
  
  if command -v docker-compose &> /dev/null; then
    docker-compose pull
  else
    docker compose pull
  fi
  
  # Start Docker services
  echo -e "${BLUE}ℹ️  Starting Docker services...${RESET}"
  
  if command -v docker-compose &> /dev/null; then
    docker-compose up -d
  else
    docker compose up -d
  fi
  
  # Wait for PostgreSQL to be ready
  echo -e "${BLUE}ℹ️  Waiting for PostgreSQL to be ready...${RESET}"
  RETRIES=0
  MAX_RETRIES=30
  
  until docker exec carelinkai-postgres pg_isready -U postgres -h localhost || [ $RETRIES -eq $MAX_RETRIES ]; do
    echo -e "${YELLOW}⚠️  Waiting for PostgreSQL to be ready... ($((RETRIES+1))/$MAX_RETRIES)${RESET}"
    RETRIES=$((RETRIES+1))
    sleep 1
  done
  
  if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ PostgreSQL did not become ready in time. Please check Docker logs.${RESET}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Docker services are up and running${RESET}"
  echo ""
fi

# Initialize database with Prisma
echo -e "${BOLD}Initializing database with Prisma...${RESET}"
cd "$PROJECT_ROOT"

# Generate Prisma client
echo -e "${BLUE}ℹ️  Generating Prisma client...${RESET}"
npx prisma generate

# Run database migrations
echo -e "${BLUE}ℹ️  Running database migrations...${RESET}"
npx prisma migrate dev --name init

echo -e "${GREEN}✅ Database initialized successfully${RESET}"
echo ""

# Create initial admin user
echo -e "${BOLD}Creating initial admin user...${RESET}"
cat > "$PROJECT_ROOT/prisma/seed.ts" << EOL
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // In a real app, use bcrypt or argon2 - this is simplified for the seed script
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

async function main() {
  // Check if admin user already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      email: 'admin@carelinkai.com',
      role: UserRole.ADMIN,
    },
  });

  if (!existingAdmin) {
    // Create admin user
    const hashedPassword = await hashPassword('Admin123!');
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@carelinkai.com',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
      },
    });
    
    console.log(\`Created admin user with ID: \${admin.id}\`);
  } else {
    console.log('Admin user already exists, skipping creation');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.\$disconnect();
  });
EOL

echo -e "${BLUE}ℹ️  Running database seed script...${RESET}"
npx ts-node "$PROJECT_ROOT/prisma/seed.ts"

echo -e "${GREEN}✅ Created initial admin user${RESET}"
echo -e "${BLUE}ℹ️  Admin credentials: admin@carelinkai.com / Admin123!${RESET}"
echo -e "${YELLOW}⚠️  Please change this password after first login!${RESET}"
echo ""

# Final setup steps
echo -e "${BOLD}Completing setup...${RESET}"

# Create a simple README.local.md with local development instructions
cat > "$PROJECT_ROOT/README.local.md" << EOL
# CareLinkAI Local Development

This file contains instructions for local development after running the setup script.

## Quick Start

1. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

2. Access the application at http://localhost:5000

## Admin Access

- Email: admin@carelinkai.com
- Password: Admin123!

**Important:** Change this password after first login!

## Available Commands

- \`npm run dev\`: Start development server with hot reloading
- \`npm run build\`: Build production version
- \`npm start\`: Start production server
- \`npm run lint\`: Run ESLint
- \`npm test\`: Run tests
- \`npm run prisma:generate\`: Generate Prisma client
- \`npm run prisma:migrate\`: Apply database migrations
- \`npm run prisma:studio\`: Open Prisma Studio (database UI)

## Docker Services

- PostgreSQL: localhost:5432
- Redis: localhost:6379
- MinIO: localhost:9000 (Console: http://localhost:9001)
- Mailhog: http://localhost:8025 (SMTP: localhost:1025)

## Stopping Docker Services

\`\`\`bash
docker compose down
\`\`\`

## Resetting Database

\`\`\`bash
docker compose down -v
docker compose up -d
npx prisma migrate dev
\`\`\`

## Troubleshooting

If you encounter any issues, check the logs:

\`\`\`bash
docker compose logs -f
\`\`\`

For application-specific issues, check the logs in the \`logs\` directory.
EOL

echo -e "${GREEN}✅ Created README.local.md with development instructions${RESET}"

# Make the script executable
chmod +x "$PROJECT_ROOT/scripts/setup.sh"

echo ""
echo -e "${BOLD}${GREEN}==============================================================================${RESET}"
echo -e "${BOLD}${GREEN}                  CareLinkAI Setup Completed Successfully!                    ${RESET}"
echo -e "${BOLD}${GREEN}==============================================================================${RESET}"
echo ""
echo -e "${BOLD}Next Steps:${RESET}"
echo -e "1. Start the development server: ${BLUE}npm run dev${RESET}"
echo -e "2. Access the application at ${BLUE}http://localhost:5000${RESET}"
echo -e "3. Log in with admin credentials: ${BLUE}admin@carelinkai.com / Admin123!${RESET}"
echo -e "4. Read ${BLUE}README.local.md${RESET} for more information about local development"
echo ""
echo -e "${YELLOW}Note: For security reasons, please change the admin password after first login!${RESET}"
echo ""
