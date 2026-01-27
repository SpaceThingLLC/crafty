<script lang="ts">
	import Mail from '@lucide/svelte/icons/mail';
</script>

<svelte:head>
	<title>Sign In - PriceMyCraft</title>
</svelte:head>

<main class="container mx-auto px-4 max-w-md py-16">
	<div class="card p-6 space-y-6">
		<div class="text-center">
			<h1 class="text-2xl font-bold mb-2">Sign In</h1>
			<p class="text-surface-600-400">
				Enter your email to receive a magic link sign-in.
			</p>
		</div>

		<form class="space-y-4" onsubmit={(e) => e.preventDefault()}>
			<label class="label">
				<span class="label-text">Email</span>
				<input
					type="email"
					class="input"
					placeholder="crafter@example.com"
					required
					disabled
				/>
			</label>
			<button
				type="submit"
				class="btn preset-filled-primary-500 w-full"
				disabled
			>
				<Mail size={16} />
				<span>Send Magic Link</span>
			</button>
		</form>

		<p class="text-xs text-center text-surface-500">
			Auth integration coming soon. For now, use the dashboard directly.
		</p>

		<div class="text-center">
			<a href="/dashboard" class="text-primary-500 hover:underline text-sm">
				Go to Dashboard
			</a>
		</div>
	</div>
</main>
