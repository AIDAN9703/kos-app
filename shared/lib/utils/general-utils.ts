import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { unstable_cache } from 'next/cache'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// UUID validation helper
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    revalidate?: number;
    tags?: string[];
  } = {}
): Promise<T> {
  return unstable_cache(
    fetchFn,
    [key],
    {
      revalidate: options.revalidate ?? 3600,
      tags: options.tags ?? [key]
    }
  )();
}

/**
 * Format a dollar/euro/pound amount (major units, not cents).
 *
 * Defaults to USD with whole-dollar precision for backward compatibility,
 * but accepts any ISO 4217 currency code. The currency typically comes from
 * `boat.currency` or `bookingPricing.currency` — pass it explicitly so the
 * UI matches the underlying record (e.g. "€1,200" vs "$1,200").
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  options: { showCents?: boolean } = {},
): string {
  const showCents = options.showCents ?? false;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);
}

/**
 * Convert 24-hour time format to 12-hour format for display
 * @param time24 Time in HH:mm format (e.g., "14:30")
 * @returns Time in 12-hour format (e.g., "2:30 PM")
 */
export function formatTime12Hour(time24: string): string {
  if (!time24) return "";

  const [hours24, minutes] = time24.split(':').map(Number);
  const isPM = hours24 >= 12;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;

  return `${hours12}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
}

/**
 * Debounce function to limit how often a function can be called
 * Includes a cancel method for cleanup
 * 
 * @param func The function to debounce
 * @param waitFor The time to wait in milliseconds
 * @returns A debounced version of the function with a cancel method
 */
export function debounce<Args extends unknown[]>(
  func: (...args: Args) => void,
  waitFor: number
): ((...args: Args) => void) & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Args): void => {
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return Object.assign(debounced, {
    cancel: () => {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
    },
  });
}

/**
 * Formats a phone number to E.164 format for Twilio
 * E.164 format: +[country code][phone number without leading 0]
 * Example: +12345678900
 * 
 * @param phoneNumber The phone number to format
 * @param defaultCountryCode The default country code to use if not provided (default: '1' for US)
 * @returns The formatted phone number in E.164 format
 */
export function formatPhoneNumberE164(phoneNumber: string, defaultCountryCode: string = '1'): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');

  // Check if the number already has a country code (starts with '+')
  if (phoneNumber.startsWith('+')) {
    return '+' + digits;
  }

  // Check if the number already has a country code without the '+'
  // US numbers are typically 10 digits, if longer, assume it includes country code
  if (digits.length > 10 && digits.startsWith('1')) {
    return '+' + digits;
  }

  // For US numbers, they should be exactly 10 digits without country code
  if (digits.length === 10) {
    return '+' + defaultCountryCode + digits;
  }

  // If the number is less than 10 digits or doesn't match expected formats,
  // just add the + and default country code as a best effort
  return '+' + defaultCountryCode + digits;
}

/**
 * Formats a phone number for UI display (not for Twilio/API).
 * US/Canada (+1) numbers render as +1 (724) 688-9698; other values are returned trimmed.
 */
export function formatPhoneNumberForDisplay(
  phoneNumber: string | null | undefined,
): string {
  if (!phoneNumber?.trim()) return "";

  const trimmed = phoneNumber.trim();
  const digits = trimmed.replace(/\D/g, "");

  const formatUsNational = (national: string) =>
    `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;

  if (digits.length === 10) {
    return formatUsNational(digits);
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 ${formatUsNational(digits.slice(1))}`;
  }

  return trimmed;
}

/**
 * Normalizes a phone value for tel: links (E.164 when possible).
 */
export function formatPhoneNumberTelHref(phoneNumber: string): string {
  return formatPhoneNumberE164(phoneNumber);
}

/**
 * Formats a date in a human-readable format
 * @param date The date to format
 * @returns A formatted date string
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Not available";

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a plain calendar-date string ("yyyy-MM-dd", e.g. a pg DATE column)
 * without constructing a timestamp — avoids the UTC-midnight timezone shift
 * that can render the previous day.
 */
export function formatPlainDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Not available";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats a date with time in a human-readable format
 * @param date The date to format
 * @returns A formatted date-time string (e.g. "Jan 15, 2025, 2:30 PM")
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "Not available";

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
