"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Trash2, MessageCircle, UserPlus, Star, AlertCircle, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface Notification {
  id: string;
  type: "message" | "connection" | "reply" | "alert";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const iconMap = {
  message: MessageCircle,
  connection: UserPlus,
  reply: Star,
  alert: AlertCircle,
};

const colorMap = {
  message: "bg-blue-100 text-blue-600",
  connection: "bg-green-100 text-green-600",
  reply: "bg-purple-100 text-purple-600",
  alert: "bg-orange-100 text-orange-600",
};

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real notifications from API
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/notifications');
        const data = await response.json();
        if (data.success && data.notifications) {
          // Map database notifications to component format
          const mappedNotifications = data.notifications.map((n: any) => ({
            id: String(n.id),
            type: n.type as Notification['type'],
            title: n.title,
            description: n.message,
            time: formatTimeAgo(n.created_at),
            read: n.read
          }));
          setNotifications(mappedNotifications);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Auto-refresh every 30s when panel is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/notifications');
        const data = await response.json();
        if (data.success && data.notifications) {
          setNotifications(data.notifications.map((n: any) => ({
            id: String(n.id),
            type: n.type as Notification['type'],
            title: n.title,
            description: n.message,
            time: formatTimeAgo(n.created_at),
            read: n.read
          })));
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}j`;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH' });
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(id), read: true })
      });
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const clearAll = async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' });
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50/60 transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
          
          <Card className="absolute right-0 top-12 w-96 z-50 shadow-2xl border border-gray-200 bg-white overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-blue-600 hover:bg-blue-50">
                      <Check className="w-3 h-3 mr-1" /> Mark all read
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="w-7 h-7">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Zone de Scroll avec Scrollbar BLEUE */}
            <div className="max-h-80 overflow-y-auto bg-white 
              scrollbar-thin 
              scrollbar-thumb-blue-500 
              scrollbar-track-blue-50/50
              [&::-webkit-scrollbar]:w-1.5
              [&::-webkit-scrollbar-track]:bg-blue-50/50
              [&::-webkit-scrollbar-thumb]:bg-blue-500
              [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-blue-600">
              
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = iconMap[notification.type];
                  return (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`p-4 border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition-colors ${
                        !notification.read ? "bg-blue-50/40" : "bg-white"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorMap[notification.type]}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <span className="text-[10px] text-gray-400 shrink-0 uppercase font-semibold">
                              {notification.time}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {notification.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2 border-t border-gray-100 bg-gray-50/50 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 text-xs transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Clear all
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}