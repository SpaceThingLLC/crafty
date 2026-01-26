import type { Material, Project, ProjectMaterial, Settings, LaborRateUnit } from './types';
import { getCurrencyConfig, migrateCurrencySymbol } from './currencies';

/**
 * Calculate the cost of a single material usage in a project
 */
export function calculateMaterialCost(
	projectMaterial: ProjectMaterial,
	materials: Material[]
): number {
	const material = materials.find((m) => m.id === projectMaterial.materialId);
	if (!material) return 0;
	return material.unitCost * projectMaterial.quantity;
}

/**
 * Calculate the total materials cost for a project
 */
export function calculateMaterialsTotal(project: Project, materials: Material[]): number {
	return project.materials.reduce((total, pm) => total + calculateMaterialCost(pm, materials), 0);
}

/**
 * Convert labor rate to cost per minute based on rate unit
 */
export function getLaborRatePerMinute(rate: number, unit: LaborRateUnit): number {
	switch (unit) {
		case 'hour':
			return rate / 60;
		case '15min':
			return rate / 15;
		case 'minute':
		default:
			return rate;
	}
}

/**
 * Calculate labor cost for a project
 */
export function calculateLaborCost(laborMinutes: number, settings: Settings): number {
	const ratePerMinute = getLaborRatePerMinute(settings.laborRate, settings.laborRateUnit);
	return laborMinutes * ratePerMinute;
}

/**
 * Calculate the total cost (suggested price) for a project
 */
export function calculateProjectTotal(project: Project, materials: Material[], settings: Settings): number {
	const materialsCost = calculateMaterialsTotal(project, materials);
	const laborCost = calculateLaborCost(project.laborMinutes, settings);
	return materialsCost + laborCost;
}

// Cache formatters for performance
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currencyCode: string): Intl.NumberFormat {
	if (!formatterCache.has(currencyCode)) {
		const config = getCurrencyConfig(currencyCode);
		const locale = config?.locale || 'en-US';
		formatterCache.set(
			currencyCode,
			new Intl.NumberFormat(locale, {
				style: 'currency',
				currency: currencyCode,
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			})
		);
	}
	return formatterCache.get(currencyCode)!;
}

/**
 * Format a number as currency using Intl.NumberFormat
 * Handles locale-specific formatting (symbol position, separators)
 */
export function formatCurrency(amount: number, settings: Settings): string {
	const currencyCode = settings.currencyCode || migrateCurrencySymbol(settings.currencySymbol);
	return getFormatter(currencyCode).format(amount);
}

/**
 * Get just the currency symbol for display (e.g., in input prefixes)
 */
export function getCurrencySymbol(settings: Settings): string {
	const currencyCode = settings.currencyCode || 'USD';
	const config = getCurrencyConfig(currencyCode);
	return config?.symbol || '$';
}

/**
 * Get human-readable label for labor rate unit
 */
export function getLaborRateUnitLabel(unit: LaborRateUnit): string {
	switch (unit) {
		case 'hour':
			return 'Hour';
		case '15min':
			return '15 Minutes';
		case 'minute':
		default:
			return 'Minute';
	}
}
