<script lang="ts">
  import { onDestroy } from 'svelte'
  import {
    DEFAULT_LOGO_SURF_SCHEME,
    getIconCandidates,
    iconifyIcon,
    iconifyNameFromUrl,
    iconifyProxyIcon,
    logoSurfIcon,
    normalizeIconifyName,
    type IconCandidate,
    type LogoSurfColorScheme,
  } from '../lib/icons'
  import { getErrorMessage, iconifyApi } from '../lib/api'
  import type { BookmarkFormValue } from '../lib/adminTypes'
  import {
    buildBookmarkSubmitPayload,
    createBookmarkFormValue,
    emptyBookmarkForm,
    findLogoSchemeName,
    getIconifySearchQuery,
    getLogoSchemeByName,
  } from '../lib/bookmarkFormIcons'
  import BookmarkCustomIconField from './BookmarkCustomIconField.svelte'
  import BookmarkIconCandidatePicker from './BookmarkIconCandidatePicker.svelte'
  import ColorAlphaInput from './ColorAlphaInput.svelte'
  import IconifySelector from './IconifySelector.svelte'
  import LogoSchemeSelector from './LogoSchemeSelector.svelte'
  import type { IconifyCandidate as IconifySearchCandidate } from '../../shared/types'

  type BookmarkCategoryOption = {
    id: string | number
    title: string
  }

  export let open = false
  export let loading = false
  export let error = ''
  export let mode: 'create' | 'edit' = 'create'
  export let value: Partial<BookmarkFormValue> | null = null
  export let categories: BookmarkCategoryOption[] = []
  export let onSubmit: ((payload: BookmarkFormValue) => void | Promise<void>) | undefined = undefined
  export let onCancel: (() => void) | undefined = undefined
  export let onDelete: ((bookmark: { id: string | number; title: string }) => void | Promise<void>) | undefined = undefined
  export let deleting = false
  export let imageHostUrl = ''

  let form: BookmarkFormValue = { ...emptyBookmarkForm }
  let formKey = ''
  let faviconError = ''
  let selectedLogoSchemeName = DEFAULT_LOGO_SURF_SCHEME.name
  let iconifyName = ''
  let iconifyUseConfirmed = false
  let confirmedIconifyName = ''
  let iconifySearchCandidates: IconifySearchCandidate[] = []
  let iconifySearchLoading = false
  let iconifySearchError = ''
  let iconifySearchTimer: ReturnType<typeof setTimeout> | null = null
  let iconifySearchRequestId = 0
  let lastIconifySearchQuery = ''
  let previousBodyOverflow: string | null = null
  let previousDocumentOverflow: string | null = null

  // 当前链接下的图标候选
  let candidates: IconCandidate[] = []
  let candidateError = ''

  $: nextKey = JSON.stringify({ open, mode, value, categoryIds: categories.map((item) => item.id) })
  $: setPageScrollLocked(open)
  $: if (nextKey !== formKey) {
    formKey = nextKey
    faviconError = ''
    candidateError = ''
    const fallbackCategoryId = categories[0]?.id
    form = createBookmarkFormValue(value, fallbackCategoryId)
    selectedLogoSchemeName = findLogoSchemeName(form.icon) ?? DEFAULT_LOGO_SURF_SCHEME.name
    iconifyName = form.icon_source === 'iconify' ? iconifyNameFromUrl(form.icon) ?? '' : ''
    iconifyUseConfirmed = mode === 'edit' && form.icon_source === 'iconify' && Boolean(iconifyName)
    confirmedIconifyName = iconifyUseConfirmed ? iconifyName : ''
    iconifySearchCandidates = []
    iconifySearchError = ''
    iconifySearchLoading = false
    lastIconifySearchQuery = ''
    // 编辑模式也重新生成候选
    if (form.url.trim()) {
      candidates = getIconCandidates(form.url.trim(), form.title.trim())
    } else {
      candidates = []
    }
  }

  // 输入 URL 后实时生成候选
  $: if (form.url.trim() && formKey) {
    candidates = getIconCandidates(form.url.trim(), form.title.trim())
    candidateError = ''
  }

  $: currentLogoScheme = getLogoSchemeByName(selectedLogoSchemeName)
  $: normalizedIconifyName = normalizeIconifyName(iconifyName)
  $: iconifySourceUrl = iconifyIcon(iconifyName)
  $: iconifyPreviewUrl = iconifyProxyIcon(iconifyName)
  $: showLogoSchemes = form.icon_source === 'logo_surf' && Boolean(form.url.trim())
  $: showIconifyOptions = form.icon_source === 'iconify'
  $: iconifySelected =
    iconifyUseConfirmed &&
    Boolean(normalizedIconifyName) &&
    confirmedIconifyName === normalizedIconifyName
  $: scheduleIconifyCandidateSearch(showIconifyOptions, iconifyName)
  $: logoPreviewText = (form.title.trim() || 'NAV').slice(0, 4)
  $: if (iconifyUseConfirmed && normalizedIconifyName !== confirmedIconifyName) {
    iconifyUseConfirmed = false
  }
  $: if (form.icon_source === 'logo_surf' && form.url.trim()) {
    const nextLogoIcon = logoSurfIcon(form.title.trim(), form.url.trim(), currentLogoScheme)
    if (form.icon !== nextLogoIcon) {
      form.icon = nextLogoIcon
    }
  }
  $: if (form.icon_source === 'iconify' && normalizedIconifyName && form.icon !== iconifySourceUrl) {
    form.icon = iconifySourceUrl
  }

  function clearIconifySearchTimer() {
    if (iconifySearchTimer) {
      clearTimeout(iconifySearchTimer)
      iconifySearchTimer = null
    }
  }

  function scheduleIconifyCandidateSearch(enabled: boolean, value: string) {
    const query = enabled ? getIconifySearchQuery(value) : ''
    if (query === lastIconifySearchQuery) return

    lastIconifySearchQuery = query
    clearIconifySearchTimer()
    iconifySearchRequestId += 1
    iconifySearchError = ''

    if (!query) {
      iconifySearchCandidates = []
      iconifySearchLoading = false
      return
    }

    const requestId = iconifySearchRequestId
    iconifySearchLoading = true
    iconifySearchTimer = setTimeout(() => {
      void loadIconifyCandidates(query, requestId)
    }, 280)
  }

  async function loadIconifyCandidates(query: string, requestId: number) {
    try {
      const result = await iconifyApi.search(query)
      if (requestId !== iconifySearchRequestId) return

      iconifySearchCandidates = result.candidates
      iconifySearchError = ''
    } catch (searchError) {
      if (requestId !== iconifySearchRequestId) return

      iconifySearchCandidates = []
      iconifySearchError = getErrorMessage(searchError)
    } finally {
      if (requestId === iconifySearchRequestId) {
        iconifySearchLoading = false
      }
    }
  }

  function selectLogoColorScheme(scheme: LogoSurfColorScheme) {
    if (!form.url.trim()) return
    selectedLogoSchemeName = scheme.name
    form.icon = logoSurfIcon(form.title.trim(), form.url.trim(), scheme)
    form.icon_source = 'logo_surf'
    candidateError = ''
    faviconError = ''
  }

  function selectIconifyIcon() {
    if (!iconifySourceUrl) {
      candidateError = '请输入有效的 Iconify 图标名或 icon-sets 链接，例如 mdi:home 或 https://icon-sets.iconify.design/mdi/home/'
      return
    }

    form.icon = iconifySourceUrl
    form.icon_source = 'iconify'
    iconifyName = normalizedIconifyName
    iconifyUseConfirmed = true
    confirmedIconifyName = normalizedIconifyName
    candidateError = ''
    faviconError = ''
  }

  function selectIconifySearchCandidate(candidate: IconifySearchCandidate) {
    iconifyName = candidate.name
    form.icon = candidate.url
    form.icon_source = 'iconify'
    iconifyUseConfirmed = true
    confirmedIconifyName = candidate.name
    candidateError = ''
    faviconError = ''
  }

  function openIconifyLibrary() {
    window.open('https://icon-sets.iconify.design/', '_blank', 'noopener,noreferrer')
  }

  function setPageScrollLocked(locked: boolean) {
    if (typeof document === 'undefined') return

    if (locked && previousBodyOverflow === null) {
      previousBodyOverflow = document.body.style.overflow
      previousDocumentOverflow = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      return
    }

    if (!locked && previousBodyOverflow !== null) {
      document.documentElement.style.overflow = previousDocumentOverflow ?? ''
      document.body.style.overflow = previousBodyOverflow
      previousBodyOverflow = null
      previousDocumentOverflow = null
    }
  }

  function selectCandidate(candidate: IconCandidate) {
    if (candidate.source === 'logo_surf') {
      selectLogoColorScheme(DEFAULT_LOGO_SURF_SCHEME)
      return
    }

    form.icon = candidate.url
    form.icon_source = candidate.source
    if (candidate.source === 'iconify') {
      iconifyName = iconifyNameFromUrl(candidate.url) ?? iconifyName
      iconifyUseConfirmed = false
      confirmedIconifyName = ''
    } else {
      iconifyName = ''
      iconifyUseConfirmed = false
      confirmedIconifyName = ''
    }
    candidateError = ''
    faviconError = ''
  }

  function markCustomIconInput(nextIcon: string) {
    form.icon = nextIcon
    form.icon_source = ''
    iconifyName = ''
    iconifyUseConfirmed = false
    confirmedIconifyName = ''
  }

  function openImageHost() {
    if (!imageHostUrl) return
    const base = imageHostUrl.endsWith('/') ? imageHostUrl.slice(0, -1) : imageHostUrl
    window.open(`${base}/upload`, '_blank', 'noopener,noreferrer')
  }

  async function handleSubmit() {
    await onSubmit?.(buildBookmarkSubmitPayload(form, iconifyName))
  }

  function handleCancel() {
    if (loading || deleting) {
      return
    }
    onCancel?.()
  }

  async function handleDelete() {
    if (!form.id || !onDelete || loading || deleting) return
    await onDelete({ id: form.id, title: form.title.trim() })
  }

  onDestroy(() => {
    clearIconifySearchTimer()
    setPageScrollLocked(false)
  })
