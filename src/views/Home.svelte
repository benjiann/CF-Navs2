<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte'
  import SearchBox from '../components/SearchBox.svelte'
  import Sidebar from '../components/Sidebar.svelte'
  import CategorySection from '../components/CategorySection.svelte'
  import type { PublicBookmark, PublicCategory, PublicSettings } from '../../shared/types'

  type AsyncVoid<T = void> = T | Promise<T>

  export let categories: PublicCategory[] = []
  export let bookmarks: PublicBookmark[] = []
  export let settings: PublicSettings | null = null
  export let title = ''
  export let isAuthenticated = false
  export let authLoading = false
  export let onOpenCreateBookmark: ((categoryId?: string | number) => AsyncVoid) | undefined = undefined
  export let onEditBookmark: ((bookmark: PublicBookmark) => AsyncVoid) | undefined = undefined
  export let onSortBookmarksInCategory: ((categoryId: number, orderedIds: number[]) => AsyncVoid) | undefined = undefined
  export let onSwitchToAdmin: (() => AsyncVoid) | undefined = undefined
  export let onLogout: (() => AsyncVoid) | undefined = undefined
  export let onOpenLogin: (() => AsyncVoid) | undefined = undefined
  export let activeTheme: 'light' | 'dark' = 'light'
  export let onToggleTheme: (() => AsyncVoid) | undefined = undefined

  let categoryBookmarks = new Map<number, PublicBookmark[]>()
  let categoryTitleById = new Map<number, string>()
  let searchTextByBookmarkId = new Map<number, string>()
  let sectionElements: HTMLElement[] = []
  let activeId = ''
  let isScrolling = false
  let searchQuery = ''
  let sectionsKey = ''
  let scrollFrame = 0
  let sortedCategoriesSource: PublicCategory[] | null = null
  let sortedCategoriesMemo: PublicCategory[] = []
  let sortedBookmarksSource: PublicBookmark[] | null = null
  let sortedBookmarksMemo: PublicBookmark[] = []
  let categoryTitleSource: PublicCategory[] | null = null
  let categoryTitleMemo = new Map<number, string>()
  let searchIndexBookmarksSource: PublicBookmark[] | null = null
  let searchIndexCategoriesSource: PublicCategory[] | null = null
  let searchIndexMemo = new Map<number, string>()

  $: sortedCategories = getSortedCategories(categories)
  $: sortedBookmarks = getSortedBookmarks(bookmarks)
  $: normalizedSearchQuery = normalizeSearchQuery(searchQuery)
  $: hasSearchQuery = normalizedSearchQuery.length > 0
  $: categoryTitleById = getCategoryTitleMap(sortedCategories)
  $: searchTextByBookmarkId = getSearchIndex(sortedBookmarks, sortedCategories, categoryTitleById)
  $: visibleBookmarks = hasSearchQuery
    ? sortedBookmarks.filter((bookmark) => bookmarkMatchesSearch(bookmark, normalizedSearchQuery, searchTextByBookmarkId))
    : sortedBookmarks
  $: visibleCategoryIds = new Set(visibleBookmarks.map((bookmark) => bookmark.category_id))
  $: visibleCategories = hasSearchQuery
    ? sortedCategories.filter((category) => visibleCategoryIds.has(category.id))
    : sortedCategories

  $: {
    const nextCategoryBookmarks = new Map<number, PublicBookmark[]>()

    for (const bookmark of visibleBookmarks) {
      const list = nextCategoryBookmarks.get(bookmark.category_id) ?? []
      list.push(bookmark)
      nextCategoryBookmarks.set(bookmark.category_id, list)
    }

    categoryBookmarks = nextCategoryBookmarks
  }

  $: sections = visibleCategories.map((category) => ({
    id: `category-${category.id}`,
    title: category.title,
    count: categoryBookmarks.get(category.id)?.length ?? 0,
  }))
  $: nextSectionsKey = sections.map((section) => section.id).join('|')
  $: if (nextSectionsKey !== sectionsKey) {
    sectionsKey = nextSectionsKey
    void refreshSectionElementsAfterRender()
  }

  $: totalBookmarks = sortedBookmarks.length
  $: visibleBookmarkCount = visibleBookmarks.length
  $: pageTitle = title || settings?.site_title || '导航首页'
  $: siteTitleColor = settings?.site_title_color?.trim() || 'inherit'
  $: siteTitleFontSize = clampTitleFontSize(settings?.site_title_font_size)
  $: contentLayout = settings?.content_layout ?? {
    max_width: 1200,
    max_width_unit: 'px',
    margin_x: 0,
    margin_top: 0,
    margin_bottom: 0,
  }
  $: contentMaxWidth = `${contentLayout.max_width}${contentLayout.max_width_unit}`
  $: cardTextColor = settings?.card_text_color?.trim() ?? ''
  $: homeShellStyle = [
    `--content-max-width: ${contentMaxWidth}`,
    `--content-margin-x: ${contentLayout.margin_x}px`,
    `--content-margin-top: ${contentLayout.margin_top}%`,
    `--content-margin-bottom: ${contentLayout.margin_bottom}%`,
    cardTextColor ? `--card-text-color: ${cardTextColor}` : '',
  ].filter(Boolean).join('; ')
  $: pageDescription =
    totalBookmarks > 0
      ? `已整理 ${sortedCategories.length} 个分类，收录 ${totalBookmarks} 个站点。`
      : '一个简洁的公开导航首页。'

  $: if (!sections.some((section) => section.id === activeId)) {
    activeId = sections[0]?.id ?? ''
  }

  function clampTitleFontSize(value: number | undefined): number {
    if (!Number.isFinite(value)) return 32
    return Math.min(72, Math.max(16, Number(value)))
  }

  function normalizeSearchQuery(value: string): string {
    return value.trim().toLowerCase()
  }

  function getSortedCategories(items: PublicCategory[]): PublicCategory[] {
    if (items === sortedCategoriesSource) return sortedCategoriesMemo

    sortedCategoriesSource = items
    sortedCategoriesMemo = [...items].sort((a, b) => a.sort - b.sort)
    return sortedCategoriesMemo
  }

  function getSortedBookmarks(items: PublicBookmark[]): PublicBookmark[] {
    if (items === sortedBookmarksSource) return sortedBookmarksMemo

    sortedBookmarksSource = items
    sortedBookmarksMemo = [...items].sort((a, b) => a.sort - b.sort)
    return sortedBookmarksMemo
  }

  function getCategoryTitleMap(items: PublicCategory[]): Map<number, string> {
    if (items === categoryTitleSource) return categoryTitleMemo

    categoryTitleSource = items
    categoryTitleMemo = new Map(items.map((category) => [category.id, category.title]))
    return categoryTitleMemo
  }

  function getSearchIndex(
    items: PublicBookmark[],
    categoryItems: PublicCategory[],
    categoryTitles: Map<number, string>,
  ): Map<number, string> {
    if (items === searchIndexBookmarksSource && categoryItems === searchIndexCategoriesSource) {
      return searchIndexMemo
    }

    searchIndexBookmarksSource = items
    searchIndexCategoriesSource = categoryItems
    searchIndexMemo = buildSearchIndex(items, categoryTitles)
    return searchIndexMemo
  }

  function buildSearchIndex(
    items: PublicBookmark[],
    categoryTitles: Map<number, string>,
  ): Map<number, string> {
    const nextIndex = new Map<number, string>()

    for (const bookmark of items) {
      nextIndex.set(
        bookmark.id,
        [
          bookmark.title,
          bookmark.url,
          bookmark.description ?? '',
          categoryTitles.get(bookmark.category_id) ?? '',
        ].join('\n').toLowerCase(),
      )
    }

    return nextIndex
  }

  function bookmarkMatchesSearch(
    bookmark: PublicBookmark,
    keyword: string,
    searchIndex: Map<number, string>,
  ): boolean {
    return (searchIndex.get(bookmark.id) ?? '').includes(keyword)
  }

  function refreshSectionElements() {
    sectionElements = Array.from(document.querySelectorAll<HTMLElement>('[data-section-id]'))
  }

  async function refreshSectionElementsAfterRender() {
    if (typeof document === 'undefined') return
    await tick()
    refreshSectionElements()
  }

  function updateActiveSection() {
    const threshold = 140
    let nextActiveId = sectionElements[0]?.dataset.sectionId ?? ''

    for (const sectionElement of sectionElements) {
      if (sectionElement.getBoundingClientRect().top <= threshold) {
        nextActiveId = sectionElement.dataset.sectionId ?? nextActiveId
      }
    }

    activeId = nextActiveId
  }

  function handleMainScroll() {
    if (isScrolling || scrollFrame) return

    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0
      updateActiveSection()
    })
  }

  onMount(() => {
    refreshSectionElements()
    window.addEventListener('scroll', handleMainScroll)
  })

  onDestroy(() => {
    window.removeEventListener('scroll', handleMainScroll)
    if (scrollFrame) {
      window.cancelAnimationFrame(scrollFrame)
      scrollFrame = 0
    }
  })

  function handleNavigate(id: string | number) {
    const targetElement =
      sectionElements.find((sectionElement) => sectionElement.dataset.sectionId === String(id)) ??
      document.querySelector<HTMLElement>(`[data-section-id="${id}"]`)

    if (!targetElement) {
      activeId = String(id)
      return
    }

    const targetRect = targetElement.getBoundingClientRect()
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    const currentScroll = window.scrollY
    const desiredTopDistance = 80
    let targetScroll = currentScroll + targetRect.top - desiredTopDistance
    const maxScroll = documentHeight - windowHeight

    if (targetScroll > maxScroll) {
      targetScroll = maxScroll
    }

    const finalScroll = Math.max(0, targetScroll)

    isScrolling = true
    activeId = String(id)

    window.scrollTo({
      top: finalScroll,
      behavior: 'smooth',
    })

    setTimeout(() => {
      isScrolling = false
    }, 600)
  }

