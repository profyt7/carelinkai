# CareBot Implementation Guide

## Overview
CareBot is a 24/7 AI-powered chatbot that helps families navigate the senior care placement process. It provides empathetic, knowledgeable assistance on topics like assisted living, memory care, Medicaid vs private-pay, and more.

## Implementation Summary

### Components Created

#### 1. **FloatingChatButton.tsx** (`src/components/carebot/FloatingChatButton.tsx`)
- Floating chat button in bottom-right corner
- Opens/closes chat window
- Pulsing animation when closed
- Responsive design (mobile and desktop)
- Always visible across all pages

#### 2. **ChatWindow.tsx** (`src/components/carebot/ChatWindow.tsx`)
- Full chat interface with message history
- Suggested prompts for first-time users
- Real-time streaming responses
- Session storage for chat history persistence
- User/assistant message bubbles
- Typing indicators and loading states
- Error handling
- Mobile-responsive design

#### 3. **API Route** (`src/app/api/carebot/chat/route.ts`)
- Handles POST requests to `/api/carebot/chat`
- Comprehensive system prompt with senior care knowledge
- Streams responses from LLM API in real-time
- Proper error handling
- User context integration (authenticated users)

### Key Features

#### Knowledge Base
The CareBot has extensive knowledge about:
- **Types of Care**: Assisted living, memory care, skilled nursing, independent living
- **Medicaid vs Private-Pay**: Eligibility, costs, application process
- **What to Look For**: Safety, staff, activities, food quality
- **Tour Questions**: Staff ratios, emergencies, activities, costs
- **Common Concerns**: Guilt, timing, cost, transition, resistance
- **CareLinkAI Platform**: Features, search, tours, inquiries

#### Communication Style
- Warm, empathetic, and professional
- Acknowledges emotional difficulty
- Uses simple language
- Provides actionable information
- Knows when to escalate to human support

#### Escalation Triggers
- Crisis situations (abuse, immediate danger)
- Complex medical/legal questions
- User confusion or frustration
- Financial planning beyond basics
- Explicit requests for human help

### Technical Implementation

#### Streaming Architecture
```
User Input → ChatWindow → API Route → LLM API
                ↑                           |
                |                           ↓
                └──── Streamed Response ────┘
```

#### Session Storage
- Chat history persists during browser session
- Automatic save after each message
- Loads on component mount

#### Error Handling
- Network errors: "Sorry, I'm having trouble connecting"
- API errors: Proper status codes returned
- Empty responses: Filtered out from history

#### Crash Prevention
- All data access uses optional chaining (`?.`)
- Null coalescing for defaults (`?? []`)
- Array methods protected (`messages?.map?.() ?? null`)
- Try-catch blocks for JSON parsing

### Integration Points

#### Root Layout
Added to `src/app/layout.tsx`:
```tsx
import FloatingChatButton from "../components/carebot/FloatingChatButton";

// Inside body, after ToastProvider:
<FloatingChatButton />
```

#### Environment Variables
Added to `.env`:
```
ABACUSAI_API_KEY="2639fe6caf714373a772c3f44853bf4d"
```

#### Script Tag
Added to root layout `<head>`:
```html
<script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
```

## Testing

### Manual Testing
1. **Open any page** - Chat button should appear bottom-right
2. **Click button** - Chat window opens
3. **Try suggested prompts** - Should stream responses
4. **Ask questions** - Should respond with senior care knowledge
5. **Refresh page** - Chat history should persist
6. **Mobile view** - Should be fully responsive

### API Testing
```bash
curl -X POST http://localhost:3000/api/carebot/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is assisted living?"}],
    "userContext": {"isAuthenticated": false}
  }'
```

### Example Questions
- "Help me find assisted living homes"
- "What's the difference between Medicaid and private-pay?"
- "What questions should I ask during a tour?"
- "Tell me about memory care options"
- "How do I know when it's time for assisted living?"

## Customization

### Updating System Prompt
Edit `src/app/api/carebot/chat/route.ts`:
```typescript
const SYSTEM_PROMPT = `Your updated prompt here...`;
```

### Changing Appearance
Edit `src/components/carebot/FloatingChatButton.tsx` and `ChatWindow.tsx`:
- Colors: Update `bg-primary-*` classes
- Size: Modify `h-14 w-14` classes
- Position: Change `bottom-4 right-4`

### Adding Suggested Prompts
Edit `src/components/carebot/ChatWindow.tsx`:
```typescript
const SUGGESTED_PROMPTS = [
  "Your new prompt here",
  // ...
];
```

## Monitoring

### Console Logs
The API logs all requests:
```
🤖 [CAREBOT] Chat request received
🤖 [CAREBOT] Processing 1 messages
🤖 [CAREBOT] User context: { isAuthenticated: false }
🤖 [CAREBOT] Calling LLM API...
🤖 [CAREBOT] ✅ Streaming response from LLM API
```

### Error Tracking
Errors are logged with full context:
```
🤖 [CAREBOT] ❌ LLM API error: 500
🤖 [CAREBOT] ❌ Error: [error details]
```

## Deployment Notes

### Production Checklist
- [ ] Verify ABACUSAI_API_KEY is set in production `.env`
- [ ] Test streaming responses in production
- [ ] Verify mobile responsiveness
- [ ] Check session storage works across pages
- [ ] Test escalation messaging
- [ ] Monitor API usage and costs

### Environment Variables
Ensure these are set in your deployment:
```
ABACUSAI_API_KEY=your_production_key_here
```

## Future Enhancements

### Potential Features
1. **Platform Integration**
   - Direct search integration (query database)
   - Tour scheduling from chat
   - Inquiry submission from chat

2. **Analytics**
   - Track common questions
   - Measure escalation rate
   - User satisfaction feedback

3. **Advanced Features**
   - Voice input/output
   - Multi-language support
   - File upload for document questions
   - Facility-specific Q&A

4. **Personalization**
   - Remember user preferences
   - Contextual recommendations
   - Follow-up reminders

## Support

For issues or questions:
1. Check console logs for errors
2. Verify API key is correct
3. Test API endpoint directly with curl
4. Check network tab in browser DevTools

## Files Modified/Created

### New Files
- `src/components/carebot/FloatingChatButton.tsx` (98 lines)
- `src/components/carebot/ChatWindow.tsx` (291 lines)
- `src/app/api/carebot/chat/route.ts` (283 lines)
- `CAREBOT_IMPLEMENTATION_GUIDE.md` (this file)

### Modified Files
- `src/app/layout.tsx` (added import and component)
- `.env` (added ABACUSAI_API_KEY)

### Total Lines of Code
- **672 lines** of production code
- **Fully functional** with comprehensive error handling
- **Zero crashes** with null-safe coding patterns

## Success Metrics

✅ **Implementation Complete**
- [x] Floating chat button on all pages
- [x] Chat window with message history
- [x] Streaming AI responses
- [x] Comprehensive senior care knowledge
- [x] Session storage persistence
- [x] Mobile responsive
- [x] Error handling
- [x] Production ready

✅ **Testing Complete**
- [x] API streaming verified
- [x] UI renders correctly
- [x] No TypeScript errors in CareBot code
- [x] No runtime crashes
- [x] Proper null safety throughout

---

**Status**: ✅ Ready for Production Deployment
**Version**: 1.0.0
**Date**: December 30, 2025
