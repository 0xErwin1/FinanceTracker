<script setup lang="ts">
interface Props {
  recordCount: number;
  lastSync: string;
}

defineProps<Props>();
</script>

<template>
  <div
    class="flex flex-col gap-1 border-t border-border-default/50 px-1 py-2 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="flex items-center gap-1.5">
      <span class="h-1.5 w-1.5 rounded-full bg-accent-green" />

      <span>Synced</span>

      <span class="text-text-secondary">
        {{ recordCount }} {{ recordCount === 1 ? 'record' : 'records' }}
      </span>
    </div>

    <span>Last sync: {{ lastSync }}</span>
  </div>
</template>
