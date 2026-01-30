import { describe, it, expect } from 'vitest';
import {
	calculateMaterialCost,
	calculateMaterialsTotal,
	getLaborRatePerMinute,
	calculateLaborCost,
	calculateProjectTotal,
	formatCurrency,
	getCurrencySymbol,
	getLaborRateUnitLabel
} from '$lib/calculator';
import type { ProjectMaterial, LaborType, Settings } from '$lib/types';

// Test fixtures
const createProjectMaterial = (overrides: Partial<ProjectMaterial> = {}): ProjectMaterial => ({
	id: '00000000-0000-0000-0000-000000000010',
	materialId: '00000000-0000-0000-0000-000000000001',
	quantity: 1,
	materialName: 'Test Material',
	materialUnitCost: 10,
	materialUnit: 'each',
	...overrides
});

const createLaborType = (overrides: Partial<LaborType> = {}): LaborType => ({
	id: '00000000-0000-0000-0000-000000000020',
	name: 'Standard Labor',
	rate: 20,
	rateUnit: 'hour',
	sortOrder: 0,
	...overrides
});

const createSettings = (overrides: Partial<Settings> = {}): Settings => ({
	currencySymbol: '$',
	currencyCode: 'USD',
	defaultLaborTypeId: null,
	...overrides
});

