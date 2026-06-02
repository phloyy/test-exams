import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, BookOpen, Trophy, AlertCircle, CheckCircle, XCircle, Save, SkipForward, ClipboardList, Filter, Upload, Trash2, FileText, GraduationCap, Layers, Search } from 'lucide-react';
import managementRaw from './data/management.json';
import economicsRaw from './data/economics.json';
import businessCommunicationRaw from './data/business_communication.json';
import FlashcardDeck from './components/FlashcardDeck';
import QuestionSearch from './components/QuestionSearch';
import HelpButton from './components/HelpButton';

// Сколько вопросов в одном варианте
const VARIANT_SIZE = 30;

// Ключи localStorage
const IMPORTED_KEY = 'quiz_imported_subjects';
const progressKeyFor = (subjectId, variantId) => `quiz_progress_${subjectId}_${variantId}`;

// Приведение одного вопроса к внутреннему формату.
// Поддерживает оба формата: новый JSON ({options:[{text,isCorrect}], explanation:"строка"})
// и внутренний ({answers:[{text,correct}], explanation:{correct,details}}).
const normalizeQuestion = (raw, id) => {
  const source = raw.answers || raw.options || [];
  const answers = source.map((a) => ({
    text: a.text,
    correct: a.correct ?? a.isCorrect ?? false,
  }));

  let explanation;
  if (typeof raw.explanation === 'string') {
    explanation = { correct: raw.explanation, details: {} };
  } else if (raw.explanation && typeof raw.explanation === 'object') {
    explanation = {
      correct: raw.explanation.correct || '',
      details: raw.explanation.details || {},
    };
  } else {
    explanation = { correct: '', details: {} };
  }

  return { id, question: raw.question, answers, explanation };
};

// Построение предмета: нормализация вопросов + разбивка на варианты
const buildSubject = (meta, rawArray) => {
  const arr = Array.isArray(rawArray) ? rawArray : [];
  const questions = arr.map((q, i) => normalizeQuestion(q, i + 1));

  const variants = [];
  for (let i = 0; i < questions.length; i += VARIANT_SIZE) {
    variants.push({
      id: variants.length + 1,
      name: `Вариант ${variants.length + 1}`,
      questions: questions.slice(i, i + VARIANT_SIZE),
    });
  }
  if (variants.length === 0) {
    variants.push({ id: 1, name: 'Вариант 1', questions: [] });
  }

  return { ...meta, totalQuestions: questions.length, variants };
};

// Встроенные предметы
const BUILTIN_SUBJECTS = [
  buildSubject({ id: 'management', name: 'Менеджмент', icon: '📊', builtin: true }, managementRaw),
  buildSubject({ id: 'economics', name: 'Экономика', icon: '💰', builtin: true }, economicsRaw),
  buildSubject({ id: 'business_communication', name: 'Деловое общение', icon: '🤝', builtin: true }, businessCommunicationRaw),
];

// Проверка, что загруженный JSON — корректный массив вопросов
const isValidQuizArray = (data) =>
  Array.isArray(data) &&
  data.length > 0 &&
  data.every(
    (q) =>
      q &&
      typeof q.question === 'string' &&
      Array.isArray(q.answers || q.options)
  );

// Загрузка импортированных предметов из localStorage
const loadImportedSubjects = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(IMPORTED_KEY) || '[]');
    return saved.map((s) =>
      buildSubject({ id: s.id, name: s.name, icon: '📦', builtin: false }, s.data)
    );
  } catch (e) {
    console.error('Ошибка загрузки импортированных предметов:', e);
    return [];
  }
};

// Функция для перемешивания массива (Fisher-Yates)
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Функция для получения детального пояснения
const getExplanation = (question, selectedAnswer, isCorrect) => {
  const correctAnswer = question.answers.find(a => a.correct);
  
  if (isCorrect) {
    if (question.explanation?.correct) {
      return question.explanation.correct;
    }
    return `Верно! ${correctAnswer.text}`;
  } else {
    let explanation = '';
    
    if (question.explanation?.details?.[selectedAnswer]) {
      explanation = question.explanation.details[selectedAnswer];
    } else {
      explanation = `Выбранный вариант неверен.`;
    }
    
    explanation += `\n\n✅ Правильный ответ: ${correctAnswer.text}`;
    
    if (question.explanation?.correct) {
      explanation += `\n\n${question.explanation.correct}`;
    }
    
    return explanation;
  }
};


