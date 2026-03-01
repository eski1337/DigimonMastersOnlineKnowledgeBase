'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, CheckCheck, MessageSquare, MessageCircle, Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
  fromUser?: { id: string; username?: string; name?: string } | string;
  isRead: boolean;
  createdAt: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'new_message':
      return <MessageSquare className="h-4 w-4 text-blue-400 shrink-0" />;
    case 'profile_comment':
    case 'comment_reply':
      return <MessageCircle className="h-4 w-4 text-orange-400 shrink-0" />;
    case 'role_change':
    case 'moderation':
      return <Shield className="h-4 w-4 text-yellow-400 shrink-0" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.docs || []);
        setUnreadCount((data.docs || []).filter((n: Notification) => !n.isRead).length);
      }
    } catch { /* ignore */ }
  }, [session?.user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setNotifications(prev =>
        prev.map(n => ids.includes(n.id) ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - ids.length));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  if (!session?.user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={(e) => { e.preventDefault(); markAllRead(); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem key={n.id} asChild className="cursor-pointer">
              <div
                className={`flex items-start gap-3 p-3 ${!n.isRead ? 'bg-accent/50' : ''}`}
                onClick={() => {
                  if (!n.isRead) markAsRead([n.id]);
                  if (n.linkUrl) window.location.href = n.linkUrl;
                  setIsOpen(false);
                }}
              >
                {getNotificationIcon(n.type)}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${!n.isRead ? 'font-medium' : 'text-muted-foreground'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {n.body}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {!n.isRead && (
                  <div className="h-2 w-2 rounded-full bg-orange-500 shrink-0 mt-1" />
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
