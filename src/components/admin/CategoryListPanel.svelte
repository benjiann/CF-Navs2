<script lang="ts">
  import type { AdminBookmarkSummary, AdminCategorySummary } from '../../lib/appData'
  import { clampPage, pageCount, pageEnd, pageStart, slicePage } from '../../lib/pagination'
  import { reorderByIds } from '../../lib/reorder'
  import { sortableList, type SortHandler } from '../../lib/sortableList'
  import './adminListPanels.css'

  type AsyncVoid<T = void> = T | Promise<T>
  type AdminCategory = AdminCategorySummary
  type AdminBookmark = AdminBookmarkSummary

  export let isAuthenticated = false
  export let authLoading = false
  export let categories: AdminCategory[] = []
  export let bookmarks: AdminBookmark[] = []
  export let categoriesLoading = false
  export let deletingCategoryId: string | number | null = null
  export let onOpenCreateCategory: (() => AsyncVoid) | undefined = undefined
  export let onEditCategory: ((category: AdminCategory) => AsyncVoid) | undefined = undefined
  export let onDeleteCategory: ((category: AdminCategory) => AsyncVoid) | undefined = undefined
  export let onOpenCreateBookmark: ((categoryId?: string | number) => AsyncVoid) | undefined = undefined
  export let onSortCategories: SortHandler | undefined = undefined

  let sortMode = false
  let localCategories: AdminCategory[] = []
  let savingSort = false
  let page = 1

  $: totalPages = pageCount(categories.length)
  $: page = clampPage(page, totalPages)
  $: pagedCategories = slicePage(categories, page)
  $: displayCategories = sortMode ? localCategories : pagedCategories

  const getBookmarksByCategory = (categoryId: string | number) =>
    bookmarks.filter((bookmark) => bookmark.category_id === categoryId)

  function enterSort() {
    localCategories = [...categories]
    page = 1
    sortMode = true
  }

  function cancelSort() {
    sortMode = false
    localCategories = []
  }

  function handleReorder(orderedIds: Array<string | number>) {
    localCategories = reorderByIds(localCategories, orderedIds)
  }

  async function saveSort() {
    if (!onSortCategories) {
      cancelSort()
      return
    }

    savingSort = true
    try {
      await onSortCategories(localCategories.map((item) => item.id))
      cancelSort()
    } finally {
      savingSort = false
    }
  }
</script>

<div class="admin-list-view">
  <section class="admin-status-panel">
    <div class="admin-status-item">
      <span class="admin-status-label">登录状态</span>
      <strong>{isAuthenticated ? '已登录' : '未登录'}</strong>
    </div>
    <div class="admin-status-item">
      <span class="admin-status-label">分类数量</span>
      <strong>{categories.length}</strong>
    </div>
    <div class="admin-status-item">
      <span class="admin-status-label">书签数量</span>
      <strong>{bookmarks.length}</strong>
    </div>
  </section>

  <section class="admin-list-panel admin-category-list-panel">
    <div class="admin-list-panel-header">
      <div>
        <p class="admin-panel-eyebrow">分类</p>
        <h2>分类列表</h2>
      </div>
      <div class="admin-header-actions-row">
        {#if !sortMode}
          <button
            type="button"
            class="admin-ghost-button"
            on:click={enterSort}
            disabled={!isAuthenticated || categoriesLoading || authLoading || categories.length < 2}
          >
            排序
          </button>
          <button type="button" class="admin-primary-button" on:click={() => onOpenCreateCategory?.()} disabled={!isAuthenticated}>
            新增分类
          </button>
        {/if}
      </div>
    </div>

    <div class="admin-panel-scroll-body">
      {#if categoriesLoading}
        <p class="admin-empty-text">分类加载中...</p>
      {:else if categories.length === 0}
        <p class="admin-empty-text">暂无分类数据</p>
      {:else}
        <div
          class="admin-list-stack"
          class:is-sorting={sortMode}
          use:sortableList={{
            enabled: sortMode,
            onSort: handleReorder,
          }}
        >
          {#each displayCategories as category (category.id)}
            <article class="admin-compact-card" class:sortable={sortMode} data-sortable-item data-sort-id={category.id}>
              {#if sortMode}
                <span class="admin-drag-handle" aria-hidden="true">⋮⋮</span>
              {/if}
              <span class="admin-icon-badge">{category.icon || '📁'}</span>
              <div class="admin-compact-info">
                <h3>{category.title}</h3>
                <span class="admin-count-badge">{category.bookmarkCount ?? getBookmarksByCategory(category.id).length} 个书签</span>
              </div>
              {#if !sortMode}
                <div class="admin-inline-actions">
                  <button type="button" class="admin-sm-button" on:click={() => onEditCategory?.(category)} disabled={!isAuthenticated}>
                    编辑
                  </button>
                  <button type="button" class="admin-sm-button" on:click={() => onOpenCreateBookmark?.(category.id)} disabled={!isAuthenticated}>
                    加书签
                  </button>
                  <button
                    type="button"
                    class="admin-sm-button danger"
                    on:click={() => onDeleteCategory?.(category)}
                    disabled={!isAuthenticated || deletingCategoryId === category.id}
                  >
                    {#if deletingCategoryId === category.id}删除中...{:else}删除{/if}
                  </button>
                </div>
              {/if}
            </article>
          {/each}
        </div>
      {/if}
    </div>

    {#if categories.length > 0}
      <div class="admin-panel-footer">
        {#if sortMode}
          <div class="admin-sort-hint">拖动卡片调整顺序，完成后点击「保存排序」。</div>
        {:else}
          <div class="admin-pagination">
            <span>第 {pageStart(page, categories.length)}-{pageEnd(page, categories.length)} 条 / 共 {categories.length} 条</span>
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
    <span class="admin-sort-hint-inline">正在排序分类，拖动调整顺序后保存。</span>
    <button type="button" class="admin-ghost-button" on:click={cancelSort} disabled={savingSort}>取消</button>
    <button type="button" class="admin-primary-button" on:click={saveSort} disabled={savingSort}>
      {#if savingSort}保存中...{:else}保存排序{/if}
    </button>
  </div>
{/if}
