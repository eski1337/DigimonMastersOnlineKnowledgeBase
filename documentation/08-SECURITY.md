# Security - DMO Knowledge Base

Security architecture, authentication, authorization, and best practices.

---

## Authentication System

### NextAuth Implementation
- **Strategy**: JWT sessions (not database sessions)
- **Providers**:
  1. **Credentials** - Payload CMS username/password
  2. **Discord OAuth** - Social authentication
  3. **Email** (disabled) - Magic link login
- **Session Storage**: HTTP-only cookies
- **Token Signing**: HMAC with `NEXTAUTH_SECRET`

### Authentication Flow
```
1. User visits /auth/signin
2. Chooses provider (Credentials or Discord)
3. Provider validates credentials
4. NextAuth generates JWT token
5. Token stored in HTTP-only cookie
6. Subsequent requests include cookie
7. Middleware validates token
```

---

## Authorization (RBAC)

### Role Hierarchy
```
owner (highest)
  ↓
admin
  ↓
editor
  ↓
member
  ↓
guest (lowest)
```

### Role Permissions

#### Guest
- ✅ Read published content
- ❌ No write access
- ❌ No account features

#### Member
- ✅ Read published content
- ✅ User profile
- ✅ Settings
- ❌ No content editing

#### Editor
- ✅ All member permissions
- ✅ Create/edit Digimon
- ✅ Create/edit Guides
- ✅ Create/edit Tools
- ✅ Upload media
- ❌ Cannot delete
- ❌ Cannot manage users

#### Admin
- ✅ All editor permissions
- ✅ Delete content
- ✅ Manage users (except owners)
- ✅ Access admin panel
- ❌ Cannot change owner role

#### Owner
- ✅ Full system access
- ✅ Manage all users
- ✅ Change any role
- ✅ System configuration

### Access Control Implementation

**Payload Collections** (`apps/cms/src/collections/*.ts`):
```typescript
access: {
  read: () => true,  // Public read
  create: ({ req: { user } }) => {
    if (!user) return false;
    return ['editor', 'admin', 'owner'].includes(user.role);
  },
  update: ({ req: { user } }) => {
    if (!user) return false;
    return ['editor', 'admin', 'owner'].includes(user.role);
  },
  delete: ({ req: { user } }) => {
    if (!user) return false;
    return ['admin', 'owner'].includes(user.role);
  },
}
```

**Next.js Middleware** (`apps/web/src/middleware.ts`):
```typescript
export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      if (req.nextUrl.pathname.startsWith('/admin')) {
        return token?.roles?.includes('editor') || false;
      }
      if (req.nextUrl.pathname.startsWith('/account')) {
        return !!token;
      }
      return true;
    },
  },
});
```

---

## Discord Role Sync

### Purpose
Automatically sync roles from Discord server to app roles.

### Configuration
Map Discord role IDs to app roles in `.env`:
```env
DISCORD_OWNER_ROLE_ID=123...
DISCORD_ADMIN_ROLE_ID=456...
DISCORD_EDITOR_ROLE_ID=789...
DISCORD_MEMBER_ROLE_ID=012...
DISCORD_GUEST_ROLE_ID=345...
```

### Sync Process
1. User signs in with Discord OAuth
2. NextAuth fetches user's Discord roles
3. Maps highest Discord role to app role
4. Stores role in JWT token
5. Role used for all subsequent requests

### Fallback
- If Discord API fails: default to 'member' role
- If no special role: assign 'member' role
- Never downgrade existing role

---

## Development Auto-Upgrade Hook

### Purpose
Automatically upgrade users to 'editor' role in development for testing.

### Implementation
**File**: `apps/cms/src/collections/Users.ts`
```typescript
hooks: {
  beforeChange: [
    ({ data, req, operation }) => {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      // New users get 'editor' in development
      if (operation === 'create' && !req.user) {
        data.role = isDevelopment ? 'editor' : 'member';
      }
      
      // Auto-upgrade existing users to 'editor' in development
      if (isDevelopment && ['guest', 'member'].includes(data.role)) {
        data.role = 'editor';
      }
      
      return data;
    },
  ],
}
```

### Production Safety
- Only activates when `NODE_ENV === 'development'`
- Production users get 'member' by default
- Admins must manually promote users in production

---

## Password Security

### Hashing
- **Algorithm**: bcrypt
- **Salt Rounds**: 10 (Payload default)
- **Storage**: Hashed password only (never plain text)

### Password Requirements
- **Minimum Length**: 8 characters (Payload default)
- **Strength**: No enforced complexity (TODO: add)
- **Reset**: Email-based reset flow

### Recommendations
- Use strong, unique passwords
- Enable Discord OAuth for easier management
- Rotate admin passwords regularly

---

## Email Verification

### Flow
1. User registers account
2. System sends verification email
3. User clicks verification link
4. Token validated, account marked verified
5. User can log in

