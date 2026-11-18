<script setup lang="ts">
import type { ChatMessage } from '~/types';

/** Penpot DS: Chat Bubble (User | Assistant | Tool Call) */
const props = defineProps<{ message: ChatMessage }>();

const argsText = computed(() =>
  props.message.kind === 'tool' ? JSON.stringify(props.message.args) : ''
);
</script>

<template>
  <!-- User -->
  <div v-if="message.kind === 'user'" class="flex justify-end">
    <div class="max-w-[85%] whitespace-pre-wrap rounded-[14px] rounded-br-[4px] bg-indigo-600 px-3.5 py-2.5 text-[13px] text-white">
      {{ message.text }}
    </div>
  </div>

  <!-- Assistant -->
  <div v-else-if="message.kind === 'assistant'" class="max-w-[92%] rounded-[14px] rounded-tl-[4px] bg-zinc-800 px-3.5 py-2.5">
    <p class="mb-1 text-[11px] font-bold text-indigo-300">TokoAI Assistant</p>
    <!-- miniMarkdown meng-escape HTML terlebih dahulu -->
    <div class="text-[13px] leading-relaxed text-zinc-100" v-html="miniMarkdown(message.text)" />
  </div>

  <!-- MCP Tool Call -->
  <div
    v-else-if="message.kind === 'tool'"
    class="max-w-[92%] rounded-[10px] border border-dashed px-3 py-2.5"
    :class="message.status === 'error' ? 'border-red-700 bg-red-950/60' : 'border-indigo-700 bg-indigo-950'"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-[10px] font-bold tracking-[0.08em] text-indigo-300">MCP TOOL CALL</span>
      <span
        class="truncate font-mono text-[10px] font-semibold"
        :class="{
          'text-green-400': message.status === 'ok',
          'text-red-400': message.status === 'error',
          'animate-pulse text-zinc-400': message.status === 'pending',
        }"
      >
        <template v-if="message.status === 'pending'">memanggil…</template>
        <template v-else>{{ message.status === 'ok' ? '✓' : '✕' }} {{ message.summary }}</template>
      </span>
    </div>
    <p class="mt-1 font-mono text-[13px] font-bold text-white">{{ message.name }}</p>
    <p class="mt-0.5 break-all font-mono text-[11px] text-zinc-400">{{ argsText }}</p>
  </div>

  <!-- Error -->
  <div v-else class="rounded-[10px] border border-red-800 bg-red-950 px-3 py-2 text-[12px] text-red-300">
    ⚠ {{ message.text }}
  </div>
</template>
