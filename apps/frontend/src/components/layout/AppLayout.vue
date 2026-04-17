<script setup lang="ts">
import Sidebar from './Sidebar.vue';
import Topbar from './Topbar.vue';
</script>

<template>
  <div class="flex min-h-screen bg-bg-primary">
    <!-- Fixed sidebar -->
    <Sidebar />

    <!-- Main area: topbar + content -->
    <div class="ml-[256px] flex flex-1 flex-col min-h-screen">
      <!-- Topbar -->
      <Topbar />

      <!-- Scrollable content area -->
      <main class="flex-1 overflow-y-auto p-6 px-4 sm:px-6 lg:px-8">
        <div class="w-full">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
