import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// Mock localStorage with a clean store that resets between tests
const createLocalStorageMock = () => {
	let store: Record<string, string> = {};

	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
		// Test helper to access the store directly
		_getStore: () => store,
		_setStore: (newStore: Record<string, string>) => {
			store = newStore;
		}
	};
};

const localStorageMock = createLocalStorageMock();

Object.defineProperty(globalThis, 'localStorage', {
	value: localStorageMock,
	writable: true
});

// Mock crypto.randomUUID for generating IDs in tests
let uuidCounter = 0;
Object.defineProperty(globalThis, 'crypto', {
	value: {
		randomUUID: vi.fn(
			() => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}`
		),
		getRandomValues: (arr: Uint8Array) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			return arr;
		}
	},
	writable: true
});

// Mock window.location
Object.defineProperty(globalThis, 'location', {
	value: {
		href: 'http://localhost:5173',
		origin: 'http://localhost:5173',
		pathname: '/',
		search: '',
		hash: ''
	},
	writable: true
});

// Reset mocks and state between tests
beforeEach(() => {
	localStorageMock.clear();
	vi.clearAllMocks();
	uuidCounter = 0;
});

// Export for use in tests that need direct access
export { localStorageMock };