### Token Security
- **Generation**: Random 32-byte token
- **Storage**: Hashed in database
- **Expiry**: 24 hours (Payload default)
- **Single Use**: Token invalidated after verification

### Email Content
- Custom HTML template in `Users.ts`
- Verification link: `{APP_URL}/verify-email?token={token}`
- Styled with inline CSS (email compatibility)

---

## Session Management

### JWT Tokens
- **Algorithm**: HS256 (HMAC SHA-256)
- **Signing Key**: `NEXTAUTH_SECRET`
- **Expiry**: 30 days (NextAuth default)
- **Refresh**: Automatic on page load
- **Storage**: HTTP-only cookie (XSS protection)

### Session Data
```typescript
{
  user: {
    id: string,
    email: string,
    name: string,
    role: string,
    roles: string[]
  },
  expires: string (ISO date)
}
```

### Invalidation
- Logout: Clears cookie
- Token expiry: Auto-logout
- Password change: Requires re-login
- Role change: Requires re-login

---

## CORS Configuration

### Payload CMS
**File**: `apps/cms/src/payload.config.ts`
```typescript
cors: [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
],
csrf: [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
]
```

### Allowed Origins
- Development: `http://localhost:3000`
- Production: Your domain (set via env var)

### Security Headers
- Blocks cross-origin requests from unauthorized domains
- CSRF protection enabled
- Same-origin policy for cookies

---

## Input Validation

### Zod Schemas
**File**: `packages/shared/src/schemas.ts`

All API inputs validated with Zod:
```typescript
const digimonSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  rank: z.string().optional(),
  // ...
});
```

### Payload Validation
- Required fields enforced at schema level
- Type checking (text, number, email, etc.)
- Custom validation functions
- Sanitization of rich text fields

### Benefits
- Prevents injection attacks
- Type safety at runtime
- Consistent error messages
- Early error detection

---

## API Security

### Rate Limiting
**Current**: Configured but not enforced
```env
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

**TODO**: Implement middleware for:
- API endpoints
- Login attempts
- Password reset requests
- Media uploads

### Authentication Required
Protected endpoints require valid JWT:
- `/api/digimon` (POST, PATCH, DELETE)
- `/api/evolution-lines` (POST, PATCH, DELETE)
- `/api/media` (POST, DELETE)
- All admin panel routes

### Error Handling
- Never expose stack traces in production
- Generic error messages to clients
- Detailed logging server-side only
- No sensitive data in error responses

---

## Data Privacy

### User Data Collection
- Email (required for auth)
- Username (optional)
- Discord ID (if OAuth used)
- Role (for authorization)
- IP address (session logging)

### Data Usage
- Authentication only
- No third-party sharing
- No marketing/analytics tracking
- Discord data not stored beyond ID

### GDPR Compliance (TODO)
- [ ] Add privacy policy
- [ ] Implement data export
- [ ] Implement account deletion
- [ ] Add cookie consent
- [ ] Document data retention

---

## Security Best Practices

### DO ✅
- Use HTTPS in production
- Keep dependencies updated
- Validate all inputs
- Use parameterized queries (Mongoose)
- Store secrets in environment variables
- Enable CSRF protection
- Use HTTP-only cookies
- Implement rate limiting
- Log security events
- Regular security audits

### DON'T ❌
- Expose secrets in client code
- Trust user input
- Use weak passwords
- Disable security features
- Log sensitive data
- Store passwords in plain text
- Allow SQL injection (use ORM)
- Ignore security warnings
- Use default secrets in production

---

## Security Headers (TODO)

Recommended for production:
```typescript
// next.config.mjs
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```

---

## Vulnerability Scanning

### Tools to Use
- `npm audit` / `pnpm audit` - Dependency vulnerabilities
- Snyk - Continuous monitoring
- OWASP ZAP - Penetration testing
- ESLint security plugins - Code analysis

### Regular Tasks
- [ ] Weekly dependency audits
- [ ] Monthly security reviews
- [ ] Quarterly penetration tests
- [ ] Annual third-party audit

---

## Incident Response Plan (TODO)

### In Case of Security Breach
1. **Identify**: Determine scope and impact
2. **Contain**: Block attacker access
3. **Eradicate**: Remove vulnerability
4. **Recover**: Restore normal operations
5. **Notify**: Inform affected users
6. **Learn**: Document and prevent recurrence

### Contacts
- Owner: (define)
- Security team: (define)
- Hosting provider: (define)

---

## Production Security Checklist

- [ ] HTTPS enabled everywhere
- [ ] Strong secrets generated
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] CORS properly restricted
- [ ] Input validation on all endpoints
- [ ] Error handling doesn't leak info
- [ ] Dependencies up to date
- [ ] No development tools in production
- [ ] Logging and monitoring enabled
- [ ] Backup strategy in place
- [ ] Incident response plan defined
- [ ] Privacy policy published
- [ ] Terms of service published
