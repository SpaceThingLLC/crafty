import type { Material, Project, ProjectMaterial, Settings, LaborRateUnit } from './types';

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

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currencySymbol: string): string {
	return `${currencySymbol}${amount.toFixed(2)}`;
}

/**
 * Get human-readable label for labor rate unit
 */
export function getLaborRateUnitLabel(unit: LaborRateUnit): string {
	switch (unit) {
		case 'hour':
			return 'hour';
		case '15min':
			return '15 minutes';
		case 'minute':
		default:
			return 'minute';
	}
}
