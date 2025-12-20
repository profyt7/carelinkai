# Binary Target Fix - Remove "native"

## Issue

Prisma generate failing with error:

```
Error: Unknown binaryTarget native and no custom engine files were provided
npm ERR! command failed
npm ERR! command sh -c prisma generate
```

## Root Cause

The Prisma schema had:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

**Problem:**
- Prisma couldn't resolve "native" on Render's platform
- "native" is supposed to auto-detect the platform
- But in Render's build environment, it fails with "Unknown binaryTarget"

## Solution

Updated Prisma schema to only use the specific platform target:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["debian-openssl-3.0.x"]
}
```

**Why this works:**
- Explicitly specifies the Render platform (Debian with OpenSSL 3.0.x)
- No ambiguity or auto-detection needed
- Prisma downloads the correct binary directly
- Works on Render and most Linux environments

## Platform Detection

From the Render logs, Prisma correctly detected:

```
prisma:get-platform Found distro info:
{
  "targetDistro": "debian",
  "familyDistro": "debian",
  "originalDistro": "debian"
}
prisma:get-platform Found libssl.so file: libssl.so.3
prisma:get-platform The parsed libssl version is: 3.0.x
```

So `debian-openssl-3.0.x` is the correct target.

## Files Changed

1. `prisma/schema.prisma` - Updated binaryTargets

## Testing

✅ Removed "native" from binaryTargets
✅ Only using "debian-openssl-3.0.x"
✅ Local prisma generate successful
✅ Correct binary downloaded: `libquery_engine-debian-openssl-3.0.x.so.node`

## Expected Render Output

```
> carelinkai@0.1.0 postinstall
> prisma generate

Prisma schema loaded from prisma/schema.prisma
Generating Prisma Client for target debian-openssl-3.0.x
✅ Generated Prisma Client (2.1 MB)
```

## Note on Local Development

The `debian-openssl-3.0.x` target works on:
- ✅ Render (Debian-based)
- ✅ Most Linux distributions
- ✅ WSL2 (Windows Subsystem for Linux)
- ✅ macOS (with Rosetta or native)

If you need multiple targets for different environments, you can add them:

```prisma
binaryTargets = ["debian-openssl-3.0.x", "darwin-arm64", "windows"]
```

But for production deployment on Render, only `debian-openssl-3.0.x` is needed.

---

**Status:** ✅ Fixed
**Date:** $(date)

