<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { RouteDefinition } from '../types/RouteTypes';

    const dispatch = createEventDispatcher();

    export let route: RouteDefinition; // Route data with isSaved property

    function toggleFavorite() {
        route.isSaved = !route.isSaved;

        dispatch('toggleFavorite', { route });
    }
</script>
<button
    class="favorite-button"
    on:click|stopPropagation={() => toggleFavorite()}
    title={route.isSaved ? 'Remove from favorites' : 'Add to favorites'}
>
    {#if route.isSaved}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc3545" stroke="#dc3545" stroke-width="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
    {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#495057" stroke-width="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
    {/if}
</button>

<style lang="less">
    .favorite-button {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &:hover {
            transform: scale(1.1);
        }
    }
</style>