import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

  // Carregar vocabulário inicial
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

  // Salvar progresso no LocalStorage
  useEffect(() => {
    if (Object.keys(progress).length) localStorage.setItem('er_progress', JSON.stringify(progress))
  }, [progress])

  // Função de Áudio (Text-to-Speech)
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  const handleAnswer = (correct) => {
    if (!currentWord) return
    
    // Salvar lógica SRS
    setProgress(prev => {
      const curr = prev[currentWord.word] || { box: 1, nextReview: Date.now() }
      const newBox = correct ? Math.min(curr.box + 1, 5) : 1
      return {
        ...prev,
        [currentWord.word]: { ...curr, box: newBox, nextReview: Date.now() + newBox * 86400000 }
      }
    })

    // Tocar som de feedback (opcional, mas legal)
    // const audio = new Audio(correct ? 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3' : 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3')
    // audio.play()

    // Trocar palavra com animação
    const nextIndex = Math.floor(Math.random() * vocabulary.length)
    setCurrentWord(vocabulary[nextIndex])
    setRevealed(false)
  }

  const stats = {
    total: Object.keys(progress).length,
    mastered: Object.values(progress).filter(p => p.box >= 4).length
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-400 animate-pulse">Carregando biblioteca...</div>

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen text-slate-100 select-none">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1D9E75]">Word Drill IELTS</h1>
          <p className="text-sm text-slate-400">Real English + Band Score</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center border border-slate-700 shadow-lg">
          🎯
        </div>
      </header>

      <main>
        <AnimatePresence mode="wait">
          {currentWord ? (
            <motion.div 
              key={currentWord.word + revealed}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                {/* Background Glow Effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1D9E75] to-emerald-400"></div>
                
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-[#1D9E75] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    Band {currentWord.band}
                  </span>
                  <span className="text-slate-400 text-sm font-mono">{currentWord.topic}</span>
                </div>

                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <h2 className="text-4xl font-bold text-white">{currentWord.word}</h2>
                    {/* Botão de Áudio */}
                    <button 
                      onClick={() => speak(currentWord.word)}
                      className="p-2 rounded-full hover:bg-slate-700 transition text-slate-400 hover:text-[#1D9E75]"
                      title="Ouvir Pronúncia"
                    >
                      🔊
                    </button>
                  </div>
                </div>

                {revealed ? (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                      <p className="text-slate-300 text-lg">{currentWord.definition}</p>
                      {currentWord.example && (
                        <p className="text-slate-400 italic mt-2 border-l-2 border-[#1D9E75] pl-3">
                          "{currentWord.example}"
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button 
                        onClick={() => handleAnswer(false)} 
                        className="flex-1 py-4 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white transition transform active:scale-95 shadow-lg"
                      >
                        ❌ Errei
                      </button>
                      <button 
                        onClick={() => handleAnswer(true)} 
                        className="flex-1 py-4 bg-[#1D9E75] hover:bg-emerald-500 rounded-xl font-bold text-white transition transform active:scale-95 shadow-lg"
                      >
                        ✅ Acertei
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRevealed(true)} 
                    className="w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold text-lg transition shadow-lg mt-4"
                  >
                    👁️ Ver Resposta
                  </motion.button>
                )}
              </div>
            </motion.div>
          ) : (
            /* Dashboard View */
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700 shadow-xl">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Progresso</p>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-5xl font-bold text-white">{stats.mastered}</span>
                  <span className="text-[#1D9E75] mb-1 font-medium">mastered</span>
                </div>
                <div className="w-full bg-slate-700 h-3 rounded-full mt-4 overflow-hidden">
                  <motion.div 
                    className="bg-[#1D9E75] h-full rounded-full" 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.total ? (stats.mastered/stats.total)*100 : 0}%` }}
                    transition={{ duration: 1 }}
                  ></motion.div>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-right">{stats.total} palavras revisadas</p>
              </div>

              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCurrentWord(vocabulary[0])} 
                className="w-full py-5 bg-gradient-to-r from-[#1D9E75] to-emerald-600 rounded-xl font-bold text-xl text-white shadow-lg shadow-emerald-900/50"
              >
                🚀 Iniciar ({vocabulary.length} items)
              </motion.button>
              
              <div className="text-center text-xs text-slate-600">
                <p>Dica: Clique no ícone 🔊 para ouvir a pronúncia nativa.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="text-center text-xs text-slate-600 mt-8 pb-4">
        <p>English_Real v0.5 (React + Audio + Motion)</p>
      </footer>
    </div>
  )
}

export default App