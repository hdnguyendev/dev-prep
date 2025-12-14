-- Clean duplicate Clerk users created by token.substring()
-- Keep only users created with real Clerk user IDs (clerk_user_...)

BEGIN;

-- 1. Delete CandidateProfiles of duplicate users
DELETE FROM "CandidateProfile" 
WHERE "userId" IN (
  SELECT id FROM "User" 
  WHERE email LIKE 'clerk_eyJ%'  -- JWT token format
     OR email LIKE 'clerk_IS%'   -- Another possible token start
     OR (email LIKE 'clerk_%' AND email NOT LIKE 'clerk_user_%')
);

-- 2. Delete Applications created by duplicate users
DELETE FROM "Application"
WHERE "candidateId" IN (
  SELECT "CandidateProfile".id FROM "CandidateProfile"
  INNER JOIN "User" ON "User".id = "CandidateProfile"."userId"
  WHERE "User".email LIKE 'clerk_eyJ%'
     OR "User".email LIKE 'clerk_IS%'
     OR ("User".email LIKE 'clerk_%' AND "User".email NOT LIKE 'clerk_user_%')
);

-- 3. Delete duplicate Users
DELETE FROM "User" 
WHERE email LIKE 'clerk_eyJ%'
   OR email LIKE 'clerk_IS%'
   OR (email LIKE 'clerk_%' AND email NOT LIKE 'clerk_user_%' AND email NOT LIKE '%@%');

COMMIT;

-- Verify remaining users
SELECT id, email, "firstName", "lastName", role, "createdAt" 
FROM "User" 
WHERE email LIKE 'clerk_%'
ORDER BY "createdAt" DESC;
