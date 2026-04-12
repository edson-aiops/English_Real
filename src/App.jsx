import { useState, useEffect } from 'react'
import { loadVocabulary } from './lib/vocabulary.js'

function App() {
  const [vocabulary, setVocabulary] = useState([])
  const [currentWord, setCurrentWord] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('er_progress')
    return saved ? JSON.parse(saved) : {}
  })

  useEffect(() => {
    async function init() {
      try {
        const words = await loadVocabulary()
        setVocabulary(words)
        if (words.length > 0) setCurrentWord(words[0])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    init()
  }, [])

  useEffect(() => {
    if (Object.keys(progress).length) localStorage.setItem('er_progress', JSON.stringify(progress))
  }, [progress])

  const handleAnswer = (correct) => {
    if (!currentWord) return
    setProgress(prev => {
      const curr = prev[currentWord.word] || { box: 1, nextReview: Date.now() }
      const newBox = correct ? Math.min(curr.box + 1, 5) : 1
      return {
        ...prev,
        [currentWord.word]: { ...curr, box: newBox, nextReview: Date.now() + newBox * 86400000 }
      }
    })
    setCurrentWord(vocabulary[Math.floor(Math.random() * vocabulary.length)])
    setRevealed(false)
  }

  const stats = {
    total: Object.keys(progress).length,
    mastered: Object.values(progress).filter(p => p.box >= 4).length
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-400">Carregando...</div>

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen text-slate-100">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div><h1 className="text-2xl font-bold text-[#1D9E75]">Word Drill IELTS</h1><p className="text-sm text-slate-400">Real English + Band Score</p></div>
        <div className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center border border-slate-700">🎯</div>
      </header>

      <main>
        {currentWord ? (
          <>
            <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between mb-4">
                <span className="bg-[#1D9E75] text-white text-xs font-bold px-3 py-1 rounded-full">Band {currentWord.band}</span>
                <span className="text-slate-400 text-sm">{currentWord.topic}</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">{currentWord.word}</h2>
              {revealed ? (
                <div className="space-y-3">
                  <p className="text-slate-300">{currentWord.definition}</p>
                  {currentWord.example && <p className="text-slate-400 italic">"{currentWord.example}"</p>}
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => handleAnswer(false)} className="flex-1 py-3 bg-red-600 rounded-xl font-bold">❌ Errei</button>
                    <button onClick={() => handleAnswer(true)} className="flex-1 py-3 bg-[#1D9E75] rounded-xl font-bold text-white">✅ Acertei</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setRevealed(true)} className="w-full py-3 bg-slate-700 rounded-xl">👁️ Ver resposta</button>
              )}
            </div>
            <button onClick={() => setCurrentWord(null)} className="mt-4 w-full py-3 text-slate-400 hover:text-white">← Voltar</button>
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700">
              <p className="text-slate-400 text-sm">Progresso</p>
              <div className="flex justify-between mt-2"><span className="text-4xl font-bold">{stats.mastered}</span><span className="text-[#1D9E75] mb-1">mastered</span></div>
              <div className="w-full bg-slate-700 h-2 rounded-full mt-4"><div className="bg-[#1D9E75] h-full rounded-full transition-all" style={{ width: `${stats.total ? (stats.mastered/stats.total)*100 : 0}%` }}></div></div>
              <p className="text-xs text-slate-500 mt-2">{stats.total} revisadas</p>
            </div>
            <button onClick={() => setCurrentWord(vocabulary[0])} className="w-full py-4 bg-gradient-to-r from-[#1D9E75] to-emerald-600 rounded-xl font-bold text-lg text-white shadow-lg">🚀 Iniciar ({vocabulary.length} items)</button>
          </div>
        )}
      </main>
      <footer className="text-center text-xs text-slate-600 mt-8 pb-4">English_Real v0.4 (React)</footer>
    </div>
  )
}
export default App