import { loadState, saveState } from './storage';
import type { AppState, Material, Project, ProjectMaterial, LaborType, Settings } from './types';
import { DEFAULT_SETTINGS, DEFAULT_STATE } from './types';

function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Create the local-only application state store using Svelte 5 runes.
 * This manages state entirely in localStorage with no cloud sync.
 * Used when the user has not signed in.
 */
function createLocalState() {
	let state = $state<AppState>(loadState());

	function persist() {
		saveState(state);
	}

	return {
		// State getters
		get settings() {
			return state.settings;
		},
		get materials() {
			return state.materials;
		},
		get laborTypes() {
			return state.laborTypes;
		},
		get projects() {
			return state.projects;
		},
		get projectMaterials() {
			return state.projectMaterials;
		},
		get lastSelectedProjectId() {
			return state.lastSelectedProjectId;
		},
		get state() {
			return state;
		},

		// Settings
		updateSettings(updates: Partial<Settings>) {
			state.settings = { ...state.settings, ...updates };
			persist();
		},

		// Materials
		addMaterial(material: Omit<Material, 'id'>) {
			const newMaterial: Material = { ...material, id: generateId() };
			state.materials = [...state.materials, newMaterial];
			persist();
			return newMaterial;
		},

		updateMaterial(id: string, updates: Partial<Omit<Material, 'id'>>) {
			state.materials = state.materials.map((m) => (m.id === id ? { ...m, ...updates } : m));
			persist();
		},

		deleteMaterial(id: string) {
			state.materials = state.materials.filter((m) => m.id !== id);
			// Also remove project materials referencing this material
			state.projectMaterials = state.projectMaterials.filter((pm) => pm.materialId !== id);
			persist();
		},

		getMaterial(id: string): Material | undefined {
			return state.materials.find((m) => m.id === id);
		},

		// Labor types
		addLaborType(laborType: Omit<LaborType, 'id'>) {
			const newLaborType: LaborType = { ...laborType, id: generateId() };
			state.laborTypes = [...state.laborTypes, newLaborType];
			persist();
			return newLaborType;
		},

		updateLaborType(id: string, updates: Partial<Omit<LaborType, 'id'>>) {
			state.laborTypes = state.laborTypes.map((lt) =>
				lt.id === id ? { ...lt, ...updates } : lt
			);
			persist();
		},

		deleteLaborType(id: string) {
			state.laborTypes = state.laborTypes.filter((lt) => lt.id !== id);
			// Clear laborTypeId references in projects
			state.projects = state.projects.map((p) =>
				p.laborTypeId === id ? { ...p, laborTypeId: null } : p
			);
			// Clear default labor type in settings
			if (state.settings.defaultLaborTypeId === id) {
				state.settings = { ...state.settings, defaultLaborTypeId: null };
			}
			persist();
		},

		getLaborType(id: string): LaborType | undefined {
			return state.laborTypes.find((lt) => lt.id === id);
		},

		// Projects
		addProject(project: Omit<Project, 'id'>) {
			const newProject: Project = { ...project, id: generateId() };
			state.projects = [...state.projects, newProject];
			persist();
			return newProject;
		},

		updateProject(id: string, updates: Partial<Omit<Project, 'id'>>) {
			state.projects = state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
			persist();
		},

		deleteProject(id: string) {
			state.projects = state.projects.filter((p) => p.id !== id);
			// Also remove project materials for this project
			state.projectMaterials = state.projectMaterials.filter((pm) => pm.projectId !== id);
			persist();
		},

		getProject(id: string): Project | undefined {
			return state.projects.find((p) => p.id === id);
		},

		// Project materials
		addProjectMaterial(pm: Omit<ProjectMaterial, 'id'>) {
			const newPm: ProjectMaterial = { ...pm, id: generateId() };
			state.projectMaterials = [...state.projectMaterials, newPm];
			persist();
			return newPm;
		},

		updateProjectMaterial(id: string, updates: Partial<Omit<ProjectMaterial, 'id'>>) {
			state.projectMaterials = state.projectMaterials.map((pm) =>
				pm.id === id ? { ...pm, ...updates } : pm
			);
			persist();
		},

		deleteProjectMaterial(id: string) {
			state.projectMaterials = state.projectMaterials.filter((pm) => pm.id !== id);
			persist();
		},

		getProjectMaterials(projectId: string): ProjectMaterial[] {
			return state.projectMaterials.filter((pm) => pm.projectId === projectId);
		},

		// Import/Export
		importState(newState: AppState) {
			state.settings = newState.settings;
			state.materials = newState.materials;
			state.laborTypes = newState.laborTypes;
			state.projects = newState.projects;
			state.projectMaterials = newState.projectMaterials;
			state.lastSelectedProjectId = newState.lastSelectedProjectId;
			persist();
		},

		setLastSelectedProjectId(id: string | null) {
			state.lastSelectedProjectId = id;
			persist();
		},

		resetState() {
			state.settings = DEFAULT_SETTINGS;
			state.materials = [];
			state.laborTypes = [];
			state.projects = [];
			state.projectMaterials = [];
			state.lastSelectedProjectId = null;
			persist();
		}
	};
}

export const localState = createLocalState();
