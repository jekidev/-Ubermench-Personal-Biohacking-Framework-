<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Settings</h1>
      <p class="text-zinc-500">
        Provider configuration is persistent metadata; API keys use the Tauri Stronghold vault on desktop and a browser secret store in preview.
        Google OAuth and MCP installs live on <NuxtLink to="/connectors" class="underline underline-offset-4">Connectors</NuxtLink>.
      </p>
    </div>

    <div class="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
      <UButton
        size="sm"
        :variant="activeTab === 'general' ? 'solid' : 'ghost'"
        @click="setTab('general')"
      >
        General
      </UButton>
      <UButton
        size="sm"
        :variant="activeTab === 'github' ? 'solid' : 'ghost'"
        @click="setTab('github')"
      >
        GitHub
      </UButton>
      <UButton
        size="sm"
        :variant="activeTab === 'memory' ? 'solid' : 'ghost'"
        @click="setTab('memory')"
      >
        Memory
      </UButton>
      <UButton
        size="sm"
        :variant="activeTab === 'research' ? 'solid' : 'ghost'"
        @click="setTab('research')"
      >
        Research
      </UButton>
      <UButton
        size="sm"
        :variant="activeTab === 'plugins' ? 'solid' : 'ghost'"
        @click="setTab('plugins')"
      >
        Plugins
      </UButton>
    </div>

    <template v-if="activeTab === 'general'">
      <UCard>
        <template #header><div class="flex items-center justify-between"><span class="font-medium">Secret vault</span><span class="text-xs text-zinc-500">{{ vaultUnlocked ? 'Unlocked' : 'Locked' }}</span></div></template>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <UInput v-model="vaultPassword" type="password" placeholder="Vault password" autocomplete="new-password" class="sm:flex-1" />
          <UButton v-if="!vaultUnlocked" :loading="vaultBusy" @click="unlockVault">Unlock vault</UButton>
          <UButton v-else color="neutral" variant="outline" :loading="vaultBusy" @click="lockVault">Lock vault</UButton>
        </div>
        <p v-if="vaultError" class="mt-2 text-sm text-red-500">{{ vaultError }}</p>
        <p class="mt-2 text-xs text-zinc-500">On Tauri desktop, provider API keys are stored in Stronghold and are not written to localStorage. The vault password is never persisted.</p>
        <UAlert
          v-if="browserDevPath"
          class="mt-3"
          title="Browser development credential path"
          description="You are not in the Tauri runtime. Secrets use an in-memory browser store for local preview only — do not use this path for production credentials."
          color="warning"
          variant="subtle"
        />
      </UCard>

      <UCard>
        <template #header><div class="font-medium">LLM orchestration</div></template>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label class="flex items-center gap-2 text-sm"><input v-model="settings.preferFree" type="checkbox" @change="save" /> Prefer free models (autoFreeOnly)</label>
          <label class="flex items-center gap-2 text-sm"><input v-model="settings.autoRotate" type="checkbox" @change="save" /> Automatic fallback / rotation</label>
          <label class="flex items-center gap-2 text-sm"><input v-model="settings.showModel" type="checkbox" @change="save" /> Show active model</label>
          <label class="flex items-center gap-2 text-sm"><input v-model="settings.allowFrameworkWrite" type="checkbox" @change="save" /> Allow framework file writes (Tauri only)</label>
        </div>
        <p class="mt-2 text-xs text-zinc-500">Framework write and command tools stay disabled unless explicitly enabled. MCP stdio always requires Tauri plus human approval.</p>
      </UCard>

      <UCard v-if="openRouterProvider">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <span class="font-medium">OpenRouter free-model catalog</span>
            <UButton size="sm" variant="outline" :loading="catalogBusy" :disabled="!vaultUnlocked" @click="refreshCatalog">Refresh catalog</UButton>
          </div>
        </template>
        <p class="text-sm text-zinc-400">
          When <code>preferFree</code> is on, rotation expands to live free models from OpenRouter (cached 15 minutes).
        </p>
        <div class="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div><span class="text-zinc-500">Cached models:</span> {{ catalogStatus.modelCount }}</div>
          <div><span class="text-zinc-500">Cache state:</span> {{ catalogStatus.stale ? 'stale / empty' : 'fresh' }}</div>
          <div><span class="text-zinc-500">Last refresh:</span> {{ catalogFetchedLabel }}</div>
        </div>
        <p v-if="catalogStatus.error" class="mt-3 text-sm text-red-500">{{ catalogStatus.error }}</p>
        <ul v-if="catalogStatus.models.length" class="mt-4 space-y-1 font-mono text-xs text-zinc-400">
          <li v-for="model in catalogStatus.models" :key="model">{{ model }}</li>
        </ul>
        <p v-else-if="vaultUnlocked && !catalogBusy" class="mt-3 text-sm text-zinc-500">No cached free models yet. Refresh after adding an OpenRouter key.</p>
        <p v-if="!vaultUnlocked" class="mt-3 text-xs text-zinc-500">Unlock the vault to refresh the catalog.</p>
      </UCard>

      <div class="grid gap-4 lg:grid-cols-2">
        <UCard v-for="provider in settings.providers" :key="provider.provider">
          <template #header><div class="flex items-center justify-between"><span class="font-medium capitalize">{{ provider.provider }}</span><span class="text-xs text-zinc-500">priority {{ provider.priority }}</span></div></template>
          <div class="space-y-3">
            <UInput
              v-model="provider.apiKey"
              type="password"
              placeholder="API key"
              autocomplete="off"
              :disabled="!vaultUnlocked"
              @change="saveKey(provider.provider, provider.apiKey ?? '')"
            />
            <p v-if="!vaultUnlocked" class="text-xs text-zinc-500">Unlock the secret vault before changing provider credentials.</p>
            <UInput v-model="provider.model" placeholder="Model (OpenRouter can use openrouter/free)" @change="save" />
            <UInput v-model="provider.baseUrl" placeholder="Base URL (optional)" @change="save" />
            <label class="flex items-center gap-2 text-sm"><input v-model="provider.enabled" type="checkbox" @change="save" /> Enabled</label>
          </div>
        </UCard>
      </div>

      <div class="flex flex-wrap gap-3">
        <UButton :disabled="!vaultUnlocked" @click="clearKeys">Clear keys</UButton>
        <UButton color="neutral" variant="outline" @click="reset">Reset settings</UButton>
      </div>
    </template>

    <template v-else-if="activeTab === 'github'">
      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <span class="font-medium">GitHub MCP + starred archive</span>
            <UBadge :color="githubStatusColor" variant="subtle">{{ githubStatusLabel }}</UBadge>
          </div>
        </template>
        <p class="text-sm text-zinc-400">
          Configure your GitHub personal access token for the official <code>@modelcontextprotocol/server-github</code> MCP server.
          Agents can also browse your starred repositories from the local STARCHIVE snapshot via <code>github.starchive.*</code> tools.
        </p>

        <UAlert v-if="github.error" class="mt-3" title="GitHub error" :description="github.error" color="error" variant="subtle" />

        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm text-zinc-400">GitHub username</label>
            <div class="flex gap-2">
              <UInput v-model="github.usernameDraft" placeholder="jekidev" class="flex-1" />
              <UButton size="sm" :loading="github.busy" :disabled="!vaultUnlocked" @click="saveGitHubUsername">Save</UButton>
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-sm text-zinc-400">Personal access token</label>
            <div class="flex gap-2">
              <UInput
                v-model="github.tokenDraft"
                type="password"
                placeholder="GITHUB_PERSONAL_ACCESS_TOKEN"
                autocomplete="off"
                class="flex-1"
                :disabled="!vaultUnlocked"
              />
              <UButton size="sm" :loading="github.busy" :disabled="!vaultUnlocked" @click="saveGitHubToken">Save</UButton>
            </div>
          </div>
        </div>
        <p v-if="!vaultUnlocked" class="mt-2 text-xs text-zinc-500">Unlock the secret vault before saving GitHub credentials.</p>
        <p class="mt-2 text-xs text-zinc-500">
          Token scopes: <code>repo</code> for private repos, <code>read:user</code> for profile. Public stars work without a token.
        </p>

        <div class="mt-4 flex flex-wrap items-center gap-4">
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              :checked="github.connectorEnabled"
              @change="onGitHubConnectorToggle(($event.target as HTMLInputElement).checked)"
            />
            Enable GitHub connector (auto-installs MCP catalog entry)
          </label>
          <span class="text-xs text-zinc-500">
            MCP: {{ github.mcpInstalled ? (github.mcpEnabled ? 'installed + enabled' : 'installed, disabled') : 'not installed' }}
          </span>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <UButton :loading="github.busy" :disabled="!vaultUnlocked" @click="github.refreshArchive()">Refresh starred archive</UButton>
          <UButton variant="outline" @click="github.resetToBundled()">Use bundled snapshot</UButton>
          <UButton variant="outline" to="/connectors">Open Connectors</UButton>
        </div>

        <div class="mt-4 grid gap-2 text-sm sm:grid-cols-4">
          <div><span class="text-zinc-500">User:</span> {{ github.summary.username }}</div>
          <div><span class="text-zinc-500">Repos:</span> {{ github.summary.repoCount }}</div>
          <div><span class="text-zinc-500">Source:</span> {{ github.activeCatalog.source }}</div>
          <div><span class="text-zinc-500">Exported:</span> {{ starchiveExportedLabel }}</div>
        </div>
        <p v-if="github.summary.topLanguages.length" class="mt-2 text-xs text-zinc-500">
          Top languages:
          <span v-for="item in github.summary.topLanguages" :key="item.language" class="mr-2">
            {{ item.language }} ({{ item.count }})
          </span>
        </p>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Browse starred repositories</div></template>
        <div class="flex flex-wrap gap-2">
          <UInput v-model="github.searchQuery" placeholder="Search name or description" class="flex-1 min-w-[12rem]" @keyup.enter="github.runSearch()" />
          <UInput v-model="github.searchLanguage" placeholder="Language filter" class="w-40" @keyup.enter="github.runSearch()" />
          <UButton @click="github.runSearch()">Search</UButton>
        </div>
        <p class="mt-2 text-xs text-zinc-500">{{ github.searchTotal }} matches</p>
        <ul v-if="github.searchResults.length" class="mt-4 space-y-2 text-sm">
          <li
            v-for="repo in github.searchResults"
            :key="repo.fullName"
            class="rounded border border-zinc-800 p-3"
          >
            <a :href="repo.htmlUrl" target="_blank" rel="noopener noreferrer" class="font-medium underline underline-offset-4">
              {{ repo.fullName }}
            </a>
            <div class="text-xs text-zinc-500">
              {{ repo.language || 'Unknown' }} · ★ {{ repo.stars }} · updated {{ formatDate(repo.updatedAt) }}
            </div>
            <p v-if="repo.description" class="mt-1 text-zinc-400">{{ repo.description }}</p>
          </li>
        </ul>
        <p v-else class="mt-4 text-sm text-zinc-500">No matches. Try a broader query or refresh the archive from GitHub.</p>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Agent tools</div></template>
        <ul class="space-y-1 font-mono text-xs text-zinc-400">
          <li><code>github.status</code> — connector, MCP, and archive metadata</li>
          <li><code>github.starchive.search</code> — search local starred snapshot</li>
          <li><code>github.starchive.get</code> — snapshot summary + preview</li>
          <li><code>github.starchive.refresh</code> — pull latest stars from GitHub API (approval required)</li>
          <li><code>mcp.stdio:github</code> — official GitHub MCP after install (approval required)</li>
        </ul>
      </UCard>
    </template>

    <template v-else-if="activeTab === 'memory'">
      <UCard>
        <template #header><div class="font-medium">Unified RAG memory</div></template>
        <p class="text-sm text-zinc-400">
          Persisted agent memories are merged into local RAG search alongside lab PDFs and transcripts.
          Optional MCP sidecars add external memory graphs (<code>supermemory-mcp</code>, Mem0 cloud, or official server-memory).
        </p>
        <UAlert v-if="memory.error" class="mt-3" title="Memory error" :description="memory.error" color="error" variant="subtle" />
        <div class="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div><span class="text-zinc-500">Persisted agent memories:</span> {{ memory.agentMemoryCount }}</div>
          <div>
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                :checked="memory.connectorEnabled"
                @change="memory.setAgentMemoryConnector(($event.target as HTMLInputElement).checked)"
              />
              Agent Memory RAG enabled
            </label>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Memory MCP sidecars</div></template>
        <div class="space-y-4">
          <div class="rounded border border-zinc-800 p-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="font-medium">SuperMemory (local)</div>
                <p class="text-xs text-zinc-500">npx supermemory-mcp · no API key</p>
              </div>
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  :checked="memory.isConnectorEnabled('supermemory')"
                  @change="memory.setMemoryMcpConnector('supermemory', ($event.target as HTMLInputElement).checked)"
                />
                Enable
              </label>
            </div>
            <p class="mt-2 text-xs text-zinc-500">MCP: {{ memory.mcpStatus('supermemory') }}</p>
          </div>

          <div class="rounded border border-zinc-800 p-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="font-medium">MCP Knowledge Graph</div>
                <p class="text-xs text-zinc-500">@modelcontextprotocol/server-memory</p>
              </div>
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  :checked="memory.isConnectorEnabled('mcp-memory')"
                  @change="memory.setMemoryMcpConnector('mcp-memory', ($event.target as HTMLInputElement).checked)"
                />
                Enable
              </label>
            </div>
            <p class="mt-2 text-xs text-zinc-500">MCP: {{ memory.mcpStatus('memory') }}</p>
          </div>

          <div class="rounded border border-zinc-800 p-3">
            <div class="font-medium">Mem0 Cloud (optional)</div>
            <p class="text-xs text-zinc-500">Requires MEM0_API_KEY · @mem0/mcp-server</p>
            <div class="mt-3 flex gap-2">
              <UInput v-model="memory.mem0KeyDraft" type="password" placeholder="MEM0_API_KEY" class="flex-1" :disabled="!vaultUnlocked" />
              <UButton size="sm" :loading="memory.busy" :disabled="!vaultUnlocked" @click="memory.saveMem0Key()">Save</UButton>
            </div>
            <label class="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                :checked="memory.isConnectorEnabled('mem0')"
                @change="memory.setMemoryMcpConnector('mem0', ($event.target as HTMLInputElement).checked)"
              />
              Enable Mem0 MCP
            </label>
            <p class="mt-2 text-xs text-zinc-500">MCP: {{ memory.mcpStatus('mem0') }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Search unified RAG</div></template>
        <div class="flex flex-wrap gap-2">
          <UInput v-model="memory.searchQuery" placeholder="Search documents and agent memories" class="flex-1 min-w-[12rem]" @keyup.enter="memory.runSearch()" />
          <UButton @click="memory.runSearch()">Search</UButton>
        </div>
        <ul v-if="memory.searchResults.length" class="mt-4 space-y-2 text-sm">
          <li v-for="hit in memory.searchResults" :key="hit.id" class="rounded border border-zinc-800 p-3">
            <div class="font-medium">{{ hit.title }}</div>
            <div class="text-xs text-zinc-500">{{ hit.kind }} · {{ hit.source }} · score {{ hit.score.toFixed(2) }}</div>
            <p class="mt-1 text-zinc-400">{{ hit.content.slice(0, 240) }}</p>
          </li>
        </ul>
        <p v-else class="mt-4 text-sm text-zinc-500">No matches yet.</p>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Agent tools</div></template>
        <ul class="space-y-1 font-mono text-xs text-zinc-400">
          <li><code>rag.search</code> — unified documents + agent memory search</li>
          <li><code>memory.search</code> — persisted agent memories</li>
          <li><code>documents.search</code> — document RAG only</li>
          <li><code>mcp.stdio:supermemory</code> / <code>mcp.stdio:mem0</code> / <code>mcp.stdio:memory</code></li>
        </ul>
      </UCard>
    </template>

    <template v-else-if="activeTab === 'research'">
      <UCard>
        <template #header><div class="font-medium">Literature & deep research</div></template>
        <p class="text-sm text-zinc-400">
          Starred research adapters: Paper Search MCP, PaperQA local-RAG, Local Deep Research, and Transcriptor.
          Sci-Hub stays disabled. Europe PMC is always available via <code>research.europepmc</code>.
        </p>
        <UAlert v-if="research.error" class="mt-3" title="Research error" :description="research.error" color="error" variant="subtle" />
        <ul class="mt-4 space-y-1 text-sm text-zinc-400">
          <li v-for="provider in research.providers" :key="provider.id">
            {{ provider.name }} — {{ provider.enabled ? 'enabled' : 'disabled' }}
            <span v-if="provider.requiresLocalRuntime" class="text-xs text-zinc-500">· local runtime</span>
          </li>
        </ul>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Paper Search MCP</div></template>
        <p class="text-xs text-zinc-500">uvx paper-search-mcp · arXiv, PubMed, bioRxiv, OpenAlex</p>
        <div class="mt-3 flex gap-2">
          <UInput v-model="research.unpaywallEmailDraft" placeholder="PAPER_SEARCH_MCP_UNPAYWALL_EMAIL" class="flex-1" :disabled="!vaultUnlocked" />
          <UButton size="sm" :loading="research.busy" :disabled="!vaultUnlocked" @click="research.saveUnpaywallEmail()">Save</UButton>
        </div>
        <label class="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="research.isConnectorEnabled('paper-search')" @change="research.setConnector('paper-search', ($event.target as HTMLInputElement).checked)" />
          Enable Paper Search
        </label>
        <p class="mt-2 text-xs text-zinc-500">MCP: {{ research.mcpStatus('paper-search') }}</p>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Local Deep Research</div></template>
        <p class="text-xs text-zinc-500">uvx local-deep-research[mcp] ldr-mcp · cited summaries sidecar</p>
        <div class="mt-3 flex gap-2">
          <UInput v-model="research.ldrProviderDraft" placeholder="LDR_LLM_PROVIDER (e.g. openai)" class="flex-1" :disabled="!vaultUnlocked" />
          <UButton size="sm" :loading="research.busy" :disabled="!vaultUnlocked" @click="research.saveLdrProvider()">Save</UButton>
        </div>
        <label class="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="research.isConnectorEnabled('local-deep-research')" @change="research.setConnector('local-deep-research', ($event.target as HTMLInputElement).checked)" />
          Enable Local Deep Research
        </label>
        <p class="mt-2 text-xs text-zinc-500">MCP: {{ research.mcpStatus('local-deep-research') }}</p>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">PaperQA (local RAG)</div></template>
        <p class="text-xs text-zinc-500">Citation contract over indexed lab PDFs — no PaperQA2 sidecar required for preview.</p>
        <label class="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="research.isConnectorEnabled('paper-qa')" @change="research.setConnector('paper-qa', ($event.target as HTMLInputElement).checked)" />
          Enable PaperQA connector
        </label>
        <div class="mt-4 flex flex-wrap gap-2">
          <UInput v-model="research.paperQaQuestion" placeholder="Scientific question" class="flex-1 min-w-[12rem]" @keyup.enter="research.runPaperQaPreview()" />
          <UButton @click="research.runPaperQaPreview()">Preview local answer</UButton>
        </div>
        <div v-if="research.paperQaAnswer" class="mt-4 rounded border border-zinc-800 p-3 text-sm">
          <div class="text-xs text-zinc-500">{{ research.paperQaAnswer.backend }} · confidence {{ research.paperQaAnswer.confidence.toFixed(2) }}</div>
          <p class="mt-2 text-zinc-300 whitespace-pre-wrap">{{ research.paperQaAnswer.answer.slice(0, 800) }}</p>
        </div>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Transcriptor MCP</div></template>
        <p class="text-xs text-zinc-500">Docker sidecar for playlists, Whisper fallback, and private YouTube videos.</p>
        <label class="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="research.isConnectorEnabled('transcriptor')" @change="research.setConnector('transcriptor', ($event.target as HTMLInputElement).checked)" />
          Enable Transcriptor MCP
        </label>
        <p class="mt-2 text-xs text-zinc-500">MCP: {{ research.mcpStatus('transcriptor') }}</p>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Agent tools</div></template>
        <ul class="space-y-1 font-mono text-xs text-zinc-400">
          <li><code>research.providers</code> / <code>research.status</code></li>
          <li><code>research.europepmc</code> — built-in bibliographic search</li>
          <li><code>research.paperqa.plan</code> / <code>research.paperqa.ask</code></li>
          <li><code>mcp.stdio:paper-search</code> / <code>mcp.stdio:local-deep-research</code> / <code>mcp.stdio:transcriptor</code></li>
        </ul>
      </UCard>
    </template>

    <template v-else-if="activeTab === 'plugins'">
      <UCard>
        <template #header><div class="font-medium">Domain plugins</div></template>
        <p class="text-sm text-zinc-400">
          Fearprime and Longevity are first-class domain plugins with manifests under <code>plugins/</code>.
          MCP connectors and OAuth live on <NuxtLink to="/connectors" class="underline underline-offset-4">Connectors</NuxtLink>;
          starred research adapters are on the Research tab.
        </p>
        <UAlert v-if="plugins.error" class="mt-3" title="Plugins error" :description="plugins.error" color="error" variant="subtle" />
        <div class="mt-4 grid gap-3 lg:grid-cols-2">
          <div
            v-for="plugin in plugins.domainPlugins"
            :key="plugin.id"
            class="rounded border border-zinc-800 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="font-medium">{{ plugin.name }}</div>
              <UBadge variant="subtle">v{{ plugin.version }}</UBadge>
            </div>
            <p class="mt-2 text-sm text-zinc-400">{{ plugin.description }}</p>
            <div class="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
              <span v-if="plugin.clinicalMode">Clinical mode</span>
              <span v-if="plugin.researchMode">Research mode</span>
              <span v-if="plugin.id === 'fearprime'">{{ plugins.fearprimeInterventionCount }} interventions</span>
              <span v-if="plugin.id === 'longevity'">{{ plugins.exerciseCatalog.count }} exercises</span>
            </div>
            <UButton class="mt-3" size="sm" variant="outline" :to="plugin.route">Open {{ plugin.name }}</UButton>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Starred integrations</div></template>
        <p class="text-xs text-zinc-500">Approved adapters from jekidev/stararchive — not wholesale merges. Sci-Hub stays off.</p>
        <ul class="mt-4 space-y-3">
          <li
            v-for="integration in plugins.starredIntegrations"
            :key="integration.id"
            class="rounded border border-zinc-800 p-3"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="font-medium">{{ integration.name }}</div>
                <p class="mt-1 text-sm text-zinc-400">{{ integration.description }}</p>
                <p class="mt-1 font-mono text-xs text-zinc-500">{{ integration.modulePath }}</p>
              </div>
              <div class="flex flex-col items-end gap-2">
                <UBadge variant="subtle">{{ integration.kind }}</UBadge>
                <UButton
                  v-if="integration.settingsTab === 'research'"
                  size="xs"
                  variant="ghost"
                  to="/settings?tab=research"
                >
                  Research settings
                </UButton>
                <UButton
                  v-else-if="integration.settingsTab === 'github'"
                  size="xs"
                  variant="ghost"
                  to="/settings?tab=github"
                >
                  GitHub settings
                </UButton>
                <UButton
                  v-else-if="integration.settingsTab === 'memory'"
                  size="xs"
                  variant="ghost"
                  to="/settings?tab=memory"
                >
                  Memory settings
                </UButton>
                <UButton
                  v-else-if="integration.settingsTab === 'connectors'"
                  size="xs"
                  variant="ghost"
                  to="/connectors"
                >
                  Connectors
                </UButton>
              </div>
            </div>
            <label
              v-if="integration.connectorId && integration.kind === 'connector'"
              class="mt-3 flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                :checked="plugins.isIntegrationEnabled(integration) ?? false"
                @change="plugins.setIntegrationConnector(integration.connectorId!, ($event.target as HTMLInputElement).checked)"
              />
              Enable {{ integration.name }} connector
            </label>
          </li>
        </ul>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Exercise catalog</div></template>
        <p class="text-xs text-zinc-500">
          {{ plugins.exerciseCatalog.count }} exercises · {{ plugins.exerciseCatalog.license }} · {{ plugins.exerciseCatalog.source }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UInput
            v-model="plugins.exerciseSearchQuery"
            placeholder="Search exercises (e.g. squat, dumbbell)"
            class="flex-1 min-w-[12rem]"
            @keyup.enter="plugins.runExerciseSearch()"
          />
          <UButton @click="plugins.runExerciseSearch()">Search</UButton>
        </div>
        <ul v-if="plugins.exerciseResults.length" class="mt-4 space-y-2 text-sm">
          <li v-for="exercise in plugins.exerciseResults" :key="exercise.id" class="rounded border border-zinc-800 p-3">
            <div class="font-medium">{{ exercise.name }}</div>
            <div class="text-xs text-zinc-500">{{ exercise.category }} · {{ exercise.equipment }} · {{ exercise.target }}</div>
          </li>
        </ul>
        <p v-else class="mt-4 text-sm text-zinc-500">Search the catalog. The same catalog is also on <NuxtLink to="/longevity/fitness" class="underline underline-offset-4">Longevity → Fitness</NuxtLink>.</p>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Longevity watchlist</div></template>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="tier in ['all', 'resource', 'clock', 'organization', 'reading'] as const"
            :key="tier"
            size="xs"
            :variant="plugins.watchlistTier === tier ? 'solid' : 'ghost'"
            @click="plugins.watchlistTier = tier"
          >
            {{ tier }}
          </UButton>
        </div>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-for="item in plugins.watchlistItems" :key="item.id" class="rounded border border-zinc-800 p-3">
            <a :href="item.url" target="_blank" rel="noopener noreferrer" class="font-medium underline underline-offset-4">{{ item.title }}</a>
            <div class="text-xs text-zinc-500">{{ item.tier }} · {{ item.source }}</div>
            <p class="mt-1 text-zinc-400">{{ item.notes }}</p>
          </li>
        </ul>
      </UCard>

      <div class="grid gap-4 lg:grid-cols-2">
        <UCard>
          <template #header><div class="font-medium">Garmin biometric map</div></template>
          <div class="grid gap-2 text-sm">
            <div><span class="text-zinc-500">OAuth client:</span> {{ plugins.garminStatus.oauthConfigured ? 'configured' : 'missing' }}</div>
            <div><span class="text-zinc-500">Access token:</span> {{ plugins.garminStatus.oauthConnected ? 'present' : 'missing' }}</div>
            <div><span class="text-zinc-500">Persisted samples:</span> {{ plugins.garminStatus.observationCount }}</div>
            <div><span class="text-zinc-500">Last sample:</span> {{ plugins.garminStatus.lastObservedAt ? new Date(plugins.garminStatus.lastObservedAt).toLocaleString() : 'None' }}</div>
          </div>
          <p v-if="plugins.garminStatus.metrics.length" class="mt-3 text-xs text-zinc-500">
            Synced metrics: {{ plugins.garminStatus.metrics.join(', ') }}
          </p>
          <p class="mt-4 text-xs text-zinc-500">Supported schema metrics:</p>
          <ul class="mt-2 space-y-1 font-mono text-xs text-zinc-400">
            <li v-for="metric in plugins.garminMetrics" :key="metric">{{ metric }}</li>
          </ul>
          <p class="mt-4 text-xs text-zinc-500">Rejected providers (use Garmin or Health Connect):</p>
          <p class="mt-1 text-xs text-zinc-400">{{ plugins.rejectedProviders.join(', ') }}</p>
          <UButton class="mt-3" size="sm" variant="outline" to="/health-sync">Open Health Sync</UButton>
        </UCard>

        <UCard>
          <template #header><div class="font-medium">PDF inspector</div></template>
          <p class="text-xs text-zinc-500">Classify a lab PDF as text, scanned, or mixed. Lab import uses this when the connector is enabled (on by default).</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton size="sm" variant="outline" @click="plugins.inspectSamplePdf()">Inspect sample PDF</UButton>
            <label class="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input type="file" accept="application/pdf" class="text-xs" @change="onPdfFileSelected">
              Upload PDF
            </label>
          </div>
          <div v-if="plugins.pdfInspection" class="mt-4 rounded border border-zinc-800 p-3 text-sm">
            <div class="font-medium capitalize">{{ plugins.pdfInspection.kind }}</div>
            <div class="text-xs text-zinc-500">
              text streams {{ plugins.pdfInspection.textStreamCount }} · images {{ plugins.pdfInspection.imageXObjectCount }}
              · OCR {{ plugins.pdfInspection.recommendOcr ? 'recommended' : 'not needed' }}
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header><div class="font-medium">Agent tools</div></template>
        <ul class="space-y-1 font-mono text-xs text-zinc-400">
          <li><code>plugins.status</code> — domain plugins + starred integration summary</li>
          <li><code>plugins.exercises.search</code> — search MIT exercise catalog</li>
          <li><code>plugins.watchlist.list</code> — geroscience watchlist</li>
          <li><code>plugins.garmin.schema</code> — Garmin-only biometric map</li>
          <li><code>plugins.garmin.status</code> — OAuth + persisted Garmin samples</li>
        </ul>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  getOpenRouterCatalogStatus,
  refreshOpenRouterCatalog,
  type OpenRouterCatalogStatus,
} from '~/services/llm-provider-bridge'
import { isTauriRuntime } from '~/utils/runtime-platform'
import { parseSettingsTab, settingsTabQuery, type SettingsTab } from '~/utils/settings-tabs'

const route = useRoute()
const router = useRouter()
const activeTab = computed(() => parseSettingsTab(route.query.tab))

function setTab(tab: SettingsTab) {
  void router.replace({ query: settingsTabQuery(tab) })
}

const { settings, vaultUnlocked, unlockVault: unlock, lockVault: lock, update, setProviderKey, clearKeys: clearProviderKeys, reset: resetSettings } = useLLM()
const github = useGitHubIntegration()
const memory = useMemoryIntegration()
const research = useResearchIntegration()
const plugins = usePluginsIntegration()
const browserDevPath = computed(() => !isTauriRuntime())
const vaultPassword = ref('')
const vaultBusy = ref(false)
const vaultError = ref('')
const catalogBusy = ref(false)
const catalogStatus = ref<OpenRouterCatalogStatus>(getOpenRouterCatalogStatus(settings.value))
const githubConnectorStatus = ref('disabled')

const openRouterProvider = computed(() => settings.value.providers.find((provider) => provider.provider === 'openrouter'))
const catalogFetchedLabel = computed(() => {
  if (!catalogStatus.value.fetchedAt) return 'Never'
  return new Date(catalogStatus.value.fetchedAt).toLocaleString()
})
const starchiveExportedLabel = computed(() => {
  const exportedAt = github.summary.value?.exportedAt
  return exportedAt ? new Date(exportedAt).toLocaleString() : 'Unknown'
})
const githubStatusLabel = computed(() => githubConnectorStatus.value)
const githubStatusColor = computed(() => {
  switch (githubConnectorStatus.value) {
    case 'connected': return 'success'
    case 'configured': return 'primary'
    case 'missing-credentials': return 'warning'
    default: return 'neutral'
  }
})

watch(settings, (value) => {
  catalogStatus.value = getOpenRouterCatalogStatus(value)
}, { deep: true })

onMounted(async () => {
  await github.loadCredentials()
  github.runSearch()
  githubConnectorStatus.value = (await github.refreshStatus()).status
  await memory.loadCredentials()
  memory.runSearch()
  plugins.runExerciseSearch()
  await plugins.refreshGarminStatus()
})

async function refreshGitHubStatus() {
  githubConnectorStatus.value = (await github.refreshStatus()).status
}

function save() {
  update({
    providers: settings.value.providers,
    preferFree: settings.value.preferFree,
    autoRotate: settings.value.autoRotate,
    showModel: settings.value.showModel,
    allowFrameworkWrite: settings.value.allowFrameworkWrite,
  })
}

async function unlockVault() {
  vaultError.value = ''
  vaultBusy.value = true
  try {
    await unlock(vaultPassword.value)
    vaultPassword.value = ''
  } catch (error) {
    vaultError.value = error instanceof Error ? error.message : String(error)
  } finally {
    vaultBusy.value = false
  }
}

async function lockVault() {
  vaultBusy.value = true
  try { await lock() } finally { vaultBusy.value = false }
}

async function saveKey(provider: typeof settings.value.providers[number]['provider'], apiKey: string) {
  try {
    await setProviderKey(provider, apiKey)
    if (provider === 'openrouter') catalogStatus.value = getOpenRouterCatalogStatus(settings.value)
  } catch (error) { vaultError.value = error instanceof Error ? error.message : String(error) }
}

async function refreshCatalog() {
  catalogBusy.value = true
  catalogStatus.value = await refreshOpenRouterCatalog(settings.value)
  catalogBusy.value = false
}

async function clearKeys() {
  try { await clearProviderKeys() } catch (error) { vaultError.value = error instanceof Error ? error.message : String(error) }
}

function reset() { resetSettings() }

async function saveGitHubToken() {
  await github.saveToken()
  await refreshGitHubStatus()
}

async function saveGitHubUsername() {
  await github.saveUsername()
}

async function onGitHubConnectorToggle(enabled: boolean) {
  await github.setConnector(enabled)
  if (enabled) github.ensureMcpInstalled()
  await refreshGitHubStatus()
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString()
}

function onPdfFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) plugins.inspectPdfFile(file)
}
</script>
