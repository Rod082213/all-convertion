// components/Header.tsx
"use client"; // Required for useState and Framer Motion components

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react'; // Icons for hamburger and close
import { motion, AnimatePresence } from 'framer-motion'; // For animations
import { cn } from '@/app/lib/utils'; // Assuming you have this utility

const navLinks = [
  { href: "/", label: "Image Convert" },
  { href: "/document-converter", label: "Doc Convert" },
  { href: "/remove-background", label: "BG Remove" },
  { href: "/humanizer", label: " AI Humanizer" },
  { href: "/transcribe", label: "Video Scribe" },
];

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const menuVariants = {
    hidden: { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeInOut" } },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut", staggerChildren: 0.05 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeInOut" } }
  };

  const linkVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" }  }
  };

  return (
    <header className="bg-slate-800/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
      <nav className="container mx-auto">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                MediaTools
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          {/* --- CHANGE 1: Switched from md:flex to lg:flex --- */}
          <div className="hidden lg:flex lg:items-center lg:space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-slate-300 hover:text-slate-100 hover:bg-slate-700/50 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          {/* --- CHANGE 2: Switched from md:hidden to lg:hidden --- */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={toggleMobileMenu}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown with Animation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          // --- CHANGE 3: Switched from md:hidden to lg:hidden ---
          <motion.div
            className="lg:hidden absolute top-16 left-0 right-0 bg-slate-800/95 backdrop-blur-sm shadow-lg pb-3 space-y-1 sm:px-3"
            id="mobile-menu"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={menuVariants}
          >
            {navLinks.map((link) => (
              <motion.div key={link.href} variants={linkVariants}>
                <Link
                  href={link.href}
                  className="text-slate-300 hover:text-slate-100 hover:bg-slate-700 block px-3 py-3 rounded-md text-base font-medium transition-colors duration-150"
                  onClick={() => setIsMobileMenuOpen(false)} // Close menu on link click
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;