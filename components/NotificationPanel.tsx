"use client";

import { useState } from "react";
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

const mockNotifications: Notification[] = [
  { id: "1", type: "message", title: "Nouveau message", description: "Marie Dupont a répondu à votre message", time: "2 min", read: false },
  { id: "2", type: "connection", title: "Nouvelle connexion", description: "Jean Martin a accepté votre invitation", time: "15 min", read: false },
  { id: "3", type: "reply", title: "Réponse reçue", description: "Pierre Durand est intéressé par votre offre", time: "1h", read: true },
  { id: "4", type: "alert", title: "Limite approchée", description: "Vous avez atteint 80% de vos connexions quotidiennes", time: "3h", read: true },
  { id: "5", type: "message", title: "Campagne terminée", description: "Votre campagne 'Q1 Prospecting' est terminée", time: "5h", read: true },
  { id: "6", type: "message", title: "Note", description: "Ceci est une notification pour tester le scroll bleu", time: "6h", read: true },
  { id: "7", type: "connection", title: "Archive", description: "Ancienne notification pour forcer le scroll", time: "1j", read: true },
];

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
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </Button>

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
                      <Check className="w-3 h-3 mr-1" /> Tout lire
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
                  <p>Aucune notification</p>
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
                  Tout effacer
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}