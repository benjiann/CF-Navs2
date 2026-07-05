<script lang="ts">
  import type { AdminBookmarkSummary, AdminCategorySummary } from '../../lib/appData'
  import { getBookmarkFallbackIcon, getBookmarkIconUrl, hasBookmarkImageIcon } from '../../lib/bookmarkIconDisplay'
  import { clampPage, pageCount, pageEnd, pageStart, slicePage } from '../../lib/pagination'
  import { reorderByIds } from '../../lib/reorder'
  import { sortableList, type SortHandler } from '../../lib/sortableList'
  import CachedBookmarkIcon from '../CachedBookmarkIcon.svelte'
  import './adminListPanels.css'

  type AsyncVoid<T = void> = T | Promise<T>
  type AdminCategory = AdminCategorySummary
  type AdminBookmark = AdminBookmarkSummary

  export let isAuthenticated = false
  export let authLoading = false
  export let categories: AdminCategory[] = []
  export let bookmarks: AdminBookmark[] = []
  export let bookmarksLoading = false
  export let deletingBookmarkId: string | number | null = null
  export let onOpenCreateBookmark: ((categoryId?: string | number) => AsyncVoid) | undefined = undefined
  export let onEditBookmark: ((bookmark: AdminBookmark) => AsyncVoid) | undefined = undefined
  export let onDeleteBookmark: ((bookmark: AdminBookmark) => AsyncVoid) | undefined = undefined
  export let onSortBookmarks: SortHandler | undefined = undefined

  let sortMode = false
  let localBookmarks: AdminBookmark[] = []
  let savingSort = false
  let page = 1
  let search = ''

  $: categoryTitleById = new Map(categories.map((category) => [category.id, category.title]))
  $: normalizedSearch = search.trim().toLowerCase()
  $: filteredBookmarks = normalizedSearch
    ? bookmarks.filter((bookmark) => {
        const catTitle = (categoryTitleById.get(bookmark.category_id) ?? '').toLowerCase()
        return (
          bookmark.title.toLowerCase().includes(normalizedSearch) ||
          bookmark.url.toLowerCase().includes(normalizedSearch) ||
          catTitle.includes(normalizedSearch)
        )
      })
    : bookmarks
  $: totalPages = pageCount(filteredBookmarks.length)
  $: page = clampPage(page, totalPages)
  $: pagedBookmarks = slicePage(filteredBookmarks, page)
  $: displayBookmarks = sortMode ? localBookmarks : pagedBookmarks

  const getCategoryTitle = (categoryId: string | number) =>
    categories.find((category) => category.id === categoryId)?.title ?? '未分类'

  function enterSort() {
    search = ''
    page = 1
    localBookmarks = [...bookmarks]
    sortMode = true
  }

  function cancelSort() {
    sortMode = false
    localBookmarks = []
  }

  function handleReorder(orderedIds: Array<string | number>) {
    localBookmarks = reorderByIds(localBookmarks, orderedIds)
  }

  async function saveSort() {
    if (!onSortBookmarks) {
      cancelSort()
      return
    }

    savingSort = true
    try {
      await onSortBookmarks(localBookmarks.map((item) => item.id))
      cancelSort()
    } finally {
      savingSort = false
    }
  }

  function handleSearchInput(event: Event) {
    search = (event.currentTarget as HTMLInputElement).value
    page = 1
  }
</script>

