<script>
  import { onMount } from 'svelte';

  /** @type {HTMLAudioElement | null} */
  let audioElement = null;

  onMount(() => {
    if (audioElement) {
      audioElement.volume = 0.7; // Set default volume
    }
  });
</script>

<svelte:head>
	<title>Clearing Song | All Is In Bloom</title>
	<meta name="description" content="Listen to and download the Clearing Song meditation audio." />
</svelte:head>

<div class="container">
	<h1>Clearing Song</h1>

	<div class="audio-section">
		<audio bind:this={audioElement} controls src="/audio/clearing-song.mp3">
			Your browser does not support the audio element.
		</audio>

		<div class="download-section">
			<p>
				i wrote this song in a valley high above Takaka, New Zealand in 2024
			</p>
			<p>
				this is the only recording i have with live tuis and cicadas singing in the background
			</p>
			<p>
				now if only i had better breath control…kinda went flat in parts! 🙄
			</p>
			<a href="/clearing-song/download" class="download-button"> Download Audio </a>
		</div>
	</div>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: 'Noto Serif', serif;
	}

	h1 {
		font-family: 'Noto Serif Display', serif;
		font-weight: 600;
		margin-bottom: 2rem;
	}

	.audio-section {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		margin: 2rem 0;
	}

	audio {
		width: 100%;
		max-width: 500px;
	}

	.download-section {
		max-width: 500px;
	}

	.download-button {
		display: inline-block;
		background-color: #3b5249;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		text-decoration: none;
		font-family: 'Noto Sans', sans-serif;
		font-weight: 500;
		margin-top: 1rem;
		transition: background-color 0.2s ease;
	}

	.download-button:hover {
		background-color: #2a3c35;
	}
</style>
