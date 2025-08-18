"use client";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();
  
  return (
    <nav className="flex space-x-1">
      <a 
        href="/" 
        className={`px-4 py-2 text-sm font-medium transition-colors duration-200 relative ${
          pathname === "/" 
            ? "text-gray-900 dark:text-white" 
            : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        Daily Overview
        {pathname === "/" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white"></div>
        )}
      </a>
      <a 
        href="/goals" 
        className={`px-4 py-2 text-sm font-medium transition-colors duration-200 relative ${
          pathname === "/goals" 
            ? "text-gray-900 dark:text-white" 
            : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        Goals
        {pathname === "/goals" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white"></div>
        )}
      </a>
    </nav>
  );
}