<div class="admin-list-view">
  <section class="admin-list-panel admin-bookmark-list-panel">
    <div class="admin-list-panel-header">
      <div>
        <p class="admin-panel-eyebrow">书签</p>
        <h2>书签列表</h2>
      </div>
      <div class="admin-header-actions-row">
        <button
          type="button"
          class="admin-ghost-button"
          on:click={enterSort}
          disabled={sortMode || !isAuthenticated || bookmarksLoading || authLoading || bookmarks.length < 2}
        >
          排序
        </button>
        <button
          type="button"
          class="admin-primary-button"
          on:click={() => onOpenCreateBookmark?.()}
          disabled={sortMode || !isAuthenticated || categories.length === 0}
        >
          新增书签
        </button>
      </div>
    </div>

    <div class="admin-list-toolbar">
      {#if !sortMode}
        <div class="admin-bookmark-search-bar">
          <input
            type="text"
            placeholder="搜索标题、链接或分类…"
            value={search}
            on:input={handleSearchInput}
          />
        </div>
      {/if}
    </div>

    <div class="admin-panel-scroll-body admin-table-scroll-body">
      {#if bookmarksLoading}
        <p class="admin-empty-text">书签加载中...</p>
      {:else if bookmarks.length === 0}
        <p class="admin-empty-text">暂无书签数据</p>
      {:else}
        <div class="admin-table-wrap">
          <table class="admin-bookmark-table" class:is-sorting={sortMode}>
            <colgroup>
              {#if sortMode}<col style="width: 44px;" />{/if}
              <col />
              <col style="width: 88px;" />
              <col />
              <col style="width: 114px;" />
              {#if !sortMode}<col style="width: 122px;" />{/if}
            </colgroup>
            <thead>
              <tr>
                {#if sortMode}<th style="width: 44px;">排序</th>{/if}
                <th>标题</th>
                <th style="width: 88px;">分类</th>
                <th>链接</th>
                <th style="width: 114px;">打开方式</th>
                {#if !sortMode}<th style="width: 122px;">操作</th>{/if}
              </tr>
            </thead>
            <tbody
              use:sortableList={{
                enabled: sortMode,
                onSort: handleReorder,
                handle: '[data-drag-handle]',
              }}
            >
              {#each displayBookmarks as bookmark (bookmark.id)}
                <tr data-sortable-item data-sort-id={bookmark.id} class:is-sorting={sortMode}>
                  {#if sortMode}
                    <td>
                      <button
                        type="button"
                        class="admin-drag-handle"
                        data-drag-handle
                        aria-label={`拖动排序书签 ${bookmark.title}`}
                      >
                        ⋮⋮
                      </button>
                    </td>
                  {/if}
                  <td>
                    <div class="admin-bookmark-cell">
                      <span class="admin-icon-badge small" style={bookmark.icon_background_color ? `background: ${bookmark.icon_background_color};` : ''}>
                        {#if hasBookmarkImageIcon(bookmark)}
                          <CachedBookmarkIcon
                            id={bookmark.id}
                            icon={bookmark.icon ?? ''}
                            iconSource={bookmark.icon_source}
                            iconBlob={bookmark.icon_blob ?? ''}
                            src={getBookmarkIconUrl(bookmark)}
                            alt=""
                            fallback={getBookmarkFallbackIcon(bookmark)}
                            style="width: 100%; height: 100%; object-fit: contain;"
                          />
                        {:else}
                          {getBookmarkFallbackIcon(bookmark)}
                        {/if}
                      </span>
                      <div>
                        <strong>{bookmark.title}</strong>
                        {#if bookmark.description}
                          <p>{bookmark.description}</p>
                        {/if}
                      </div>
                    </div>
                  </td>
                  <td class="admin-cat-cell">{getCategoryTitle(bookmark.category_id)}</td>
                  <td class="admin-url-cell">
                    <a href={bookmark.url} target="_blank" rel="noreferrer">{bookmark.url}</a>
                  </td>
                  <td class="admin-method-cell">
                    {bookmark.open_method === 'same_tab' ? '当前标签页' : bookmark.open_method === 'modal' ? '当前页弹层' : '新标签页'}
                  </td>
                  {#if !sortMode}
                    <td>
                      <div class="admin-inline-actions compact">
                        <button type="button" class="admin-ghost-button compact" on:click={() => onEditBookmark?.(bookmark)} disabled={!isAuthenticated}>
                          编辑
                        </button>
                        <button
                          type="button"
                          class="admin-danger-button compact"
                          on:click={() => onDeleteBookmark?.(bookmark)}
                          disabled={!isAuthenticated || deletingBookmarkId === bookmark.id}
                        >
                          {#if deletingBookmarkId === bookmark.id}删除中...{:else}删除{/if}
                        </button>
                      </div>
                    </td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
          {#if !sortMode && filteredBookmarks.length === 0}
            <p class="admin-empty-text" style="padding: 24px 0; text-align: center;">未找到匹配的书签。</p>
          {/if}
        </div>
      {/if}
    </div>

    {#if bookmarks.length > 0}
      <div class="admin-panel-footer">
        {#if sortMode}
          <div class="admin-sort-hint">拖动行调整顺序，完成后点击「保存排序」。</div>
        {:else}
          <div class="admin-pagination">
            <span>第 {pageStart(page, filteredBookmarks.length)}-{pageEnd(page, filteredBookmarks.length)} 条 / 共 {filteredBookmarks.length} 条</span>
            <div class="admin-pager-actions">
              <button type="button" class="admin-ghost-button compact" on:click={() => page -= 1} disabled={page <= 1}>上一页</button>
              <span>{page} / {totalPages}</span>
              <button type="button" class="admin-ghost-button compact" on:click={() => page += 1} disabled={page >= totalPages}>下一页</button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </section>
</div>

{#if sortMode}
  <div class="admin-sort-bar" role="toolbar" aria-label="排序操作">
    <span class="admin-sort-hint-inline">正在排序书签，拖动调整顺序后保存。</span>
    <button type="button" class="admin-ghost-button" on:click={cancelSort} disabled={savingSort}>取消</button>
    <button type="button" class="admin-primary-button" on:click={saveSort} disabled={savingSort}>
      {#if savingSort}保存中...{:else}保存排序{/if}
    </button>
  </div>
{/if}
