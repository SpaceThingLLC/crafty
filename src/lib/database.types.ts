/**
 * Supabase database types
 * Generated from schema - update if schema changes
 */

export interface Database {
	public: {
		Tables: {
			workspaces: {
				Row: {
					id: string;
					owner_id: string;
					name: string;
					description: string | null;
					is_public: boolean;
					sort_order: number;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					owner_id: string;
					name: string;
					description?: string | null;
					is_public?: boolean;
					sort_order?: number;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					owner_id?: string;
					name?: string;
					description?: string | null;
					is_public?: boolean;
					sort_order?: number;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			labor_types: {
				Row: {
					id: string;
					workspace_id: string;
					name: string;
					rate: number;
					rate_unit: string;
					sort_order: number;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					workspace_id: string;
					name: string;
					rate: number;
					rate_unit?: string;
					sort_order?: number;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					workspace_id?: string;
					name?: string;
					rate?: number;
					rate_unit?: string;
					sort_order?: number;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			settings: {
				Row: {
					workspace_id: string;
					currency_symbol: string;
					currency_code: string;
					default_labor_type_id: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					workspace_id: string;
					currency_symbol?: string;
					currency_code?: string;
					default_labor_type_id?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					workspace_id?: string;
					currency_symbol?: string;
					currency_code?: string;
					default_labor_type_id?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			materials: {
				Row: {
					id: string;
					workspace_id: string;
					name: string;
					unit_cost: number;
					unit: string;
					cost: number | null;
					notes: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					workspace_id: string;
					name: string;
					unit_cost: number;
					unit: string;
					cost?: number | null;
					notes?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					workspace_id?: string;
					name?: string;
					unit_cost?: number;
					unit?: string;
					cost?: number | null;
					notes?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			projects: {
				Row: {
					id: string;
					workspace_id: string;
					owner_id: string;
					name: string;
					slug: string;
					description: string | null;
					labor_minutes: number;
					labor_type_id: string | null;
					is_public: boolean;
					sort_order: number;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					workspace_id: string;
					owner_id: string;
					name: string;
					slug: string;
					description?: string | null;
					labor_minutes?: number;
					labor_type_id?: string | null;
					is_public?: boolean;
					sort_order?: number;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					workspace_id?: string;
					owner_id?: string;
					name?: string;
					slug?: string;
					description?: string | null;
					labor_minutes?: number;
					labor_type_id?: string | null;
					is_public?: boolean;
					sort_order?: number;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			project_materials: {
				Row: {
					id: string;
					project_id: string;
					material_id: string | null;
					quantity: number;
					material_name: string;
					material_unit_cost: number;
					material_unit: string;
				};
				Insert: {
					id?: string;
					project_id: string;
					material_id?: string | null;
					quantity: number;
					material_name: string;
					material_unit_cost: number;
					material_unit: string;
				};
				Update: {
					id?: string;
					project_id?: string;
					material_id?: string | null;
					quantity?: number;
					material_name?: string;
					material_unit_cost?: number;
					material_unit?: string;
				};
				Relationships: [];
			};
			project_photos: {
				Row: {
					id: string;
					project_id: string;
					storage_path: string;
					alt_text: string | null;
					sort_order: number;
					created_at: string;
				};
				Insert: {
					id?: string;
					project_id: string;
					storage_path: string;
					alt_text?: string | null;
					sort_order?: number;
					created_at?: string;
				};
				Update: {
					id?: string;
					project_id?: string;
					storage_path?: string;
					alt_text?: string | null;
					sort_order?: number;
					created_at?: string;
				};
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
}

// Row types for convenience
export type WorkspaceRow = Database['public']['Tables']['workspaces']['Row'];
export type LaborTypeRow = Database['public']['Tables']['labor_types']['Row'];
export type SettingsRow = Database['public']['Tables']['settings']['Row'];
export type MaterialRow = Database['public']['Tables']['materials']['Row'];
export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type ProjectMaterialRow = Database['public']['Tables']['project_materials']['Row'];
export type ProjectPhotoRow = Database['public']['Tables']['project_photos']['Row'];
