<script lang="ts">
  import type { PublicBookmark } from '../../shared/types'
  import BookmarkIcon from './BookmarkIcon.svelte'

  type AsyncVoid<T = void> = T | Promise<T>

  export let bookmark: PublicBookmark
  export let openInNewTab = true
  export let sortMode = false
  export let cardLinkStyle = ''
  export let showDescription = true
  export let iconUrl = ''
  export let iconText = ''
  export let infoIconSize = 60
  export let infoIconStyle = ''
  export let hasCustomIconBackground = false
  export let onLinkClick: ((event: MouseEvent) => AsyncVoid) | undefined = undefined
  export let onContextMenu: ((event: MouseEvent) => AsyncVoid) | undefined = undefined
  export let onIconError: (() => AsyncVoid) | undefined = undefined
  export let onIconLoad: (() => AsyncVoid) | undefined = undefined

  function handleLinkClick(event: MouseEvent) {
    void onLinkClick?.(event)
  }

  function handleContextMenu(event: MouseEvent) {
    void onContextMenu?.(event)
  }
</script>

<a
  class="bookmark-card bookmark-card-info"
  class:sort-mode={sortMode}
  href={bookmark.url}
  target={openInNewTab ? '_blank' : undefined}
  rel={openInNewTab ? 'noopener noreferrer' : undefined}
  style={cardLinkStyle}
  on:click={handleLinkClick}
  on:contextmenu={handleContextMenu}
>
  <BookmarkIcon
    title={bookmark.title}
    {iconUrl}
    {iconText}
    size={infoIconSize}
    iconStyle={infoIconStyle}
    hasCustomBackground={hasCustomIconBackground}
    variant="info"
    onError={onIconError}
    onLoad={onIconLoad}
  />

  <div class="bookmark-text">
    <h3 class="bookmark-title">{bookmark.title}</h3>
    {#if showDescription && bookmark.description}
      <p class="bookmark-description">{bookmark.description}</p>
    {/if}
  </div>
</a>

<style>
  .bookmark-card {
    box-sizing: border-box;
    text-decoration: none;
    color: inherit;
    border: 1px solid rgba(255, 255, 255, 0.42);
    background:
      linear-gradient(135deg, rgb(var(--card-bg-rgb, 255 255 255) / calc(var(--card-bg-opacity, 0.9) * 0.78)), rgba(255, 255, 255, 0.34)),
      rgb(var(--card-bg-rgb, 255 255 255) / calc(var(--card-bg-opacity, 0.9) * 0.62));
    backdrop-filter: blur(18px) saturate(135%);
    -webkit-backdrop-filter: blur(18px) saturate(135%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.46),
      0 2px 8px rgba(15, 23, 42, 0.08);
    transition:
      transform 0.16s ease,
      border-color 0.16s ease;
  }

  .bookmark-card-info {
    display: flex;
    align-items: center;
    gap: 0.82rem;
    width: 100%;
    height: 70px;
    padding: 0 0.95rem 0 0.55rem;
    border-radius: 1.2rem;
    overflow: hidden;
  }

  .bookmark-card-info:hover {
    border-color: rgba(255, 255, 255, 0.62);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.58),
      0 6px 16px rgba(15, 23, 42, 0.1);
    transform: translateY(-1px);
  }

  .bookmark-card-info .bookmark-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    padding: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .bookmark-card-info .bookmark-title {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0;
    line-height: 1.2;
    color: var(--card-text-color, #0f172a);
    text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bookmark-card-info .bookmark-description {
    font-size: 0.75rem;
    color: var(--card-text-color, #475569);
    opacity: 0.88;
    margin: 0.25rem 0 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
  }

  .bookmark-card-info.sort-mode {
    cursor: move;
    transform: none !important;
    transition: none;
    user-select: none;
  }

  .bookmark-card-info.sort-mode:hover {
    transform: none !important;
  }

  :global([data-theme='dark']) .bookmark-card-info {
    border-color: rgba(255, 255, 255, 0.1);
    background:
      linear-gradient(135deg, rgb(var(--card-bg-rgb, 255 255 255) / calc(var(--card-bg-opacity, 0.15) * 0.82)), rgba(15, 23, 42, 0.22)),
      rgb(var(--card-bg-rgb, 255 255 255) / calc(var(--card-bg-opacity, 0.15) * 0.7));
    color: var(--card-text-color, #e2e8f0);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 2px 10px rgba(0, 0, 0, 0.18);
  }

  :global([data-theme='dark']) .bookmark-card-info:hover {
    border-color: rgba(125, 211, 252, 0.26);
  }

  :global([data-theme='dark']) .bookmark-card-info .bookmark-title {
    color: var(--card-text-color, #e5eefb);
  }

  :global([data-theme='dark']) .bookmark-card-info .bookmark-description {
    color: var(--card-text-color, #cbd5e1);
    opacity: 0.92;
  }
</style>
