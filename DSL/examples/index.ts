/**
 * DSL Examples
 * 
 * Export all DSL example schemas for easy importing
 * 
 * Note: Examples are JavaScript files, so they need to be imported differently
 * in TypeScript. Use dynamic imports or require() for these.
 */

// Type definitions for examples
export interface DSLExample {
  name: string;
  description?: string;
  fields: any[];
}

/**
 * Get example schema by name
 * 
 * Available examples:
 * - customer-list
 * - product-inventory
 * - event-registration
 * - task-tracker
 * - employee-directory
 */
export async function getExample(name: string): Promise<any> {
  const examples: Record<string, () => Promise<any>> = {
    "customer-list": () => import("./customer-list.js").then((m) => m.default || m),
    "product-inventory": () => import("./product-inventory.js").then((m) => m.default || m),
    "event-registration": () => import("./event-registration.js").then((m) => m.default || m),
    "task-tracker": () => import("./task-tracker.js").then((m) => m.default || m),
    "employee-directory": () => import("./employee-directory.js").then((m) => m.default || m),
  };

  const loader = examples[name];
  if (!loader) {
    throw new Error(`Example '${name}' not found. Available: ${Object.keys(examples).join(", ")}`);
  }

  return loader();
}

/**
 * List all available example names
 */
export function getAvailableExamples(): string[] {
  return [
    "customer-list",
    "product-inventory",
    "event-registration",
    "task-tracker",
    "employee-directory",
  ];
}
