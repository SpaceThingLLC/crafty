<script lang="ts">
	import { onMount } from 'svelte';
	import Home from '@lucide/svelte/icons/home';
	import LogOut from '@lucide/svelte/icons/log-out';
	import { getSupabase, isSupabaseConfigured } from '$lib/supabase';
	import { createDashboardState } from '$lib/dashboard-state.svelte';
	import { setDashboardStateContext } from '$lib/dashboard-context.svelte';

	let { children } = $props();

	const supabase = getSupabase();
	const dashboardState = supabase ? createDashboardState(supabase) : null;

	if (dashboardState) {
		setDashboardStateContext(dashboardState);
	}

	let authenticated = $state(false);
	let userEmail = $state<string | null>(null);

	onMount(() => {
		if (!supabase) return;

		// Check initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session?.user) {
				authenticated = true;
				userEmail = session.user.email ?? null;
			}
		});

		// Listen for auth changes
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			authenticated = !!session?.user;
			userEmail = session?.user?.email ?? null;
		});

		return () => subscription.unsubscribe();
	});

	async function handleSignOut() {
		if (!supabase) return;
		await supabase.auth.signOut();
		window.location.href = '/';
	}
</script>

<svelte:head>
	<title>Dashboard - PriceMyCraft</title>
</svelte:head>

{#if !isSupabaseConfigured()}
	<main class="container mx-auto p-4 max-w-4xl">
		<div class="card p-8 text-center">
			<h1 class="text-2xl font-bold mb-4">Dashboard Unavailable</h1>
			<p class="text-surface-600-400 mb-4">
				Cloud features are not configured. Please set up Supabase environment variables.
			</p>
			<a href="/" class="btn preset-filled-primary-500">Back to Home</a>
		</div>
	</main>
{:else}
	<!-- Dashboard Header -->
	<header class="border-b border-surface-200-800 bg-surface-50-950 sticky top-0 z-30">
		<div class="container mx-auto px-4 max-w-6xl">
			<div class="flex items-center justify-between h-14">
				<div class="flex items-center gap-4">
					<a href="/" class="flex items-center gap-2 text-surface-600-400 hover:text-surface-900-100">
						<Home size={18} />
					</a>
					<a href="/dashboard" class="text-lg font-bold">PriceMyCraft</a>
				</div>

				<div class="flex items-center gap-3">
					{#if authenticated && userEmail}
						<span class="text-sm text-surface-500 hidden sm:inline">{userEmail}</span>
					{/if}
					{#if authenticated}
						<button
							type="button"
							class="btn btn-sm preset-tonal-surface"
							onclick={handleSignOut}
						>
							<LogOut size={14} />
							<span class="hidden sm:inline">Sign Out</span>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- Dashboard Content -->
	<main class="container mx-auto p-4 max-w-6xl">
		{#if dashboardState}
			{@render children()}
		{:else}
			<div class="card p-8 text-center">
				<p class="text-surface-600-400">Failed to initialize dashboard.</p>
			</div>
		{/if}
	</main>
{/if}
