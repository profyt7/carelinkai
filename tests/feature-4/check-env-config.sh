#!/bin/bash

echo "⚙️  Checking Environment Configuration"
echo "================================================================================"
echo ""

# Check if running in production
if [ "$NODE_ENV" = "production" ]; then
  echo "✅ Environment: Production"
else
  echo "ℹ️  Environment: ${NODE_ENV:-development}"
fi
echo ""

# Check OpenAI
if [ -n "$OPENAI_API_KEY" ]; then
  echo "✅ OpenAI API Key: Configured"
else
  echo "⚠️  OpenAI API Key: NOT configured (AI responses will not work)"
fi
echo ""

# Check SMTP
if [ -n "$SMTP_HOST" ] && [ -n "$SMTP_USER" ]; then
  echo "✅ SMTP: Configured ($SMTP_HOST)"
else
  echo "⚠️  SMTP: NOT configured (Email sending will not work)"
fi
echo ""

# Check Twilio
if [ -n "$TWILIO_ACCOUNT_SID" ] && [ -n "$TWILIO_AUTH_TOKEN" ]; then
  echo "✅ Twilio: Configured"
else
  echo "⚠️  Twilio: NOT configured (SMS sending will not work)"
fi
echo ""

# Check Database
if [ -n "$DATABASE_URL" ]; then
  echo "✅ Database: Configured"
else
  echo "❌ Database: NOT configured (CRITICAL)"
fi
echo ""

# Check NextAuth
if [ -n "$NEXTAUTH_SECRET" ]; then
  echo "✅ NextAuth Secret: Configured"
else
  echo "⚠️  NextAuth Secret: NOT configured"
fi
echo ""

echo "================================================================================"
echo ""
echo "📝 Configuration Summary:"
echo ""
echo "Core Features (Database): $([ -n "$DATABASE_URL" ] && echo "✅ Ready" || echo "❌ Not Ready")"
echo "AI Responses (OpenAI): $([ -n "$OPENAI_API_KEY" ] && echo "✅ Ready" || echo "⚠️  Needs Config")"
echo "Email (SMTP): $([ -n "$SMTP_HOST" ] && echo "✅ Ready" || echo "⚠️  Needs Config")"
echo "SMS (Twilio): $([ -n "$TWILIO_ACCOUNT_SID" ] && echo "✅ Ready" || echo "⚠️  Needs Config")"
echo ""
