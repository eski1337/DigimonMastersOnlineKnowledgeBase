# Sharp Version Override Workaround

## Issue

Payload CMS v2.32.3 has a dependency on `sharp@0.32.6`, which fails to build on Windows due to missing native binaries. This version is incompatible with the current Windows build toolchain.

## Solution

We override the `sharp` version to `0.33.5` globally using pnpm's override feature.

### Implementation

**File: `package.json` (root)**

```json
{
  "dependencies": {
    "sharp": "0.33.5"
  },
  "pnpm": {
    "overrides": {
      "sharp": "0.33.5"
    }
  }
}
```

**File: `apps/cms/package.json`**

```json
{
  "dependencies": {
    "sharp": "0.33.5"
  }
}
```

## Verification

To verify the correct version is installed:

```bash
# Check all sharp installations
Get-ChildItem -Path node_modules\.pnpm -Filter sharp* -Directory | Select-Object Name

# Expected output:
# Name
# ----
# sharp@0.33.5

# Should NOT show sharp@0.32.6
```

## When to Remove

This workaround can be removed when:

1. **Payload CMS updates** to a version that supports `sharp@0.33.x` or later
2. **Sharp releases** a version that properly supports `sharp@0.32.6` on Windows

### Monitoring

Check Payload CMS releases: https://github.com/payloadcms/payload/releases

Look for mentions of:
- Sharp version updates
- Windows build fixes
- Native module compilation improvements

## Known Issues

None currently. The override works correctly and all functionality is preserved.

## Build Process

After any `pnpm install`, the override ensures:
1. Only `sharp@0.33.5` is installed
2. No `sharp@0.32.6` artifacts remain
3. Native binaries are properly compiled for Windows x64

## Testing

To test if Sharp is working correctly:

```bash
# CMS should start without errors
pnpm dev:cms

# Check for Sharp errors in logs
# Should see: "Payload Admin URL: http://localhost:3001"
# Should NOT see: "Cannot find module '../build/Release/sharp-win32-x64.node'"
```

## References

- Sharp Documentation: https://sharp.pixelplumbing.com/install
- Payload CMS Sharp Usage: Used for image processing in Media collection
- pnpm Overrides: https://pnpm.io/package_json#pnpmoverrides

---

**Status**: ✅ Working - No issues since implementation (Oct 13, 2025)