function MathExam() {
  const [subjects, setSubjects] = useState(BUILTIN_SUBJECTS);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [mode, setMode] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [skipped, setSkipped] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [showExamResults, setShowExamResults] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all', 'correct', 'incorrect', 'skipped'
  const [shuffledAnswers, setShuffledAnswers] = useState({});
  const [importError, setImportError] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Текущий предмет / вариант / набор вопросов
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || null;
  const selectedVariant = selectedSubject?.variants.find((v) => v.id === selectedVariantId) || null;
  const QUESTIONS_DATA = selectedVariant?.questions || [];
  const progressKey =
    selectedSubjectId && selectedVariantId
      ? progressKeyFor(selectedSubjectId, selectedVariantId)
      : null;

  // Подгрузка импортированных предметов при старте
  useEffect(() => {
    setSubjects([...BUILTIN_SUBJECTS, ...loadImportedSubjects()]);
  }, []);

  // Сброс состояния прохождения теста
  const clearQuizState = () => {
    setMode(null);
    setCurrentQ(0);
    setAnswers({});
    setSkipped({});
    setShowResult(false);
    setShowExamResults(false);
    setShowReview(false);
    setShuffledAnswers({});
  };

  // Загрузка прогресса при выборе варианта
  useEffect(() => {
    if (!progressKey) return;
    const saved = localStorage.getItem(progressKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setAnswers(data.answers || {});
        setSkipped(data.skipped || {});
        setCurrentQ(data.currentQ || 0);
        setMode(data.mode || null);
      } catch (e) {
        console.error('Ошибка загрузки прогресса:', e);
      }
    }
  }, [progressKey]);

  // Автосохранение прогресса
  useEffect(() => {
    if (progressKey && mode) {
      const data = { answers, skipped, currentQ, mode };
      localStorage.setItem(progressKey, JSON.stringify(data));
    }
  }, [answers, skipped, currentQ, mode, progressKey]);

  // Перемешивание ответов для текущего вопроса
  useEffect(() => {
    const question = QUESTIONS_DATA[currentQ];
    if (question && !shuffledAnswers[question.id]) {
      setShuffledAnswers({
        ...shuffledAnswers,
        [question.id]: shuffleArray(question.answers)
      });
    }
  }, [currentQ, selectedVariantId]);

  // Навигация по экранам
  const backToSubjects = () => {
    clearQuizState();
    setSelectedVariantId(null);
    setSelectedSubjectId(null);
  };

  const backToVariants = () => {
    clearQuizState();
    setSelectedVariantId(null);
  };

  const chooseSubject = (id) => {
    clearQuizState();
    setSelectedVariantId(null);
    setSelectedSubjectId(id);
  };

  const chooseVariant = (id) => {
    clearQuizState();
    setSelectedVariantId(id);
  };

  // Импорт пользовательского JSON-файла
  const handleImport = (event) => {
    setImportError('');
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!isValidQuizArray(data)) {
          setImportError('Неверный формат: ожидается массив вопросов с полями question и options/answers.');
          return;
        }
        const baseName = file.name.replace(/\.json$/i, '');
        const name = (window.prompt('Название предмета:', baseName) || baseName).trim();
        if (!name) return;

        const id = `imported_${Date.now()}`;
        const saved = JSON.parse(localStorage.getItem(IMPORTED_KEY) || '[]');
        saved.push({ id, name, data });
        localStorage.setItem(IMPORTED_KEY, JSON.stringify(saved));
        setSubjects([...BUILTIN_SUBJECTS, ...loadImportedSubjects()]);
      } catch (err) {
        setImportError('Не удалось прочитать файл: ' + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // позволяет импортировать тот же файл повторно
  };

  // Удаление импортированного предмета
  const deleteImportedSubject = (id) => {
    if (!window.confirm('Удалить этот импортированный предмет?')) return;
    const saved = JSON.parse(localStorage.getItem(IMPORTED_KEY) || '[]').filter((s) => s.id !== id);
    localStorage.setItem(IMPORTED_KEY, JSON.stringify(saved));
    // Чистим сохранённый прогресс по вариантам удалённого предмета
    Object.keys(localStorage)
      .filter((k) => k.startsWith(`quiz_progress_${id}_`))
      .forEach((k) => localStorage.removeItem(k));
    setSubjects([...BUILTIN_SUBJECTS, ...loadImportedSubjects()]);
  };

  const question = QUESTIONS_DATA[currentQ];
  const displayAnswers = shuffledAnswers[question?.id] || question?.answers || [];
  const userAnswer = answers[question?.id];
  const isSkipped = skipped[question?.id];
  const correctAnswer = question?.answers.find(a => a.correct);
  const isCorrect = userAnswer === correctAnswer?.text;

  const handleAnswer = (answerText) => {
    const newAnswers = { ...answers, [question.id]: answerText };
    setAnswers(newAnswers);
    
    // Убираем из пропущенных если отвечаем
    if (skipped[question.id]) {
      const newSkipped = { ...skipped };
      delete newSkipped[question.id];
      setSkipped(newSkipped);
    }
    
    if (mode === 'training') {
      setShowResult(true);
    }
  };

  const handleSkip = () => {
    setSkipped({ ...skipped, [question.id]: true });
    nextQuestion();
  };

  const nextQuestion = () => {
    if (currentQ < QUESTIONS_DATA.length - 1) {
      setCurrentQ(currentQ + 1);
      setShowResult(false);
    } else if (mode === 'exam') {
      setShowExamResults(true);
    }
  };

  const prevQuestion = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      setShowResult(false);
    }
  };

  const reset = () => {
    setCurrentQ(0);
    setAnswers({});
    setSkipped({});
    setShowResult(false);
    setShowExamResults(false);
    setShowReview(false);
    setMode(null);
    if (progressKey) localStorage.removeItem(progressKey);
  };

  const saveProgress = () => {
    alert('✅ Прогресс сохранён! Можешь закрыть страницу и вернуться позже.');
  };

  const stats = {
    answered: Object.keys(answers).length,
    skippedCount: Object.keys(skipped).length,
    correct: Object.entries(answers).filter(([qId, ans]) => {
      const q = QUESTIONS_DATA.find(qu => qu.id === parseInt(qId));
      return ans === q?.answers.find(a => a.correct)?.text;
    }).length,
    total: QUESTIONS_DATA.length
  };

  // Страница-база вопросов с поиском
  if (showSearch) {
    return <QuestionSearch subjects={subjects} onExit={() => setShowSearch(false)} />;
  }

  // Экран выбора предмета
  if (!selectedSubjectId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <GraduationCap className="w-16 h-16 mx-auto text-purple-600 mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Подготовка к тестам</h1>
              <p className="text-gray-600">Выберите предмет для подготовки</p>
            </div>

            <button
              onClick={() => setShowSearch(true)}
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-purple-200 bg-purple-50 py-3 font-medium text-purple-700 transition-colors hover:bg-purple-100"
            >
              <Search className="h-5 w-5" />
              Поиск по всем вопросам
            </button>

            <div className="space-y-3">
              {subjects.map((subject) => {
                const hasProgress = subject.variants.some((v) =>
                  localStorage.getItem(progressKeyFor(subject.id, v.id))
                );
                return (
                  <div key={subject.id} className="flex items-center gap-2">
                    <button
                      onClick={() => chooseSubject(subject.id)}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-5 rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-left">
                          <span className="text-3xl">{subject.icon}</span>
                          <div>
                            <h3 className="text-xl font-bold">{subject.name}</h3>
                            <p className="text-sm text-purple-100">
                              {subject.totalQuestions} вопросов · {subject.variants.length} вар.
                              {!subject.builtin && ' · импортирован'}
                              {hasProgress && ' · есть прогресс'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6" />
                      </div>
                    </button>
                    {!subject.builtin && (
                      <button
                        onClick={() => deleteImportedSubject(subject.id)}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить импортированный предмет"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Импорт JSON */}
            <div className="mt-8 p-5 bg-purple-50 rounded-xl border-2 border-dashed border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-900">Импорт своего теста</h3>
              </div>
              <p className="text-sm text-purple-700 mb-3">
                Загрузите JSON-файл с вопросами — он появится в списке предметов и сохранится в браузере.
              </p>
              <label className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
                <FileText className="w-5 h-5" />
                Выбрать JSON-файл
                <input type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
              </label>
              {importError && (
                <p className="mt-3 text-sm text-red-600">{importError}</p>
              )}
              <p className="mt-3 text-xs text-purple-600">
                Формат: массив объектов <code>{'{ question, options: [{ text, isCorrect }], explanation }'}</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Экран выбора варианта
  if (!selectedVariantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <button
              onClick={backToSubjects}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> К предметам
            </button>
            <div className="text-center mb-8">
              <Layers className="w-16 h-16 mx-auto text-purple-600 mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {selectedSubject.icon} {selectedSubject.name}
              </h1>
              <p className="text-gray-600">Выберите вариант теста</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedSubject.variants.map((variant) => {
                const hasProgress = localStorage.getItem(progressKeyFor(selectedSubject.id, variant.id));
                return (
                  <button
                    key={variant.id}
                    onClick={() => chooseVariant(variant.id)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-5 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <h3 className="text-lg font-bold">{variant.name}</h3>
                        <p className="text-sm text-indigo-100">
                          {variant.questions.length} вопросов
                          {hasProgress && ' · есть прогресс'}
                        </p>
                      </div>
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Экран выбора режима
  if (!mode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <button
              onClick={backToVariants}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> К вариантам
            </button>
            <div className="text-center mb-8">
              <BookOpen className="w-16 h-16 mx-auto text-purple-600 mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {selectedSubject.icon} {selectedSubject.name}
              </h1>
              <p className="text-gray-600">{selectedVariant.name} · выберите режим подготовки</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setMode('training')}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h3 className="text-xl font-bold mb-1">Режим тренировки</h3>
                    <p className="text-sm text-green-100">Мгновенная проверка и детальные пояснения</p>
                  </div>
                  <CheckCircle className="w-8 h-8" />
                </div>
              </button>

              <button
                onClick={() => setMode('exam')}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white p-6 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h3 className="text-xl font-bold mb-1">Режим экзамена</h3>
                    <p className="text-sm text-orange-100">Результаты и детальный разбор в конце</p>
                  </div>
                  <Trophy className="w-8 h-8" />
                </div>
              </button>

              <button
                onClick={() => setMode('flashcards')}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h3 className="text-xl font-bold mb-1">Флеш-карточки</h3>
                    <p className="text-sm text-indigo-100">Свайп-режим: вопрос → ответ, «знаю» / «повторить»</p>
                  </div>
                  <Layers className="w-8 h-8" />
                </div>
              </button>
            </div>

            <div className="mt-8 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-900">
                <strong>Вопросов в варианте:</strong> {QUESTIONS_DATA.length}
              </p>
              <p className="text-xs text-purple-700 mt-2">
                💾 Прогресс сохраняется автоматически
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Режим флеш-карточек: вопрос/ответ со свайпами
  if (mode === 'flashcards') {
    const flashcards = QUESTIONS_DATA.map((q) => {
      const correct = q.answers.find((a) => a.correct);
      return {
        id: q.id,
        question: q.question,
        answer: correct?.text || '',
        explanation: q.explanation?.correct || '',
      };
    });

    return (
      <FlashcardDeck
        cards={flashcards}
        title={`${selectedSubject?.icon} ${selectedSubject?.name} · ${selectedVariant?.name}`}
        onExit={() => setMode(null)}
      />
    );
  }

  // Детальный разбор пройденных вопросов
  if (showReview) {
    const answeredQuestions = QUESTIONS_DATA.filter(q => answers[q.id] || skipped[q.id]);
    
    const filteredQuestions = answeredQuestions.filter(q => {
      if (reviewFilter === 'all') return true;
      if (reviewFilter === 'correct') {
        return answers[q.id] === q.answers.find(a => a.correct)?.text;
      }
      if (reviewFilter === 'incorrect') {
        return answers[q.id] && answers[q.id] !== q.answers.find(a => a.correct)?.text;
      }
      if (reviewFilter === 'skipped') {
        return skipped[q.id];
      }
      return true;
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Разбор пройденных вопросов</h2>
                <p className="text-gray-600">Отвечено: {answeredQuestions.length} из {QUESTIONS_DATA.length}</p>
              </div>
              <button
                onClick={() => setShowReview(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Назад к тесту
              </button>
            </div>

            {/* Фильтры */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setReviewFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  reviewFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Все ({answeredQuestions.length})
              </button>
              <button
                onClick={() => setReviewFilter('correct')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  reviewFilter === 'correct' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Правильные ({stats.correct})
              </button>
              <button
                onClick={() => setReviewFilter('incorrect')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  reviewFilter === 'incorrect' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Ошибки ({stats.answered - stats.correct})
              </button>
              <button
                onClick={() => setReviewFilter('skipped')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  reviewFilter === 'skipped' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Пропущенные ({stats.skippedCount})
              </button>
            </div>

            {/* Список вопросов */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredQuestions.map((q, idx) => {
                const userAns = answers[q.id];
                const correctAns = q.answers.find(a => a.correct);
                const isRight = userAns === correctAns?.text;
                const isSkip = skipped[q.id];
                
                return (
                  <div key={q.id} className={`p-6 rounded-lg border-2 ${
                    isSkip ? 'bg-orange-50 border-orange-200' :
                    isRight ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-3 mb-4">
                      {isSkip ? (
                        <SkipForward className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                      ) : isRight ? (
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 mb-3">{q.question}</p>
                        
                        {isSkip ? (
                          <p className="text-sm text-orange-700 mb-2">Вопрос был пропущен</p>
                        ) : (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Ваш ответ:</p>
                            <p className={`text-sm ${isRight ? 'text-green-700' : 'text-red-700'}`}>
                              {userAns}
                            </p>
                          </div>
                        )}
                        
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Правильный ответ:</p>
                          <p className="text-sm text-green-700 font-medium">{correctAns?.text}</p>
                        </div>
                        
                        {/* Пояснение */}
                        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm font-bold text-gray-800 mb-2">📚 Объяснение:</p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            {isSkip 
                              ? q.explanation?.correct || correctAns?.text
                              : getExplanation(q, userAns, isRight)
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredQuestions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Нет вопросов по выбранному фильтру</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Результаты экзамена
  if (showExamResults) {
    const percentage = Math.round((stats.correct / QUESTIONS_DATA.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              {passed ? (
                <Trophy className="w-20 h-20 mx-auto text-green-500 mb-4" />
              ) : (
                <AlertCircle className="w-20 h-20 mx-auto text-orange-500 mb-4" />
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {passed ? 'Экзамен сдан!' : 'Нужно ещё потренироваться'}
              </h1>
              <p className="text-2xl font-bold text-purple-600">{percentage}%</p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">{stats.correct}</p>
                <p className="text-sm text-gray-600">Правильных</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-red-600">{stats.answered - stats.correct}</p>
                <p className="text-sm text-gray-600">Ошибок</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-orange-600">{stats.skippedCount}</p>
                <p className="text-sm text-gray-600">Пропущено</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-purple-600">{QUESTIONS_DATA.length}</p>
                <p className="text-sm text-gray-600">Всего</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setShowReview(true)}
                className="w-full bg-purple-600 text-white py-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <ClipboardList className="w-5 h-5" />
                Детальный разбор всех ответов
              </button>
              
              <button
                onClick={reset}
                className="w-full bg-gray-600 text-white py-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Пройти заново
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Основной интерфейс теста
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Хедер с прогрессом */}
        <div className="bg-white rounded-t-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-gray-600">
                {selectedSubject?.icon} {selectedSubject?.name} · {selectedVariant?.name} · {mode === 'training' ? '🎯 Тренировка' : '📝 Экзамен'}
              </h2>
              <p className="text-2xl font-bold text-gray-900">
                Вопрос {currentQ + 1} / {QUESTIONS_DATA.length}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={backToSubjects}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2"
                title="К выбору предмета"
              >
                <GraduationCap className="w-6 h-6" />
              </button>
              <button
                onClick={() => setShowReview(true)}
                className="text-purple-600 hover:text-purple-700 transition-colors p-2"
                title="Разбор пройденных"
              >
                <ClipboardList className="w-6 h-6" />
              </button>
              <button
                onClick={saveProgress}
                className="text-blue-600 hover:text-blue-700 transition-colors p-2"
                title="Сохранить прогресс"
              >
                <Save className="w-6 h-6" />
              </button>
              <button
                onClick={reset}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2"
                title="Начать заново"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Прогресс-бар */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full transition-all duration-300"
              style={{ width: `${((currentQ + 1) / QUESTIONS_DATA.length) * 100}%` }}
            />
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-600">Отвечено</p>
              <p className="text-xl font-bold text-blue-600">{stats.answered}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-600">Правильно</p>
              <p className="text-xl font-bold text-green-600">
                {mode === 'training' ? stats.correct : '?'}
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-600">Пропущено</p>
              <p className="text-xl font-bold text-orange-600">{stats.skippedCount}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-600">Осталось</p>
              <p className="text-xl font-bold text-purple-600">
                {QUESTIONS_DATA.length - stats.answered - stats.skippedCount}
              </p>
            </div>
          </div>
        </div>

        {/* Вопрос и ответы */}
        <div className="bg-white shadow-lg p-6 mb-4">
          {isSkipped && (
            <div className="mb-4 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
              <p className="text-sm text-orange-800">⏭️ Вопрос был пропущен ранее</p>
            </div>
          )}
          
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            {question.question}
          </h3>

          <div className="space-y-3">
            {displayAnswers.map((answer, idx) => {
              const isSelected = userAnswer === answer.text;
              const isCorrectAnswer = answer.correct;
              
              let bgClass = 'bg-gray-50 border-2 border-gray-200 hover:border-purple-400';
              
              if (showResult && mode === 'training') {
                if (isSelected && isCorrectAnswer) {
                  bgClass = 'bg-green-100 border-2 border-green-500';
                } else if (isSelected && !isCorrectAnswer) {
                  bgClass = 'bg-red-100 border-2 border-red-500';
                } else if (isCorrectAnswer) {
                  bgClass = 'bg-green-50 border-2 border-green-300';
                }
              } else if (isSelected) {
                bgClass = 'bg-purple-100 border-2 border-purple-500';
              }

              return (
                <button
                  key={idx}
                  onClick={() => !showResult && handleAnswer(answer.text)}
                  disabled={showResult && mode === 'training'}
                  className={`w-full text-left p-4 rounded-lg transition-all ${bgClass} ${
                    showResult && mode === 'training' ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
                    </div>
                    <span className="flex-1 font-medium text-gray-800">{answer.text}</span>
                    {showResult && mode === 'training' && isCorrectAnswer && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {showResult && mode === 'training' && isSelected && !isCorrectAnswer && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Пояснение */}
          {showResult && mode === 'training' && (
            <div className={`mt-6 p-4 rounded-lg ${isCorrect ? 'bg-green-50 border-l-4 border-green-500' : 'bg-orange-50 border-l-4 border-orange-500'}`}>
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                )}
                <div>
                  <p className="font-bold text-gray-900 mb-2">
                    {isCorrect ? '✓ Правильно!' : '✗ Неверно'}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {getExplanation(question, userAnswer, isCorrect)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Навигация */}
        <div className="bg-white rounded-b-2xl shadow-lg p-4">
          <div className="flex gap-3">
            <button
              onClick={prevQuestion}
              disabled={currentQ === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Назад
            </button>

            {!userAnswer && !showResult && (
              <button
                onClick={handleSkip}
                className="flex items-center gap-2 px-6 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                <SkipForward className="w-5 h-5" />
                Пропустить
              </button>
            )}

            <button
              onClick={nextQuestion}
              disabled={!userAnswer && !isSkipped}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {currentQ === QUESTIONS_DATA.length - 1 ? (
                mode === 'exam' ? (
                  <>Завершить экзамен <Trophy className="w-5 h-5" /></>
                ) : (
                  <>Последний вопрос <ChevronRight className="w-5 h-5" /></>
                )
              ) : (
                <>Следующий <ChevronRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Обёртка: основной интерфейс + плавающая кнопка помощи на всех экранах
export default function App() {
  return (
    <>
      <MathExam />
      <HelpButton />
    </>
  );
}
