import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, BookOpen, Trophy, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

// Вынес данные за пределы компонента
const QUESTIONS_DATA = [/* твои 213 вопросов */];

// Единая функция перемешивания
const shuffle = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const generateExplanation = (question, correctAnswer) => {
  const explanations = {
    "аббревиатура икт": "ИКТ — Информационно-коммуникационные технологии.",
    "основной функцией икт": "Главная функция ИКТ — сбор, обработка и анализ данных.",
    "microsoft excel": "Excel — стандарт для работы с таблицами и фин. анализа."
  };
  const key = Object.keys(explanations).find(k => question.toLowerCase().includes(k));
  return key ? explanations[key] : `Правильный ответ: "${correctAnswer}".`;
};

export default function ICTExam() {
  const [mode, setMode] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [showExamResults, setShowExamResults] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);

  // Инициализация при выборе режима
  const startQuiz = (selectedMode) => {
    // Перемешиваем вопросы И ответы внутри них
    const prepared = shuffle(QUESTIONS_DATA).map(q => ({
      ...q,
      answers: shuffle(q.answers)
    }));
    setShuffledQuestions(prepared);
    setMode(selectedMode);
  };

  const question = shuffledQuestions[currentQ];
  const userAnswer = question ? answers[question.id] : null;
  const correctAnswer = question?.answers.find(a => a.correct);
  const isCorrect = userAnswer === correctAnswer?.text;

  const handleAnswer = (answerText) => {
    setAnswers(prev => ({ ...prev, [question.id]: answerText }));
    if (mode === 'training') setShowResult(true);
  };

  const nextQuestion = () => {
    if (currentQ < shuffledQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
      setShowResult(false);
    } else if (mode === 'exam') {
      setShowExamResults(true);
    }
  };

  const reset = () => {
    setMode(null);
    setCurrentQ(0);
    setAnswers({});
    setShowResult(false);
    setShowExamResults(false);
    setShuffledQuestions([]);
  };

  // Статистика
  const stats = {
    answered: Object.keys(answers).length,
    correct: Object.keys(answers).filter(qId => {
      const q = shuffledQuestions.find(qu => qu.id === parseInt(qId));
      return answers[qId] === q?.answers.find(a => a.correct)?.text;
    }).length,
    total: QUESTIONS_DATA.length
  };

  if (!mode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-indigo-600 mb-4" />
          <h1 className="text-2xl font-bold mb-6">ИКТ в экономике</h1>
          <div className="space-y-4">
            <button onClick={() => startQuiz('training')} className="w-full bg-emerald-500 text-white p-4 rounded-xl font-bold hover:bg-emerald-600 transition-all">Тренировка</button>
            <button onClick={() => startQuiz('exam')} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition-all">Экзамен</button>
          </div>
        </div>
      </div>
    );
  }

  if (showExamResults) {
    const score = Math.round((stats.correct / stats.total) * 100);
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-2xl mx-auto text-center">
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${score >= 70 ? 'text-yellow-500' : 'text-slate-400'}`} />
          <h2 className="text-3xl font-bold mb-2">{score >= 70 ? 'Зачет' : 'Не зачет'}</h2>
          <p className="text-5xl font-black text-indigo-600 mb-8">{score}%</p>
          <button onClick={reset} className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold">Попробовать снова</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{mode} mode</span>
            <span className="text-sm font-mono">{currentQ + 1} / {stats.total}</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-8">
            <div className="h-full bg-indigo-600 transition-all" style={{ width: `${((currentQ + 1) / stats.total) * 100}%` }} />
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-8">{question?.question}</h2>

          <div className="space-y-3">
            {question?.answers.map((ans, i) => {
              const isSelected = userAnswer === ans.text;
              const isCorrectAns = ans.correct;
              let style = "border-slate-200 hover:border-indigo-200";

              if (mode === 'training' && showResult) {
                if (isCorrectAns) style = "border-emerald-500 bg-emerald-50 text-emerald-700";
                else if (isSelected && !isCorrectAns) style = "border-red-500 bg-red-50 text-red-700";
              } else if (isSelected) {
                style = "border-indigo-600 bg-indigo-50 text-indigo-700";
              }

              return (
                <button
                  key={i}
                  disabled={showResult && mode === 'training'}
                  onClick={() => handleAnswer(ans.text)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${style}`}
                >
                  {ans.text}
                </button>
              );
            })}
          </div>

          {showResult && mode === 'training' && (
            <div className="mt-6 p-4 bg-slate-900 text-white rounded-xl text-sm">
              <p className="opacity-60 mb-1">Пояснение:</p>
              {generateExplanation(question.question, correctAnswer.text)}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button onClick={() => {setCurrentQ(q => q - 1); setShowResult(false)}} disabled={currentQ === 0} className="px-6 py-3 bg-white border border-slate-200 rounded-xl disabled:opacity-30"><ChevronLeft/></button>
          <button onClick={nextQuestion} disabled={!userAnswer} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
            {currentQ === stats.total - 1 ? 'Финиш' : 'Далее'} <ChevronRight className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </div>
  );
}
