/**
 * Debug Mentions Script
 * 
 * This script inspects recent comments across documents, notes, and galleries
 * to test mention resolution and diagnose notification issues.
 */

const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Extract @mention names from text using regex
 * @param {string} text - Comment content to extract mentions from
 * @returns {string[]} Array of unique mention names
 */
function extractMentionNames(text) {
  // Match @ followed by 1-4 capitalised name tokens (same pattern as app code)
  // e.g. “@John Doe”, “@Mary-Anne O'Neil”
  const mentionRegex =
    /@([A-Z][a-zA-Z'\\-]+(?:\\s+[A-Z][a-zA-Z'\\-]+){0,3})\\b/g;
  const mentions = new Set();
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const name = match[1].trim();
    mentions.add(name);
  }
  
  return Array.from(mentions);
}

/**
 * Resolve mentioned users from a family
 * @param {string} familyId - ID of the family
 * @param {string[]} names - Array of names to resolve
 * @returns {Promise<Array>} Array of matching users
 */
async function resolveMentionedUsers(familyId, names) {
  const familyMembers = await prisma.familyMember.findMany({
    where: { familyId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });
  
  return familyMembers
    .filter(member => {
      const fullName = `${member.user.firstName} ${member.user.lastName}`;
      return names.some(name => 
        fullName.toLowerCase() === name.toLowerCase()
      );
    })
    .map(member => member.user);
}

/**
 * Format user for compact display
 * @param {Object} user - User object
 * @returns {string} Compact user representation
 */
function formatUser(user) {
  return `{id: ${user.id.substring(0, 8)}..., email: ${user.email}, name: ${user.firstName} ${user.lastName}}`;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Debugging @mentions resolution...');
    
    // Track successful matches for summary
    const matches = {
      document: [],
      note: [],
      gallery: []
    };
    
    // 1. Fetch recent document comments
    console.log('\n--- DOCUMENT COMMENTS ---');
    const documentComments = await prisma.documentComment.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        document: {
          select: { id: true, title: true, familyId: true }
        }
      }
    });
    
    for (const comment of documentComments) {
      const names = extractMentionNames(comment.content || '');
      if (names.length > 0) {
        const users = await resolveMentionedUsers(comment.document.familyId, names);
        console.log(`Document ${comment.id} fam=${comment.document.familyId} txt="${comment.content}" -> names=[${names.join(', ')}] matches=[${users.map(formatUser).join(', ')}]`);
        
        if (users.length > 0) {
          matches.document.push({
            commentId: comment.id,
            familyId: comment.document.familyId,
            names,
            users
          });
        }
      }
    }
    
    // 2. Fetch recent note comments
    console.log('\n--- NOTE COMMENTS ---');
    const noteComments = await prisma.noteComment.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        note: {
          select: { id: true, title: true, familyId: true }
        }
      }
    });
    
    for (const comment of noteComments) {
      const names = extractMentionNames(comment.content || '');
      if (names.length > 0) {
        const users = await resolveMentionedUsers(comment.note.familyId, names);
        console.log(`Note ${comment.id} fam=${comment.note.familyId} txt="${comment.content}" -> names=[${names.join(', ')}] matches=[${users.map(formatUser).join(', ')}]`);
        
        if (users.length > 0) {
          matches.note.push({
            commentId: comment.id,
            familyId: comment.note.familyId,
            names,
            users
          });
        }
      }
    }
    
    // 3. Fetch recent gallery comments
    console.log('\n--- GALLERY COMMENTS ---');
    const galleryComments = await prisma.galleryComment.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        gallery: {
          select: { id: true, title: true, familyId: true }
        }
      }
    });
    
    for (const comment of galleryComments) {
      const names = extractMentionNames(comment.content || '');
      if (names.length > 0) {
        const users = await resolveMentionedUsers(comment.gallery.familyId, names);
        console.log(`Gallery ${comment.id} fam=${comment.gallery.familyId} txt="${comment.content}" -> names=[${names.join(', ')}] matches=[${users.map(formatUser).join(', ')}]`);
        
        if (users.length > 0) {
          matches.gallery.push({
            commentId: comment.id,
            familyId: comment.gallery.familyId,
            names,
            users
          });
        }
      }
    }
    
    // 4. Print summary
    console.log('\n--- SUMMARY ---');
    console.log(`Document comments with matches: ${matches.document.length}`);
    console.log(`Note comments with matches: ${matches.note.length}`);
    console.log(`Gallery comments with matches: ${matches.gallery.length}`);
    
    if (matches.document.length + matches.note.length + matches.gallery.length === 0) {
      console.log('\nNo matches found! Possible issues:');
      console.log('1. No comments contain @mentions in the expected format');
      console.log('2. Names in @mentions do not match any family members exactly');
      console.log('3. Family membership is not set up correctly');
    } else {
      console.log('\nMatches found! If notifications are still not working, check:');
      console.log('1. The notification creation code in handleMentionsInComment or createDocumentComment');
      console.log('2. The notification API routes and authentication');
      console.log('3. The NotificationCenter component subscription to SSE events');
    }
    
  } catch (error) {
    console.error('Error debugging mentions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
