<script>
	import TheNet from '$lib/components/TheNet.svelte';
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<svelte:head>
	<meta name="description" content="Allisin Bloom's poems, offered one at a time from the network's nearest node." />
</svelte:head>

<TheNet lit={data.net.lit} poem={data.net.poem} slugs={data.net.slugs} minute={data.net.minute} />
