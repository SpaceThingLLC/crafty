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
import type { Material, Project, ProjectMaterial, Settings } from '$lib/types';

// Test fixtures
const createMaterial = (overrides: Partial<Material> = {}): Material => ({
	id: '00000000-0000-0000-0000-000000000001',
	name: 'Test Material',
	unitCost: 10,
	unit: 'each',
	...overrides
});

const createProjectMaterial = (overrides: Partial<ProjectMaterial> = {}): ProjectMaterial => ({
	materialId: '00000000-0000-0000-0000-000000000001',
	quantity: 1,
	...overrides
});

const createProject = (overrides: Partial<Project> = {}): Project => ({
	id: '00000000-0000-0000-0000-000000000002',
	name: 'Test Project',
	materials: [],
	laborMinutes: 0,
	createdAt: Date.now(),
	updatedAt: Date.now(),
	...overrides
});

const createSettings = (overrides: Partial<Settings> = {}): Settings => ({
	currencySymbol: '$',
	currencyCode: 'USD',
	laborRate: 20,
	laborRateUnit: 'hour',
	...overrides
});

describe('calculator', () => {
	describe('calculateMaterialCost', () => {
		it('should calculate cost for a single material', () => {
			const materials = [createMaterial({ unitCost: 5.99 })];
			const pm = createProjectMaterial({ quantity: 3 });

			const result = calculateMaterialCost(pm, materials);

			expect(result).toBeCloseTo(17.97, 2);
		});

		it('should return 0 for non-existent material', () => {
			const pm = createProjectMaterial({ materialId: 'non-existent' });

			const result = calculateMaterialCost(pm, []);

			expect(result).toBe(0);
		});

		it('should handle fractional quantities', () => {
			const materials = [createMaterial({ unitCost: 10 })];
			const pm = createProjectMaterial({ quantity: 2.5 });

			const result = calculateMaterialCost(pm, materials);

			expect(result).toBe(25);
		});

		it('should handle quantity of 1', () => {
			const materials = [createMaterial({ unitCost: 7.5 })];
			const pm = createProjectMaterial({ quantity: 1 });

			const result = calculateMaterialCost(pm, materials);

			expect(result).toBe(7.5);
		});

		it('should find material in array of multiple materials', () => {
			const targetId = '00000000-0000-0000-0000-000000000003';
			const materials = [
				createMaterial({ id: '00000000-0000-0000-0000-000000000001', unitCost: 5 }),
				createMaterial({ id: '00000000-0000-0000-0000-000000000002', unitCost: 10 }),
				createMaterial({ id: targetId, unitCost: 15 })
			];
			const pm = createProjectMaterial({ materialId: targetId, quantity: 2 });

			const result = calculateMaterialCost(pm, materials);

			expect(result).toBe(30);
		});
	});

	describe('calculateMaterialsTotal', () => {
		it('should return 0 for project with no materials', () => {
			const project = createProject({ materials: [] });

			const result = calculateMaterialsTotal(project, []);

			expect(result).toBe(0);
		});

		it('should sum costs of all materials in project', () => {
			const materials = [
				createMaterial({ id: '00000000-0000-0000-0000-000000000001', unitCost: 10 }),
				createMaterial({ id: '00000000-0000-0000-0000-000000000002', unitCost: 5 })
			];
			const project = createProject({
				materials: [
					{ materialId: '00000000-0000-0000-0000-000000000001', quantity: 2 }, // 20
					{ materialId: '00000000-0000-0000-0000-000000000002', quantity: 3 } // 15
				]
			});

			const result = calculateMaterialsTotal(project, materials);

			expect(result).toBe(35);
		});

		it('should handle single material in project', () => {
			const materials = [createMaterial({ unitCost: 8.5 })];
			const project = createProject({
				materials: [createProjectMaterial({ quantity: 4 })]
			});

			const result = calculateMaterialsTotal(project, materials);

			expect(result).toBe(34);
		});

		it('should skip missing materials gracefully', () => {
			const materials = [createMaterial({ unitCost: 10 })];
			const project = createProject({
				materials: [
					createProjectMaterial({ quantity: 2 }), // 20 (found)
					{ materialId: 'missing', quantity: 5 } // 0 (not found)
				]
			});

			const result = calculateMaterialsTotal(project, materials);

			expect(result).toBe(20);
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
		});
	});

	describe('calculateLaborCost', () => {
		it('should calculate labor cost with hourly rate', () => {
			const settings = createSettings({ laborRate: 60, laborRateUnit: 'hour' });

			const result = calculateLaborCost(60, settings); // 60 minutes at $1/min

			expect(result).toBe(60);
		});

		it('should calculate labor cost with 15min rate', () => {
			const settings = createSettings({ laborRate: 15, laborRateUnit: '15min' });

			const result = calculateLaborCost(30, settings); // 30 minutes at $1/min

			expect(result).toBe(30);
		});

		it('should calculate labor cost with minute rate', () => {
			const settings = createSettings({ laborRate: 0.5, laborRateUnit: 'minute' });

			const result = calculateLaborCost(100, settings);

			expect(result).toBe(50);
		});

		it('should return 0 for 0 labor minutes', () => {
			const settings = createSettings({ laborRate: 100, laborRateUnit: 'hour' });

			const result = calculateLaborCost(0, settings);

			expect(result).toBe(0);
		});

		it('should return 0 for 0 labor rate', () => {
			const settings = createSettings({ laborRate: 0, laborRateUnit: 'hour' });

			const result = calculateLaborCost(120, settings);

			expect(result).toBe(0);
		});
	});

	describe('calculateProjectTotal', () => {
		it('should calculate total of materials and labor', () => {
			const materials = [createMaterial({ unitCost: 10 })];
			const project = createProject({
				materials: [createProjectMaterial({ quantity: 3 })], // 30 materials
				laborMinutes: 60
			});
			const settings = createSettings({ laborRate: 30, laborRateUnit: 'hour' }); // $0.50/min

			const result = calculateProjectTotal(project, materials, settings);

			expect(result).toBe(60); // 30 materials + 30 labor
		});

		it('should return only materials cost when no labor', () => {
			const materials = [createMaterial({ unitCost: 25 })];
			const project = createProject({
				materials: [createProjectMaterial({ quantity: 2 })],
				laborMinutes: 0
			});
			const settings = createSettings({ laborRate: 50, laborRateUnit: 'hour' });

			const result = calculateProjectTotal(project, materials, settings);

			expect(result).toBe(50);
		});

		it('should return only labor cost when no materials', () => {
			const project = createProject({
				materials: [],
				laborMinutes: 120
			});
			const settings = createSettings({ laborRate: 60, laborRateUnit: 'hour' }); // $1/min

			const result = calculateProjectTotal(project, [], settings);

			expect(result).toBe(120);
		});

		it('should return 0 for empty project', () => {
			const project = createProject({
				materials: [],
				laborMinutes: 0
			});
			const settings = createSettings({ laborRate: 0, laborRateUnit: 'hour' });

			const result = calculateProjectTotal(project, [], settings);

			expect(result).toBe(0);
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
	});
});
