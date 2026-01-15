// Quick verification that authOptions is properly exported
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying authOptions import fix...\n');

// Check if auth.ts exports authOptions as named export
const authFile = fs.readFileSync('src/lib/auth.ts', 'utf8');
const hasNamedExport = authFile.includes('export const authOptions');

console.log('✓ auth.ts exports authOptions:', hasNamedExport ? '✅ Yes' : '❌ No');

// Check all API files use correct import
const apiFiles = [
  'src/app/api/admin/users/route.ts',
  'src/app/api/admin/users/[id]/route.ts',
  'src/app/api/marketplace/caregivers/route.ts',
  'src/app/api/marketplace/applications/route.ts'
];

let allCorrect = true;
apiFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const hasCorrectImport = content.includes("import { authOptions } from '@/lib/auth'");
    const hasIncorrectImport = content.includes("import authOptions from '@/lib/auth'");
    
    if (hasCorrectImport) {
      console.log(`✓ ${file}: ✅ Correct import`);
    } else if (hasIncorrectImport) {
      console.log(`✓ ${file}: ❌ INCORRECT import (still default)`);
      allCorrect = false;
    }
  }
});

console.log('\n' + '='.repeat(60));
if (allCorrect && hasNamedExport) {
  console.log('✅ ALL CHECKS PASSED - Fix is correctly applied');
} else {
  console.log('❌ SOME CHECKS FAILED - Review needed');
}
console.log('='.repeat(60));
