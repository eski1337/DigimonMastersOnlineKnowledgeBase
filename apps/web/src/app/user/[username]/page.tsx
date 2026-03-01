'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, Calendar, MessageSquare, Send, Lock, Eye,
  Globe, ExternalLink,
  ChevronDown, Trash2, Pencil, X, Save, Loader2,
} from 'lucide-react';
import { FaDiscord, FaTwitter, FaYoutube, FaTwitch } from 'react-icons/fa';

/* ── Types ─────────────────────────────────────────────────────── */

interface UserProfile {
  id: string;
  username: string;
  name?: string;
  role: string;
  avatar?: { url: string; sizes?: { thumbnail?: { url: string } } } | null;
  banner?: { url: string } | null;
  bio?: string;
  location?: string;
  socialLinks?: {
    discord?: string;
    twitter?: string;
    youtube?: string;
    twitch?: string;
    website?: string;
  };
  profileVisibility?: string;
  allowMessages?: string;
  allowProfileComments?: string;
  lastSeen?: string;
  createdAt?: string;
  isPrivate?: boolean;
  isRestricted?: boolean;
}

interface ProfileComment {
  id: string;
  author: { id: string; username: string; name?: string; avatar?: any };
  body: string;
  createdAt: string;
  parent?: string | null;
}

/* ── Helpers ────────────────────────────────────────────────────── */

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
  admin: 'bg-red-500/20 text-red-400 border-red-500/50',
  editor: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  member: 'bg-green-500/20 text-green-400 border-green-500/50',
  guest: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getInitials(name?: string, username?: string): string {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (username) return username.slice(0, 2).toUpperCase();
  return '?';
}

function getAvatarUrl(avatar: any): string | undefined {
  if (!avatar) return undefined;
  return avatar.sizes?.thumbnail?.url || avatar.url;
}

/* ── Comment Component ──────────────────────────────────────────── */

