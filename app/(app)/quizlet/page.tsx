'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, RotateCcw, Trophy, ChevronRight, Sparkles } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  answer: string;
  options?: string[];
  type: 'multiple' | 'text';
  category: string;
}

const QUESTIONS: Question[] = [
  // History
  {
    id: 1,
    question: 'When was Lambda Chi Alpha founded nationally?',
    answer: 'November 2, 1909',
    options: ['November 2, 1909', 'October 15, 1910', 'March 22, 1908', 'January 5, 1911'],
    type: 'multiple',
    category: 'History',
  },
  {
    id: 2,
    question: 'Where was Lambda Chi Alpha founded?',
    answer: 'Boston University',
    options: ['Boston University', 'Harvard University', 'MIT', 'Yale University'],
    type: 'multiple',
    category: 'History',
  },
  {
    id: 3,
    question: 'Who founded Lambda Chi Alpha?',
    answer: 'Warren A. Cole',
    options: ['Warren A. Cole', 'James T. Smith', 'Robert E. Davis', 'William H. Clark'],
    type: 'multiple',
    category: 'History',
  },
  {
    id: 4,
    question: 'When was the ASU (Zeta-Psi) chapter of Lambda Chi Alpha originally founded?',
    answer: '1951',
    options: ['1951', '1947', '1963', '1958'],
    type: 'multiple',
    category: 'History',
  },

  // Values & Mottos
  {
    id: 5,
    question: 'What does "Per Crucem Crescens" mean?',
    answer: 'Crescent and the Cross',
    options: ['Crescent and the Cross', 'Through Strength We Rise', 'Brothers in Arms', 'Light Through Darkness'],
    type: 'multiple',
    category: 'Values',
  },
  {
    id: 6,
    question: 'What does "Vir Quisque Vir" mean?',
    answer: 'Every Man a Man',
    options: ['Every Man a Man', 'Brotherhood Forever', 'Strength in Unity', 'Men of Honor'],
    type: 'multiple',
    category: 'Values',
  },
  {
    id: 7,
    question: 'Which of these is a core value of Lambda Chi Alpha?',
    answer: 'Loyalty',
    options: ['Loyalty', 'Wealth', 'Dominance', 'Fame'],
    type: 'multiple',
    category: 'Values',
  },
  {
    id: 8,
    question: 'Name 3 core values of Lambda Chi Alpha.',
    answer: 'Loyalty, Duty, Respect, Service, Honor, Integrity, Personal Courage',
    type: 'text',
    category: 'Values',
  },

  // Symbols & Colors
  {
    id: 9,
    question: 'What are the colors of Lambda Chi Alpha?',
    answer: 'Purple, Green, and Gold',
    options: ['Purple, Green, and Gold', 'Red, White, and Blue', 'Black and Gold', 'Blue and Silver'],
    type: 'multiple',
    category: 'Symbols',
  },
  {
    id: 10,
    question: 'What is the symbol of Lambda Chi Alpha?',
    answer: 'The Cross and Crescent',
    options: ['The Cross and Crescent', 'The Eagle', 'The Shield and Sword', 'The Oak Tree'],
    type: 'multiple',
    category: 'Symbols',
  },
  {
    id: 11,
    question: 'What is the flower of Lambda Chi Alpha?',
    answer: 'White Rose',
    options: ['White Rose', 'Red Carnation', 'Purple Orchid', 'Yellow Lily'],
    type: 'multiple',
    category: 'Symbols',
  },
  {
    id: 12,
    question: 'What is the mascot of Lambda Chi Alpha?',
    answer: 'Lion Rampant',
    options: ['Lion Rampant', 'Golden Eagle', 'White Stallion', 'Grey Wolf'],
    type: 'multiple',
    category: 'Symbols',
  },

  // Philanthropy
  {
    id: 13,
    question: 'What is Lambda Chi Alpha\'s philanthropy event?',
    answer: 'Watermelon Bust with Feeding America',
    options: ['Watermelon Bust with Feeding America', 'Relay for Life', 'Dance Marathon', 'Habitat Build Day'],
    type: 'multiple',
    category: 'Philanthropy',
  },

  // Notable Alumni
  {
    id: 14,
    question: 'Which U.S. President was a Lambda Chi Alpha member?',
    answer: 'Harry S. Truman',
    options: ['Harry S. Truman', 'John F. Kennedy', 'Theodore Roosevelt', 'Dwight D. Eisenhower'],
    type: 'multiple',
    category: 'Alumni',
  },
  {
    id: 15,
    question: 'Which country musician is a Lambda Chi Alpha alumnus?',
    answer: 'Kenny Chesney',
    options: ['Kenny Chesney', 'Luke Bryan', 'Tim McGraw', 'Blake Shelton'],
    type: 'multiple',
    category: 'Alumni',
  },
  {
    id: 16,
    question: 'Which Lambda Chi Alpha alumnus co-founded ESPN?',
    answer: 'Bill Rasmussen',
    options: ['Bill Rasmussen', 'Dick Ebersol', 'Roone Arledge', 'Keith Jackson'],
    type: 'multiple',
    category: 'Alumni',
  },
  {
    id: 17,
    question: 'Fred J. Borch, a Lambda Chi Alpha alumnus, was the former president/CEO of which company?',
    answer: 'General Electric',
    options: ['General Electric', 'Ford Motor Company', 'IBM', 'AT&T'],
    type: 'multiple',
    category: 'Alumni',
  },
  {
    id: 18,
    question: 'Which Lambda Chi Alpha alumnus is in the College & Pro Football Hall of Fame?',
    answer: 'Frederick S. Biletnikoff',
    options: ['Frederick S. Biletnikoff', 'Joe Montana', 'Terry Bradshaw', 'Johnny Unitas'],
    type: 'multiple',
    category: 'Alumni',
  },
  {
    id: 19,
    question: 'Name a famous Lambda Chi Alpha alumnus.',
    answer: 'Harry S. Truman, Kenny Chesney, Bill Rasmussen, Fred J. Borch, Claude Akins, Frederick S. Biletnikoff',
    type: 'text',
    category: 'Alumni',
  },

  // Fun / Chapter
  {
    id: 20,
    question: 'Who is the best ping pong player in the GLV?',
    answer: 'Cole Jolley',
    options: ['Cole Jolley', 'Random Pledge', 'The President', 'Nobody plays ping pong'],
    type: 'multiple',
    category: 'Chapter',
  },
];

