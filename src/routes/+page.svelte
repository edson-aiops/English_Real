<script>
  import { onMount } from 'svelte';
  import { loadProgress, stats, reviewWord } from '../lib/srs.js';
  import WordCard from '../components/WordCard.svelte';

  let isDrilling = $state(false);
  
  // Mock data (será substituído pelos JSONs depois)
  const mockWord = {
    word: "Analyse",
    definition: "To examine something in detail to understand it better",
    example: "Researchers analysed data from 500 participants",
    band: 6.0,
    topic: "Academic"
  };

  onMount(() => {
    loadProgress();
  });

  function handleReview({ word, correct, newBox }) {
    reviewWord(word, correct);
  }
</script>

<div class="max-w-md mx-auto p-4 min-h-screen flex flex-col justify-between">
  
  <!-- Header -->
  <header class="flex justify-between items-center mb-8">
    <div>
      <h1 class="text-2xl font-bold text-brand">Word Drill IELTS</h1>
      <p class="text-sm text-slate-400">Real English + Band Score</p>
    </div>
    <div class="w-10 h-10 rounded-full bg-brand-card flex items-center justify-center border border-slate-700">
      🎯
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1">
    {#if isDrilling}
      <WordCard {...mockWord} onReview={handleReview} />
      <button 
        onclick={() => isDrilling = false}
        class="mt-4 w-full py-3 text-slate-400 hover:text-white transition"
      >
        ← Voltar ao Dashboard
      </button>
    {:else}
      <!-- Dashboard -->
      <div class="space-y-6">
        
        <!-- Stats Card -->
        <div class="bg-brand-card p-6 rounded-2xl border border-slate-700">
          <p class="text-slate-400 text-sm">Progresso Atual</p>
          <div class="flex items-end justify-between mt-2">
            <span class="text-4xl font-bold text-white">{stats.mastered}</span>
            <span class="text-brand mb-1">words mastered</span>
          </div>
          <div class="w-full bg-slate-700 h-2 rounded-full mt-4 overflow-hidden">
            <div 
              class="bg-brand h-full rounded-full transition-all duration-500" 
              style="width: {stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0}%"
            ></div>
          </div>
          <p class="text-xs text-slate-500 mt-2">
            {stats.total} palavras revisadas
          </p>
        </div>

        <!-- CTA Button -->
        <button 
          onclick={() => isDrilling = true}
          class="w-full py-4 bg-gradient-to-r from-brand to-emerald-600 rounded-xl font-bold text-lg text-white shadow-lg shadow-brand/20 hover:scale-[1.02] transition-transform"
        >
          🚀 Iniciar Treino (SRS)
        </button>

        <!-- Info Card -->
        <div class="bg-brand-card p-4 rounded-xl border border-slate-700">
          <h3 class="font-semibold mb-2">📚 Conteúdo Disponível</h3>
          <ul class="text-sm text-slate-400 space-y-1">
            <li>• Band 6.0: 100 palavras ✅</li>
            <li>• Band 6.5: 141 palavras ✅</li>
            <li>• Real English: 5 phrasal verbs ✅</li>
          </ul>
        </div>

      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="text-center text-xs text-slate-600 mt-8 pb-4">
    <p>English_Real v0.1 (Svelte 5)</p>
    <p class="mt-1">"figure out" > "determine"</p>
  </footer>

</div>