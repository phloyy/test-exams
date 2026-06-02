import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  GraduationCap,
  Layers,
  BookOpen,
  CheckCircle,
  Trophy,
  Search,
  Save,
  Upload,
  ClipboardList,
  RotateCcw,
} from 'lucide-react';

// Один раздел инструкции
function Section({ icon: Icon, color, title, children }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <h3 className={`mb-2 flex items-center gap-2 font-bold ${color}`}>
        <Icon className="h-5 w-5" />
        {title}
      </h3>
      <div className="space-y-1 text-sm leading-relaxed text-gray-700">{children}</div>
    </div>
  );
}

/**
 * Плавающая кнопка «?» в углу + модальное окно с инструкцией по платформе.
 * Позиционируется fixed, поэтому работает поверх любого экрана.
 */
export default function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Плавающая кнопка */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg transition-all hover:scale-105 hover:bg-purple-700"
        title="Как пользоваться платформой"
        aria-label="Помощь"
      >
        <HelpCircle className="h-7 w-7" />
      </button>

      {/* Модальное окно */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Шапка */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <HelpCircle className="h-6 w-6" />
                Как пользоваться платформой
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 transition-colors hover:bg-white/20"
                aria-label="Закрыть"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Контент */}
            <div className="space-y-4 overflow-y-auto p-6">
              <p className="text-gray-700">
                Это тренажёр для подготовки к тестам. Вопросы сгруппированы по{' '}
                <strong>предметам</strong>, каждый предмет разбит на <strong>варианты</strong> по 30
                вопросов. Готовиться можно в трёх режимах, а ещё есть общий поиск по всем вопросам.
              </p>

              <Section icon={GraduationCap} color="text-purple-700" title="С чего начать">
                <p>
                  1. Выберите <strong>предмет</strong> на главном экране.
                </p>
                <p>
                  2. Выберите <strong>вариант</strong> (набор из 30 вопросов).
                </p>
                <p>
                  3. Выберите <strong>режим</strong> подготовки — тренировка, экзамен или
                  флеш-карточки.
                </p>
              </Section>

              <Section icon={CheckCircle} color="text-green-700" title="Режим «Тренировка»">
                <p>Отвечаете на вопрос и сразу видите, верно или нет.</p>
                <p>
                  Показывается <strong>правильный ответ</strong> и <strong>пояснение</strong> к нему.
                  Идеально, чтобы разобраться в теме.
                </p>
              </Section>

              <Section icon={Trophy} color="text-orange-700" title="Режим «Экзамен»">
                <p>
                  Отвечаете на все вопросы без подсказок. Результат и <strong>детальный разбор</strong>{' '}
                  всех ответов показываются в конце.
                </p>
                <p>Проходной балл — 70%. Можно отфильтровать разбор: правильные, ошибки, пропущенные.</p>
              </Section>

              <Section icon={Layers} color="text-indigo-700" title="Режим «Флеш-карточки»">
                <p>Карточки для быстрого повторения по принципу «вопрос → ответ».</p>
                <p>
                  • <strong>Тап</strong> по карточке — переворот, показывает ответ и пояснение.
                </p>
                <p>
                  • <strong>Свайп вправо 👉</strong> — «Знаю».
                </p>
                <p>
                  • <strong>Свайп влево 👈</strong> — «Нужно повторить».
                </p>
                <p>
                  На телефоне свайпайте пальцем, на компьютере — тащите мышкой или жмите кнопки ✓ / ✗
                  под колодой. В конце — статистика и кнопка{' '}
                  <strong>«Повторить неудачные»</strong>: соберёт новую колоду только из тех карточек,
                  что вы свайпнули влево.
                </p>
              </Section>

              <Section icon={Search} color="text-purple-700" title="Поиск по всем вопросам">
                <p>
                  Кнопка <strong>«Поиск по всем вопросам»</strong> на главном экране открывает базу
                  всех вопросов сразу по всем предметам.
                </p>
                <p>
                  Введите любое слово — поиск ищет по тексту вопроса, вариантам ответов и пояснению.
                  Нажмите на вопрос, чтобы раскрыть варианты (правильный подсвечен) и пояснение.
                </p>
                <p>
                  Зачем нужен: быстро найти конкретный вопрос и через кнопку 📋{' '}
                  <strong>скопировать его текст</strong>, чтобы поискать подробности в интернете или
                  спросить у ИИ.
                </p>
              </Section>

              <Section icon={Save} color="text-blue-700" title="Сохранение прогресса">
                <p>
                  Прогресс сохраняется <strong>автоматически</strong> в браузере для каждого варианта.
                  Можно закрыть страницу и вернуться позже — ответы не потеряются.
                </p>
                <p className="flex items-center gap-1">
                  Кнопка <ClipboardList className="inline h-4 w-4" /> — разбор уже пройденных вопросов,
                  <RotateCcw className="inline h-4 w-4" /> — начать вариант заново.
                </p>
              </Section>

              <Section icon={Upload} color="text-purple-700" title="Импорт своего теста">
                <p>
                  Внизу главного экрана можно загрузить свой <strong>JSON-файл</strong> с вопросами — он
                  появится в списке предметов и сохранится в браузере.
                </p>
                <p>
                  Формат: массив объектов{' '}
                  <code className="rounded bg-gray-100 px-1 text-xs">
                    {'{ question, options: [{ text, isCorrect }], explanation }'}
                  </code>
                </p>
              </Section>

              <p className="pt-2 text-center text-sm text-gray-400">
                Удачной подготовки! 🎓
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
