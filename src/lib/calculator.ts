import type { ProjectMaterial, LaborType, LaborRateUnit, Settings } from './types';
import { getCurrencyConfig, migrateCurrencySymbol } from './currencies';

/**
 * Calculate the cost of a single project material using its snapshot values
 */
export function calculateMaterialCost(projectMaterial: ProjectMaterial): number {
	return projectMaterial.materialUnitCost * projectMaterial.quantity;
}

/**
 * Calculate the total materials cost for a set of project materials
 */
export function calculateMaterialsTotal(projectMaterials: ProjectMaterial[]): number {
	return projectMaterials.reduce((total, pm) => total + calculateMaterialCost(pm), 0);
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
			return rate;
		case 'fixed':
			return 0; // Fixed rate is not per-minute
	}
}

/**
 * Calculate labor cost for a project
 */
export function calculateLaborCost(laborMinutes: number, laborType: LaborType | null): number {
	if (!laborType) return 0;
	if (laborType.rateUnit === 'fixed') return laborType.rate;
	const ratePerMinute = getLaborRatePerMinute(laborType.rate, laborType.rateUnit);
	return laborMinutes * ratePerMinute;
}

/**
 * Calculate the total cost (suggested price) for a project
 */
export function calculateProjectTotal(
	projectMaterials: ProjectMaterial[],
	laborMinutes: number,
	laborType: LaborType | null
): number {
	const materialsCost = calculateMaterialsTotal(projectMaterials);
	const laborCost = calculateLaborCost(laborMinutes, laborType);
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
			return 'Minute';
		case 'fixed':
			return 'Fixed';
	}
}
