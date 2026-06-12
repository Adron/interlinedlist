/**
 * Shared catalog of InterlinedList client products.
 *
 * Used by the /products pages and the top-nav ProductsDropdown so the
 * product list, icons, and naming stay consistent in one place.
 * All products are pre-release ("Coming soon, in development.").
 */

export interface Product {
  /** URL slug under /products/ */
  slug: string;
  name: string;
  /** Boxicons class name (e.g. "bxl-apple") */
  icon: string;
  /** Grouping: native client apps vs. desktop synchronization tools */
  category: 'app' | 'sync';
  /** One-or-two-sentence summary for the products list page */
  summary: string;
  /** Paragraph-length description for the individual product page */
  description: string;
}

export const PRODUCTS: Product[] = [
  {
    slug: 'ios-app',
    name: 'iOS App',
    icon: 'bxl-apple',
    category: 'app',
    summary:
      'A native iPhone and iPad client for InterlinedList. Post, read your feed, and stay on top of notifications from your pocket.',
    description:
      'The InterlinedList iOS app is a native client for iPhone and iPad, built directly on the InterlinedList API. It is being designed to bring the core of the platform to mobile: writing and publishing posts, reading your feed, following people and organizations, and receiving push notifications when something needs your attention. You sign in with your existing InterlinedList account, so everything stays in sync with the web app. The iOS app is in active development and is not yet available for download.',
  },
  {
    slug: 'macos-app',
    name: 'MacOS App',
    icon: 'bx-desktop',
    category: 'app',
    summary:
      'A native Mac desktop client for InterlinedList, bringing the platform to your Mac as a first-class desktop app.',
    description:
      'The InterlinedList MacOS app is a native desktop client for the Mac. Rather than living in a browser tab, it is being built as a first-class desktop application on the InterlinedList API — for composing and publishing posts, browsing your feed, and working with your InterlinedList content from the desktop. You sign in with your existing account, and your content stays consistent with the web app and other clients. The MacOS app is in active development and is not yet available for download.',
  },
  {
    slug: 'macos-sync',
    name: 'MacOS Sync',
    icon: 'bxl-apple',
    category: 'sync',
    summary:
      'A desktop synchronization tool for macOS that keeps a local folder on your Mac in step with your InterlinedList content.',
    description:
      'MacOS Sync is a desktop synchronization tool for the Mac. It runs on your machine and keeps a local folder in sync with your InterlinedList content — changes you make locally are pushed up to the platform, and changes made on the platform are pulled back down, so you can work with your own files in your own editors while everything stays connected to your InterlinedList account. MacOS Sync is in active development and is not yet available for download.',
  },
  {
    slug: 'windows-sync',
    name: 'Windows Sync',
    icon: 'bxl-windows',
    category: 'sync',
    summary:
      'A desktop synchronization tool for Windows that keeps a local folder on your PC in step with your InterlinedList content.',
    description:
      'Windows Sync is a desktop synchronization tool for Windows. It runs on your PC and keeps a local folder in sync with your InterlinedList content — changes you make locally are pushed up to the platform, and changes made on the platform are pulled back down, so you can work with your own files in your own editors while everything stays connected to your InterlinedList account. Windows Sync is in active development and is not yet available for download.',
  },
  {
    slug: 'linux-sync',
    name: 'Linux Sync',
    icon: 'bxl-tux',
    category: 'sync',
    summary:
      'A desktop synchronization tool for Linux that keeps a local folder on your machine in step with your InterlinedList content.',
    description:
      'Linux Sync is a desktop synchronization tool for Linux. It runs on your machine and keeps a local folder in sync with your InterlinedList content — changes you make locally are pushed up to the platform, and changes made on the platform are pulled back down, so you can work with your own files in your own editors while everything stays connected to your InterlinedList account. Linux Sync is in active development and is not yet available for download.',
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
