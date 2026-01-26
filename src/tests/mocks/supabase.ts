import { vi } from 'vitest';

// Mock Supabase client with chainable methods
export function createMockSupabaseClient() {
	const mockResult = { data: null, error: null };

	const createChainable = () => ({
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		upsert: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		single: vi.fn().mockResolvedValue(mockResult),
		then: vi.fn((resolve) => resolve(mockResult))
	});

	return {
		from: vi.fn(() => createChainable()),
		rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
		_setResult: (data: unknown, error: unknown = null) => {
			mockResult.data = data as null;
			mockResult.error = error as null;
		}
	};
}

export const mockSupabase = createMockSupabaseClient();
