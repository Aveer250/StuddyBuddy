import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetTutorHelp } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Link, useLocation, Router as WouterRouter } from 'wouter';
import {
  ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, CircleHelp,
  Clock3, Flame, Home, Lightbulb, LockKeyhole, MessageCircle, RotateCcw,
  Sparkles, Star, Target, Trophy, X, Zap, type LucideIcon,
} from 'lucide-react';
import { lessons, questions, subjects, type Lesson, type Question, type Subject } from './data';

type Progress = { date: string; points: number; completedQuestionIds: string[]; subjectTotals: Record<Subject, { correct: number; attempted: number }>; streak: number };
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type TutorSubject = Subject | 'SST';
const STORAGE_KEY = 'studdybuddy-progress-v1';
const today = () => new Date().toLocaleDateString('en-CA');
const freshProgress = (): Progress => ({ date: today(), points: 0, completedQuestionIds: [], subjectTotals: { Maths: { correct: 0, attempted: 0 }, Science: { correct: 0, attempted: 0 }, English: { correct: 0, attempted: 0 }, 'General Knowledge': { correct: 0, attempted: 0 } }, streak: 0 });
function loadProgress(): Progress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return freshProgress();
    const value = JSON.parse(stored) as Progress;
    const base = { ...freshProgress(), ...value };
    if (base.date !== today()) {
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
      return { ...base, date: today(), points: 0, completedQuestionIds: [], streak: base.date === yesterday && base.completedQuestionIds.length > 0 ? base.streak : 0 };
    }
    return base;
  } catch { return freshProgress(); }
}
function saveProgress(value: Progress) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* Storage can be unavailable in private browsing. */ } }

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/practice', label: 'Practice', icon: Target },
  { href: '/lessons', label: 'Lessons', icon: BookOpen },
  { href: '/progress', label: 'Progress', icon: Trophy },
  { href: '/tutor', label: 'Ask a tutor', icon: MessageCircle },
];
const subjectStyle: Record<Subject, { bg: string; ink: string; mark: string }> = {
  Maths: { bg: '#dfe5ff', ink: '#4358c7', mark: '01' },
  Science: { bg: '#d9f2e8', ink: '#26785f', mark: '02' },
  English: { bg: '#ffe1d8', ink: '#bf5b48', mark: '03' },
  'General Knowledge': { bg: '#fbe9b8', ink: '#86641e', mark: '04' },
};
const tutorSubjects: TutorSubject[] = [...subjects, 'SST'];
const sstStyle = { bg: '#e5e8ff', ink: '#6256b5', mark: 'SST' };

