'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, Send, ArrowLeft, Inbox,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────── */

interface Participant {
  user: { id: string; username: string; name?: string; avatar?: any } | string;
  lastReadAt?: string;
  deletedAt?: string;
}

interface Conversation {
  id: string;
  participants: Participant[];
  lastMessageAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
}

interface Message {
  id: string;
  sender: { id: string; username: string; name?: string; avatar?: any } | string;
  body: string;
  createdAt: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */

function relativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 30) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

function getUserObj(participant: Participant['user']): { id: string; username: string; name?: string; avatar?: any } | null {
  if (typeof participant === 'string') return null;
  return participant;
}

function getAvatarUrl(avatar: any): string | undefined {
  if (!avatar) return undefined;
  return avatar?.sizes?.thumbnail?.url || avatar?.url;
}

function getInitials(name?: string, username?: string): string {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (username) return username.slice(0, 2).toUpperCase();
  return '?';
}

/* ── Conversation List Item ─────────────────────────────────────── */

function ConversationItem({ conv, currentUserId, isActive, onClick }: {
  conv: Conversation;
  currentUserId: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const otherParticipant = conv.participants.find(p => {
    const u = getUserObj(p.user);
    return u && u.id !== currentUserId;
  });
  const other = otherParticipant ? getUserObj(otherParticipant.user) : null;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
        isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-[#282828]/50'
      }`}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={getAvatarUrl(other?.avatar)} />
        <AvatarFallback className="text-sm">{getInitials(other?.name, other?.username)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm truncate">{other?.name || other?.username || 'Unknown'}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(conv.lastMessageAt)}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {conv.lastMessagePreview || 'No messages yet'}
        </p>
      </div>
    </button>
  );
}

/* ── Message Bubble ─────────────────────────────────────────────── */

function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  const sender = typeof msg.sender === 'object' ? msg.sender : null;

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && (
        <Avatar className="h-7 w-7 shrink-0 mt-1">
          <AvatarImage src={getAvatarUrl(sender?.avatar)} />
          <AvatarFallback className="text-[10px]">{getInitials(sender?.name, sender?.username)}</AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-2 text-sm ${
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-[#282828] text-foreground rounded-bl-md'
        }`}>
          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
        </div>
        <p className={`text-[10px] text-muted-foreground/60 mt-0.5 ${isOwn ? 'text-right' : ''}`}>
          {relativeTime(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

/* ── Main Messages Page ─────────────────────────────────────────── */

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showInbox, setShowInbox] = useState(true);

  // Handle ?to=username param for starting new conversations
  const toUsername = searchParams.get('to');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/messages');
    }
  }, [status, router]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!session?.user) return;
    setIsLoadingConvs(true);
    try {
      const res = await fetch('/api/conversations?limit=50');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.docs || []);
      }
    } catch { /* ignore fetch error */ }
    setIsLoadingConvs(false);
  }, [session?.user]);

  useEffect(() => {
    if (session?.user) fetchConversations();
  }, [session?.user, fetchConversations]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId: string) => {
    setIsLoadingMsgs(true);
    try {
      const res = await fetch(`/api/messages?conversationId=${convId}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        // Reverse so oldest messages are at top
        setMessages((data.docs || []).reverse());
      }
    } catch { /* ignore fetch error */ }
    setIsLoadingMsgs(false);
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      setShowInbox(false);
    }
  }, [activeConvId, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!messageText.trim() || !session?.user) return;
    setIsSending(true);
    try {
      const body: Record<string, string> = { body: messageText.trim() };

      if (activeConvId) {
        body.conversationId = activeConvId;
      } else if (toUsername) {
        // Need to resolve username to userId
        const userRes = await fetch(`/api/users/${encodeURIComponent(toUsername)}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          body.recipientId = userData.id;
        } else {
          setIsSending(false);
          return;
        }
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setMessageText('');
        // If we started a new conversation, switch to it
        if (data.conversationId && !activeConvId) {
          setActiveConvId(data.conversationId);
          fetchConversations();
        } else {
          fetchMessages(activeConvId!);
          fetchConversations(); // Update preview
        }
      }
    } catch { /* ignore send error */ }
    setIsSending(false);
  };

  if (status === 'loading') {
    return (
      <div className="container py-8 max-w-5xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!session?.user) return null;

  const activeConv = conversations.find(c => c.id === activeConvId);
  const otherUser = activeConv?.participants.find(p => {
    const u = getUserObj(p.user);
    return u && u.id !== session.user.id;
  });
  const otherUserObj = otherUser ? getUserObj(otherUser.user) : null;

  return (
    <div className="container py-4 sm:py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      <div className="flex gap-4 h-[calc(100vh-180px)] min-h-[500px]">
        {/* Sidebar: Conversation List */}
        <Card className={`w-full md:w-80 shrink-0 flex flex-col overflow-hidden ${
          !showInbox && activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-3 border-b border-border/50">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Inbox className="w-4 h-4" /> Inbox
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingConvs ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))
            ) : conversations.length > 0 ? (
              conversations.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  currentUserId={session.user.id}
                  isActive={activeConvId === conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                />
              ))
            ) : (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No conversations yet</p>
                <p className="text-xs mt-1">Start a conversation from a user&apos;s profile</p>
              </div>
            )}
          </div>
        </Card>

        {/* Main: Message Thread */}
        <Card className={`flex-1 flex flex-col overflow-hidden ${
          showInbox && !activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConvId || toUsername ? (
            <>
              {/* Conversation header */}
              <div className="p-3 border-b border-border/50 flex items-center gap-3">
                <button
                  onClick={() => { setActiveConvId(null); setShowInbox(true); setMessages([]); }}
                  className="md:hidden shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {otherUserObj ? (
                  <Link href={`/user/${otherUserObj.username}`} className="flex items-center gap-2 hover:opacity-80">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getAvatarUrl(otherUserObj.avatar)} />
                      <AvatarFallback className="text-xs">{getInitials(otherUserObj.name, otherUserObj.username)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm">{otherUserObj.name || otherUserObj.username}</span>
                  </Link>
                ) : toUsername ? (
                  <span className="font-semibold text-sm">New conversation with @{toUsername}</span>
                ) : (
                  <span className="font-semibold text-sm">Conversation</span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingMsgs ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className={`flex gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                      <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                      <Skeleton className={`h-10 ${i % 2 === 0 ? 'w-48' : 'w-40'} rounded-2xl`} />
                    </div>
                  ))
                ) : messages.length > 0 ? (
                  messages.map(msg => {
                    const senderId = typeof msg.sender === 'object' ? msg.sender.id : msg.sender;
                    return (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isOwn={senderId === session.user.id}
                      />
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    <p>No messages yet. Say hello!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border/50">
                <div className="flex gap-2">
                  <textarea
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#1d2021] border border-border/50 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring max-h-24"
                    rows={1}
                    maxLength={5000}
                  />
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={!messageText.trim() || isSending}
                    className="shrink-0 self-end"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm mt-1">or start one from a user&apos;s profile</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
