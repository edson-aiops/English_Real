export async function loadVocabulary() {
  try {
    console.log('🔄 Carregando vocabulário...');
    
    const base = import.meta.env.BASE_URL;
    const urls = [
      `${base}vocabulary/band_5.0/words.json`,
      `${base}vocabulary/band_6.0/words.json`,
      `${base}vocabulary/band_6.5/words_groq.json`,
      `${base}vocabulary/real_english/phrasal_verbs.json`,
      `${base}vocabulary/real_english/contractions.json`,
      `${base}vocabulary/band_7.0/words.json`
    ];

    const results = [];
    
    for (const url of urls) {
      try {
        console.log(`📥 Carregando: ${url}`);
        const response = await fetch(url);
        const text = await response.text();
        console.log(`Texto recebido (${url}):`, text.substring(0, 100));
        
        // Remove BOM se existir
        const cleanText = text.replace(/^\uFEFF/, '');
        const json = JSON.parse(cleanText);
        
        results.push(json);
        console.log(`✅ Sucesso: ${url} - ${json.length} items`);
      } catch (err) {
        console.error(`❌ Falha em ${url}:`, err.message);
        results.push([]); // Retorna array vazio para não quebrar o resto
      }
    }

    const [band5, band6, band65, phrasals, contractions, band7] = results;

    const normalizedPhrasals = phrasals.map(item => ({
      ...item,
      word: item.phrasal_verb,
      definition: item.meaning,
      topic: "Real English",
      band: 6.5
    }));

    const normalizedContractions = contractions.map(item => ({
      word: item.contraction,
      definition: item.full_form,
      example: item.example,
      topic: "Real English",
      band: 6.5
    }));

    const total = [...band5, ...band6, ...band65, ...normalizedPhrasals, ...normalizedContractions, ...band7];
    
    console.log('📊 TOTAL GERAL:', total.length);
    return total;
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    return [];
  }
}