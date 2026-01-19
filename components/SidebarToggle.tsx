'use client';

import { useEffect } from 'react';

export default function SidebarToggle() {
  useEffect(() => {
    // Set sidebar to hidden by default on mobile
    const checkMobile = () => {
      const html = document.documentElement;
      if (window.innerWidth < 576) {
        // sm breakpoint
        if (!html.hasAttribute('data-sidebar-size')) {
          html.setAttribute('data-sidebar-size', 'hidden');
        }
      } else {
        // Desktop - remove hidden attribute
        html.removeAttribute('data-sidebar-size');
      }
    };

    // Initial check
    checkMobile();

    // Handle resize
    window.addEventListener('resize', checkMobile);

    // Handle toggle button click
    const handleToggle = (e: Event) => {
      e.preventDefault();
      const html = document.documentElement;
      if (html.classList.contains('sidebar-enable')) {
        html.classList.remove('sidebar-enable');
      } else {
        html.classList.add('sidebar-enable');
      }
    };

    const button = document.querySelector('.button-toggle-menu');
    if (button) {
      button.addEventListener('click', handleToggle);
    }

    // Close sidebar when clicking outside on mobile
    const handleClickOutside = (e: MouseEvent) => {
      const html = document.documentElement;
      const sidebar = document.querySelector('.app-sidebar');
      const target = e.target as HTMLElement;
      
      if (
        html.classList.contains('sidebar-enable') &&
        sidebar &&
        !sidebar.contains(target) &&
        !(target.closest('.button-toggle-menu')) &&
        window.innerWidth < 576
      ) {
        html.classList.remove('sidebar-enable');
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('resize', checkMobile);
      if (button) {
        button.removeEventListener('click', handleToggle);
      }
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return null;
}
