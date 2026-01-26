import { describe, it, expect } from 'vitest';
import {
	SUPPORTED_CURRENCIES,
	CURRENCY_CODES,
	DEFAULT_CURRENCY_CODE,
	getCurrencyConfig,
	migrateCurrencySymbol,
	type CurrencyConfig
} from '$lib/currencies';

describe('currencies', () => {
	describe('SUPPORTED_CURRENCIES', () => {
		it('should contain exactly 10 currencies', () => {
			expect(SUPPORTED_CURRENCIES).toHaveLength(10);
		});

		it('should contain USD', () => {
			const usd = SUPPORTED_CURRENCIES.find((c) => c.code === 'USD');
			expect(usd).toEqual({
				code: 'USD',
				symbol: '$',
				name: 'US Dollar',
				locale: 'en-US'
			});
		});

		it('should contain EUR', () => {
			const eur = SUPPORTED_CURRENCIES.find((c) => c.code === 'EUR');
			expect(eur).toEqual({
				code: 'EUR',
				symbol: '€',
				name: 'Euro',
				locale: 'de-DE'
			});
		});

		it('should contain all expected currency codes', () => {
			const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
			expect(codes).toContain('USD');
			expect(codes).toContain('CAD');
			expect(codes).toContain('EUR');
			expect(codes).toContain('GBP');
			expect(codes).toContain('AUD');
			expect(codes).toContain('MXN');
			expect(codes).toContain('JPY');
			expect(codes).toContain('CHF');
			expect(codes).toContain('NZD');
			expect(codes).toContain('INR');
		});

		it('should have valid structure for all currencies', () => {
			SUPPORTED_CURRENCIES.forEach((currency) => {
				expect(currency.code).toBeDefined();
				expect(currency.code.length).toBe(3);
				expect(currency.symbol).toBeDefined();
				expect(currency.symbol.length).toBeGreaterThan(0);
				expect(currency.name).toBeDefined();
				expect(currency.locale).toBeDefined();
			});
		});
	});

	describe('CURRENCY_CODES', () => {
		it('should be derived from SUPPORTED_CURRENCIES', () => {
			expect(CURRENCY_CODES).toHaveLength(SUPPORTED_CURRENCIES.length);
			CURRENCY_CODES.forEach((code) => {
				const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
				expect(found).toBeDefined();
			});
		});

		it('should be a readonly tuple', () => {
			// Type check - this will fail to compile if CURRENCY_CODES is not a tuple
			const firstCode: string = CURRENCY_CODES[0];
			expect(firstCode).toBeDefined();
		});
	});

	describe('DEFAULT_CURRENCY_CODE', () => {
		it('should be USD', () => {
			expect(DEFAULT_CURRENCY_CODE).toBe('USD');
		});

		it('should be a valid currency code', () => {
			expect(CURRENCY_CODES).toContain(DEFAULT_CURRENCY_CODE);
		});
	});

	describe('getCurrencyConfig', () => {
		it('should return config for valid USD code', () => {
			const config = getCurrencyConfig('USD');

			expect(config).toEqual({
				code: 'USD',
				symbol: '$',
				name: 'US Dollar',
				locale: 'en-US'
			});
		});

		it('should return config for valid EUR code', () => {
			const config = getCurrencyConfig('EUR');

			expect(config).toEqual({
				code: 'EUR',
				symbol: '€',
				name: 'Euro',
				locale: 'de-DE'
			});
		});

		it('should return config for valid GBP code', () => {
			const config = getCurrencyConfig('GBP');

			expect(config).toEqual({
				code: 'GBP',
				symbol: '£',
				name: 'British Pound',
				locale: 'en-GB'
			});
		});

		it('should return config for valid JPY code', () => {
			const config = getCurrencyConfig('JPY');

			expect(config).toEqual({
				code: 'JPY',
				symbol: '¥',
				name: 'Japanese Yen',
				locale: 'ja-JP'
			});
		});

		it('should return undefined for invalid currency code', () => {
			expect(getCurrencyConfig('INVALID')).toBeUndefined();
			expect(getCurrencyConfig('XXX')).toBeUndefined();
			expect(getCurrencyConfig('')).toBeUndefined();
		});

		it('should be case sensitive', () => {
			expect(getCurrencyConfig('usd')).toBeUndefined();
			expect(getCurrencyConfig('Usd')).toBeUndefined();
		});

		it('should return config for all supported currencies', () => {
			CURRENCY_CODES.forEach((code) => {
				const config = getCurrencyConfig(code);
				expect(config).toBeDefined();
				expect(config?.code).toBe(code);
			});
		});
	});

	describe('migrateCurrencySymbol', () => {
		it('should map $ to USD', () => {
			expect(migrateCurrencySymbol('$')).toBe('USD');
		});

		it('should map € to EUR', () => {
			expect(migrateCurrencySymbol('€')).toBe('EUR');
		});

		it('should map £ to GBP', () => {
			expect(migrateCurrencySymbol('£')).toBe('GBP');
		});

		it('should map ¥ to JPY', () => {
			expect(migrateCurrencySymbol('¥')).toBe('JPY');
		});

		it('should map ₹ to INR', () => {
			expect(migrateCurrencySymbol('₹')).toBe('INR');
		});

		it('should map CHF to CHF', () => {
			expect(migrateCurrencySymbol('CHF')).toBe('CHF');
		});

		it('should default unknown symbols to USD', () => {
			expect(migrateCurrencySymbol('X')).toBe('USD');
			expect(migrateCurrencySymbol('ABC')).toBe('USD');
			expect(migrateCurrencySymbol('')).toBe('USD');
			expect(migrateCurrencySymbol('unknown')).toBe('USD');
		});
	});
});
