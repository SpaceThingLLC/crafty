/**
 * Currency configuration for locale-aware formatting
 */

export interface CurrencyConfig {
	code: string; // ISO 4217 code (USD, CAD, etc.)
	symbol: string; // Display symbol ($, €, £)
	name: string; // Human-readable name
	locale: string; // Locale for Intl.NumberFormat
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
	{ code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
	{ code: 'CAD', symbol: '$', name: 'Canadian Dollar', locale: 'en-CA' },
	{ code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
	{ code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
	{ code: 'AUD', symbol: '$', name: 'Australian Dollar', locale: 'en-AU' },
	{ code: 'MXN', symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
	{ code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
	{ code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
	{ code: 'NZD', symbol: '$', name: 'New Zealand Dollar', locale: 'en-NZ' },
	{ code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' }
];

export const DEFAULT_CURRENCY_CODE = 'USD';

export function getCurrencyConfig(code: string): CurrencyConfig | undefined {
	return SUPPORTED_CURRENCIES.find((c) => c.code === code);
}

/**
 * For backwards compatibility - convert old symbol to new code
 * Best-effort mapping when migrating from symbol-only storage
 */
export function migrateCurrencySymbol(symbol: string): string {
	// Common symbol mappings
	const symbolMap: Record<string, string> = {
		$: 'USD', // Default $ to USD
		'€': 'EUR',
		'£': 'GBP',
		'¥': 'JPY',
		'₹': 'INR',
		CHF: 'CHF'
	};

	return symbolMap[symbol] || 'USD';
}
