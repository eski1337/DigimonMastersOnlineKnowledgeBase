# Discord OAuth Setup Guide

## Discord Server Configuration

Your Discord server is already configured with the correct role hierarchy:

```
Server ID: 1427056567693476016

Roles:
├── Owner:  1427056890008961166
├── Admin:  1427056820697960579
├── Editor: 1427056761029918761
├── Member: 1427056712690565181
└── Guest:  1427056679018696847
```

These role IDs are already added to your `.env` file.

---

## Steps to Complete Discord Integration

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Name it: **"DMO Knowledge Base"**
4. Click **"Create"**

### 2. Configure OAuth2

1. In your application, go to **OAuth2** → **General**
2. Copy the **Client ID**
3. Copy the **Client Secret** (click "Reset Secret" if needed)
4. Add Redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/discord
   https://your-domain.com/api/auth/callback/discord
   ```
5. Click **"Save Changes"**

### 3. Update .env File

Add the Discord credentials to your `.env`:

```env
DISCORD_CLIENT_ID=your-copied-client-id
DISCORD_CLIENT_SECRET=your-copied-client-secret
```

**The guild ID and role IDs are already configured!**

### 4. Set Bot Permissions (Optional)

If you want the bot to read guild members:

1. Go to **Bot** tab
2. Click **"Add Bot"**
3. Enable **Server Members Intent**
4. Enable **Presence Intent**
5. Copy the bot token (optional, for future features)

### 5. Invite Application to Server

1. Go to **OAuth2** → **URL Generator**
2. Select scopes:
   - `identify`
   - `email`
   - `guilds`
   - `guilds.members.read`
3. Copy the generated URL
4. Open it in browser and add to your server

---

## How It Works

### Role Sync Flow

1. **User logs in** via Discord OAuth
2. **NextAuth** fetches user's Discord profile and guild roles
3. **Role mapper** checks user's Discord roles against configured role IDs
4. **Website role** assigned based on highest Discord role:
   - Discord Owner role → Website Owner
   - Discord Admin role → Website Admin
   - Discord Editor role → Website Editor
   - Discord Member role → Website Member
   - Discord Guest role → Website Guest

### Automatic Updates

Role sync happens:
- ✅ On first login
- ✅ Every time user logs in
- ✅ When token refreshes (automatic)

### Code Location

- **OAuth Config**: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- **Role Mapping**: Automatic based on env vars
- **User Management**: Payload CMS Users collection

---

## Testing

### Test Login Flow

1. Start services:
   ```bash
   pnpm dev:cms  # Terminal 1
   pnpm dev      # Terminal 2
   ```

2. Visit: http://localhost:3000/auth/signin

3. Click **"Sign in with Discord"**

4. Authorize the application

5. Check your role:
   - Go to http://localhost:3001/admin
   - You should be logged in with correct role

### Verify Role Sync

1. Log in to CMS admin
2. Go to **Users** collection
3. Find your user
4. Check the **Role** field
5. Should match your Discord role

---

## Production Deployment

### Update Environment Variables

```env
NEXTAUTH_URL=https://your-domain.com
DISCORD_CLIENT_ID=your-production-client-id
DISCORD_CLIENT_SECRET=your-production-client-secret
DISCORD_GUILD_ID=1427056567693476016
```

### Add Production Redirect URL

In Discord Developer Portal:
```
https://your-domain.com/api/auth/callback/discord
```

### Security Notes

- ✅ Never commit Discord credentials to git
- ✅ Use different Discord app for production
- ✅ Keep role IDs consistent across environments
- ✅ Rotate secrets regularly

---

## Troubleshooting

### "Invalid OAuth2 redirect_uri"
**Solution**: Add redirect URI in Discord Developer Portal

### "User has no roles"
**Solution**: Make sure user has at least Guest role in Discord server

### "Role not syncing"
**Solution**: 
1. Check role IDs match in `.env`
2. Clear browser cookies
3. Log out and log back in

### "Discord OAuth not appearing"
**Solution**: Check `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are set in `.env`

---

## Current Status

- ✅ Discord server configured with correct roles
- ✅ Role IDs added to `.env`
- ✅ Environment validation configured
- ✅ OAuth code ready
- ⏳ Need Discord app credentials (Client ID + Secret)

**Once you add the Client ID and Secret, Discord login will work immediately!**

---

## References

- Discord Developer Portal: https://discord.com/developers/applications
- NextAuth Discord Provider: https://next-auth.js.org/providers/discord
- OAuth2 Scopes: https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes
