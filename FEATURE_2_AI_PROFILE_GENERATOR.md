# Feature #2: AI-Powered Home Profile Generator

## Overview
Operators and Admins can now generate professional, AI-powered descriptions and highlights for assisted living homes with a single click. This feature uses OpenAI's GPT-4 to create compelling, accurate profiles based on the home's existing data.

## Implementation Date
December 16, 2024

## Components Added/Modified

### 1. Database Schema Updates
**File:** `prisma/schema.prisma`
- Added to `AssistedLivingHome` model:
  - `aiGeneratedDescription String? @db.Text` - Stores AI-generated description
  - `highlights String[]` - Array of key highlights
  - `lastProfileGenerated DateTime?` - Timestamp of last generation

**Migration:** `prisma/migrations/20251216000001_add_ai_profile_fields/migration.sql`
- Idempotent migration that safely adds fields
- Creates index on `lastProfileGenerated` for performance

### 2. AI Profile Generator Service
**File:** `src/lib/profile-generator/home-profile-generator.ts`
- **Function:** `generateHomeProfile(homeData)` - Main generation function
- **Function:** `validateHomeData(data)` - Validates input data
- **Function:** `generateFallbackProfile(data)` - Fallback when OpenAI unavailable
- Uses OpenAI GPT-4 API (same pattern as matching explainer)
- Generates:
  - Professional 2-3 paragraph description (200-300 words)
  - 3-5 key highlights/bullet points
- Graceful fallback if API key missing or API call fails

### 3. API Endpoint
**File:** `src/app/api/operator/homes/[id]/generate-profile/route.ts`
- **Method:** POST
- **Path:** `/api/operator/homes/[id]/generate-profile`
- **Authentication:** Required (Operator or Admin only)
- **Authorization:** Operators can only generate profiles for their own homes
- **Process:**
  1. Authenticates user
  2. Verifies ownership
  3. Fetches home data
  4. Calls AI generator
  5. Saves to database
  6. Creates audit log
  7. Returns generated profile

### 4. Frontend UI (Edit Page)
**File:** `src/app/operator/homes/[id]/edit/page.tsx`
- Added "Generate Profile with AI" button below description field
- Features:
  - Loading state with animated spinner
  - Preview modal showing generated content
  - "Apply to Description" button to use AI content
  - "Regenerate" button for new version
  - Last generated timestamp display
  - Professional gradient design with icons

### 5. Display Integration
**File:** `src/app/operator/homes/[id]/page.tsx`
- Shows "AI-Enhanced Profile" badge when AI description exists
- Displays AI-generated description (fallback to manual if not available)
- Shows key highlights in attractive card with checkmarks
- Blue/indigo gradient design for AI content

## User Flow

### For Operators/Admins:
1. Navigate to home edit page (`/operator/homes/[id]/edit`)
2. Click "Generate Profile with AI" button
3. AI generates description and highlights (10-30 seconds)
4. Review generated content in preview modal
5. Options:
   - **Apply to Description:** Replaces current description
   - **Regenerate:** Creates new version
   - **Cancel:** Dismisses without applying
6. Save changes to persist

### Viewing Generated Profiles:
- **Home detail page:** Shows AI badge and highlights
- **Matching results:** AI descriptions automatically included
- **Search results:** Future integration point

## Technical Details

### OpenAI Integration
- Model: `gpt-4`
- Temperature: `0.7`
- Max tokens: `400` (description), `200` (highlights)
- Prompts designed for professional, warm tone
- System messages define role and requirements

### Error Handling
- Graceful fallback to template-based generation
- Validates home data before generation
- Handles missing API key
- Logs errors for debugging

### Security & Permissions
- RBAC enforced (Operator, Admin roles only)
- Operators restricted to their own homes
- Audit logging for all generations

### Performance
- Async generation (doesn't block UI)
- Caches generated content in database
- Indexed for fast retrieval

## Database Migration Instructions

The migration is idempotent and safe to run multiple times:

```bash
# The migration will be automatically applied on next deployment
# Or manually run:
npx prisma migrate deploy
```

## Testing Checklist

- [x] Database schema updated and migration created
- [x] Prisma client regenerated
- [x] AI service created and tested
- [x] API endpoint created with authentication
- [x] Frontend UI implemented
- [x] Display integration complete
- [ ] Manual testing with demo home
- [ ] Verify RBAC enforcement
- [ ] Test fallback behavior (no API key)
- [ ] Test error handling (invalid data)
- [ ] Verify audit logs created

## Demo Flow

1. Login as demo operator: `demo.operator@carelinkai.test` / `DemoUser123!`
2. Navigate to Homes list
3. Select a home or create a new one
4. Click "Edit" button
5. Scroll to description field
6. Click "Generate Profile with AI"
7. Review generated content
8. Apply to description and save

## Future Enhancements

1. **Multi-language Support:** Generate profiles in multiple languages
2. **Tone Customization:** Allow operators to choose tone (formal, casual, etc.)
3. **Batch Generation:** Generate profiles for multiple homes at once
4. **Version History:** Track and compare different generated versions
5. **A/B Testing:** Test which descriptions perform better
6. **SEO Optimization:** Generate SEO-friendly descriptions
7. **Integration with Search:** Automatically use AI descriptions in search results
8. **Scheduled Regeneration:** Auto-regenerate profiles periodically

## Known Limitations

1. Requires OpenAI API key (configured in environment)
2. Generation time: 10-30 seconds depending on API response
3. Rate limits apply (OpenAI API limits)
4. Quality depends on input data completeness
5. Currently English only

## Monitoring & Metrics

Track these metrics for feature success:
- Number of profiles generated per day
- Generation success rate vs. fallback rate
- Average generation time
- Operator adoption rate
- Profile quality feedback (future: rating system)

## Environment Variables

Required:
- `OPENAI_API_KEY` - OpenAI API key for GPT-4 access

## Support & Troubleshooting

### Common Issues:

**1. "Failed to generate profile"**
- Check OpenAI API key is set
- Verify API key has sufficient credits
- Check network connectivity

**2. "Forbidden - You can only generate profiles for your own homes"**
- User is trying to generate profile for home they don't own
- Verify user role and home ownership

**3. Fallback profile generated instead of AI**
- OpenAI API key missing or invalid
- Check logs for OpenAI API errors
- Verify API rate limits not exceeded

### Debugging:
- Check server logs for `[Profile Generator]` entries
- Verify audit logs for generation attempts
- Test with `curl` to API endpoint directly

## Related Files

- `src/lib/matching/openai-explainer.ts` - Similar AI integration pattern
- `src/lib/audit.ts` - Audit logging
- `prisma/schema.prisma` - Database schema
- `.env` - Environment configuration

## Credits

Implemented as part of CareLinkAI Feature Development Phase 2
Follows existing OpenAI integration patterns from Feature #1 (AI Matching Engine)
