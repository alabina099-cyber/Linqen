"use client";

import { Search, User, Menu } from "lucide-react";
import { Button } from "./ui/button";
import NotificationPanel from "./NotificationPanel";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4 mt-14 lg:mt-0">
      <div className="flex items-center justify-between gap-4">
        {/* Search - Hidden on mobile, visible on lg */}
        <div className="hidden lg:block flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher des prospects..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Mobile Search - Compact */}
        <div className="lg:hidden flex-1 max-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

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
