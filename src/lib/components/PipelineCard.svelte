<script>
  import { page } from '$app/stores';
  import { build, environments, reviewUrl, checksUrl } from '$lib/pipeline.js';
</script>

<section class="pipeline" aria-label="Publishing pipeline">
  <div class="pipeline-heading"><strong>dev → staging → production</strong></div>
  <nav aria-label="Site environments">
    {#each environments as environment}
      <a href={environment.id === 'staging' && build.environment === 'staging' ? $page.url.origin : environment.url} target="_blank" rel="noopener noreferrer" aria-current={build.environment === environment.id ? 'location' : undefined}>
        <span class:current={build.environment === environment.id} class="light" aria-hidden="true"></span>
        <span>{environment.label}</span>
        <small>{build.environment === environment.id ? `${build.revision.slice(0, 8)} · here` : environment.description}</small>
      </a>
    {/each}
  </nav>
  <div class="pipeline-actions">
    <a href={checksUrl} target="_blank" rel="noopener noreferrer">CI checks ↗</a>
    <a href={reviewUrl} target="_blank" rel="noopener noreferrer">Review release ↗</a>
  </div>
  {#if $page.data.draftPoems?.length}<p><a href="/review/poems">Poem review & sources →</a></p>{/if}
  <p>Production release needs Al’s approval.</p>
</section>

<style>
  .pipeline { margin: 8px 0 14px; padding-bottom: 12px; border-bottom: 1px solid #65566c; font: 12px/1.5 system-ui, sans-serif; color: #e8e2ea; }
  .pipeline-heading { margin-bottom: 7px; }
  nav { display: grid; gap: 4px; }
  nav a { display: grid; grid-template-columns: 8px 1fr auto; gap: 8px; align-items: center; padding: 8px; border: 1px solid #65566c; border-radius: 4px; color: inherit; text-decoration: none; }
  a::after { content: none !important; }
  nav a[aria-current] { border-color: #c5a4da; background: #352d3c; }
  .light { width: 6px; height: 6px; border: 1px solid #d0c2d5; border-radius: 50%; }
  .light.current { background: #b0dfba; border-color: #b0dfba; }
  small { color: #d0c2d5; font: 10px/1.5 monospace; }
  .pipeline-actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 10px; }
  .pipeline-actions a { color: #dcc2ef; }
  a:focus-visible { outline: 2px solid #e4c1fa; outline-offset: 2px; }
  p { margin: 9px 0 0; font-size: 11px; color: #d0c2d5; white-space: normal; }
</style>
