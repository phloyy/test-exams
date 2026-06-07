import React, { useRef, useState } from 'react';

/**
 * Интерактивный прогресс-бар с пошаговой (step) навигацией.
 * Гладкий градиент-бар + перетаскиваемая ручка. Клик или драг в любом
 * месте дорожки выбирает шаг (вопрос/карточку); во время перетаскивания
 * двигается только ручка и показывается подсказка «n / total», а сам
 * переход применяется после отпускания (onChange).
 *
 * @param {number}   total   - количество шагов (вопросов/карточек)
 * @param {number}   current - текущий шаг (0-based)
 * @param {Function} onChange - (index) => void, вызывается при отпускании
 * @param {string}   className     - доп. классы обёртки
 * @param {string}   trackClassName - классы дорожки (фон)
 * @param {string}   fillClassName  - классы заполнения
 * @param {string}   height         - высота дорожки (tailwind h-*)
 */
export default function StepProgressBar({
  total,
  current,
  onChange,
  className = '',
  trackClassName = 'bg-gray-200',
  fillClassName = 'bg-gradient-to-r from-purple-500 to-indigo-600',
  height = 'h-3',
}) {
  const trackRef = useRef(null);
  const [dragStep, setDragStep] = useState(null);
  const dragging = dragStep !== null;

  // Шаг под курсором/пальцем по координате X
  const stepFromClientX = (clientX) => {
    const el = trackRef.current;
    if (!el || total <= 1) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return Math.round(ratio * (total - 1));
  };

  const handlePointerDown = (e) => {
    if (total <= 1) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragStep(stepFromClientX(e.clientX));
  };

  const handlePointerMove = (e) => {
    if (dragStep === null) return;
    setDragStep(stepFromClientX(e.clientX));
  };

  const handlePointerUp = (e) => {
    if (dragStep === null) return;
    const target = stepFromClientX(e.clientX);
    setDragStep(null);
    if (target !== current) onChange(target);
  };

  const activeStep = dragging ? dragStep : current;
  const percent = total > 1 ? (activeStep / (total - 1)) * 100 : 100;

  return (
    <div className={`relative ${className}`}>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full ${height} ${trackClassName} cursor-pointer touch-none select-none rounded-full`}
      >
        {/* Заполнение */}
        <div
          className={`${fillClassName} h-full rounded-full ${dragging ? '' : 'transition-all duration-300'}`}
          style={{ width: `${percent}%` }}
        />

        {/* Ручка */}
        <div
          className={`absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-purple-500 bg-white shadow-md ${
            dragging ? 'scale-110' : 'transition-all duration-300 hover:scale-110'
          }`}
          style={{ left: `${percent}%` }}
        />

        {/* Подсказка с номером во время перетаскивания */}
        {dragging && (
          <div
            className="pointer-events-none absolute -top-9 -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
            style={{ left: `${percent}%` }}
          >
            {dragStep + 1} / {total}
          </div>
        )}
      </div>
    </div>
  );
}
