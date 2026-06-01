import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loadVocabulary } from './lib/vocabulary.js'
import { reportDrillCorrect } from './lib/mastery.js'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

function shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateOptions(current, allWords) {
  if (!current || !allWords || allWords.length < 2) return [current?.definition].filter(Boolean)
  const correct = current.definition
  const others = allWords.filter(w => w.word !== current.word && w.definition && w.definition !== correct)
  // Prefer same band, then same topic
  const sameBand = others.filter(w => w.band === current.band)
  const sameTopic = others.filter(w => w.topic === current.topic)
  let pool = sameBand.length >= 3 ? sameBand : sameTopic.length >= 3 ? sameTopic : others
  if (pool.length < 3) pool = others
  const distractors = shuffle(pool).slice(0, 3).map(w => w.definition)
  const uniqueDistractors = [...new Set(distractors)].filter(d => d !== correct)
  // Fill up to 3 if we lost some to dedup
  let finalDistractors = uniqueDistractors
  if (finalDistractors.length < 3) {
    const fallback = shuffle(others.filter(w => w.definition !== correct && !finalDistractors.includes(w.definition)))
    while (finalDistractors.length < 3 && fallback.length > 0) {
      const d = fallback.pop().definition
      if (!finalDistractors.includes(d)) finalDistractors.push(d)
    }
  }
  return shuffle([correct, ...finalDistractors])
}