describe('calculator', () => {
	describe('calculateMaterialCost', () => {
		it('should calculate cost using snapshot values', () => {
			const pm = createProjectMaterial({ materialUnitCost: 5.99, quantity: 3 });

			const result = calculateMaterialCost(pm);

			expect(result).toBeCloseTo(17.97, 2);
		});

		it('should handle fractional quantities', () => {
			const pm = createProjectMaterial({ materialUnitCost: 10, quantity: 2.5 });

			const result = calculateMaterialCost(pm);

			expect(result).toBe(25);
		});

		it('should handle quantity of 1', () => {
			const pm = createProjectMaterial({ materialUnitCost: 7.5, quantity: 1 });

			const result = calculateMaterialCost(pm);

			expect(result).toBe(7.5);
		});

		it('should handle zero unit cost', () => {
			const pm = createProjectMaterial({ materialUnitCost: 0, quantity: 5 });

			const result = calculateMaterialCost(pm);

			expect(result).toBe(0);
		});
	});

	describe('calculateMaterialsTotal', () => {
		it('should return 0 for empty array', () => {
			const result = calculateMaterialsTotal([]);

			expect(result).toBe(0);
		});

		it('should sum costs of all project materials', () => {
			const materials = [
				createProjectMaterial({ materialUnitCost: 10, quantity: 2 }), // 20
				createProjectMaterial({
					id: '00000000-0000-0000-0000-000000000011',
					materialUnitCost: 5,
					quantity: 3
				}) // 15
			];

			const result = calculateMaterialsTotal(materials);

			expect(result).toBe(35);
		});

		it('should handle single material', () => {
			const materials = [createProjectMaterial({ materialUnitCost: 8.5, quantity: 4 })];

			const result = calculateMaterialsTotal(materials);

			expect(result).toBe(34);
		});
	});

	describe('getLaborRatePerMinute', () => {
		it('should convert hourly rate to per-minute', () => {
			const result = getLaborRatePerMinute(60, 'hour');

			expect(result).toBe(1);
		});

		it('should convert 15min rate to per-minute', () => {
			const result = getLaborRatePerMinute(15, '15min');

			expect(result).toBe(1);
		});

		it('should return rate unchanged for minute unit', () => {
			const result = getLaborRatePerMinute(0.5, 'minute');

			expect(result).toBe(0.5);
		});

		it('should return 0 for fixed rate', () => {
			const result = getLaborRatePerMinute(100, 'fixed');

			expect(result).toBe(0);
		});

		it('should handle decimal hourly rates', () => {
			const result = getLaborRatePerMinute(30, 'hour');

			expect(result).toBe(0.5);
		});

		it('should handle decimal 15min rates', () => {
			const result = getLaborRatePerMinute(7.5, '15min');

			expect(result).toBe(0.5);
		});

		it('should handle zero rate', () => {
			expect(getLaborRatePerMinute(0, 'hour')).toBe(0);
			expect(getLaborRatePerMinute(0, '15min')).toBe(0);
			expect(getLaborRatePerMinute(0, 'minute')).toBe(0);
			expect(getLaborRatePerMinute(0, 'fixed')).toBe(0);
		});
	});

	describe('calculateLaborCost', () => {
		it('should calculate labor cost with hourly rate', () => {
			const laborType = createLaborType({ rate: 60, rateUnit: 'hour' });

			const result = calculateLaborCost(60, laborType); // 60 minutes at $1/min

			expect(result).toBe(60);
		});

		it('should calculate labor cost with 15min rate', () => {
			const laborType = createLaborType({ rate: 15, rateUnit: '15min' });

			const result = calculateLaborCost(30, laborType); // 30 minutes at $1/min

			expect(result).toBe(30);
		});

		it('should calculate labor cost with minute rate', () => {
			const laborType = createLaborType({ rate: 0.5, rateUnit: 'minute' });

			const result = calculateLaborCost(100, laborType);

			expect(result).toBe(50);
		});

		it('should return fixed rate regardless of minutes', () => {
			const laborType = createLaborType({ rate: 25, rateUnit: 'fixed' });

			expect(calculateLaborCost(0, laborType)).toBe(25);
			expect(calculateLaborCost(60, laborType)).toBe(25);
			expect(calculateLaborCost(120, laborType)).toBe(25);
		});

		it('should return 0 for null labor type', () => {
			const result = calculateLaborCost(120, null);

			expect(result).toBe(0);
		});

		it('should return 0 for 0 labor minutes with non-fixed rate', () => {
			const laborType = createLaborType({ rate: 100, rateUnit: 'hour' });

			const result = calculateLaborCost(0, laborType);

			expect(result).toBe(0);
		});

		it('should return 0 for 0 rate with non-fixed unit', () => {
			const laborType = createLaborType({ rate: 0, rateUnit: 'hour' });

			const result = calculateLaborCost(120, laborType);

			expect(result).toBe(0);
		});
	});

	describe('calculateProjectTotal', () => {
		it('should calculate total of materials and labor', () => {
			const materials = [createProjectMaterial({ materialUnitCost: 10, quantity: 3 })]; // 30
			const laborType = createLaborType({ rate: 30, rateUnit: 'hour' }); // $0.50/min

			const result = calculateProjectTotal(materials, 60, laborType);

			expect(result).toBe(60); // 30 materials + 30 labor
		});

		it('should return only materials cost when no labor type', () => {
			const materials = [createProjectMaterial({ materialUnitCost: 25, quantity: 2 })]; // 50

			const result = calculateProjectTotal(materials, 60, null);

			expect(result).toBe(50);
		});

		it('should return only labor cost when no materials', () => {
			const laborType = createLaborType({ rate: 60, rateUnit: 'hour' }); // $1/min

			const result = calculateProjectTotal([], 120, laborType);

			expect(result).toBe(120);
		});

		it('should return 0 for empty project', () => {
			const result = calculateProjectTotal([], 0, null);

			expect(result).toBe(0);
		});

		it('should handle fixed labor type', () => {
			const materials = [createProjectMaterial({ materialUnitCost: 10, quantity: 2 })]; // 20
			const laborType = createLaborType({ rate: 15, rateUnit: 'fixed' });

			const result = calculateProjectTotal(materials, 60, laborType);

			expect(result).toBe(35); // 20 materials + 15 fixed labor
		});
	});

	describe('formatCurrency', () => {
		it('should format USD correctly', () => {
			const settings = createSettings({ currencyCode: 'USD' });

			const result = formatCurrency(1234.56, settings);

			expect(result).toBe('$1,234.56');
		});

		it('should format EUR correctly', () => {
			const settings = createSettings({ currencyCode: 'EUR' });

			const result = formatCurrency(1234.56, settings);

			// EUR uses German locale formatting
			expect(result).toMatch(/1[.,]234[.,]56/);
			expect(result).toContain('€');
		});

		it('should format GBP correctly', () => {
			const settings = createSettings({ currencyCode: 'GBP' });

			const result = formatCurrency(1234.56, settings);

			expect(result).toContain('£');
		});

		it('should format JPY correctly', () => {
			const settings = createSettings({ currencyCode: 'JPY' });

			const result = formatCurrency(1234, settings);

			// JPY uses either ¥ (halfwidth) or ￥ (fullwidth) depending on locale/environment
			expect(result).toMatch(/[¥￥]/);
			expect(result).toContain('1,234');
		});

		it('should migrate from legacy symbol-only settings', () => {
			const settings = createSettings({
				currencySymbol: '$',
				currencyCode: undefined
			});

			const result = formatCurrency(100, settings);

			// Should still work by migrating $ to USD
			expect(result).toBe('$100.00');
		});

		it('should handle zero amount', () => {
			const settings = createSettings({ currencyCode: 'USD' });

			const result = formatCurrency(0, settings);

			expect(result).toBe('$0.00');
		});

		it('should handle negative amounts', () => {
			const settings = createSettings({ currencyCode: 'USD' });

			const result = formatCurrency(-50, settings);

			expect(result).toContain('50.00');
			expect(result).toMatch(/-/);
		});
	});

	describe('getCurrencySymbol', () => {
		it('should return $ for USD', () => {
			const settings = createSettings({ currencyCode: 'USD' });

			const result = getCurrencySymbol(settings);

			expect(result).toBe('$');
		});

		it('should return € for EUR', () => {
			const settings = createSettings({ currencyCode: 'EUR' });

			const result = getCurrencySymbol(settings);

			expect(result).toBe('€');
		});

		it('should return £ for GBP', () => {
			const settings = createSettings({ currencyCode: 'GBP' });

			const result = getCurrencySymbol(settings);

			expect(result).toBe('£');
		});

		it('should return default $ for missing currency code', () => {
			const settings = createSettings({ currencyCode: undefined });

			const result = getCurrencySymbol(settings);

			expect(result).toBe('$');
		});

		it('should return ₹ for INR', () => {
			const settings = createSettings({ currencyCode: 'INR' });

			const result = getCurrencySymbol(settings);

			expect(result).toBe('₹');
		});
	});

	describe('getLaborRateUnitLabel', () => {
		it('should return "Hour" for hour unit', () => {
			expect(getLaborRateUnitLabel('hour')).toBe('Hour');
		});

		it('should return "15 Minutes" for 15min unit', () => {
			expect(getLaborRateUnitLabel('15min')).toBe('15 Minutes');
		});

		it('should return "Minute" for minute unit', () => {
			expect(getLaborRateUnitLabel('minute')).toBe('Minute');
		});

		it('should return "Fixed" for fixed unit', () => {
			expect(getLaborRateUnitLabel('fixed')).toBe('Fixed');
		});
	});
});