const categoryColors: Record<string, string> = {
  History: 'var(--info, #3B82F6)',
  Values: 'var(--accent, #1D9E75)',
  Symbols: 'var(--violet, #8A00FF)',
  Philanthropy: 'var(--warning, #F59E0B)',
  Alumni: 'var(--danger, #EF4444)',
  Chapter: 'var(--success, #22C55E)',
};

export default function QuizletPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);

  const question = QUESTIONS[currentIndex];
  const progress = ((currentIndex) / QUESTIONS.length) * 100;

  const checkAnswer = useCallback((answer: string) => {
    if (answered) return;
    setSelectedAnswer(answer);
    setAnswered(true);

    const correct = question.type === 'text'
      ? question.answer.toLowerCase().split(',').some(a => answer.toLowerCase().trim().includes(a.trim().toLowerCase()))
      : answer === question.answer;

    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);
    setAnswers(prev => [...prev, correct]);
  }, [answered, question]);

  const nextQuestion = () => {
    if (currentIndex + 1 >= QUESTIONS.length) {
      setShowResults(true);
      return;
    }
    setCurrentIndex(i => i + 1);
    setAnswered(false);
    setSelectedAnswer(null);
    setTextAnswer('');
    setIsCorrect(false);
  };

  const restart = () => {
    setCurrentIndex(0);
    setScore(0);
    setAnswered(false);
    setSelectedAnswer(null);
    setTextAnswer('');
    setIsCorrect(false);
    setShowResults(false);
    setAnswers([]);
  };

  if (showResults) {
    const pct = Math.round((score / QUESTIONS.length) * 100);
    return (
      <div className="p-6 flex items-center justify-center min-h-[80vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg text-center"
          style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '40px' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <Trophy size={64} style={{ color: pct >= 80 ? 'var(--accent)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)', margin: '0 auto 16px' }} />
          </motion.div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {pct >= 80 ? 'Outstanding!' : pct >= 50 ? 'Not Bad!' : 'Study Up!'}
          </h1>
          <p style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)', margin: '16px 0' }}>
            {score}/{QUESTIONS.length}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            {pct}% correct — {pct >= 80 ? 'You know your stuff, brother.' : pct >= 50 ? 'Getting there. Review the ones you missed.' : 'Time to hit the books.'}
          </p>

          {/* Answer breakdown */}
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
            {answers.map((correct, i) => (
              <div
                key={i}
                style={{
                  width: '24px', height: '24px', borderRadius: '6px',
                  background: correct ? 'var(--success-muted)' : 'var(--danger-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700,
                  color: correct ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <button
            onClick={restart}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'var(--accent)', color: 'white',
              padding: '12px 24px', borderRadius: 'var(--radius-md)',
              fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
            }}
          >
            <RotateCcw size={16} /> Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Lambda Sweetheart Quizlet
            </h1>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
            {currentIndex + 1} / {QUESTIONS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: 'var(--accent)', borderRadius: '2px' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Score: <strong style={{ color: 'var(--accent)' }}>{score}</strong>
          </span>
          <span
            style={{
              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
              padding: '2px 8px', borderRadius: '9999px',
              background: categoryColors[question.category] + '18',
              color: categoryColors[question.category],
            }}
          >
            {question.category}
          </span>
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            padding: '28px',
            marginBottom: '20px',
          }}
        >
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600,
            color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '20px',
          }}>
            {question.question}
          </h2>

          {question.type === 'multiple' && question.options ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {question.options.map((option) => {
                const isSelected = selectedAnswer === option;
                const isRight = option === question.answer;
                let bg = 'var(--bg-surface)';
                let border = 'var(--border)';
                let textColor = 'var(--text-primary)';

                if (answered) {
                  if (isRight) {
                    bg = 'var(--success-muted)';
                    border = 'var(--success)';
                    textColor = 'var(--success)';
                  } else if (isSelected && !isRight) {
                    bg = 'var(--danger-muted)';
                    border = 'var(--danger)';
                    textColor = 'var(--danger)';
                  }
                }

                return (
                  <motion.button
                    key={option}
                    onClick={() => checkAnswer(option)}
                    disabled={answered}
                    whileHover={!answered ? { scale: 1.01 } : {}}
                    whileTap={!answered ? { scale: 0.99 } : {}}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 16px',
                      background: bg, border: `1px solid ${border}`,
                      borderRadius: 'var(--radius-md)',
                      color: textColor,
                      fontSize: '14px', fontFamily: 'var(--font-body)',
                      textAlign: 'left', cursor: answered ? 'default' : 'pointer',
                      transition: 'all 150ms ease',
                      width: '100%',
                    }}
                  >
                    <span style={{ flex: 1 }}>{option}</span>
                    {answered && isRight && <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />}
                    {answered && isSelected && !isRight && <XCircle size={18} style={{ color: 'var(--danger)' }} />}
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div>
              <input
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && textAnswer.trim() && !answered) checkAnswer(textAnswer);
                }}
                disabled={answered}
                placeholder="Type your answer..."
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)',
                  outline: 'none',
                }}
              />
              {!answered && (
                <button
                  onClick={() => textAnswer.trim() && checkAnswer(textAnswer)}
                  disabled={!textAnswer.trim()}
                  style={{
                    marginTop: '8px', padding: '10px 20px',
                    background: textAnswer.trim() ? 'var(--accent)' : 'var(--bg-surface)',
                    color: textAnswer.trim() ? 'white' : 'var(--text-tertiary)',
                    borderRadius: 'var(--radius-md)', border: 'none',
                    fontSize: '14px', fontWeight: 600, cursor: textAnswer.trim() ? 'pointer' : 'default',
                  }}
                >
                  Submit
                </button>
              )}
              {answered && (
                <div style={{ marginTop: '12px', padding: '12px', borderRadius: 'var(--radius-md)', background: isCorrect ? 'var(--success-muted)' : 'var(--danger-muted)' }}>
                  <p style={{ fontSize: '13px', color: isCorrect ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {isCorrect ? 'Correct!' : 'Not quite.'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Answer: {question.answer}
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Feedback + Next */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            {question.type === 'multiple' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isCorrect ? (
                  <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
                ) : (
                  <XCircle size={20} style={{ color: 'var(--danger)' }} />
                )}
                <span style={{ fontSize: '14px', fontWeight: 600, color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                  {isCorrect ? 'Correct!' : `Answer: ${question.answer}`}
                </span>
              </div>
            )}
            <button
              onClick={nextQuestion}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: 'auto',
                background: 'var(--accent)', color: 'white',
                padding: '10px 20px', borderRadius: 'var(--radius-md)',
                fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >
              {currentIndex + 1 >= QUESTIONS.length ? 'See Results' : 'Next'}
              <ChevronRight size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
