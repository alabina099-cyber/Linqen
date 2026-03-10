"use client";

import NotificationPanel from "./NotificationPanel";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4 mt-14 lg:mt-0">
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-2 lg:gap-4">
          <NotificationPanel />

          {/* User Info - Simplified on mobile */}
          <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-gray-200">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">Dorra Boucharbia</p>
              <p className="text-xs text-gray-500 hidden md:block">dorraboucharbia@gmail.com</p>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs lg:text-sm">
              DB
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
