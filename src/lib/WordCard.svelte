<script>
  // Props do componente (Svelte 5)
  let { 
    word, 
    definition, 
    example, 
    band, 
    topic,
    onReview = () => {} 
  } = $props();
  
  // Estado local
  let revealed = $state(false);
  let box = $state(1);

  function handleAnswer(correct) {
    box = correct ? Math.min(box + 1, 5) : 1;
    revealed = false;
    onReview({ word, correct, newBox: box });
  }
</script>

<div class="bg-brand-card border border-slate-700 rounded-2xl p-6 shadow-lg">
  <!-- Header: Band & Topic -->
  <div class="flex justify-between items-center mb-4">
    <span class="bg-brand text-white text-xs font-bold px-3 py-1 rounded-full">
      Band {band}
    </span>
    <span class="text-slate-400 text-sm capitalize">{topic}</span>
  </div>

  <!-- Palavra -->
  <h2 class="text-3xl font-bold mb-4 text-white">{word}</h2>

  {#if revealed}
    <!-- Conteúdo Revelado -->
    <div class="animate-fade space-y-3">
      <p class="text-slate-300">{definition}</p>
      <p class="text-slate-400 italic">"{example}"</p>
      
      <div class="flex gap-3 mt-6">
        <button 
          onclick={() => handleAnswer(false)}
          class="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition"
        >
          ❌ Errei
        </button>
        <button 
          onclick={() => handleAnswer(true)}
          class="flex-1 py-3 bg-brand hover:bg-brand-light rounded-xl font-bold transition text-white"
        >
          ✅ Acertei
        </button>
      </div>
    </div>
  {:else}
    <!-- Botão Revelar -->
    <button 
      onclick={() => revealed = true}
      class="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition"
    >
      👁️ Ver resposta
    </button>
  {/if}

  <!-- Indicador SRS -->
  <div class="mt-6">
    <div class="flex gap-1 h-2">
      {#each [1, 2, 3, 4, 5] as i}
        <div class="flex-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            class="h-full bg-brand transition-all duration-500" 
            class:w-full={i <= box}
          ></div>
        </div>
      {/each}
    </div>
    <p class="text-xs text-center text-slate-500 mt-2">
      {box === 1 ? 'Novo' : box === 5 ? 'Dominado' : `Caixa ${box}`}
    </p>
  </div>
</div>

<style>
  .animate-fade {
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>