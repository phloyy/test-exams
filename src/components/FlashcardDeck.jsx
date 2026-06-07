import React, { useState } from 'react';
import {
  ChevronLeft,
  RotateCcw,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  Layers,
  PartyPopper,
  Undo2,
} from 'lucide-react';
import SwipeableCard from './SwipeableCard';
import StepProgressBar from './StepProgressBar';

// Сколько карточек колоды видно одновременно (верхняя + те, что за ней)
const VISIBLE_STACK = 3;

/**
 * Колода флеш-карточек с механикой свайпов и экраном итогов.
 *
 * @param {Array} cards   - [{ id, question, answer, explanation }]
 * @param {Function} onExit - вернуться к выбору режима
 * @param {string} title  - заголовок (предмет · вариант)
 */
export default function FlashcardDeck({ cards: initialCards, onExit, title }) {
  // Текущая колода со статусами
  const [cards, setCards] = useState(() =>
    initialCards.map((c) => ({ ...c, status: 'unanswered' }))
  );
  const [index, setIndex] = useState(0);
  const [openId, setOpenId] = useState(null); // раскрытый пункт аккордеона

  const handleSwipe = (dir) => {
    setCards((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], status: dir === 'right' ? 'success' : 'failed' };
      }
      return next;
    });
    setIndex((i) => i + 1);
  };

  // Откат на предыдущую карточку: возвращаем её статус и индекс
  const goBack = () => {
    if (index === 0) return;
    setCards((prev) => {
      const next = [...prev];
      if (next[index - 1]) {
        next[index - 1] = { ...next[index - 1], status: 'unanswered' };
      }
      return next;
    });
    setIndex((i) => i - 1);
  };

  const restartFailed = () => {
    const failedCards = cards.filter((c) => c.status === 'failed');
    setCards(failedCards.map((c) => ({ ...c, status: 'unanswered' })));
    setIndex(0);
    setOpenId(null);
  };

  const restartAll = () => {
    setCards(initialCards.map((c) => ({ ...c, status: 'unanswered' })));
    setIndex(0);
    setOpenId(null);
  };

  const finished = index >= cards.length;
  const success = cards.filter((c) => c.status === 'success');
  const failed = cards.filter((c) => c.status === 'failed');

  // ── Экран итогов ──────────────────────────────────────────────
  if (finished) {
    const total = cards.length;
    const successPct = total ? Math.round((success.length / total) * 100) : 0;
    const failedPct = total ? 100 - successPct : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4 sm:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              onClick={onExit}
              className="mb-4 flex items-center gap-1 text-gray-500 transition-colors hover:text-gray-700"
            >
              <ChevronLeft className="h-5 w-5" /> К выбору режима
            </button>

            <div className="mb-6 text-center">
              <PartyPopper className="mx-auto mb-3 h-16 w-16 text-purple-600" />
              <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-3xl">Колода пройдена!</h1>
              <p className="text-gray-600">{title}</p>
            </div>

            {/* Прогресс-бар success / failed */}
            <div className="mb-6">
              <div className="mb-2 flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="bg-green-500 transition-all" style={{ width: `${successPct}%` }} />
                <div className="bg-red-500 transition-all" style={{ width: `${failedPct}%` }} />
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-green-600">Знаю · {successPct}%</span>
                <span className="text-red-600">Повторить · {failedPct}%</span>
              </div>
            </div>

            {/* Счётчики */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{success.length}</p>
                <p className="text-sm text-gray-600">Знаю</p>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{failed.length}</p>
                <p className="text-sm text-gray-600">Повторить</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{total}</p>
                <p className="text-sm text-gray-600">Всего</p>
              </div>
            </div>

            {/* Аккордеон вопросов на повтор */}
            {failed.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-800">
                  <X className="h-5 w-5 text-red-500" />
                  Нужно повторить ({failed.length})
                </h2>
                <div className="space-y-2">
                  {failed.map((c) => (
                    <div key={c.id} className="overflow-hidden rounded-lg border border-red-100">
                      <button
                        onClick={() => setOpenId(openId === c.id ? null : c.id)}
                        className="flex w-full items-center justify-between gap-3 bg-red-50 px-4 py-3 text-left transition-colors hover:bg-red-100"
                      >
                        <span className="font-medium text-gray-800">{c.question}</span>
                        <ChevronDown
                          className={`h-5 w-5 flex-shrink-0 text-red-500 transition-transform ${
                            openId === c.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {openId === c.id && (
                        <div className="bg-white px-4 py-3">
                          <p className="font-semibold text-indigo-900">{c.answer}</p>
                          {c.explanation && (
                            <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
                              {c.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="space-y-3">
              {failed.length > 0 && (
                <button
                  onClick={restartFailed}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-4 font-medium text-white transition-colors hover:bg-red-700"
                >
                  <RefreshCw className="h-5 w-5" />
                  Повторить неудачные ({failed.length})
                </button>
              )}
              <button
                onClick={restartAll}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-4 font-medium text-white transition-colors hover:bg-purple-700"
              >
                <RotateCcw className="h-5 w-5" />
                Начать заново
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Экран колоды ──────────────────────────────────────────────
  // Рендерим окно из VISIBLE_STACK карточек, верхняя — текущая.
  const visible = [];
  for (let offset = VISIBLE_STACK - 1; offset >= 0; offset--) {
    const card = cards[index + offset];
    if (card) visible.push({ card, offset });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4 sm:p-8">
      <div className="mx-auto max-w-md">
        {/* Хедер */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onExit}
            className="flex items-center gap-1 text-gray-500 transition-colors hover:text-gray-700"
          >
            <ChevronLeft className="h-5 w-5" /> Выход
          </button>
          <span className="flex items-center gap-1 text-sm font-medium text-gray-600">
            <Layers className="h-4 w-4" />
            {index + 1} / {cards.length}
          </span>
        </div>

        {/* Прогресс-бар колоды — перетаскиванием меняем карточку */}
        <StepProgressBar
          total={cards.length}
          current={index}
          onChange={setIndex}
          className="mb-6"
          height="h-2"
        />

        {/* Область колоды */}
        <div className="flashcard-stage relative mx-auto h-[26rem] w-full">
          {visible.map(({ card, offset }) => (
            <SwipeableCard
              key={card.id}
              card={card}
              isTop={offset === 0}
              stackIndex={offset}
              onSwipe={handleSwipe}
            />
          ))}
        </div>

        {/* Кнопки-дубли для тех, кто без свайпа (desktop) */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={goBack}
            disabled={index === 0}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-gray-500 shadow-md transition-all hover:scale-105 hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            title="Назад к предыдущей карточке"
          >
            <Undo2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleSwipe('left')}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-200 bg-white text-red-500 shadow-md transition-all hover:scale-105 hover:border-red-400"
            title="Повторить (свайп влево)"
          >
            <X className="h-7 w-7" />
          </button>
          <button
            onClick={() => handleSwipe('right')}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-200 bg-white text-green-500 shadow-md transition-all hover:scale-105 hover:border-green-400"
            title="Знаю (свайп вправо)"
          >
            <Check className="h-7 w-7" />
          </button>
          <button
            onClick={restartAll}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-gray-500 shadow-md transition-all hover:scale-105 hover:border-gray-400"
            title="Сбросить колоду"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          Свайп вправо 👉 — знаю · влево 👈 — повторить · тап — перевернуть
        </p>
      </div>
    </div>
  );
}
