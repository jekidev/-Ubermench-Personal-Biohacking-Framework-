<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Tools</p>
      <h1 class="mt-2 text-2xl font-semibold">STARCHIVE</h1>
      <p class="mt-2 text-zinc-500">
        Export GitHub starred repositories as structured CSV. This is a read-only installer of
        <a class="underline underline-offset-4" :href="STARCHIVE_UPSTREAM" target="_blank" rel="noreferrer">jwardsmith/STARCHIVE</a>.
        It does not modify GitHub stars or lists.
      </p>
    </div>

    <UCard>
      <template #header><div class="font-medium">GitHub credentials</div></template>
      <div class="grid gap-4 md:grid-cols-2">
        <UInput v-model="usernameInput" placeholder="GitHub username" autocomplete="username" @change="saveUsername(usernameInput)" />
        <UInput v-model="tokenInput" type="password" placeholder="GitHub token (public_repo)" autocomplete="off" @change="persistToken" />
      </div>
      <p class="mt-3 text-xs text-zinc-500">
        Agents read the committed snapshot in <code>app/data/starchive/catalog.json</code>.
        Username defaults to <code>jekidev</code>. A token is only needed for private or hidden stars.
      </p>
    </UCard>

    <div class="flex flex-wrap gap-3">
      <UButton :loading="loading" :disabled="!usernameInput.trim()" @click="runFetch">
        Fetch starred repos
      </UButton>
      <UButton color="neutral" variant="outline" :disabled="!catalog" @click="safeDownload('repos')">
        Download starred_repos.csv
      </UButton>
      <UButton color="neutral" variant="outline" :disabled="!catalog" @click="safeDownload('lists')">
        Download starred_repo_lists.csv
      </UButton>
    </div>

    <p v-if="status" class="text-sm text-zinc-400">{{ status }}</p>
    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    <p v-if="exportError" class="text-sm text-red-500">{{ exportError }}</p>

    <UCard v-if="catalog">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <span class="font-medium">{{ catalog.repos.length }} repositories</span>
          <span class="text-xs text-zinc-500">{{ catalog.lists.length }} lists</span>
        </div>
      </template>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th class="pb-2 pr-4">Repository</th>
              <th class="pb-2 pr-4">Language</th>
              <th class="pb-2 pr-4">Stars</th>
              <th class="pb-2">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="repo in catalog.repos.slice(0, 50)" :key="repo.fullName" class="border-t border-zinc-800 align-top">
              <td class="py-2 pr-4">
                <a class="underline underline-offset-4" :href="repo.htmlUrl" target="_blank" rel="noreferrer">{{ repo.fullName }}</a>
              </td>
              <td class="py-2 pr-4 text-zinc-400">{{ repo.language || '—' }}</td>
              <td class="py-2 pr-4">{{ repo.stars }}</td>
              <td class="py-2 text-zinc-400">{{ repo.description || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="catalog.repos.length > 50" class="mt-3 text-xs text-zinc-500">Showing the first 50 rows. Download the CSV for the full export.</p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { STARCHIVE_UPSTREAM } from '~/services/starchive'

const {
  username,
  token,
  catalog,
  error,
  status,
  loading,
  reloadToken,
  saveUsername,
  saveToken,
  fetchCatalog,
  downloadReposCsv,
  downloadListsCsv,
} = useStarchive()

const usernameInput = ref(username.value)
const tokenInput = ref(token.value)
const exportError = ref('')

await reloadToken()
usernameInput.value = username.value
tokenInput.value = token.value

async function persistToken() {
  exportError.value = ''
  try {
    await saveToken(tokenInput.value)
  } catch (cause) {
    exportError.value = cause instanceof Error ? cause.message : 'Unable to store GitHub token'
  }
}

async function runFetch() {
  exportError.value = ''
  saveUsername(usernameInput.value)
  await persistToken()
  try {
    await fetchCatalog()
  } catch {
    // fetchCatalog already records a user-visible error
  }
}

function safeDownload(kind: 'repos' | 'lists') {
  exportError.value = ''
  try {
    if (kind === 'repos') downloadReposCsv()
    else downloadListsCsv()
  } catch (cause) {
    exportError.value = cause instanceof Error ? cause.message : 'Unable to export CSV'
  }
}
</script>
