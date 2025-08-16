# =========================================
# STAGE 1: Build environment
# =========================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies required for node-gyp
RUN apk add --no-cache python3 make g++ libc6-compat

# Set environment to production for optimized builds
ENV NODE_ENV=production

# Install dependencies first (for better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# =========================================
# STAGE 2: Production environment
# =========================================
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=5000 \
    # HIPAA compliance: Ensure proper logging and security
    AUDIT_LOGGING_ENABLED=true \
    SESSION_COOKIE_SECURE=true \
    SESSION_COOKIE_HTTPONLY=true \
    SESSION_COOKIE_SAMESITE=strict

# Create a non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init tzdata curl && \
    # Clean up
    rm -rf /var/cache/apk/*

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy security and configuration files
COPY --from=builder --chown=nextjs:nodejs /app/docker/security-headers.js ./docker/security-headers.js
COPY --from=builder --chown=nextjs:nodejs /app/docker/healthcheck.js ./docker/healthcheck.js

# Create directory for logs with appropriate permissions
RUN mkdir -p /app/logs && \
    chown -R nextjs:nodejs /app/logs && \
    chmod -R 750 /app/logs

# Set proper file permissions
RUN chmod -R 750 /app && \
    chmod -R 770 /app/logs

# Set up health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node", "docker/healthcheck.js"]

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 5000

# Use dumb-init as entrypoint to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["npm", "start"]

# Security labels (for container orchestration)
LABEL org.opencontainers.image.title="CareLinkAI" \
      org.opencontainers.image.description="CareLinkAI - Connecting Families, Homes, and Caregivers" \
      org.opencontainers.image.vendor="CareLinkAI" \
      org.opencontainers.image.source="https://github.com/carelinkai/carelinkai" \
      org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.version=$BUILD_VERSION \
      org.opencontainers.image.revision=$BUILD_REVISION \
      org.opencontainers.image.licenses="Proprietary" \
      security.hipaa.compliant="true" \
      security.selinux.type="container_runtime_t"
