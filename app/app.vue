<template>
  <UApp>
    <div class="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <a class="skip-link" href="#main-content">Skip to content</a>

      <header role="banner" class="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-5">
        <div class="min-w-0">
          <div class="font-semibold tracking-tight">UBERMENCH</div>
          <div class="truncate text-xs text-zinc-500">Personal Biohacking Framework</div>
        </div>
        <UBadge variant="subtle">Local-first</UBadge>
      </header>

      <div class="min-h-[calc(100vh-65px)] md:flex">
        <aside class="hidden w-64 shrink-0 border-r border-zinc-800 p-3 md:block">
          <nav aria-label="Primary" class="space-y-4">
            <div v-for="group in navGroups" :key="group.label">
              <div class="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{{ group.label }}</div>
              <div class="space-y-1">
                <NuxtLink
                  v-for="item in group.items"
                  :key="item.to"
                  :to="item.to"
                  class="block rounded-lg px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
                  :class="{ 'nav-link-active': isCurrent(item.to) }"
                  :aria-current="isCurrent(item.to) ? 'page' : undefined"
                >
                  {{ item.label }}
                </NuxtLink>
              </div>
            </div>
          </nav>
        </aside>

        <nav aria-label="Primary" class="flex gap-1 overflow-x-auto border-b border-zinc-800 p-2 md:hidden">
          <NuxtLink
            v-for="item in flatNav"
            :key="item.to"
            :to="item.to"
            class="shrink-0 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
            :class="{ 'nav-link-active': isCurrent(item.to) }"
            :aria-current="isCurrent(item.to) ? 'page' : undefined"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <main id="main-content" role="main" tabindex="-1" class="min-w-0 flex-1 p-4 sm:p-6">
          <NuxtPage />
        </main>
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { APP_NAV_GROUPS, flattenAppNav, isNavCurrent } from '~/utils/app-navigation'

const route = useRoute()
const navGroups = APP_NAV_GROUPS
const flatNav = flattenAppNav()

function isCurrent(to: string) {
  return isNavCurrent(to, route.path, route.query.tab)
}
</script>
