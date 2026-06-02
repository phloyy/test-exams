import React, { useState, useRef } from 'react';
import { Check, X, RotateCw } from 'lucide-react';

// Сколько пикселей нужно протащить, чтобы свайп засчитался
const SWIPE_THRESHOLD = 110;
// Смещение меньше этого считается тапом (переворот), а не свайпом
const TAP_THRESHOLD = 10;
// Куда улетает карточка при свайпе
const FLY_OUT_DISTANCE = 700;

/**
 * Одна перетаскиваемая флеш-карточка.
 * - Тап/клик: 3D-переворот (вопрос ⇄ ответ).
 * - Свайп вправо: success ("Знаю").
 * - Свайп влево: failed ("Повторить").
 * Интерактивна только верхняя карточка (isTop). Карточки за ней
 * визуально складываются в колоду через stackIndex.
 */
export default function SwipeableCard({ card, isTop, stackIndex, onSwipe }) {
  const [flipped, setFlipped] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [leaving, setLeaving] = useState(null); // null | 'left' | 'right'
  const start = useRef(null);
  const moved = useRef(false);

  const handlePointerDown = (e) => {
    if (!isTop || leaving) return;
    start.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) {
      moved.current = true;
    }
    setDrag({ x: dx, y: dy });
  };

  const handlePointerUp = (e) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    start.current = null;
    setIsDragging(false);

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const dir = dx > 0 ? 'right' : 'left';
      setLeaving(dir);
      // Даём проиграть анимацию вылета, затем сообщаем колоде
      setTimeout(() => onSwipe(dir), 280);
      return;
    }

    if (!moved.current) {
      setFlipped((f) => !f);
    }
    setDrag({ x: 0, y: 0 });
  };

  // Трансформация карточки
  let transform;
  let transition;
  if (leaving) {
    const x = leaving === 'right' ? FLY_OUT_DISTANCE : -FLY_OUT_DISTANCE;
    transform = `translate(${x}px, ${drag.y}px) rotate(${leaving === 'right' ? 25 : -25}deg)`;
    transition = 'transform 0.28s ease-in';
  } else if (isTop) {
    transform = `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 22}deg)`;
    transition = isDragging ? 'none' : 'transform 0.3s ease';
  } else {
    // Карточки в глубине колоды: смещаем вниз и уменьшаем
    transform = `translateY(${stackIndex * 14}px) scale(${1 - stackIndex * 0.04})`;
    transition = 'transform 0.3s ease';
  }

  const zIndex = 30 - stackIndex;
  // Подсказки "Знаю" / "Повторить" при перетаскивании
  const swipeHint = isTop && drag.x > TAP_THRESHOLD ? 'right' : isTop && drag.x < -TAP_THRESHOLD ? 'left' : null;
  const hintOpacity = Math.min(Math.abs(drag.x) / SWIPE_THRESHOLD, 1);

  return (
    <div
      className="absolute inset-0 select-none touch-none"
      style={{ transform, transition, zIndex, cursor: isTop ? 'grab' : 'default' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className={`flip-card-inner h-full w-full ${flipped ? 'flipped' : ''}`}>
        {/* Лицевая сторона — вопрос */}
        <div className="flip-face absolute inset-0 flex flex-col rounded-2xl bg-white shadow-xl border border-gray-100 p-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-500">Вопрос</span>
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-lg font-bold text-gray-900 leading-snug">
              {card.question}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <RotateCw className="h-4 w-4" />
            Нажмите, чтобы увидеть ответ
          </div>
        </div>

        {/* Обратная сторона — ответ */}
        <div className="flip-face flip-back absolute inset-0 flex flex-col rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl border border-purple-100 p-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Ответ</span>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto">
            <p className="text-center text-lg font-bold text-indigo-900 leading-snug">
              {card.answer}
            </p>
            {card.explanation && (
              <p className="text-center text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {card.explanation}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-gray-400 px-1">
            <span>👈 Повторить</span>
            <span>Знаю 👉</span>
          </div>
        </div>
      </div>

      {/* Бейджи подсказки при свайпе */}
      {swipeHint === 'right' && (
        <div
          className="absolute left-4 top-4 flex items-center gap-1 rounded-lg border-2 border-green-500 bg-green-500/90 px-3 py-1 text-sm font-bold text-white"
          style={{ opacity: hintOpacity }}
        >
          <Check className="h-4 w-4" /> ЗНАЮ
        </div>
      )}
      {swipeHint === 'left' && (
        <div
          className="absolute right-4 top-4 flex items-center gap-1 rounded-lg border-2 border-red-500 bg-red-500/90 px-3 py-1 text-sm font-bold text-white"
          style={{ opacity: hintOpacity }}
        >
          <X className="h-4 w-4" /> ПОВТОРИТЬ
        </div>
      )}
    </div>
  );
}
