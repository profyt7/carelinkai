-- Verify email for discharge planner test account
UPDATE "User" 
SET "emailVerified" = NOW() 
WHERE email = 'discharge.planner@carelinkai.com';

-- Display the updated user record
SELECT id, email, "emailVerified", role, "createdAt" 
FROM "User" 
WHERE email = 'discharge.planner@carelinkai.com';
