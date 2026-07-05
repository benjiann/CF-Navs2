<script lang="ts">
  import type { BookmarkFormValue } from '../lib/adminTypes'
  import {
    getCandidatePreviewUrl,
    isCandidateSelected,
  } from '../lib/bookmarkFormIcons'
  import type { IconCandidate } from '../lib/icons'

  type AsyncVoid<T = void> = T | Promise<T>

  export let candidates: IconCandidate[] = []
  export let form: BookmarkFormValue
  export let urlFilled = false
  export let onSelect: ((candidate: IconCandidate) => AsyncVoid) | undefined = undefined

  function handleSelect(candidate: IconCandidate) {
    void onSelect?.(candidate)
  }
</script>

<div class="icon-picker-section field-compact">
  <span class="field-label">选择图标</span>

  {#if candidates.length > 0}
    <div class="icon-candidates">
      {#each candidates as candidate}
        <button
          type="button"
          class="candidate-card"
          class:selected={isCandidateSelected(candidate, form)}
          on:click={() => handleSelect(candidate)}
          title={candidate.label}
        >
          <img
            src={getCandidatePreviewUrl(candidate)}
            alt={candidate.label}
            loading="lazy"
          />
          <span class="candidate-label">{candidate.label}</span>
        </button>
      {/each}
    </div>
  {:else if urlFilled}
    <p class="hint-text">请输入有效链接以生成图标候选</p>
  {:else}
    <p class="hint-text">填写链接地址后将自动生成图标选项</p>
  {/if}
</div>

<style>
  .field-compact {
    grid-column: span 1;
  }

  .field-label {
    color: #334155;
    font-size: 13px;
    font-weight: 600;
  }

  .hint-text {
    margin: 0;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.35;
    padding: 2px 0;
  }

  .icon-picker-section {
    display: grid;
    min-width: 0;
    gap: 5px;
  }

  .icon-candidates {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 5px;
  }

  .candidate-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    min-height: 46px;
    padding: 4px;
    border: 2px solid #e2e8f0;
    border-radius: 9px;
    background: #ffffff;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .candidate-card:hover {
    border-color: #93c5fd;
    background: #f0f5ff;
  }

  .candidate-card.selected {
    border-color: #2563eb;
    background: #eff6ff;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  .candidate-card img {
    width: 22px;
    height: 22px;
    object-fit: contain;
    border-radius: 6px;
  }

  .candidate-label {
    font-size: 10px;
    color: #475569;
    text-align: center;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .candidate-card.selected .candidate-label {
    color: #1e40af;
    font-weight: 600;
  }

  @media (max-width: 500px) {
    .field-compact {
      grid-column: 1 / -1;
    }

    .icon-candidates {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>
