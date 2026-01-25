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
					passphrase_hash: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					passphrase_hash?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					passphrase_hash?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			settings: {
				Row: {
					workspace_id: string;
					currency_symbol: string;
					labor_rate: number;
					labor_rate_unit: 'hour' | 'minute' | '15min';
					labor_rate_prompt_dismissed: boolean;
					updated_at: string;
				};
				Insert: {
					workspace_id: string;
					currency_symbol?: string;
					labor_rate?: number;
					labor_rate_unit?: 'hour' | 'minute' | '15min';
					labor_rate_prompt_dismissed?: boolean;
					updated_at?: string;
				};
				Update: {
					workspace_id?: string;
					currency_symbol?: string;
					labor_rate?: number;
					labor_rate_unit?: 'hour' | 'minute' | '15min';
					labor_rate_prompt_dismissed?: boolean;
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
					name: string;
					labor_minutes: number;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					workspace_id: string;
					name: string;
					labor_minutes?: number;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					workspace_id?: string;
					name?: string;
					labor_minutes?: number;
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
		};
		Views: Record<string, never>;
		Functions: {
			create_workspace: {
				Args: { p_passphrase?: string | null };
				Returns: string;
			};
			verify_passphrase: {
				Args: { p_workspace_id: string; p_passphrase: string };
				Returns: boolean;
			};
		};
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
}

// Row types for convenience
export type WorkspaceRow = Database['public']['Tables']['workspaces']['Row'];
export type SettingsRow = Database['public']['Tables']['settings']['Row'];
export type MaterialRow = Database['public']['Tables']['materials']['Row'];
export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type ProjectMaterialRow = Database['public']['Tables']['project_materials']['Row'];