function App() {
  const [vocabulary, setVocabulary] = useState([])
  const [currentWord, setCurrentWord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showStats, setShowStats] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [installReady, setInstallReady] = useState(false)
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone

  useEffect(() => {
    const handler = () => setInstallReady(true)
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Quiz state
  const [quizOptions, setQuizOptions] = useState([])
  const [firstAttemptWrong, setFirstAttemptWrong] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [validHit, setValidHit] = useState(false)
  const [showResult, setShowResult] = useState(false)

  // Carregar progresso do localStorage
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('er_progress')
    return saved ? JSON.parse(saved) : {}
  })

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

  // Gerar opções quando currentWord muda
  useEffect(() => {
    if (currentWord) {
      setQuizOptions(generateOptions(currentWord, vocabulary))
      setFirstAttemptWrong(false)
      setSelectedOption(null)
      setValidHit(false)
      setShowResult(false)
    }
  }, [currentWord, vocabulary])

  // Lógica SRS — só chamada internamente, não exposta como antes
  const updateSRS = (correct) => {
    if (!currentWord) return
    setProgress(prev => {
      const curr = prev[currentWord.word] || { box: 1, nextReview: Date.now(), correct: 0, wrong: 0 }
      const newBox = correct ? Math.min(curr.box + 1, 5) : Math.max(curr.box - 1, 1)
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
  }

  const goNext = () => {
    const nextIndex = Math.floor(Math.random() * vocabulary.length)
    setCurrentWord(vocabulary[nextIndex])
  }

  // Quiz: usuário escolhe uma definição
  const handleSelect = (chosenDefinition) => {
    if (!currentWord || showResult) return
    const isCorrect = chosenDefinition === currentWord.definition
    setSelectedOption(chosenDefinition)
    setShowResult(true)

    if (isCorrect && !firstAttemptWrong) {
      // Acerto VÁLIDO de primeira
      setValidHit(true)
      updateSRS(true)
      reportDrillCorrect(currentWord.word)
    } else if (!isCorrect && !firstAttemptWrong) {
      // Errou na primeira tentativa — marca como invalidado para esta rodada
      setFirstAttemptWrong(true)
      updateSRS(false)
    }
    // Se já tinha errado antes e agora acertou: não conta como válido, não chama updateSRS
  }

  // 📊 Estatísticas Calculadas
  const stats = useMemo(() => {
    const entries = Object.entries(progress)
    const total = entries.length
    const mastered = entries.filter(([, p]) => p.box >= 4).length
    const learning = entries.filter(([, p]) => p.box >= 2 && p.box < 4).length
    const newWords = entries.filter(([, p]) => p.box === 1).length

    const totalAnswers = entries.reduce((acc, [, p]) => acc + (p.correct || 0) + (p.wrong || 0), 0)
    const totalCorrect = entries.reduce((acc, [, p]) => acc + (p.correct || 0), 0)
    const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0

    const boxData = [
      { name: 'Novas', value: newWords, color: '#64748b' },
      { name: 'Aprendendo', value: learning, color: '#3b82f6' },
      { name: 'Dominadas', value: mastered, color: '#1D9E75' }
    ].filter(d => d.value > 0)

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
      {/* Update bar */}
      <div id="update-bar" style={{display:'none', alignItems:'center', justifyContent:'space-between', background:'#fef3c7', color:'#92400e', padding:'8px 12px', borderRadius:'8px', marginBottom:'12px', fontSize:'14px'}}>
        <span>🔄 Nova versão disponível</span>
        <button onClick={() => { navigator.serviceWorker.ready.then(r => r.waiting?.postMessage({type:'SKIP_WAITING'})); }} style={{background:'#f59e0b', color:'white', border:'none', borderRadius:'6px', padding:'4px 10px', cursor:'pointer', fontSize:'13px'}}>Atualizar agora</button>
      </div>
      {/* Header com Toggle Stats */}
      <header className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1D9E75]">Word Drill IELTS</h1>
          <p className="text-sm text-slate-400">v0.7 • Quiz Validado</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center border border-slate-700 hover:border-[#1D9E75] transition"
            title="Configurações"
          >
            ⚙️
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center border border-slate-700 hover:border-[#1D9E75] transition"
          >
            {showStats ? '🎯' : '📊'}
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {showSettings ? (
          /* ⚙️ CONFIGURAÇÕES */
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="bg-[#111827] p-5 rounded-xl border border-slate-700 space-y-4">
              <h2 className="text-lg font-bold text-white">⚙️ Configurações</h2>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Chave da API Groq</label>
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener" className="text-[#1D9E75] text-sm hover:underline">Como obter chave Groq ↗</a>
              </div>

              <div className="flex flex-wrap gap-2">
                {(installReady || (isIOS && !isStandalone)) && (
                  <button
                    id="install-btn"
                    onClick={async () => {
                      if (window.deferredInstallPrompt) {
                        window.deferredInstallPrompt.prompt()
                        await window.deferredInstallPrompt.userChoice
                        window.deferredInstallPrompt = null
                        setInstallReady(false)
                      } else if (isIOS) {
                        alert('No iPhone: toque em Compartilhar → "Adicionar à Tela de Início"')
                      } else {
                        alert('App já instalado ou instalação indisponível neste navegador.')
                      }
                    }}
                    className="px-3 h-10 rounded-full bg-[#1D9E75] text-sm font-semibold flex items-center justify-center border border-[#1D9E75] hover:bg-[#168a63] transition"
                  >
                    {isIOS && !window.deferredInstallPrompt ? '📲 Como instalar' : '📲 Instalar app'}
                  </button>
                )}
                <button
                  onClick={() => { if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(r => r.waiting?.postMessage({type:'SKIP_WAITING'})) }}
                  className="px-3 h-10 rounded-full bg-[#f59e0b] text-sm font-semibold flex items-center justify-center border border-[#f59e0b] hover:bg-[#d97706] transition text-white"
                >
                  🔄 Atualizar
                </button>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                <span className="text-muted text-sm text-slate-400">v0.8 • PWA</span>
                <button onClick={() => setShowSettings(false)} className="px-4 h-9 rounded-full bg-[#374151] text-sm hover:bg-[#4b5563] transition">Voltar</button>
              </div>
            </div>
          </motion.div>
        ) : showStats ? (
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
          /* 🎯 MODO DRILL — QUIZ VALIDADO */
          <motion.div key="drill" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {currentWord ? (
              <motion.div
                key={currentWord.word}
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

                  {/* Opções do quiz */}
                  <div className="space-y-3 mt-4">
                    {quizOptions.map((opt, idx) => {
                      let btnClass = 'w-full py-3 px-4 rounded-xl font-medium text-left transition transform active:scale-95 border '
                      if (!showResult) {
                        btnClass += 'bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-200'
                      } else if (opt === currentWord.definition) {
                        btnClass += 'bg-[#1D9E75] border-[#1D9E75] text-white'
                      } else if (opt === selectedOption) {
                        btnClass += 'bg-red-600 border-red-600 text-white'
                      } else {
                        btnClass += 'bg-slate-800 border-slate-600 text-slate-500 opacity-60'
                      }
                      return (
                        <motion.button
                          key={idx}
                          whileHover={!showResult ? { scale: 1.01 } : {}}
                          whileTap={!showResult ? { scale: 0.98 } : {}}
                          onClick={() => handleSelect(opt)}
                          className={btnClass}
                          disabled={showResult}
                        >
                          <span className="mr-2 text-sm font-bold opacity-50">{String.fromCharCode(65 + idx)}.</span>
                          {opt}
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Feedback + Próxima */}
                  {showResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 space-y-3"
                    >
                      {validHit ? (
                        <div className="bg-emerald-900/40 border border-emerald-600/50 p-4 rounded-xl text-center">
                          <p className="text-emerald-400 font-bold text-lg">✅ Acerto válido!</p>
                          <p className="text-emerald-300 text-sm mt-1">Contou no progresso.</p>
                        </div>
                      ) : firstAttemptWrong && selectedOption === currentWord.definition ? (
                        <div className="bg-yellow-900/40 border border-yellow-600/50 p-4 rounded-xl text-center">
                          <p className="text-yellow-400 font-bold text-lg">⚠️ Acertou, mas não conta</p>
                          <p className="text-yellow-300 text-sm mt-1">Você errou na primeira tentativa. Continue praticando!</p>
                        </div>
                      ) : firstAttemptWrong ? (
                        <div className="bg-red-900/40 border border-red-600/50 p-4 rounded-xl text-center">
                          <p className="text-red-400 font-bold text-lg">❌ Errou</p>
                          <p className="text-red-300 text-sm mt-1">Resposta correta destacada em verde.</p>
                        </div>
                      ) : null}

                      {currentWord.example && (
                        <p className="text-slate-400 italic border-l-2 border-[#1D9E75] pl-3">
                          "{currentWord.example}"
                        </p>
                      )}

                      <button
                        onClick={goNext}
                        className="w-full py-4 bg-gradient-to-r from-[#1D9E75] to-emerald-600 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95"
                      >
                        🚀 Próxima palavra
                      </button>
                    </motion.div>
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
        <p>English_Real v0.7 • Quiz Validado + PWA</p>
      </footer>
    </div>
  )
}

export default App
