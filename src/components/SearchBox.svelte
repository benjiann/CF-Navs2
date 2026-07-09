<script lang="ts">
  import { onDestroy } from 'svelte'
  import type { SearchEngineSetting } from '../../shared/types'

  export let searchEngine: SearchEngineSetting | null = null
  export let query = ''
  export let showEngineSelector = true

  let selectedName = ''
  let engineMenuOpen = false

  $: engines = searchEngine?.engines ?? []

  $: if (engines.length === 0) {
    selectedName = ''
  } else if (!engines.some((engine) => engine.name === selectedName)) {
    selectedName = engines.find((engine) => engine.name === searchEngine?.current)?.name ?? engines[0].name
  }

  $: currentEngine = engines.find((engine) => engine.name === selectedName) ?? null

  $: if (!showEngineSelector || engines.length <= 1) {
    engineMenuOpen = false
  }

  function isIconImage(icon: string | null | undefined): boolean {
    return /^(https?:\/\/|data:image\/)/i.test(icon?.trim() ?? '')
  }

  function getEngineIconText(name: string): string {
    return name.trim().slice(0, 1).toUpperCase() || '?'
  }

  function toggleEngineMenu() {
    if (engines.length <= 1) return
    engineMenuOpen = !engineMenuOpen
  }

  function selectEngine(name: string) {
    selectedName = name
    engineMenuOpen = false
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      engineMenuOpen = false
    }
  }

  function handlePickerFocusOut(event: FocusEvent) {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return
    }

    engineMenuOpen = false
  }

  function handleSubmit() {
    const keyword = query.trim()

    if (!keyword || !currentEngine) {
      return
    }

    const targetUrl = currentEngine.url_template.replaceAll('{q}', encodeURIComponent(keyword))
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  onDestroy(() => {
    engineMenuOpen = false
  })
</script>

<form class="search-box" class:has-engine-selector={showEngineSelector} on:submit|preventDefault={handleSubmit}>
  {#if showEngineSelector}
    <div class="engine-picker" on:focusout={handlePickerFocusOut}>
      <button
        type="button"
        class="engine-icon-button"
        aria-label={currentEngine ? `当前搜索引擎：${currentEngine.name}` : '选择搜索引擎'}
        aria-haspopup="listbox"
        aria-expanded={engineMenuOpen}
        disabled={engines.length === 0}
        title={currentEngine ? `搜索引擎：${currentEngine.name}` : '选择搜索引擎'}
        on:click={toggleEngineMenu}
        on:keydown={handleKeydown}
      >
        {#if currentEngine && isIconImage(currentEngine.icon)}
          <img src={currentEngine.icon} alt="" loading="lazy" decoding="async" />
        {:else}
          <span>{getEngineIconText(currentEngine?.name ?? '')}</span>
        {/if}
      </button>

      {#if engineMenuOpen}
        <div class="engine-menu" role="listbox" aria-label="选择搜索引擎">
          {#each engines as engine}
            <button
              type="button"
              class="engine-menu-item"
              class:is-selected={engine.name === selectedName}
              role="option"
              aria-selected={engine.name === selectedName}
              on:click={() => selectEngine(engine.name)}
              on:keydown={handleKeydown}
            >
              <span class="engine-menu-icon">
                {#if isIconImage(engine.icon)}
                  <img src={engine.icon} alt="" loading="lazy" decoding="async" />
                {:else}
                  {getEngineIconText(engine.name)}
                {/if}
              </span>
              <span class="engine-menu-name">{engine.name}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <label class="sr-only" for="search-query">搜索关键词</label>
  <input
    id="search-query"
    bind:value={query}
    class="search-input"
    type="search"
    placeholder="输入关键词搜索"
    autocomplete="off"
  />

  <label class="sr-only" for="search-engine">搜索引擎</label>
  {#if showEngineSelector}
    <select
      id="search-engine"
      bind:value={selectedName}
      class="search-select"
      disabled={engines.length === 0}
    >
      {#if engines.length === 0}
        <option value="">未配置</option>
      {:else}
        {#each engines as engine}
          <option value={engine.name}>{engine.name}</option>
        {/each}
      {/if}
    </select>
  {/if}

  <button class="search-button" type="submit" disabled={!currentEngine || !query.trim()}>
    <span class="search-button-text">搜索</span>
  </button>
</form>

<style>
  .search-box {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 80px;
    gap: 0.6rem;
    align-items: center;
  }

  .search-box:has(.search-select) {
    grid-template-columns: minmax(0, 1fr) 140px 80px;
  }

  .search-input,
  .search-select,
  .search-button {
    height: 2.8rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.28);
    font: inherit;
    font-size: 0.95rem;
  }

  .engine-picker {
    display: none;
  }

  .search-input,
  .search-select {
    padding: 0 0.8rem;
    background: rgba(255, 255, 255, 0.82);
    color: inherit;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .search-input:focus,
  .search-select:focus {
    outline: 2px solid rgba(59, 130, 246, 0.18);
    outline-offset: 1px;
    border-color: rgba(59, 130, 246, 0.45);
  }

  .search-button {
    cursor: pointer;
    background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
    color: #fff;
    font-weight: 600;
  }

  .search-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .engine-icon-button,
  .engine-menu-item {
    font: inherit;
  }

  .engine-icon-button {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.82);
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .engine-icon-button img,
  .engine-menu-icon img {
    width: 1.25rem;
    height: 1.25rem;
    object-fit: contain;
  }

  .engine-icon-button span,
  .engine-menu-icon {
    font-size: 0.86rem;
    font-weight: 700;
    line-height: 1;
  }

  .engine-menu {
    position: absolute;
    top: calc(100% + 0.45rem);
    left: 0;
    z-index: 60;
    min-width: 10.5rem;
    max-width: min(16rem, calc(100vw - 2rem));
    display: grid;
    gap: 0.25rem;
    padding: 0.35rem;
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 0.85rem;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(12px);
  }

  .engine-menu-item {
    width: 100%;
    border: 0;
    border-radius: 0.65rem;
    background: transparent;
    color: #0f172a;
    cursor: pointer;
    display: grid;
    grid-template-columns: 1.7rem minmax(0, 1fr);
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.55rem;
    text-align: left;
  }

  .engine-menu-item:hover,
  .engine-menu-item.is-selected {
    background: rgba(37, 99, 235, 0.1);
  }

  .engine-menu-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 0.5rem;
    background: rgba(226, 232, 240, 0.74);
    color: #1e293b;
  }

  .engine-menu-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.9rem;
    font-weight: 600;
  }

  /* 暗色主题 */
  :global([data-theme='dark']) .search-input,
  :global([data-theme='dark']) .search-select,
  :global([data-theme='dark']) .engine-icon-button {
    background: rgba(15, 23, 42, 0.6);
    border-color: rgba(148, 163, 184, 0.28);
    color: #e5eefb;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  :global([data-theme='dark']) .search-input::placeholder {
    color: rgba(148, 163, 184, 0.7);
  }

  :global([data-theme='dark']) .engine-menu {
    border-color: rgba(148, 163, 184, 0.24);
    background: rgba(15, 23, 42, 0.96);
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.26);
  }

  :global([data-theme='dark']) .engine-menu-item {
    color: #e5eefb;
  }

  :global([data-theme='dark']) .engine-menu-item:hover,
  :global([data-theme='dark']) .engine-menu-item.is-selected {
    background: rgba(125, 211, 252, 0.14);
  }

  :global([data-theme='dark']) .engine-menu-icon {
    background: rgba(30, 41, 59, 0.86);
    color: #bae6fd;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 720px) {
    .search-box {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 2.5rem;
      gap: 0.45rem;
    }

    .search-box.has-engine-selector {
      grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem;
    }

    .search-box:has(.search-select) {
      grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem;
    }

    .search-input,
    .search-button {
      height: 2.5rem;
      border-radius: 0.7rem;
      font-size: 0.9rem;
    }

    .engine-picker {
      position: relative;
      display: block;
      width: 2.5rem;
      height: 2.5rem;
    }

    .search-select {
      display: none;
    }

    .search-input {
      min-width: 0;
    }

    .search-button {
      width: 2.5rem;
      padding: 0;
      font-size: 0.82rem;
    }

    .engine-icon-button {
      border-radius: 0.7rem;
    }

    .engine-menu {
      min-width: 9.5rem;
    }

    .search-button-text {
      display: inline-block;
      transform: scale(0.92);
      transform-origin: center;
    }
  }

  @media (max-width: 420px) {
    .search-box {
      gap: 0.45rem;
    }

    .search-box,
    .search-box.has-engine-selector,
    .search-box:has(.search-select) {
      grid-template-columns: 2.4rem minmax(0, 1fr) 2.4rem;
    }

    .search-box:not(.has-engine-selector) {
      grid-template-columns: minmax(0, 1fr) 2.4rem;
    }

    .search-input,
    .search-button {
      height: 2.4rem;
      font-size: 0.86rem;
    }

    .engine-picker {
      width: 2.4rem;
      height: 2.4rem;
    }

    .search-button {
      width: 2.4rem;
    }
  }
</style>