function CommentItem({ comment, currentUserId, onDelete }: {
  comment: ProfileComment;
  currentUserId?: string;
  onDelete: (id: string) => void;
}) {
  const isAuthor = currentUserId === comment.author?.id;
  const authorName = comment.author?.name || comment.author?.username || 'Unknown';

  return (
    <div className="flex gap-3 py-3">
      <Link href={`/user/${comment.author?.username}`}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={getAvatarUrl(comment.author?.avatar)} />
          <AvatarFallback className="text-xs">
            {getInitials(comment.author?.name, comment.author?.username)}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/user/${comment.author?.username}`} className="font-semibold text-sm hover:underline">
            {authorName}
          </Link>
          <span className="text-xs text-muted-foreground">{relativeTime(comment.createdAt)}</span>
          {isAuthor && (
            <button
              onClick={() => onDelete(comment.id)}
              className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
              title="Delete comment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">{comment.body}</p>
      </div>
    </div>
  );
}

/* ── Main Profile Page ──────────────────────────────────────────── */

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { data: session } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    bio: '',
    location: '',
    discord: '',
    twitter: '',
    youtube: '',
    twitch: '',
    website: '',
    profileVisibility: 'public',
    allowMessages: 'everyone',
    allowProfileComments: 'everyone',
  });

  const isOwnProfile = session?.user?.id === profile?.id;

  // Fetch profile
  useEffect(() => {
    if (!username) return;
    setIsLoading(true);
    fetch(`/api/users/${encodeURIComponent(username)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setIsLoading(false));
  }, [username]);

  // Populate edit form when entering edit mode
  const startEditing = () => {
    if (!profile) return;
    setEditData({
      name: profile.name || '',
      bio: profile.bio || '',
      location: profile.location || '',
      discord: profile.socialLinks?.discord || '',
      twitter: profile.socialLinks?.twitter || '',
      youtube: profile.socialLinks?.youtube || '',
      twitch: profile.socialLinks?.twitch || '',
      website: profile.socialLinks?.website || '',
      profileVisibility: profile.profileVisibility || 'public',
      allowMessages: profile.allowMessages || 'everyone',
      allowProfileComments: profile.allowProfileComments || 'everyone',
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!profile || !username) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name,
          bio: editData.bio,
          location: editData.location,
          socialLinks: {
            discord: editData.discord,
            twitter: editData.twitter,
            youtube: editData.youtube,
            twitch: editData.twitch,
            website: editData.website,
          },
          profileVisibility: editData.profileVisibility,
          allowMessages: editData.allowMessages,
          allowProfileComments: editData.allowProfileComments,
        }),
      });
      if (res.ok) {
        // Re-fetch profile to show updated data
        const refreshRes = await fetch(`/api/users/${encodeURIComponent(username)}`);
        if (refreshRes.ok) {
          const refreshed = await refreshRes.json();
          setProfile(refreshed);
        }
        setIsEditing(false);
      }
    } catch { /* ignore */ }
    setIsSaving(false);
  };

  // Fetch comments
  const fetchComments = useCallback(async (page = 1, append = false) => {
    if (!profile?.id) return;
    try {
      const res = await fetch(`/api/profile-comments?profileId=${profile.id}&page=${page}&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      setComments(prev => append ? [...prev, ...(data.docs || [])] : (data.docs || []));
      setHasMoreComments(data.hasNextPage || false);
      setCommentsPage(page);
    } catch { /* ignore */ }
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id && !profile.isPrivate && !profile.isRestricted) {
      fetchComments(1);
    }
  }, [profile?.id, profile?.isPrivate, profile?.isRestricted, fetchComments]);

  const handlePostComment = async () => {
    if (!commentText.trim() || !profile?.id || !session?.user) return;
    setIsPostingComment(true);
    try {
      const res = await fetch('/api/profile-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, body: commentText.trim() }),
      });
      if (res.ok) {
        setCommentText('');
        fetchComments(1);
      }
    } catch { /* ignore */ }
    setIsPostingComment(false);
  };

  const handleDeleteComment = async (id: string) => {
    try {
      // Delete via CMS through our API
      const res = await fetch(`/api/profile-comments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== id));
      }
    } catch { /* ignore */ }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container py-8 max-w-4xl">
        <Skeleton className="h-48 w-full rounded-xl mb-4" />
        <div className="flex gap-4 items-end -mt-12 ml-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2 pb-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!profile) {
    return (
      <div className="container py-16 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
        <p className="text-muted-foreground">The user &quot;{username}&quot; does not exist.</p>
      </div>
    );
  }

  // Private profile
  if (profile.isPrivate) {
    return (
      <div className="container py-16 text-center">
        <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold mb-2">{profile.name || profile.username}</h1>
        <p className="text-muted-foreground">This profile is private.</p>
      </div>
    );
  }

  // Restricted (registered only)
  if (profile.isRestricted) {
    return (
      <div className="container py-16 text-center">
        <Eye className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold mb-2">{profile.name || profile.username}</h1>
        <p className="text-muted-foreground">Sign in to view this profile.</p>
        <Link href="/auth/signin" className="mt-4 inline-block">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  const bannerUrl = profile.banner?.url;
  const avatarUrl = getAvatarUrl(profile.avatar);
  const canComment = profile.allowProfileComments !== 'nobody' && session?.user && !isOwnProfile;
  const canMessage = profile.allowMessages !== 'nobody' && session?.user && !isOwnProfile;

  return (
    <div className="container py-0 max-w-4xl">
      {/* Banner */}
      <div className="relative h-48 sm:h-56 rounded-b-xl overflow-hidden bg-gradient-to-br from-[#1d2021] to-[#32302f]">
        {bannerUrl && (
          <Image src={bannerUrl} alt="Profile banner" fill className="object-cover" priority />
        )}
      </div>

      {/* Avatar + Name */}
      <div className="relative px-4 sm:px-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14">
          <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-3xl bg-[#282828]">
              {getInitials(profile.name, profile.username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{profile.name || profile.username}</h1>
              <Badge variant="outline" className={ROLE_COLORS[profile.role] || ROLE_COLORS.member}>
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          </div>
          <div className="flex gap-2 sm:pb-1">
            {canMessage && (
              <Link href={`/messages?to=${profile.username}`}>
                <Button size="sm" variant="outline">
                  <MessageSquare className="w-4 h-4 mr-1" /> Message
                </Button>
              </Link>
            )}
            {isOwnProfile && !isEditing && (
              <Button size="sm" variant="outline" onClick={startEditing}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Profile
              </Button>
            )}
            {isOwnProfile && isEditing && (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 sm:px-6 mt-4 pb-12">
        {/* Left column: info or edit form */}
        <div className="space-y-4">
          {isEditing ? (
            /* ── EDIT MODE ── */
            <>
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <h3 className="text-sm font-semibold">About</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                    <input
                      value={editData.name}
                      onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                      className="w-full mt-1 bg-[#1d2021] border border-border/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      maxLength={100}
                      placeholder="Your display name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Bio</label>
                    <textarea
                      value={editData.bio}
                      onChange={e => setEditData(d => ({ ...d, bio: e.target.value }))}
                      className="w-full mt-1 bg-[#1d2021] border border-border/50 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                      maxLength={500}
                      placeholder="Tell others about yourself..."
                    />
                    <span className="text-[10px] text-muted-foreground">{editData.bio.length}/500</span>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Location</label>
                    <input
                      value={editData.location}
                      onChange={e => setEditData(d => ({ ...d, location: e.target.value }))}
                      className="w-full mt-1 bg-[#1d2021] border border-border/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      maxLength={100}
                      placeholder="e.g. Tokyo, Japan"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4">
                  <h3 className="text-sm font-semibold">Social Links</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { key: 'discord', label: 'Discord', placeholder: 'username' },
                    { key: 'twitter', label: 'Twitter / X', placeholder: 'handle (no @)' },
                    { key: 'youtube', label: 'YouTube', placeholder: 'Channel URL' },
                    { key: 'twitch', label: 'Twitch', placeholder: 'username' },
                    { key: 'website', label: 'Website', placeholder: 'https://...' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <input
                        value={(editData as any)[key] || ''}
                        onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))}
                        className="w-full mt-1 bg-[#1d2021] border border-border/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4">
                  <h3 className="text-sm font-semibold">Privacy</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { key: 'profileVisibility', label: 'Profile Visibility', options: [['public','Public'],['registered','Registered Only'],['private','Private']] },
                    { key: 'allowMessages', label: 'Allow Messages', options: [['everyone','Everyone'],['registered','Registered Only'],['nobody','Nobody']] },
                    { key: 'allowProfileComments', label: 'Allow Wall Comments', options: [['everyone','Everyone'],['registered','Registered Only'],['nobody','Nobody']] },
                  ].map(({ key, label, options }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <select
                        value={(editData as any)[key]}
                        onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))}
                        className="w-full mt-1 bg-[#1d2021] border border-border/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {options.map(([val, lbl]) => (
                          <option key={val} value={val}>{lbl}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            /* ── VIEW MODE ── */
            <>
              {/* Bio */}
              {profile.bio && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Details */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  {profile.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.createdAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Social Links */}
              {profile.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
                <Card>
                  <CardHeader className="pb-2 pt-4">
                    <h3 className="text-sm font-semibold">Links</h3>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {profile.socialLinks.discord && (
                      <div className="flex items-center gap-2 text-sm">
                        <FaDiscord className="w-4 h-4 text-[#5865F2]" />
                        <span>{profile.socialLinks.discord}</span>
                      </div>
                    )}
                    {profile.socialLinks.twitter && (
                      <a href={`https://twitter.com/${profile.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground transition-colors">
                        <FaTwitter className="w-4 h-4 text-[#1DA1F2]" />
                        <span>@{profile.socialLinks.twitter}</span>
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    )}
                    {profile.socialLinks.youtube && (
                      <a href={profile.socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground transition-colors">
                        <FaYoutube className="w-4 h-4 text-[#FF0000]" />
                        <span>YouTube</span>
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    )}
                    {profile.socialLinks.twitch && (
                      <a href={`https://twitch.tv/${profile.socialLinks.twitch}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground transition-colors">
                        <FaTwitch className="w-4 h-4 text-[#9146FF]" />
                        <span>{profile.socialLinks.twitch}</span>
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    )}
                    {profile.socialLinks.website && (
                      <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground transition-colors">
                        <Globe className="w-4 h-4" />
                        <span className="truncate">{profile.socialLinks.website.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-3 h-3 ml-auto shrink-0" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Empty state for own profile */}
              {isOwnProfile && !profile.bio && !profile.location && !(profile.socialLinks && Object.values(profile.socialLinks).some(Boolean)) && (
                <Card className="border-dashed">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">Your profile is empty.</p>
                    <Button size="sm" variant="ghost" className="mt-2" onClick={startEditing}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Add info
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Right column: wall */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2 pt-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Wall
              </h3>
            </CardHeader>
            <CardContent>
              {/* Comment input */}
              {canComment && (
                <div className="mb-4 pb-4 border-b border-border/50">
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder={`Write something on ${profile.name || profile.username}'s wall...`}
                    className="w-full bg-[#1d2021] border border-border/50 rounded-md p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                    maxLength={2000}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">{commentText.length}/2000</span>
                    <Button
                      size="sm"
                      onClick={handlePostComment}
                      disabled={!commentText.trim() || isPostingComment}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      {isPostingComment ? 'Posting...' : 'Post'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments list */}
              {comments.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {comments.map(comment => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={session?.user?.id}
                      onDelete={handleDeleteComment}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No comments yet. {canComment ? 'Be the first!' : ''}
                </div>
              )}

              {/* Load more */}
              {hasMoreComments && (
                <div className="text-center mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchComments(commentsPage + 1, true)}
                  >
                    <ChevronDown className="w-4 h-4 mr-1" /> Load more
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