</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
</svelte:head>

<div class="home-shell" style={homeShellStyle}>
  <div class="floating-actions">
    <button
      type="button"
      class="icon-button theme-toggle-button"
      class:is-dark={activeTheme === 'dark'}
      on:click={() => onToggleTheme?.()}
      title={activeTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
      aria-label={activeTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
      aria-pressed={activeTheme === 'dark'}
    >
      {activeTheme === 'dark' ? '☾' : '☀'}
    </button>
    {#if isAuthenticated}
      <button
        type="button"
        class="icon-button"
        on:click={() => onSwitchToAdmin?.()}
        title="管理后台"
        aria-label="管理后台"
      >
        &#9881;
      </button>
      <button
        type="button"
        class="icon-button"
        on:click={() => onLogout?.()}
        disabled={authLoading}
        title="退出登录"
        aria-label="退出登录"
      >
        &#8618;
      </button>
    {:else}
      <button
        type="button"
        class="icon-button"
        on:click={() => onOpenLogin?.()}
        title="管理员登录"
        aria-label="管理员登录"
      >
        &#9881;
      </button>
    {/if}
  </div>

  <section class="hero-search" aria-label="站点搜索">
    <h1 class="site-title" style="color: {siteTitleColor}; font-size: {siteTitleFontSize}px;">{pageTitle}</h1>
    {#if settings?.search_box_show ?? true}
      <div class="search-card">
        <SearchBox
          searchEngine={settings?.search_engine ?? null}
          bind:query={searchQuery}
          showEngineSelector={settings?.search_engine_selector_show ?? true}
        />
      </div>
    {/if}
  </section>

  <Sidebar items={sections} {activeId} onNavigate={handleNavigate} />

  <div class="content-layout">
    <main class="content-panel">
      <div class="content-summary">
        <div>
          <p class="summary-label">当前内容</p>
          <h2>
            {#if hasSearchQuery}
              匹配 {visibleCategories.length} 个分类，{visibleBookmarkCount} 个站点
            {:else}
              共 {sortedCategories.length} 个分类，{totalBookmarks} 个站点
            {/if}
          </h2>
        </div>
      </div>

      {#if visibleCategories.length > 0}
        <div class="section-list">
          {#each visibleCategories as category (category.id)}
            <div data-section-id={`category-${category.id}`}>
              <CategorySection
                category={category}
                bookmarks={categoryBookmarks.get(category.id) ?? []}
                canAddBookmark={isAuthenticated}
                cardWidth={settings?.card_size?.width ?? 80}
                cardHeight={settings?.card_size?.height ?? 60}
                cardStyle={settings?.card_style ?? 'info'}
                cardIconSize={settings?.card_icon_size ?? 60}
                cardShowDescription={settings?.card_show_description ?? true}
                cardIconShowTitle={settings?.card_icon_show_title ?? true}
                canSort={isAuthenticated && !hasSearchQuery}
                onAddBookmark={onOpenCreateBookmark}
                onEditBookmark={onEditBookmark}
                onSortBookmarks={onSortBookmarksInCategory}
              />
            </div>
          {/each}
        </div>
      {:else}
        <section class="empty-panel">
          {#if hasSearchQuery}
            <h2>没有匹配的书签</h2>
            <p>换个关键词试试，或按 Enter 使用当前搜索引擎搜索。</p>
          {:else}
            <h2>暂无公开内容</h2>
            <p>当前还没有可展示的分类或书签，请稍后再来查看。</p>
          {/if}
        </section>
      {/if}
    </main>
  </div>

  {#if settings?.footer_html}
    <footer class="home-footer">
      {@html settings.footer_html}
    </footer>
  {/if}
</div>

<style>
  .home-shell {
    position: relative;
    min-height: 100vh;
    padding: 1.5rem calc(1.5rem + var(--content-margin-x, 0px)) var(--content-margin-bottom, 0%);
    --home-text-color: var(--card-text-color, #0f172a);
    --home-muted-opacity: 0.72;
    --home-stat-bg: rgba(255, 255, 255, 0.5);
    --home-stat-chip-bg: rgba(255, 255, 255, 0.34);
    --home-stat-border: rgba(148, 163, 184, 0.24);
    --home-stat-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    --home-accent-color: #2563eb;
    color: var(--home-text-color);
    isolation: isolate;
  }

  .home-shell::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -2;
    background: var(--home-background, transparent);
    filter: blur(var(--home-background-blur, 0px));
    transform: scale(1.06);
  }

  .home-shell::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    background: var(--home-background-mask-color, #000000);
    opacity: var(--home-background-mask, 0.3);
  }

  :global([data-theme='dark']) .home-shell {
    --home-text-color: var(--card-text-color, #e5eefb);
    --home-muted-opacity: 0.76;
    --home-stat-bg: rgba(15, 23, 42, 0.38);
    --home-stat-chip-bg: rgba(15, 23, 42, 0.32);
    --home-stat-border: rgba(148, 163, 184, 0.22);
    --home-stat-shadow: 0 16px 34px rgba(0, 0, 0, 0.2);
    --home-accent-color: #7dd3fc;
    color: var(--home-text-color);
  }

  :global([data-theme='dark']) .home-shell::after {
    background: var(--home-background-mask-color, #000000);
    opacity: var(--home-background-mask, 0.3);
  }

  .floating-actions {
    position: fixed;
    top: 1.25rem;
    right: 1.25rem;
    z-index: 50;
    display: flex;
    gap: 0.5rem;
  }

  .hero-search {
    display: grid;
    gap: 0.85rem;
    max-width: 680px;
    margin: calc(3rem + var(--content-margin-top, 0%)) auto 1.25rem;
    text-align: center;
  }

  .site-title {
    margin: 0;
    font-weight: 700;
    line-height: 1.1;
    overflow-wrap: anywhere;
    text-shadow: 0 2px 12px rgba(15, 23, 42, 0.22);
  }

  .icon-button {
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(12px);
    font-size: 1.15rem;
    line-height: 1;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .icon-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(37, 99, 235, 0.45);
    transform: translateY(-1px);
  }

  .theme-toggle-button {
    color: #0f172a;
  }

  .theme-toggle-button.is-dark {
    background: rgba(15, 23, 42, 0.82);
    color: #e5eefb;
  }

  .icon-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  :global([data-theme='dark']) .icon-button {
    background: rgba(15, 23, 42, 0.7);
    border-color: rgba(148, 163, 184, 0.32);
    color: #e5eefb;
  }

  :global([data-theme='dark']) .icon-button:hover:not(:disabled) {
    background: rgba(15, 23, 42, 0.85);
  }

  .search-card {
    max-width: 680px;
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: 1.5rem;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(255, 255, 255, 0.68);
    backdrop-filter: blur(18px);
  }

  .content-panel,
  .empty-panel {
    border-radius: 1.5rem;
    border: none;
    background: transparent;
    backdrop-filter: none;
  }

  :global([data-theme='dark']) .search-card,
  :global([data-theme='dark']) .content-panel,
  :global([data-theme='dark']) .empty-panel {
    border-color: transparent;
    background: transparent;
  }

  :global([data-theme='dark']) .empty-panel p {
    color: rgba(203, 213, 225, 0.92);
  }

  .content-layout {
    position: relative;
    max-width: var(--content-max-width, 1200px);
    margin: 0 auto;
  }

  .content-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 0;
  }

  .content-summary {
    position: relative;
    overflow: hidden;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-end;
    padding: 0.8rem 1rem 0.82rem;
    border: 1px solid var(--home-stat-border);
    border-radius: 1rem;
    background: var(--home-stat-bg);
    box-shadow: var(--home-stat-shadow);
    backdrop-filter: blur(14px) saturate(1.08);
    -webkit-backdrop-filter: blur(14px) saturate(1.08);
  }

  .content-summary::before {
    content: '';
    position: absolute;
    inset: 0.78rem auto 0.78rem 0;
    width: 3px;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--home-accent-color), rgba(45, 212, 191, 0.72));
    opacity: 0.86;
  }

  .content-summary > div {
    position: relative;
    min-width: 0;
  }

  .summary-label,
  .content-summary h2 {
    margin: 0;
  }

  .summary-label {
    font-size: 0.76rem;
    letter-spacing: 0.04em;
    color: var(--home-text-color);
    font-weight: 700;
    opacity: var(--home-muted-opacity);
  }

  .content-summary h2 {
    margin-top: 0.28rem;
    color: var(--home-text-color);
    font-size: 1.18rem;
    font-weight: 700;
    line-height: 1.28;
    font-variant-numeric: tabular-nums;
    text-wrap: balance;
  }


  .section-list {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .empty-panel {
    padding: 2rem;
  }

  .empty-panel h2,
  .empty-panel p {
    margin: 0;
  }

  .empty-panel p {
    margin-top: 0.75rem;
    color: rgba(71, 85, 105, 0.92);
  }

  .home-footer {
    max-width: var(--content-max-width, 1200px);
    margin: 2rem auto 0;
    color: inherit;
  }

  @media (max-width: 720px) {
    .home-shell {
      padding: 1rem max(1rem, var(--content-margin-x, 0px)) var(--content-margin-bottom, 0%);
    }

    .floating-actions {
      top: 1rem;
      right: 1rem;
    }

    .hero-search {
      margin-top: 3.5rem;
    }

    .icon-button {
      width: 2.2rem;
      height: 2.2rem;
      font-size: 1rem;
    }

    .search-card {
      margin-top: 4rem;
      border-radius: 1.2rem;
    }
  }
</style>
