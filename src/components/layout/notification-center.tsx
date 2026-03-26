'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    Briefcase,
    Building2,
    CheckCircle2,
    Clock3,
    ShieldCheck,
    UserCheck,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { AppNotification } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
    userId: string;
}

function formatRelativeTime(value: string) {
    const date = new Date(value);
    const diffMs = date.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffMinutes) < 60) {
        return rtf.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
        return rtf.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    return rtf.format(diffDays, 'day');
}

function getNotificationIcon(type: string) {
    if (type.includes('application')) {
        return Briefcase;
    }
    if (type.includes('verified')) {
        return CheckCircle2;
    }
    if (type.includes('rejected')) {
        return XCircle;
    }
    if (type.includes('company')) {
        return Building2;
    }
    if (type.includes('student')) {
        return UserCheck;
    }
    if (type.includes('pending')) {
        return Clock3;
    }
    if (type.includes('approved')) {
        return ShieldCheck;
    }
    return Bell;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
    const router = useRouter();
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [tableReady, setTableReady] = useState(true);

    useEffect(() => {
        if (!userId) return;
        const supabase = createClient();

        const loadNotifications = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('recipient_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('Failed to load notifications', error);
                setTableReady(false);
                setNotifications([]);
            } else {
                setTableReady(true);
                setNotifications((data || []) as AppNotification[]);
            }
            setLoading(false);
        };

        loadNotifications();

        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${userId}`,
                },
                (payload) => {
                    const incoming = payload.new as AppNotification;
                    setNotifications((prev) => [incoming, ...prev.filter((item) => item.id !== incoming.id)].slice(0, 20));
                    toast(incoming.title, { description: incoming.message });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${userId}`,
                },
                (payload) => {
                    const incoming = payload.new as AppNotification;
                    setNotifications((prev) => prev.map((item) => (item.id === incoming.id ? incoming : item)));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!panelRef.current) return;
            if (!panelRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleOutsideClick);
        }

        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [open]);

    const unreadCount = useMemo(
        () => notifications.filter((item) => !item.is_read).length,
        [notifications]
    );

    const markAsRead = async (notificationId: string) => {
        const supabase = createClient();
        const now = new Date().toISOString();

        setNotifications((prev) =>
            prev.map((item) =>
                item.id === notificationId
                    ? { ...item, is_read: true, read_at: now }
                    : item
            )
        );

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: now })
            .eq('id', notificationId)
            .eq('recipient_id', userId);

        if (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);
        if (unreadIds.length === 0) return;

        const supabase = createClient();
        const now = new Date().toISOString();

        setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true, read_at: now })));

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: now })
            .in('id', unreadIds)
            .eq('recipient_id', userId);

        if (error) {
            console.error('Failed to mark all notifications as read', error);
        }
    };

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        setOpen(false);
        if (notification.link) {
            router.push(notification.link);
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => setOpen((prev) => !prev)}
                title="Notifications"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {open && (
                <div className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold">Notifications</p>
                            <p className="text-[11px] text-muted-foreground">Real-time updates across your workflow</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[11px]"
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                        >
                            Mark all read
                        </Button>
                    </div>

                    {!tableReady ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Notifications will appear once the latest database migration is applied.
                        </div>
                    ) : loading ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Loading notifications...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No notifications yet.
                        </div>
                    ) : (
                        <div className="max-h-[420px] overflow-y-auto">
                            {notifications.map((notification) => {
                                const Icon = getNotificationIcon(notification.type);
                                return (
                                    <button
                                        key={notification.id}
                                        className={cn(
                                            'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50',
                                            !notification.is_read && 'bg-primary/5'
                                        )}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className={cn(
                                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                                            notification.type.includes('rejected')
                                                ? 'bg-red-500/10 text-red-500'
                                                : notification.type.includes('verified') || notification.type.includes('approved')
                                                    ? 'bg-green-500/10 text-green-600'
                                                    : 'bg-primary/10 text-primary'
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="text-sm font-medium leading-5">{notification.title}</p>
                                                {!notification.is_read && (
                                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                {notification.message}
                                            </p>
                                            <p className="mt-2 text-[11px] text-muted-foreground">
                                                {formatRelativeTime(notification.created_at)}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
