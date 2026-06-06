import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronDown, Copy, Check, CheckCircle, X } from 'lucide-react';

const norm = (s) => (s || '').toLowerCase();
// Убираем ведущую нумерацию ("1. ", "12) ") — мешает поиску в интернете/ИИ
const stripNumber = (s) => (s || '').replace(/^\s*\d+\s*[.)]\s*/, '');

// Подсветка первого вхождения поискового запроса
const highlight = (text, term) => {
  if (!term) return text;
  const idx = norm(text).indexOf(term);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200 px-0.5">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
};

// Копирование с запасным вариантом для несекьюрного контекста
const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    /* падаем в запасной путь */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Страница-база всех вопросов: поиск по слову, группировка по предметам,
 * раскрытие вопроса с вариантами ответов и пояснением, копирование вопроса.
 *
 * @param {Array} subjects - предметы (встроенные + импортированные)
 * @param {Function} onExit - вернуться к выбору предмета
 */
export default function QuestionSearch({ subjects, onExit, filterSubjectId = null }) {
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Если задан filterSubjectId — ищем только внутри одного предмета
  const scopedSubjects = useMemo(
    () => (filterSubjectId ? subjects.filter((s) => s.id === filterSubjectId) : subjects),
    [subjects, filterSubjectId]
  );
  const scopedSubject = filterSubjectId ? scopedSubjects[0] : null;

  // Плоский список всех вопросов с контекстом предмета/варианта
  const allItems = useMemo(() => {
    const items = [];
    scopedSubjects.forEach((s) => {
      s.variants.forEach((v) => {
        v.questions.forEach((q) => {
          items.push({
            key: `${s.id}_${v.id}_${q.id}`,
            subjectId: s.id,
            subjectName: s.name,
            subjectIcon: s.icon,
            variantName: v.name,
            q,
          });
        });
      });
    });
    return items;
  }, [scopedSubjects]);

  const term = norm(query).trim();

  const filtered = useMemo(() => {
    if (!term) return allItems;
    return allItems.filter((it) => {
      if (norm(it.q.question).includes(term)) return true;
      if (it.q.answers.some((a) => norm(a.text).includes(term))) return true;
      if (norm(it.q.explanation?.correct).includes(term)) return true;
      return false;
    });
  }, [allItems, term]);

  // Группировка по предметам
  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((it) => {
      if (!map.has(it.subjectId)) {
        map.set(it.subjectId, { name: it.subjectName, icon: it.subjectIcon, items: [] });
      }
      map.get(it.subjectId).items.push(it);
    });
    return [...map.values()];
  }, [filtered]);

  const handleCopy = async (e, it) => {
    e.stopPropagation();
    const ok = await copyToClipboard(stripNumber(it.q.question));
    if (ok) {
      setCopiedKey(it.key);
      setTimeout(() => setCopiedKey((k) => (k === it.key ? null : k)), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <button
            onClick={onExit}
            className="mb-4 flex items-center gap-1 text-gray-500 transition-colors hover:text-gray-700"
          >
            <ChevronLeft className="h-5 w-5" /> {scopedSubject ? 'К темам' : 'К предметам'}
          </button>

          <div className="mb-6 text-center">
            <Search className="mx-auto mb-3 h-12 w-12 text-purple-600" />
            <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              {scopedSubject ? `${scopedSubject.icon} ${scopedSubject.name}` : 'База вопросов'}
            </h1>
            <p className="text-gray-600">
              {scopedSubject
                ? `Поиск по карточкам · ${allItems.length} шт.`
                : `Поиск по всем предметам · ${allItems.length} вопросов`}
            </p>
          </div>

          {/* Поле поиска */}
          <div className="sticky top-4 z-10 mb-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введите слово из вопроса, ответа или пояснения…"
                className="w-full rounded-xl border-2 border-gray-200 bg-white py-3 pl-12 pr-12 text-gray-900 shadow-sm outline-none transition-colors focus:border-purple-500"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  title="Очистить"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {term && (
              <p className="mt-2 text-sm text-gray-500">
                Найдено: {filtered.length}
              </p>
            )}
          </div>

          {/* Результаты, сгруппированные по предметам */}
          {groups.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Search className="mx-auto mb-4 h-12 w-12 opacity-40" />
              <p>Ничего не найдено по запросу «{query}»</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.name}>
                  <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-800">
                    <span className="text-2xl">{group.icon}</span>
                    {group.name}
                    <span className="text-sm font-normal text-gray-400">({group.items.length})</span>
                  </h2>

                  <div className="space-y-2">
                    {group.items.map((it) => {
                      const isOpen = openKey === it.key;
                      const correct = it.q.answers.find((a) => a.correct);
                      return (
                        <div
                          key={it.key}
                          className="overflow-hidden rounded-lg border border-gray-200"
                        >
                          {/* Заголовок вопроса */}
                          <div
                            onClick={() => setOpenKey(isOpen ? null : it.key)}
                            className="flex cursor-pointer items-start gap-3 bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100"
                          >
                            <span className="flex-1 font-medium text-gray-800">
                              {highlight(it.q.question, term)}
                            </span>
                            <button
                              onClick={(e) => handleCopy(e, it)}
                              className="flex-shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-purple-600"
                              title="Скопировать вопрос"
                            >
                              {copiedKey === it.key ? (
                                <Check className="h-5 w-5 text-green-600" />
                              ) : (
                                <Copy className="h-5 w-5" />
                              )}
                            </button>
                            <ChevronDown
                              className={`mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </div>

                          {/* Раскрытие: варианты + пояснение */}
                          {isOpen && (
                            <div className="space-y-3 bg-white px-4 py-4">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                {it.variantName}
                              </p>
                              <div className="space-y-2">
                                {it.q.answers.map((a, i) => (
                                  <div
                                    key={i}
                                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                      a.correct
                                        ? 'border-green-300 bg-green-50 font-medium text-green-800'
                                        : 'border-gray-200 bg-gray-50 text-gray-700'
                                    }`}
                                  >
                                    {a.correct && (
                                      <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                                    )}
                                    <span>{a.text}</span>
                                  </div>
                                ))}
                              </div>
                              {it.q.explanation?.correct && (
                                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                                  <p className="mb-1 text-sm font-bold text-indigo-900">📚 Пояснение</p>
                                  <p className="whitespace-pre-line text-sm text-gray-700">
                                    {it.q.explanation.correct}
                                  </p>
                                </div>
                              )}
                              <button
                                onClick={(e) => handleCopy(e, it)}
                                className="flex items-center gap-2 rounded-lg bg-purple-100 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-200"
                              >
                                {copiedKey === it.key ? (
                                  <>
                                    <Check className="h-4 w-4" /> Скопировано
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4" /> Скопировать вопрос
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
