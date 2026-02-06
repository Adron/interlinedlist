/**
 * Get ordinal suffix for a day number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  const lastDigit = day % 10;
  switch (lastDigit) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Format a date as absolute date/time (e.g., "Monday, February 5th, 2026 @ 10:02am")
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Format day of week
  const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Format month name
  const monthName = d.toLocaleDateString('en-US', { month: 'long' });
  
  // Get day number
  const day = d.getDate();
  
  // Add ordinal suffix to day
  const dayWithOrdinal = `${day}${getOrdinalSuffix(day)}`;
  
  // Format year
  const year = d.getFullYear();
  
  // Format time in 12-hour format with am/pm
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12; // Convert to 12-hour format (0 becomes 12)
  const displayMinutes = minutes.toString().padStart(2, '0'); // Ensure 2 digits
  
  // Combine: "Monday, February 5th, 2026 @ 10:02am"
  return `${dayOfWeek}, ${monthName} ${dayWithOrdinal}, ${year} @ ${displayHours}:${displayMinutes}${ampm}`;
}

/**
 * Format a date as datagrid date/time (e.g., "05/02/2026 19:15:30")
 * Format: DD/MM/YYYY HH:MM:SS (24-hour clock)
 */
export function formatDatagridDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Format day as 2 digits (01-31)
  const day = d.getDate().toString().padStart(2, '0');
  
  // Format month as 2 digits (01-12)
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  
  // Format year as 4 digits
  const year = d.getFullYear();
  
  // Format hours as 2 digits in 24-hour format (00-23)
  const hours = d.getHours().toString().padStart(2, '0');
  
  // Format minutes as 2 digits (00-59)
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  // Format seconds as 2 digits (00-59)
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  // Combine: "DD/MM/YYYY HH:MM:SS"
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

