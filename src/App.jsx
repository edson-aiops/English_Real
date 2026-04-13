import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loadVocabulary } from './lib/vocabulary.js'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

function App() {
  const [vocabulary, setVocabulary] = useState([])
  const [currentWord, setCurrentWord] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showStats, setShowStats] = useState(false)
  
  // Carregar progresso do localStorage
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('er_progress')
    return saved ? JSON.parse(saved) : {}
  })
  
  // Carregar data da última sessão para calcular streak
  const [lastSession, setLastSession] = useState(() => {
    return localStorage.getItem('er_last_session') || null
  })

  // Carregar vocabulário
  useEffect(() => {
    async function init() {
      try {
        const words = await loadVocabulary()
        setVocabulary(words)
        if (words.length > 0 && !currentWord) setCurrentWord(words[0])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    init()
  }, [])

  // Salvar progresso + atualizar streak
  useEffect(() => {
    if (Object.keys(progress).length) {
      localStorage.setItem('er_progress', JSON.stringify(progress))
      
      // Atualizar streak
      const today = new Date().toDateString()
      const last = localStorage.getItem('er_last_session')
      if (last !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString()
        const currentStreak = last === yesterday ? (getStreak() + 1) : 1
        localStorage.setItem('er_streak', currentStreak.toString())
        localStorage.setItem('er_last_session', today)
        setLastSession(today)
      }
    }
  }, [progress])

  // Calcular streak atual
  const getStreak = () => {
    const saved = localStorage.getItem('er_streak')
    return saved ? parseInt(saved) : 0
  }

  // 🔊 Pronúncia
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  // Lógica SRS
  const handleAnswer = (correct) => {
    if (!currentWord) return
    setProgress(prev => {
      const curr = prev[currentWord.word] || { box: 1, nextReview: Date.now(), correct: 0, wrong: 0 }
      const newBox = correct ? Math.min(curr.box + 1, 5) : 1
      return {
        ...prev,
        [currentWord.word]: { 
          ...curr, 
          box: newBox, 
          nextReview: Date.now() + newBox * 86400000,
          correct: curr.correct + (correct ? 1 : 0),
          wrong: curr.wrong + (correct ? 0 : 1)
        }
      }
    })
    const nextIndex = Math.floor(Math.random() * vocabulary.length)
    setCurrentWord(vocabulary[nextIndex])
    setRevealed(false)
  }

  // 📊 Estatísticas Calculadas
  const stats = useMemo(() => {
    const entries = Object.entries(progress)
    const total = entries.length
    const mastered = entries.filter(([, p]) => p.box >= 4).length
    const learning = entries.filter(([, p]) => p.box >= 2 && p.box < 4).length
    const newWords = entries.filter(([, p]) => p.box === 1).length
    
    // Taxa de acerto
    const totalAnswers = entries.reduce((acc, [, p]) => acc + (p.correct || 0) + (p.wrong || 0), 0)
    const totalCorrect = entries.reduce((acc, [, p]) => acc + (p.correct || 0), 0)
    const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0
    
    // Distribuição por Box (para gráfico)
    const boxData = [
      { name: 'Novas', value: newWords, color: '#64748b' },
      { name: 'Aprendendo', value: learning, color: '#3b82f6' },
      { name: 'Dominadas', value: mastered, color: '#1D9E75' }
    ].filter(d => d.value > 0)
    
    // Distribuição por Band
    const bandStats = vocabulary.reduce((acc, word) => {
      const p = progress[word.word]
      if (p) {
        acc[word.band] = (acc[word.band] || 0) + 1
      }
      return acc
    }, {})
    
    return { total, mastered, learning, newWords, accuracy, boxData, bandStats, streak: getStreak() }
  }, [progress, vocabulary])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-400 animate-pulse">Carregando biblioteca...</div>

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen text-slate-100 select-none">
      {/* Header com Toggle Stats */}
      <header className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1D9E75]">Word Drill IELTS</h1>
          <p className="text-sm text-slate-400">v0.6 • Stats + PWA</p>
        </div>
        <button 
          onClick={() => setShowStats(!showStats)}
          className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center border border-slate-700 hover:border-[#1D9E75] transition"
        >
          {showStats ? '🎯' : '📊'}
        </button>
      </header>

      <AnimatePresence mode="wait">
        {showStats ? (
          /* 📊 DASHBOARD DE ESTATÍSTICAS */
          <motion.div 
            key="stats"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Cards de Métricas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111827] p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs">🔥 Streak</p>
                <p className="text-3xl font-bold text-orange-400">{stats.streak} dias</p>
              </div>
              <div className="bg-[#111827] p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs">🎯 Precisão</p>
                <p className="text-3xl font-bold text-[#1D9E75]">{stats.accuracy}%</p>
              </div>
              <div className="bg-[#111827] p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs">📚 Revisadas</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-[#111827] p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs">✅ Dominadas</p>
                <p className="text-3xl font-bold text-emerald-400">{stats.mastered}</p>
              </div>
            </div>

            {/* Gráfico de Progresso */}
            <div className="bg-[#111827] p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-sm mb-3">Progresso por Nível</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.boxData}
                      cx="50%" cy="50%"
                      innerRadius={40} outerRadius={60}
                      paddingAngle={5} dataKey="value"
                    >
                      {stats.boxData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-xs mt-2">
                {stats.boxData.map((d, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                    {d.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Progresso por Band */}
            <div className="bg-[#111827] p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-sm mb-3">Por Band Score</p>
              <div className="space-y-2">
                {Object.entries(stats.bandStats).sort((a,b) => a[0]-b[0]).map(([band, count]) => (
                  <div key={band} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Band {band}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#1D9E75] rounded-full transition-all"
                          style={{ width: `${Math.min((count / 60) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão Voltar */}
            <button 
              onClick={() => setShowStats(false)}
              className="w-full py-4 bg-gradient-to-r from-[#1D9E75] to-emerald-600 rounded-xl font-bold text-white shadow-lg"
            >
              🚀 Voltar para o Drill
            </button>
            
            {/* PWA Install Hint */}
            <p className="text-center text-xs text-slate-500">
              💡 No celular: use "Adicionar à tela inicial" para instalar o app!
            </p>
          </motion.div>
        ) : (
          /* 🎯 MODO DRILL NORMAL */
          <motion.div key="drill" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {currentWord ? (
              <motion.div 
                key={currentWord.word + revealed}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
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
                      <button 
                        onClick={() => speak(currentWord.word)}
                        className="p-2 rounded-full hover:bg-slate-700 transition text-slate-400 hover:text-[#1D9E75]"
                        title="Ouvir Pronúncia"
                      >
                        🔊
                      </button>
                    </div>
                    {/* Mini indicador de progresso da palavra */}
                    {progress[currentWord.word] && (
                      <div className="flex justify-center gap-1 mt-2">
                        {[1,2,3,4,5].map(box => (
                          <div 
                            key={box}
                            className={`w-2 h-2 rounded-full transition-all ${
                              box <= progress[currentWord.word].box ? 'bg-[#1D9E75]' : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {revealed ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-4">
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <p className="text-slate-300 text-lg">{currentWord.definition}</p>
                        {currentWord.example && (
                          <p className="text-slate-400 italic mt-2 border-l-2 border-[#1D9E75] pl-3">
                            "{currentWord.example}"
                          </p>
                        )}
                      </div>
                      <div className="flex gap-3 mt-6">
                        <button onClick={() => handleAnswer(false)} className="flex-1 py-4 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white transition transform active:scale-95 shadow-lg">❌ Errei</button>
                        <button onClick={() => handleAnswer(true)} className="flex-1 py-4 bg-[#1D9E75] hover:bg-emerald-500 rounded-xl font-bold text-white transition transform active:scale-95 shadow-lg">✅ Acertei</button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setRevealed(true)} className="w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold text-lg transition shadow-lg mt-4">
                      👁️ Ver Resposta
                    </motion.button>
                  )}
                </div>
                <button onClick={() => setCurrentWord(null)} className="mt-4 w-full py-3 text-slate-400 hover:text-white transition">← Voltar</button>
              </motion.div>
            ) : (
              /* Dashboard Inicial */
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Seu Progresso</p>
                    <span className="text-orange-400 text-sm font-bold">🔥 {stats.streak} dias</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-5xl font-bold text-white">{stats.mastered}</span>
                    <span className="text-[#1D9E75] mb-1 font-medium">palavras dominadas</span>
                  </div>
                  <div className="w-full bg-slate-700 h-3 rounded-full mt-4 overflow-hidden">
                    <motion.div className="bg-[#1D9E75] h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${vocabulary.length ? (stats.mastered/vocabulary.length)*100 : 0}%` }} transition={{ duration: 1 }}></motion.div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-right">{stats.total} de {vocabulary.length} palavras revisadas</p>
                </div>

                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setCurrentWord(vocabulary[0])} className="w-full py-5 bg-gradient-to-r from-[#1D9E75] to-emerald-600 rounded-xl font-bold text-xl text-white shadow-lg shadow-emerald-900/50">
                  🚀 Iniciar ({vocabulary.length} items)
                </motion.button>
                
                <div className="text-center text-xs text-slate-500">
                  <p>Dica: Clique em 📊 no topo para ver estatísticas detalhadas</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="text-center text-xs text-slate-600 mt-8 pb-4">
        <p>English_Real v0.6 • PWA + Stats + Audio</p>
      </footer>
    </div>
  )
}

export default App