</script>

{#if open}
  <div class="modal-backdrop">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="bookmark-modal-title">
      <div class="modal-header">
        <div>
          <p class="modal-eyebrow">书签管理</p>
          <h2 id="bookmark-modal-title">{mode === 'create' ? '新增书签' : '编辑书签'}</h2>
        </div>
        <button type="button" class="ghost-button" on:click={handleCancel} disabled={loading || deleting}>取消</button>
      </div>

      <form class="modal-form" on:submit|preventDefault={handleSubmit}>
        <label class="field-compact">
          <span>所属分类</span>
          <select bind:value={form.category_id} disabled={loading || categories.length === 0} required>
            {#if categories.length === 0}
              <option value="">暂无分类可选</option>
            {:else}
              {#each categories as category}
                <option value={category.id}>{category.title}</option>
              {/each}
            {/if}
          </select>
        </label>

        <label class="field-compact">
          <span>书签标题</span>
          <input bind:value={form.title} type="text" placeholder="例如：Svelte 官方网站" required />
        </label>

        <label class="field-compact">
          <span>链接地址</span>
          <input bind:value={form.url} type="url" placeholder="https://example.com" required />
        </label>

        <label class="field-compact">
          <span>打开方式</span>
          <select bind:value={form.open_method}>
            <option value="new_tab">新标签页</option>
            <option value="same_tab">当前标签页</option>
            <option value="modal">当前页弹层</option>
          </select>
        </label>

        <BookmarkIconCandidatePicker
          {candidates}
          {form}
          urlFilled={Boolean(form.url.trim())}
          onSelect={selectCandidate}
        />

        <div class="field-block field-compact">
          <span>图标背景色</span>
          <ColorAlphaInput
            bind:value={form.icon_background_color}
            placeholder="留空则使用默认背景"
            inputLabel="图标背景颜色值"
            swatchTitle="选择图标背景色"
            alphaText="图标背景透明度"
          />
          <small>可为单个书签图标设置背景色，留空则使用全局默认。</small>
        </div>

        {#if showIconifyOptions}
          <IconifySelector
            bind:iconifyName
            {iconifyPreviewUrl}
            {iconifySelected}
            {iconifyUseConfirmed}
            {confirmedIconifyName}
            {iconifySearchCandidates}
            {iconifySearchLoading}
            {iconifySearchError}
            {candidateError}
            {loading}
            onOpenLibrary={openIconifyLibrary}
            onSelectIcon={selectIconifyIcon}
            onSelectCandidate={selectIconifySearchCandidate}
          />
        {/if}

        {#if showLogoSchemes}
          <LogoSchemeSelector
            {selectedLogoSchemeName}
            iconSource={form.icon_source}
            {currentLogoScheme}
            {logoPreviewText}
            onSelectScheme={selectLogoColorScheme}
          />
        {/if}

        <BookmarkCustomIconField
          {form}
          {iconifyName}
          {imageHostUrl}
          {loading}
          {faviconError}
          onIconInput={markCustomIconInput}
          onOpenImageHost={openImageHost}
        />


        <label class="field-wide description-field">
          <span>描述</span>
          <textarea bind:value={form.description} rows="3" placeholder="补充说明，可选"></textarea>
        </label>


        {#if error}
          <p class="error-text">{error}</p>
        {/if}

        <div class="modal-actions">
          {#if mode === 'edit' && form.id && onDelete}
            <button type="button" class="danger-button" on:click={handleDelete} disabled={loading || deleting}>
              {#if deleting}删除中...{:else}删除{/if}
            </button>
          {/if}
          <button type="button" class="ghost-button" on:click={handleCancel} disabled={loading}>取消</button>
          <button
            type="submit"
            class="primary-button"
            disabled={loading || deleting || categories.length === 0 || !form.title.trim() || !form.url.trim()}
          >
            {#if loading}保存中...{:else}保存{/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 14px;
    background: rgba(15, 23, 42, 0.56);
    overflow: hidden;
    overscroll-behavior: contain;
  }

  .modal-backdrop::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.18);
    backdrop-filter: blur(2px);
    pointer-events: none;
  }

  .modal-card {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    width: min(100%, 680px);
    height: min(720px, calc(100vh - 28px));
    height: min(720px, calc(100dvh - 28px));
    max-height: calc(100vh - 28px);
    max-height: calc(100dvh - 28px);
    min-height: 0;
    overflow: hidden;
    overscroll-behavior: contain;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
    padding: 0;
    scrollbar-gutter: stable;
  }

  .modal-header {
    flex: 0 0 auto;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin: 0;
    padding: 12px 16px 9px;
    border-bottom: 1px solid #e2e8f0;
  }

  .modal-eyebrow {
    margin: 0 0 4px;
    font-size: 12px;
    color: #64748b;
  }

  h2 {
    margin: 0;
    font-size: 20px;
    color: #0f172a;
  }

  .modal-form {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(180px, 0.85fr);
    align-content: start;
    gap: 8px 10px;
    padding: 10px 14px 0;
  }

  label,
  .field-block {
    display: grid;
    min-width: 0;
    gap: 4px;
    color: #334155;
    font-size: 13px;
  }

  .field-wide {
    grid-column: 1 / -1;
  }

  .field-compact {
    grid-column: span 1;
  }

  .field-block > span {
    font-weight: 600;
  }

  input,
  select,
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    padding: 6px 9px;
    font-size: 13px;
    color: #0f172a;
    background: #ffffff;
    font-family: inherit;
  }

  textarea {
    resize: vertical;
    min-height: 48px;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  .error-text {
    grid-column: 1 / -1;
    margin: 0;
    color: #dc2626;
    font-size: 13px;
  }

  .modal-actions {
    grid-column: 1 / -1;
    position: sticky;
    bottom: 0;
    z-index: 2;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin: 0 -14px;
    padding: 7px 14px 9px;
    border-top: 1px solid #e2e8f0;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(10px);
  }

  .primary-button,
  .ghost-button,
  .danger-button {
    border-radius: 10px;
    padding: 7px 12px;
    font-size: 13px;
    cursor: pointer;
    transition: 0.18s ease;
  }

  .primary-button {
    border: none;
    background: #2563eb;
    color: #ffffff;
  }

  .ghost-button {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
  }

  .danger-button {
    margin-right: auto;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #dc2626;
  }

  .primary-button:disabled,
  .ghost-button:disabled,
  .danger-button:disabled,
  select:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .modal-card :global(.color-picker-row) {
    gap: 6px;
  }

  .modal-card :global(.color-picker-row input[type='text']) {
    border-radius: 9px;
    padding: 6px 9px;
    font-size: 13px;
  }

  .modal-card :global(.color-swatch) {
    width: 32px;
    height: 32px;
    flex-basis: 32px;
    border-radius: 9px;
  }

  @media (max-width: 500px) {
    .modal-backdrop {
      padding: 10px;
    }

    .modal-card {
      width: min(100%, 600px);
      height: calc(100vh - 20px);
      height: calc(100dvh - 20px);
      max-height: calc(100vh - 20px);
      max-height: calc(100dvh - 20px);
    }

    .modal-form {
      grid-template-columns: 1fr;
      gap: 8px;
      padding-right: 14px;
      padding-left: 14px;
    }

    .field-compact,
    .field-wide {
      grid-column: 1 / -1;
    }

    .modal-actions {
      margin-right: -14px;
      margin-left: -14px;
      padding-right: 14px;
      padding-left: 14px;
    }
  }
</style>
