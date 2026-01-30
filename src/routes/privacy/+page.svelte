<svelte:head>
	<title>Privacy Policy - PriceMyCraft</title>
</svelte:head>

<main class="container mx-auto p-4 max-w-3xl space-y-6">
	<a class="text-sm text-primary-500 hover:underline" href="/">&larr; Back to app</a>

	<header class="space-y-2">
		<h1 class="text-3xl font-bold">Privacy Policy</h1>
		<p class="text-sm text-surface-500">Last updated: January 27, 2026</p>
	</header>

	<section class="space-y-3 text-sm text-surface-700-200">
		<p>
			PriceMyCraft is a browser-based craft cost calculator operated by Space Thing, LLC DBA
			Space Thing. This policy explains what data is handled by the app, where it lives, and
			the choices you have. If you use a self-hosted instance, the operator of that instance
			is responsible for data handling.
		</p>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">Data we collect</h2>
		<div class="space-y-3 text-sm text-surface-700-200">
			<p>
				<strong>Data you enter locally.</strong> Materials, projects, settings, labor types,
				and any other information you enter are stored in your browser using localStorage
				when you are not signed in. This data does not leave your device unless you sign in
				and use cloud features.
			</p>
			<p>
				<strong>Account and profile data.</strong> If you create an account, we store your
				email and profile information you provide (such as a public username, bio, contact
				info, and avatar). Authentication is handled by Supabase Auth.
			</p>
			<p>
				<strong>Workspace and project data.</strong> When you are signed in, your workspaces,
				labor types, materials, projects, settings, and timestamps are stored in a managed
				database. Project photos you upload are stored in managed object storage.
			</p>
			<p>
				<strong>Public pages.</strong> If you mark a workspace or project as public, its name,
				description, materials, pricing details, and photos may be visible on your public
				profile and project pages.
			</p>
			<p>
				<strong>Basic request logs.</strong> If you use a hosted instance, the hosting provider
				may collect basic server logs (such as IP address, user agent, and request time) for
				security and reliability. For this site, hosting is provided by Cloudflare Pages.
			</p>
			<p>
				<strong>Donations (optional).</strong> If you choose to make a donation via Ko-fi,
				Ko-fi processes the payment. We do not receive your payment card or bank details. We
				may receive the information you choose to share through Ko-fi (for example, a
				display name or message).
			</p>
		</div>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">How we use data</h2>
		<ul class="list-disc pl-5 text-sm text-surface-700-200 space-y-2">
			<li>Provide the calculator, materials library, and project management features.</li>
			<li>Authenticate accounts and keep your dashboard session working.</li>
			<li>Sync data across devices when you are signed in.</li>
			<li>Publish public profiles and project pages when you choose to make them public.</li>
			<li>Maintain the security and stability of the service.</li>
		</ul>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">Sharing and disclosure</h2>
		<div class="space-y-3 text-sm text-surface-700-200">
			<p>
				We do not sell your data and we do not use advertising or tracking cookies.
			</p>
			<p>
				If you are signed in, data is processed and stored by a managed database provider and
				object storage service. The hosting provider for the app may also process basic
				request logs.
			</p>
			<p>
				Public profiles and project pages are available to anyone with the link. Do not
				publish sensitive personal information in public fields.
			</p>
			<p>
				Donations are processed by Ko-fi. If you donate, your information is handled according
				to Ko-fi's privacy practices.
			</p>
		</div>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">Data retention and control</h2>
		<div class="space-y-3 text-sm text-surface-700-200">
			<p>
				Local data remains on your device until you clear it in Settings or remove it from
				your browser storage.
			</p>
			<p>
				If you are signed in, your workspace data remains in the Supabase database for that
				instance until it is deleted by you or by the operator of that instance. You can
				unpublish a workspace or project at any time.
			</p>
		</div>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">Security</h2>
		<p class="text-sm text-surface-700-200">
			We use Supabase Auth, row-level security, and storage access controls to protect your
			data. No system is 100% secure, so avoid storing sensitive personal information in your
			workspace data.
		</p>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">Children's privacy</h2>
		<p class="text-sm text-surface-700-200">
			PriceMyCraft is not directed to children under 13, and we do not knowingly collect
			personal information from children.
		</p>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">Changes to this policy</h2>
		<p class="text-sm text-surface-700-200">
			We may update this policy from time to time. Changes will be posted here with a new
			"Last updated" date.
		</p>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">Contact</h2>
		<div class="text-sm text-surface-700-200 space-y-1">
			<p>For privacy questions, contact Space Thing, LLC DBA Space Thing.</p>
			<p>
				Email: <a class="text-primary-500 hover:underline" href="mailto:contact@spacething.net">contact@spacething.net</a>
			</p>
			<p>
				Website: <a class="text-primary-500 hover:underline" href="https://spaceth.ing">spaceth.ing</a>
			</p>
		</div>
	</section>
</main>
