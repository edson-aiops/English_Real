export async function loadVocabulary() {
  try {
    const [band6, band65, phrasals, contractions] = await Promise.all([
      fetch('/vocabulary/band_6.0/words.json').then(r => r.json()),
      fetch('/vocabulary/band_6.5/words_groq.json').then(r => r.json()),
      fetch('/vocabulary/real_english/phrasal_verbs.json').then(r => r.json()),
      fetch('/vocabulary/real_english/contractions.json').then(r => r.json()) // ← NOVO
    ]);

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

    return [...band6, ...band65, ...normalizedPhrasals, ...normalizedContractions];
  } catch (error) {
    console.error("Erro ao carregar vocabulário:", error);
    return [];
  }
}