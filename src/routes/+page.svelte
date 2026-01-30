<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Calculator from '@lucide/svelte/icons/calculator';
	import Camera from '@lucide/svelte/icons/camera';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Printer from '@lucide/svelte/icons/printer';
</script>

<svelte:head>
	<title>PriceMyCraft - Know Your Worth, Price Your Craft</title>
	<meta
		name="description"
		content="Free craft pricing calculator. Track material costs, labor time, and generate shareable price breakdowns for your handmade products."
	/>
</svelte:head>

<main class="container mx-auto px-4 max-w-4xl">
	<!-- Hero -->
	<section class="text-center py-16 sm:py-24">
		<h1 class="text-5xl sm:text-6xl font-bold mb-4">
			Know Your Worth,<br />Price Your Craft
		</h1>
		<p class="text-lg text-surface-600-400 mb-8 max-w-2xl mx-auto">
			Stop guessing what to charge. Track your materials, labor time, and costs to generate
			fair prices for your handmade products.
		</p>
		<div class="flex flex-col sm:flex-row gap-3 justify-center">
			<a href="/dashboard" class="btn preset-filled-primary-500 text-lg px-8 py-3">
				<span>Get Started</span>
				<ArrowRight size={20} />
			</a>
			<a href="/login" class="btn preset-tonal-surface text-lg px-8 py-3">
				<span>Sign In</span>
			</a>
		</div>
	</section>

	<!-- Features -->
	<section class="grid sm:grid-cols-2 gap-6 pb-16">
		<div class="card p-6">
			<div class="rounded-full w-12 h-12 bg-primary-500/10 flex items-center justify-center mb-4">
				<Calculator size={24} class="text-primary-500" />
			</div>
			<h3 class="text-lg font-bold mb-2">Accurate Pricing</h3>
			<p class="text-surface-600-400">
				Track every bead, yard of fabric, and minute of labor. Get a suggested price
				that covers your real costs.
			</p>
		</div>

		<div class="card p-6">
			<div class="rounded-full w-12 h-12 bg-primary-500/10 flex items-center justify-center mb-4">
				<Camera size={24} class="text-primary-500" />
			</div>
			<h3 class="text-lg font-bold mb-2">Photo Gallery</h3>
			<p class="text-surface-600-400">
				Upload photos of your finished projects. Showcase your work alongside pricing
				on your public profile.
			</p>
		</div>

		<div class="card p-6">
			<div class="rounded-full w-12 h-12 bg-primary-500/10 flex items-center justify-center mb-4">
				<Share2 size={24} class="text-primary-500" />
			</div>
			<h3 class="text-lg font-bold mb-2">Shareable Profile</h3>
			<p class="text-surface-600-400">
				Get a public profile page with a custom URL. Share your catalog at craft fairs,
				markets, and online.
			</p>
		</div>

		<div class="card p-6">
			<div class="rounded-full w-12 h-12 bg-primary-500/10 flex items-center justify-center mb-4">
				<Printer size={24} class="text-primary-500" />
			</div>
			<h3 class="text-lg font-bold mb-2">Print & QR</h3>
			<p class="text-surface-600-400">
				Print your price list for display at events. Generate QR codes so customers
				can view details on their phones.
			</p>
		</div>
	</section>
</main>
