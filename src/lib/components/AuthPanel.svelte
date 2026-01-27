<script lang="ts">
	import Mail from '@lucide/svelte/icons/mail';
	import LogOut from '@lucide/svelte/icons/log-out';
	import { authState } from '$lib/auth.svelte';

	interface Props {
		/**
		 * Optional message shown above the magic link form when not authenticated
		 */
		message?: string;
	}

	let { message }: Props = $props();

	let email = $state('');
	let isSending = $state(false);

	async function handleSendMagicLink() {
		if (!email.trim()) return;

		isSending = true;
		const result = await authState.sendMagicLink(email.trim());
		isSending = false;

		if (!result.success) {
			// Error is already set in authState
		}
	}

	function handleTryAgain() {
		authState.resetMagicLinkSent();
		email = '';
	}
</script>

{#if authState.loading}
	<div class="flex items-center justify-center p-4">
		<span class="text-surface-500 text-sm">Loading...</span>
	</div>
{:else if authState.isAuthenticated}
	<div class="flex items-center justify-between gap-3">
		<div class="text-sm">
			<span class="text-surface-600-400">Signed in as</span>
			<span class="font-medium">{authState.email}</span>
		</div>
		<button
			type="button"
			class="btn btn-sm preset-tonal-surface"
			onclick={() => authState.signOut()}
		>
			<LogOut size={14} />
			<span>Sign Out</span>
		</button>
	</div>
{:else if authState.magicLinkSent}
	<div class="space-y-3 text-center">
		<Mail size={32} class="mx-auto text-primary-500" />
		<p class="font-medium">Check your email</p>
		<p class="text-sm text-surface-600-400">
			We sent a magic link to <strong>{email}</strong>. Click the link in your email to sign in.
		</p>
		<p class="text-xs text-surface-500">
			Make sure to open the link on this device/browser.
		</p>
		<button
			type="button"
			class="btn btn-sm preset-tonal-surface"
			onclick={handleTryAgain}
		>
			Use a different email
		</button>
	</div>
{:else}
	<div class="space-y-3">
		{#if message}
			<p class="text-sm text-surface-600-400">{message}</p>
		{/if}

		{#if authState.error}
			<div class="text-sm text-error-500">{authState.error}</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleSendMagicLink(); }} class="space-y-3">
			<label class="label">
				<span class="label-text">Email</span>
				<input
					type="email"
					class="input"
					bind:value={email}
					placeholder="you@example.com"
					disabled={isSending}
					required
				/>
			</label>

			<button
				type="submit"
				class="btn preset-filled-primary-500 w-full"
				disabled={isSending || !email.trim()}
			>
				{#if isSending}
					Sending...
				{:else}
					<Mail size={16} />
					<span>Send Magic Link</span>
				{/if}
			</button>
		</form>

		<p class="text-xs text-surface-500 text-center">
			No password needed. We'll email you a link to sign in.
		</p>
	</div>
{/if}