function Robot({ small = false }: { small?: boolean }) {
  return <div className={`robot shrink-0 ${small ? 'scale-[.72] origin-center' : ''}`} aria-label="Studdy, your study buddy" role="img" data-testid="img-study-robot">
    <div className="robot-face"><i className="robot-eye" /><i className="robot-eye" /></div><i className="robot-mouth" />
  </div>;
}
function Brand() {
  return <Link href="/" className="flex items-center gap-3 px-2 py-1" data-testid="link-brand">
    <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#4c61d8] text-white shadow-[0_4px_0_#3547b1]"><Sparkles size={21} strokeWidth={2.5} /></div>
    <span className="display-font text-[21px] font-bold tracking-[-1px] text-[#252b45]">studdy<span className="text-[#4c61d8]">buddy</span></span>
  </Link>;
}
function SideNavigation({ path }: { path: string }) {
  return <>
    <aside className="sidebar">
      <Brand />
      <div className="mt-12 px-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#a0a1a9]">Your learning nook</div>
      <nav className="mt-3 flex flex-col gap-1" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={`nav-link ${path === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
          <Icon size={19} strokeWidth={2.2} /><span>{label}</span>{path === href && <ChevronRight size={15} className="ml-auto" />}
        </Link>)}
      </nav>
      <div className="mt-auto rounded-[22px] bg-[#fff0ca] p-4">
        <div className="mb-3 flex items-center justify-between"><span className="text-xs font-extrabold uppercase tracking-wider text-[#8c702f]">Little reminder</span><Star size={16} className="text-[#d8a83a]" /></div>
        <p className="text-sm font-semibold leading-5 text-[#564d39]">Mistakes are just clues for what to try next.</p>
      </div>
      <p className="mt-5 px-2 text-[11px] font-medium text-[#a0a1a9]">A private learning space on this device.</p>
    </aside>
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {navItems.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={path === href ? 'active' : ''} data-testid={`mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
        <Icon size={20} /><span>{label === 'Ask a tutor' ? 'Tutor' : label}</span>
      </Link>)}
    </nav>
  </>;
}
function PageHeading({ eyebrow, title, subtitle, right }: { eyebrow: string; title: string; subtitle?: string; right?: ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div><div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#81849a]">{eyebrow}</div><h1 className="display-font text-[clamp(30px,4vw,44px)] font-bold leading-[1.05] tracking-[-1.8px] text-[#252b45]">{title}</h1>{subtitle && <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#717588]">{subtitle}</p>}</div>
    {right}
  </div>;
}
function ButtonLink({ href, children, secondary = false, testId }: { href: string; children: ReactNode; secondary?: boolean; testId: string }) {
  return <Link href={href} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold transition hover:-translate-y-0.5 ${secondary ? 'border border-[#e7e1d4] bg-white text-[#343a55] hover:bg-[#fffdf7]' : 'bg-[#4c61d8] text-white shadow-[0_4px_0_#3547b1] hover:bg-[#3f54ca]'}`} data-testid={testId}>{children}</Link>;
}
function SubjectMark({ subject, size = 44 }: { subject: Subject; size?: number }) {
  const style = subjectStyle[subject];
  return <div style={{ width: size, height: size, background: style.bg, color: style.ink }} className="display-font grid shrink-0 place-items-center rounded-[15px] text-sm font-bold" aria-hidden="true">{style.mark}</div>;
}
function TutorSubjectMark({ subject, size = 26 }: { subject: TutorSubject; size?: number }) {
  if (subject !== 'SST') return <SubjectMark subject={subject} size={size} />;
  return <div style={{ width: size, height: size, background: sstStyle.bg, color: sstStyle.ink }} className="display-font grid shrink-0 place-items-center rounded-[10px] text-[9px] font-bold" aria-hidden="true">{sstStyle.mark}</div>;
}
function Layout({ children, progress }: { children: ReactNode; progress: Progress }) {
  const [path] = useLocation();
  return <div className="app-shell"><div className="layout-grid"><SideNavigation path={path} /><main className="main-area">
    <div className="mb-7 flex items-center justify-between md:justify-end">
      <div className="md:hidden"><Brand /></div>
      <div className="flex items-center gap-2 rounded-full border border-[#e9e2d1] bg-white px-3 py-2 text-sm font-bold text-[#454b63]" data-testid="status-points">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#fff0ca] text-[#ac781b]"><Zap size={14} fill="currentColor" /></span>{progress.points} points
      </div>
    </div>
    {children}
  </main></div></div>;
}
function HomePage({ progress }: { progress: Progress }) {
  const done = progress.completedQuestionIds.length;
  const todayQuestions = questions.filter(q => q.subject && subjects.includes(q.subject));
  const dailyDone = done;
  return <div className="page-enter">
    <section className="relative mb-8 overflow-hidden rounded-[30px] bg-[#f4c96e] px-6 py-7 sm:px-10 sm:py-9">
      <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border-[1px] border-[#e3b758] opacity-60" /><div className="absolute right-14 top-16 h-32 w-32 rounded-full border-[1px] border-[#e3b758] opacity-60" />
      <div className="relative z-[1] flex items-center gap-5 sm:gap-9">
        <div className="hidden sm:block spark"><Robot /></div>
        <div className="max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#fff6dc] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-[#81642b]"><Sparkles size={13} /> A fresh day to discover</div>
          <h1 className="display-font max-w-[540px] text-[clamp(32px,5vw,52px)] font-bold leading-[1.02] tracking-[-2px] text-[#282e49]">Small steps.<br className="hidden sm:block" /> Big-brain energy.</h1>
          <p className="mt-4 max-w-[420px] text-[15px] font-medium leading-6 text-[#5e583f]">Pick a subject, try a few questions, and see what you can figure out today.</p>
          <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/practice" testId="button-start-practice">Let’s practise <ArrowRight size={16} /></ButtonLink><ButtonLink href="/lessons" secondary testId="button-browse-lessons">Browse lessons</ButtonLink></div>
        </div>
        <div className="ml-auto hidden rounded-[22px] border border-[#e9b951] bg-[#ffdf94] px-5 py-4 text-center sm:block">
          <div className="display-font text-3xl font-bold text-[#664e1d]" data-testid="text-questions-done">{dailyDone}<span className="text-lg text-[#8f743c]">/80</span></div><div className="mt-1 text-[11px] font-extrabold uppercase tracking-wider text-[#80662f]">little wins today</div>
        </div>
      </div>
      <div className="mt-6 sm:hidden"><div className="flex items-center gap-2 text-xs font-bold text-[#68552d]"><span>{dailyDone} of {todayQuestions.length} questions explored</span></div><div className="progress-track mt-2 bg-[#e8bd61]"><div className="progress-fill bg-[#4c61d8]" style={{ width: `${Math.min(100, dailyDone / todayQuestions.length * 100)}%` }} /></div></div>
    </section>
    <div className="mb-4 flex items-end justify-between gap-4"><div><div className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#8d91a1]">Choose your adventure</div><h2 className="display-font mt-1 text-2xl font-bold tracking-[-.7px]">What are we exploring?</h2></div><Link href="/practice" className="hidden items-center gap-1 text-sm font-extrabold text-[#4c61d8] sm:flex" data-testid="link-all-practice">All practice <ArrowRight size={15} /></Link></div>
    <div className="grid gap-4 sm:grid-cols-2">
      {subjects.map(subject => {
        const total = questions.filter(q => q.subject === subject).length;
        const completed = questions.filter(q => q.subject === subject && progress.completedQuestionIds.includes(q.id)).length;
        const totalCorrect = progress.subjectTotals[subject]?.correct ?? 0;
        return <Link href={`/practice?subject=${encodeURIComponent(subject)}`} key={subject} className="subject-tile surface flex min-h-[152px] items-center gap-4 p-5 sm:p-6" style={{ borderColor: `${subjectStyle[subject].ink}22` }} data-testid={`card-subject-${subject.toLowerCase().replaceAll(' ', '-')}`}>
          <SubjectMark subject={subject} size={56} /><div className="min-w-0 flex-1"><div className="display-font text-xl font-bold text-[#292f4a]">{subject}</div><p className="mt-1 text-sm text-[#7a7d8b]">{completed === total ? 'Daily set complete!' : `${total - completed} questions waiting`}</p><div className="progress-track mt-4"><div className="progress-fill" style={{ width: `${completed / total * 100}%`, background: subjectStyle[subject].ink }} /></div></div><div className="self-start rounded-full bg-[#f8f5ec] px-2.5 py-1 text-xs font-bold text-[#707488]">{totalCorrect} pts</div>
        </Link>;
      })}
    </div>
    <section className="mt-7 grid gap-4 md:grid-cols-[1.2fr_.8fr]">
      <div className="surface flex items-center gap-5 p-5 sm:p-6"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#e0f3ea] text-[#33765e]"><Flame size={23} /></div><div className="flex-1"><div className="font-extrabold text-[#303650]">Your learning streak</div><p className="mt-1 text-sm text-[#7a7d8b]">A little practice adds up. You’re doing great.</p></div><span className="display-font text-2xl font-bold text-[#33765e]" data-testid="text-streak">{progress.streak} days</span></div>
      <Link href="/tutor" className="surface flex items-center gap-4 p-5 transition hover:-translate-y-1 sm:p-6" data-testid="card-ask-tutor"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#ffe4dc] text-[#be5e4a]"><CircleHelp size={24} /></div><div><div className="font-extrabold text-[#303650]">A little stuck?</div><p className="mt-1 text-sm text-[#7a7d8b]">Ask your private study tutor.</p></div><ArrowRight size={18} className="ml-auto text-[#7a7d8b]" /></Link>
    </section>
  </div>;
}
function PracticePage({ progress, onAnswer }: { progress: Progress; onAnswer: (q: Question, correct: boolean) => void }) {
  const urlSubject = new URLSearchParams(window.location.search).get('subject');
  const [subject, setSubject] = useState<Subject>(subjects.includes(urlSubject as Subject) ? urlSubject as Subject : 'Maths');
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  useEffect(() => {
    const next = questions.findIndex(q => q.subject === subject && !progress.completedQuestionIds.includes(q.id));
    setIndex(Math.max(0, next));
    setChoice(null);
    setReviewMode(false);
  }, [subject]);
  const setSubjectAndReset = (next: Subject) => { setSubject(next); setIndex(0); setChoice(null); setReviewMode(false); };
  const set = questions.filter(q => q.subject === subject);
  const current = set[index];
  const finished = !current || (!reviewMode && progress.completedQuestionIds.filter(id => id.startsWith(`${subject.toLowerCase().replaceAll(' ', '-')}-`)).length >= set.length);
  const completedCount = progress.completedQuestionIds.filter(id => id.startsWith(`${subject.toLowerCase().replaceAll(' ', '-')}-`)).length;
  const handleAnswer = (answer: number) => {
    if (!current || choice !== null) return;
    setChoice(answer);
    onAnswer(current, answer === current.correctIndex);
  };
  const nextQuestion = () => {
    let nextIndex = index + 1;
    if (!reviewMode) while (nextIndex < set.length && progress.completedQuestionIds.includes(set[nextIndex].id)) nextIndex++;
    setIndex(nextIndex);
    setChoice(null);
  };
  return <div className="page-enter">
    <PageHeading eyebrow="Daily subject practice" title="Let’s have a go." subtitle="Twenty bite-sized questions for each subject. Try an answer, learn from the clues, and keep going at your own pace." right={<div className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#686e82] md:flex"><Clock3 size={16} /> Just one question at a time</div>} />
    <div className="mb-6 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Choose subject">
      {subjects.map(s => <button type="button" key={s} onClick={() => setSubjectAndReset(s)} role="tab" aria-selected={subject === s} className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-extrabold transition ${subject === s ? 'border-[#4c61d8] bg-[#4c61d8] text-white shadow-[0_3px_0_#3547b1]' : 'border-[#e6e0d4] bg-white text-[#646a7e] hover:border-[#b9c2f6]'}`} data-testid={`tab-subject-${s.toLowerCase().replaceAll(' ', '-')}`}><SubjectMark subject={s} size={25} />{s}</button>)}
    </div>
    <section className="surface mx-auto max-w-[790px] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#eee9df] px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3"><SubjectMark subject={subject} size={38} /><div><div className="text-sm font-extrabold text-[#333952]">{subject} daily set</div><div className="text-xs font-semibold text-[#9295a2]">{completedCount} of {set.length} explored</div></div></div>
        <div className="text-sm font-extrabold text-[#4c61d8]" data-testid="text-question-progress">{Math.min(completedCount + (choice !== null ? 0 : 1), set.length)}<span className="text-[#a3a6b2]"> / {set.length}</span></div>
      </div>
      <div className="px-5 py-7 sm:px-9 sm:py-9">
        {finished ? <div className="py-6 text-center" data-testid="status-practice-complete"><div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-[#d9f2e8] text-[#28775c]"><Trophy size={31} /></div><h2 className="display-font text-3xl font-bold text-[#292f4a]">You did the whole set!</h2><p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-[#74788a]">That’s {set.length} questions explored. Your brain has been busy today. Come back tomorrow to practise again.</p><div className="mt-6 flex justify-center gap-3"><button className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#e7e1d4] bg-white px-4 text-sm font-extrabold text-[#454b63]" onClick={() => { setIndex(0); setChoice(null); setReviewMode(true); }} data-testid="button-review-set"><RotateCcw size={16} /> Review set</button><ButtonLink href="/progress" testId="button-see-progress">See my progress <ArrowRight size={16} /></ButtonLink></div></div>
        : current && <>
          <div className="mb-5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#8b8fa0]"><span className="rounded-full bg-[#f6f3ed] px-3 py-1">{current.topic}</span><span>•</span><span>Take your time</span></div>
          <h2 className="display-font max-w-2xl text-[clamp(22px,3vw,31px)] font-bold leading-[1.25] tracking-[-.7px] text-[#292f4a]" data-testid={`text-question-${current.id}`}>{current.prompt}</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {current.options.map((option, i) => {
              const correct = choice !== null && i === current.correctIndex;
              const wrong = choice === i && choice !== current.correctIndex;
              return <button type="button" disabled={choice !== null} onClick={() => handleAnswer(i)} key={option} className={`flex min-h-[58px] items-center gap-3 rounded-[17px] border-2 px-4 text-left text-[15px] font-bold transition disabled:cursor-default ${correct ? 'border-[#69b997] bg-[#e7f6ef] text-[#277653]' : wrong ? 'border-[#e58d78] bg-[#fff0eb] text-[#a84d3b]' : 'border-[#eee9df] bg-[#fffefa] text-[#444a62] hover:border-[#9ca8f0] hover:bg-[#f7f8ff]'}`} data-testid={`answer-option-${current.id}-${i}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-xs font-extrabold ${correct ? 'bg-[#c7eddb] text-[#28775c]' : wrong ? 'bg-[#f9d1c8] text-[#a84d3b]' : 'bg-[#f3f0e9] text-[#878b9a]'}`}>{correct ? <Check size={16} /> : String.fromCharCode(65 + i)}</span>{option}{wrong && <X size={17} className="ml-auto" />}{correct && <CheckCircle2 size={18} className="ml-auto" />}
              </button>;
            })}
          </div>
          {choice !== null && <div className={`mt-6 rounded-[18px] p-5 ${choice === current.correctIndex ? 'bg-[#e8f6ef]' : 'bg-[#fff1e9]'}`} role="status" data-testid={`feedback-${current.id}`}>
            <div className={`flex items-center gap-2 font-extrabold ${choice === current.correctIndex ? 'text-[#267454]' : 'text-[#a64d3a]'}`}>{choice === current.correctIndex ? <><Sparkles size={17} /> You got it!</> : <><Lightbulb size={17} /> Good try — here’s a clue.</>}</div>
            <p className="mt-2 text-sm leading-6 text-[#50566b]">{current.explanation}</p>
            <button onClick={nextQuestion} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#4c61d8] px-4 text-sm font-extrabold text-white" data-testid="button-next-question">Next question <ArrowRight size={15} /></button>
          </div>}
        </>}
      </div>
    </section>
  </div>;
}
function LessonsPage() {
  const [filter, setFilter] = useState<Subject | 'All'>('All');
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = filter === 'All' ? lessons : lessons.filter(lesson => lesson.subject === filter);
  return <div className="page-enter">
    <PageHeading eyebrow="Explore, then try" title="Little lessons, big ideas." subtitle="Quick explainers you can read in a few minutes. No scores, just useful ideas to take with you." />
    <div className="mb-7 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Filter lessons">
      {(['All', ...subjects] as const).map(item => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-extrabold ${filter === item ? 'bg-[#252b45] text-white' : 'border border-[#e6e0d4] bg-white text-[#646a7e]'}`} data-testid={`filter-lessons-${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</button>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      {visible.map((lesson, i) => <LessonCard key={lesson.id} lesson={lesson} open={openId === lesson.id} onToggle={() => setOpenId(openId === lesson.id ? null : lesson.id)} index={i} />)}
    </div>
    {visible.length === 0 && <div className="surface py-16 text-center text-[#74788a]" data-testid="status-no-lessons">No lessons here yet. Try another subject.</div>}
  </div>;
}
function LessonCard({ lesson, open, onToggle, index }: { lesson: Lesson; open: boolean; onToggle: () => void; index: number }) {
  return <article className={`surface overflow-hidden ${open ? 'lg:col-span-2' : ''}`} data-testid={`card-lesson-${lesson.id}`}>
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-4 p-5 text-left sm:p-6" data-testid={`button-open-lesson-${lesson.id}`}>
      <SubjectMark subject={lesson.subject} size={48} /><div className="min-w-0 flex-1"><div className="mb-2 text-[10px] font-extrabold uppercase tracking-[.16em]" style={{ color: subjectStyle[lesson.subject].ink }}>{lesson.subject} · {String(index + 1).padStart(2, '0')}</div><h2 className="display-font text-xl font-bold tracking-[-.4px] text-[#303650]">{lesson.title}</h2><p className="mt-1.5 text-sm leading-5 text-[#7b7e8e]">{lesson.summary}</p></div><span className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full ${open ? 'rotate-90 bg-[#4c61d8] text-white' : 'bg-[#f5f2eb] text-[#6d7284]'}`}><ChevronRight size={18} /></span>
    </button>
    {open && <div className="border-t border-[#eee9df] px-5 pb-6 pt-5 sm:px-8">
      <div className="grid gap-3 sm:grid-cols-2">{lesson.steps.map((step, i) => <div key={step} className="flex gap-3 rounded-[16px] bg-[#faf8f2] p-4" data-testid={`lesson-step-${lesson.id}-${i}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-extrabold text-[#4c61d8]">{i + 1}</span><p className="text-sm leading-6 text-[#565c70]">{step}</p></div>)}</div>
      <Link href={`/practice?subject=${encodeURIComponent(lesson.subject)}`} className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#4c61d8]" data-testid={`link-practice-${lesson.id}`}>Try some {lesson.subject} <ArrowRight size={15} /></Link>
    </div>}
  </article>;
}
function ProgressPage({ progress }: { progress: Progress }) {
  const total = progress.completedQuestionIds.length;
  const accuracy = Object.values(progress.subjectTotals).reduce((sum, n) => sum + n.correct, 0);
  const attempts = Object.values(progress.subjectTotals).reduce((sum, n) => sum + n.attempted, 0);
  return <div className="page-enter">
    <PageHeading eyebrow="Look how far you’ve come" title="Your progress, your way." subtitle="Every question you try is practice your future self can build on." right={<div className="hidden items-center gap-2 rounded-full bg-[#e5f4ec] px-4 py-2 text-sm font-extrabold text-[#33765e] md:flex"><LockKeyhole size={15} /> Saved on this device</div>} />
    <section className="mb-5 grid gap-4 sm:grid-cols-3">
      <Metric icon={Zap} value={`${progress.points}`} label="points earned today" color="#fff0ca" ink="#9c6b15" />
      <Metric icon={CheckCircle2} value={`${total}`} label="questions explored today" color="#d9f2e8" ink="#26785f" />
      <Metric icon={Flame} value={`${progress.streak}`} label="day learning streak" color="#ffe1d8" ink="#bf5b48" />
    </section>
    <section className="surface p-5 sm:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><div className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#8d91a1]">A peek at your practice</div><h2 className="display-font mt-1 text-2xl font-bold tracking-[-.6px] text-[#303650]">Every subject has a story</h2></div><span className="rounded-full bg-[#f6f3ed] px-3 py-1.5 text-xs font-bold text-[#767b8d]">{attempts ? `${Math.round(accuracy / attempts * 100)}% correct on tries` : 'Your first try is waiting'}</span></div>
      <div className="space-y-5">
        {subjects.map(subject => {
          const attempted = progress.subjectTotals[subject]?.attempted ?? 0;
          const correct = progress.subjectTotals[subject]?.correct ?? 0;
          const daily = progress.completedQuestionIds.filter(id => id.startsWith(`${subject.toLowerCase().replaceAll(' ', '-')}-`)).length;
          return <div key={subject} className="flex items-center gap-3 sm:gap-4" data-testid={`progress-subject-${subject.toLowerCase().replaceAll(' ', '-')}`}>
            <SubjectMark subject={subject} size={42} /><div className="min-w-0 flex-1"><div className="mb-2 flex items-center justify-between gap-3"><span className="text-sm font-extrabold text-[#353b55]">{subject}</span><span className="text-xs font-bold text-[#85899a]">{correct} right · {daily}/20 tried</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${daily / 20 * 100}%`, background: subjectStyle[subject].ink }} /></div></div></div>;
        })}
      </div>
      <p className="mt-7 border-t border-[#eee9df] pt-5 text-xs leading-5 text-[#9295a2]" data-testid="text-progress-privacy">Your learning progress stays in this browser on this device. Clear browser storage to remove it.</p>
    </section>
    <section className="mt-5 rounded-[24px] bg-[#e8e8ff] p-5 sm:flex sm:items-center sm:gap-5 sm:p-6"><div className="mb-3 grid h-12 w-12 place-items-center rounded-[16px] bg-white text-[#4c61d8] sm:mb-0"><Star size={23} /></div><div className="flex-1"><h3 className="font-extrabold text-[#333956]">A note from your study buddy</h3><p className="mt-1 text-sm leading-6 text-[#62677e]">You don’t need a perfect score to be making progress. Curiosity counts, and every try is a brave one.</p></div><ButtonLink href="/practice" testId="button-keep-going">Keep going <ArrowRight size={15} /></ButtonLink></section>
  </div>;
}
function Metric({ icon: Icon, value, label, color, ink }: { icon: LucideIcon; value: string; label: string; color: string; ink: string }) {
  return <div className="surface p-5 sm:p-6"><div className="grid h-10 w-10 place-items-center rounded-[13px]" style={{ background: color, color: ink }}><Icon size={20} /></div><div className="display-font mt-4 text-3xl font-bold tracking-[-1px] text-[#303650]" data-testid={`metric-${label.replaceAll(' ', '-')}`}>{value}</div><div className="mt-1 text-sm font-semibold text-[#808495]">{label}</div></div>;
}
function TutorPage() {
  const [subject, setSubject] = useState<TutorSubject>('Maths');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const [lastRequest, setLastRequest] = useState<{ subject: TutorSubject; question: string; history: ChatMessage[] } | null>(null);
  const getErrorMessage = (failure: unknown) => {
    if (failure && typeof failure === 'object') {
      const apiFailure = failure as { status?: unknown; data?: unknown };
      if (apiFailure.status === 503) return 'The tutor isn’t connected right now. Please ask a grown-up to check the app setup, then try again.';
      if (apiFailure.status === 429) return 'The tutor is busy right now. Please wait a moment and try again.';
      if (apiFailure.data && typeof apiFailure.data === 'object' && 'error' in apiFailure.data && typeof apiFailure.data.error === 'string') {
        return apiFailure.data.error;
      }
    }
    return 'I couldn’t reach the tutor just now. Check the internet connection and try again.';
  };
  const tutor = useGetTutorHelp();
  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = question.trim();
    if (!clean || tutor.isPending) return;
    const history = messages.slice(-8).map(item => ({ role: item.role, content: item.content.slice(0, 1200) }));
    const request = { subject, question: clean, history };
    setLastRequest(request);
    setMessages(previous => [...previous, { role: 'user', content: clean }]);
    setQuestion('');
    setError('');
    tutor.mutate({ data: request }, {
      onSuccess: (reply) => setMessages(previous => [...previous, { role: 'assistant', content: reply.answer }]),
      onError: failure => setError(getErrorMessage(failure)),
    });
  };
  return <div className="page-enter">
    <PageHeading eyebrow="Your private study buddy" title="Let’s figure it out together." subtitle="Ask a school question and get a helpful hint or clear steps. This is a place to learn, not just get answers." />
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_270px]">
      <section className="surface overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#eee9df] p-4 sm:px-6 sm:py-5"><div className="relative"><Robot small /><span className="absolute bottom-1 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#67ba90]" /></div><div><div className="font-extrabold text-[#303650]">Studdy is here</div><div className="text-xs font-semibold text-[#8a8e9e]">A calm place to untangle tricky bits</div></div><button type="button" onClick={() => { setMessages([]); setError(''); }} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-[#e7e1d4] px-3 py-2 text-xs font-extrabold text-[#686e82]" data-testid="button-new-chat"><RotateCcw size={14} /> New chat</button></div>
        <div className="flex min-h-[330px] max-h-[55vh] flex-col gap-4 overflow-y-auto bg-[#fffefa] p-4 sm:p-6" data-testid="tutor-chat">
          {messages.length === 0 && <div className="m-auto max-w-md py-8 text-center"><div className="mx-auto mb-4"><Robot /></div><h2 className="display-font text-2xl font-bold text-[#303650]">What are you curious about?</h2><p className="mt-2 text-sm leading-6 text-[#7a7d8b]">Tell me the bit that feels tricky. We’ll take it one small step at a time.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{['Why do fractions work?', 'How do plants make food?', 'Help me plan a story'].map(prompt => <button key={prompt} type="button" onClick={() => setQuestion(prompt)} className="rounded-full border border-[#e6e0d4] bg-white px-3 py-2 text-xs font-bold text-[#646a7e] hover:border-[#9ca8f0]" data-testid={`suggestion-${prompt.toLowerCase().replaceAll(' ', '-')}`}>{prompt}</button>)}</div></div>}
          {messages.map((message, i) => <div key={`${i}-${message.role}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`chat-message-${i}`}>
            <div className={`max-w-[88%] rounded-[20px] px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-[#4c61d8] text-white' : 'rounded-bl-md border border-[#ece7dc] bg-white text-[#4e5469]'}`}><div className={`mb-1 text-[10px] font-extrabold uppercase tracking-wider ${message.role === 'user' ? 'text-[#dce1ff]' : 'text-[#4c61d8]'}`}>{message.role === 'user' ? 'You asked' : 'A thought to try'}</div>{message.content}</div>
          </div>)}
          {tutor.isPending && <div className="flex items-center gap-3 self-start rounded-[18px] border border-[#ece7dc] bg-white px-4 py-3 text-sm font-semibold text-[#777c8e]" data-testid="status-tutor-loading"><span className="flex gap-1"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4c61d8]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4c61d8] [animation-delay:150ms]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4c61d8] [animation-delay:300ms]" /></span>Thinking of a helpful hint…</div>}
          {error && <div className="self-start rounded-xl bg-[#fff0eb] px-4 py-3 text-sm font-semibold text-[#a84d3b]" role="alert" data-testid="status-tutor-error">{error}{lastRequest && <button type="button" className="ml-2 underline" onClick={() => { setError(''); tutor.mutate({ data: lastRequest }, { onSuccess: reply => setMessages(previous => [...previous, { role: 'assistant', content: reply.answer }]), onError: failure => setError(getErrorMessage(failure)) }); }} data-testid="button-retry-tutor">Try again</button>}</div>}
        </div>
        <form onSubmit={send} className="border-t border-[#eee9df] bg-white p-4 sm:p-5">
          <label htmlFor="tutor-question" className="sr-only">Your school question</label>
          <div className="flex items-end gap-2 rounded-[18px] border border-[#e8e3d9] bg-[#faf9f5] p-2 focus-within:border-[#8794eb]">
            <textarea id="tutor-question" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} rows={2} maxLength={2000} placeholder="Type your question here…" className="max-h-36 min-h-[48px] flex-1 resize-y bg-transparent px-3 py-2 text-sm text-[#343a55] outline-none placeholder:text-[#9b9eaa]" data-testid="input-tutor-question" />
            <button type="submit" disabled={!question.trim() || tutor.isPending} className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#4c61d8] text-white transition hover:bg-[#3f54ca] disabled:cursor-not-allowed disabled:bg-[#c5c9d8]" aria-label="Send question" data-testid="button-send-question"><ArrowRight size={19} /></button>
          </div>
          <p className="mt-2 px-1 text-[11px] font-medium text-[#9396a4]">Press Enter to send · Shift + Enter for a new line</p>
        </form>
      </section>
      <aside className="space-y-4">
        <div className="surface p-5"><div className="mb-3 text-[11px] font-extrabold uppercase tracking-[.15em] text-[#888c9b]">Choose a subject</div><div className="flex flex-wrap gap-2 xl:flex-col">{tutorSubjects.map(s => <button key={s} type="button" onClick={() => setSubject(s)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${subject === s ? 'bg-[#eef0ff] text-[#4c61d8]' : 'bg-[#faf8f2] text-[#717688]'}`} data-testid={`tutor-subject-${s.toLowerCase().replaceAll(' ', '-')}`}><TutorSubjectMark subject={s} size={26} />{s}</button>)}</div></div>
        <div className="rounded-[22px] bg-[#fff0ca] p-5" data-testid="privacy-reminder"><div className="mb-2 flex items-center gap-2 font-extrabold text-[#554c39]"><LockKeyhole size={17} /> A quick privacy note</div><p className="text-sm leading-6 text-[#72664d]">Your question is processed by the AI provider to make a reply; Studdybuddy does not save this chat. Please don’t include your name, address, school, or other personal details.</p></div>
        <div className="rounded-[22px] bg-[#e5f4ec] p-5"><div className="mb-2 flex items-center gap-2 font-extrabold text-[#355f50]"><Lightbulb size={17} /> How Studdy helps</div><p className="text-sm leading-6 text-[#557364]">You’ll get guiding questions, hints, and steps to help you reach your own “aha!” moment.</p></div>
      </aside>
    </div>
  </div>;
}

const queryClient = new QueryClient();
function Router() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const recordAnswer = (question: Question, correct: boolean) => {
    setProgress(previous => {
      if (previous.completedQuestionIds.includes(question.id)) return previous;
      const next = { ...previous, completedQuestionIds: [...previous.completedQuestionIds, question.id], points: previous.points + (correct ? 10 : 0), streak: previous.completedQuestionIds.length === 0 ? previous.streak + 1 : previous.streak, subjectTotals: { ...previous.subjectTotals, [question.subject]: { correct: previous.subjectTotals[question.subject].correct + (correct ? 1 : 0), attempted: previous.subjectTotals[question.subject].attempted + 1 } } };
      saveProgress(next);
      return next;
    });
  };
  return <Layout progress={progress}><Switch>
    <Route path="/" component={() => <HomePage progress={progress} />} />
    <Route path="/practice" component={() => <PracticePage progress={progress} onAnswer={recordAnswer} />} />
    <Route path="/lessons" component={LessonsPage} />
    <Route path="/progress" component={() => <ProgressPage progress={progress} />} />
    <Route path="/tutor" component={TutorPage} />
    <Route component={NotFound} />
  </Switch></Layout>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Router /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}
export default App;
