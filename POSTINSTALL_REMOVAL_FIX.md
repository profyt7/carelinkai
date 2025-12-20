# Fix: Remove Postinstall Script

## Issue

Build failing during npm install with postinstall script error:

```
> carelinkai@0.1.0 postinstall
> prisma generate

sh: 1: prisma: not found
npm ERR! code 127
npm ERR! command failed
npm ERR! command sh -c prisma generate
```

## Root Cause

The postinstall script was added to automatically run Prisma generation:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

**Problem:**
- Postinstall runs DURING npm install
- At that point, Prisma CLI is not yet available in PATH
- The script tries to run `prisma` (not `npx prisma`)
- Command not found error

## Why This Happened

We added the postinstall script thinking it would help, but:
1. It runs too early (during npm install)
2. It doesn't use `npx` to find the Prisma binary
3. It's redundant - we already have `npx prisma generate` in the build script

## Solution

**Removed the postinstall script** from package.json.

### Why This Works

1. **Build script already handles it**: Our `render-build.sh` has:
   ```bash
   npx prisma generate --schema=./prisma/schema.prisma
   ```

2. **npx finds the binary**: `npx` looks in `node_modules/.bin` and finds Prisma

3. **Runs at the right time**: After npm install completes, not during

4. **No redundancy**: One place to generate Prisma client

## Files Changed

### package.json
```diff
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
-   "postinstall": "prisma generate",
    "test": "jest",
    ...
  }
}
```

## Build Process

### Before (Broken):
```
1. npm install starts
2. Packages being installed
3. npm install completes
4. postinstall runs: "prisma generate"
5. ❌ Error: prisma command not found
6. npm install fails
7. Build fails
```

### After (Fixed):
```
1. npm install starts
2. Packages being installed
3. npm install completes
4. ✅ No postinstall script
5. Build script runs: "npx prisma generate"
6. ✅ Prisma client generated
7. ✅ Build succeeds
```

## Testing

✅ Local build successful without postinstall
✅ npm install completes without errors
✅ Prisma generation works with npx in build script
✅ Next.js build completes

## Best Practices

### ✅ DO:
- Use `npx` for CLI tools in build scripts
- Run Prisma generation AFTER npm install
- Keep build steps explicit in build command

### ❌ DON'T:
- Use postinstall for critical build steps
- Assume CLI tools are in PATH during postinstall
- Run commands without `npx` in scripts

## References

- [npm postinstall timing](https://docs.npmjs.com/cli/v8/using-npm/scripts#npm-install)
- [Prisma deployment best practices](https://www.prisma.io/docs/guides/deployment/deployment-guides)
- [npx usage](https://docs.npmjs.com/cli/v8/commands/npx)

---

**Status:** ✅ Fixed
**Date:** December 20, 2025
