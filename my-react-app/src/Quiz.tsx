import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Cấu trúc dữ liệu cho một câu hỏi
export interface Question {
  question: string;
  options: string[];
  answer: string;
  id: number;
  numberLabel: string;
}

// Cấu trúc cho một phần của bài thi (tương ứng với một file)
export interface QuizSection {
  title: string;
  questions: Question[];
}

interface QuizProps {
  sections: QuizSection[];
  onQuizComplete: (score: number, total: number) => void;
}

const Quiz: React.FC<QuizProps> = ({ sections, onQuizComplete }) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isLastQuestion = 
    currentSectionIndex === sections.length - 1 &&
    currentQuestionIndex === sections[currentSectionIndex].questions.length - 1;
  
  const currentSection = sections?.[currentSectionIndex];
  const currentQuestion = currentSection?.questions?.[currentQuestionIndex];

  const allQuestions = useMemo(() => {
    const flatQuestions: { question: Question; sectionIndex: number; questionIndex: number }[] = [];
    sections.forEach((section, sectionIndex) => {
      section.questions.forEach((question, questionIndex) => {
        flatQuestions.push({ question, sectionIndex, questionIndex });
      });
    });
    return flatQuestions;
  }, [sections]);

  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    return allQuestions.filter(({ question }) => 
      question.question.toLowerCase().includes(lowercasedQuery) ||
      question.numberLabel.toLowerCase().includes(lowercasedQuery)
    );
  }, [searchQuery, allQuestions]);

  const jumpToQuestion = (sectionIndex: number, questionIndex: number) => {
    setCurrentSectionIndex(sectionIndex);
    setCurrentQuestionIndex(questionIndex);
    setSearchQuery('');
    setIsSearchVisible(false);
  };
  
  useEffect(() => {
    if (isSearchVisible) {
      searchInputRef.current?.focus();
    }
  }, [isSearchVisible]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchVisible(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < sections[currentSectionIndex].questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    }
  }, [currentQuestionIndex, currentSectionIndex, sections]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentSectionIndex > 0) {
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentSectionIndex(prev => prev - 1);
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
  }, [currentQuestionIndex, currentSectionIndex, sections]);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' && !isLastQuestion) {
        goToNextQuestion();
      } else if (event.key === 'ArrowLeft') {
        goToPreviousQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToNextQuestion, goToPreviousQuestion, isLastQuestion]);

  const handleAnswerSelect = (option: string) => {
    setUserAnswers({
      ...userAnswers,
      [currentQuestion.id]: option,
    });
  };

  const calculateScore = () => {
    let score = 0;
    sections.forEach(section => {
      section.questions.forEach(q => {
        const correctOptionPrefix = q.answer.trim() + ')';
        if (userAnswers[q.id] && userAnswers[q.id].startsWith(correctOptionPrefix)) {
          score++;
        }
      });
    });
    return score;
  };

  const handleFinishQuiz = () => {
    const score = calculateScore();
    const total = sections.reduce((total, section) => total + section.questions.length, 0);
    onQuizComplete(score, total);
  };
  
  const totalQuestions = sections.reduce((total, section) => total + section.questions.length, 0);
  const questionsCompleted = sections.slice(0, currentSectionIndex).reduce((total, section) => total + section.questions.length, 0) + currentQuestionIndex + 1;

  useEffect(() => {
    document.body.style.backgroundColor = '#f0f2f5';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  const quizStyles = `
    .quiz-page-container {
        display: flex;
        justify-content: center;
        padding: 2rem 1rem;
        min-height: 100vh;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .quiz-layout-container {
        display: flex;
        gap: 2rem;
        width: 100%;
        max-width: 1400px;
    }

    .quiz-main-content {
        flex: 1;
        min-width: 0;
    }
    
    .quiz-navigation-sidebar {
        flex-basis: 380px;
        flex-shrink: 0;
        height: calc(100vh - 4rem);
        position: sticky;
        top: 2rem;
        background-color: #fff;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
    }

    @media (max-width: 1024px) {
        .quiz-layout-container {
            flex-direction: column;
        }
        .quiz-navigation-sidebar {
            position: static;
            height: auto;
            max-height: 450px;
            flex-basis: auto;
        }
    }
    
    .quiz-content-card {
        width: 100%; 
        background-color: #fff;
        border-radius: 16px; 
        box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        padding: 2.5rem;
        display: flex; 
        flex-direction: column;
        max-height: calc(100vh - 4rem);
    }

    .quiz-navigation-sidebar h3 {
        font-size: 1.5rem; color: #1c2a4e; margin: 0 0 1rem 0;
        padding-bottom: 1rem; border-bottom: 1px solid #e9ecef;
        flex-shrink: 0;
    }
    .quiz-nav-sections { overflow-y: auto; flex-grow: 1; padding-right: 10px; }
    .quiz-nav-section { margin-bottom: 1.5rem; }
    .quiz-nav-section:last-child { margin-bottom: 0; }
    .quiz-nav-section h4 { font-size: 1.1rem; font-weight: 600; color: #343a40; margin-bottom: 1rem; }
    .question-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(45px, 1fr)); gap: 0.75rem; }
    .question-grid-item {
        display: flex; align-items: center; justify-content: center;
        aspect-ratio: 1 / 1; border: 1px solid #dee2e6;
        border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 500;
        background-color: #f8f9fa; color: #495057; transition: all 0.2s ease;
    }
    .question-grid-item:hover { border-color: #007bff; color: #007bff; }
    .question-grid-item.answered { background-color: #e7f1ff; border-color: #a0c7ff; color: #0056b3; }
    .question-grid-item.current {
        background-color: #007bff; border-color: #007bff; color: #fff;
        transform: scale(1.05); box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
    }
    
    .quiz-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        gap: 1rem;
        flex-shrink: 0;
    }
    .quiz-header-main { flex-grow: 1; }
    .quiz-header-main h3 { font-size: 1.75rem; color: #1c2a4e; margin: 0 0 0.25rem 0; }
    .quiz-header-main p { font-size: 1.1rem; color: #5a6a8a; margin: 0; }

    .quiz-search-container { position: relative; }
    
    .search-toggle-btn {
        background: none; border: 1px solid #dee2e6; color: #495057;
        width: 44px; height: 44px; border-radius: 50%; cursor: pointer;
        font-size: 1rem; display: flex; align-items: center; justify-content: center;
        transition: background-color 0.2s, color 0.2s;
    }
    .search-toggle-btn:hover { background-color: #e9ecef; }
    
    .search-dropdown {
        position: absolute; top: 100%; right: 0; margin-top: 10px;
        background-color: #fff; border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15); z-index: 10;
        width: 380px; padding: 1rem; border: 1px solid #e9ecef;
        animation: fadeInDropdown 0.2s ease-out;
    }
    @keyframes fadeInDropdown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .search-input {
        width: 100%; padding: 0.8rem 1rem; border-radius: 8px;
        border: 1px solid #ced4da; font-size: 1rem; margin-bottom: 0.5rem;
    }
    .search-input:focus {
        outline: none; border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
    }
    
    .search-results-list {
        list-style: none; padding: 0; margin: 0; max-height: 300px;
        overflow-y: auto;
    }
    .search-results-list li {
        padding: 0.8rem 1rem; cursor: pointer; border-radius: 6px;
        transition: background-color 0.2s; white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem;
    }
    .search-results-list li:hover { background-color: #f1f3f5; }
    .search-results-list .no-results {
        color: #6c757d; cursor: default; text-align: center; padding: 1.5rem 1rem;
    }
    .search-results-list .no-results:hover { background-color: transparent; }
    
    .back-btn {
        background-color: #f8f9fa; border: 1px solid #dee2e6; color: #495057;
        padding: 0.6rem 1.2rem; border-radius: 10px; cursor: pointer;
        font-size: 0.95rem; font-weight: 500;
        transition: background-color 0.2s, color 0.2s, border-color 0.2s;
    }
    .back-btn:hover { background-color: #e9ecef; border-color: #adb5bd; }

    .progress-bar-container { width: 100%; height: 10px; background-color: #e9ecef; border-radius: 5px; margin-bottom: 2rem; overflow: hidden; flex-shrink: 0;}
    .progress-bar { height: 100%; background-color: #007bff; border-radius: 5px; transition: width 0.4s ease; }

    .quiz-scrollable-area {
        flex-grow: 1;
        overflow-y: auto;
        padding-right: 1rem;
        margin-right: -1rem;
    }

    .question-text { font-size: 1.3rem; color: #343a40; font-weight: 600; margin-bottom: 2rem; line-height: 1.6; }

    .options-list { display: flex; flex-direction: column; gap: 1rem; }
    .option-item { position: relative; }
    .radio-input { opacity: 0; position: absolute; width: 1px; height: 1px; }
    .option-label {
        display: flex; align-items: center; padding: 1rem 1.5rem;
        border: 1px solid #dee2e6; border-radius: 12px; cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
    }
    .option-label::before {
        content: ''; width: 20px; height: 20px; border-radius: 50%;
        border: 2px solid #ced4da; margin-right: 1rem;
        background-color: #fff; flex-shrink: 0;
    }
    .radio-input:hover + .option-label { border-color: #007bff; }
    .radio-input:checked + .option-label {
        background-color: #e7f1ff; border-color: #007bff;
    }
    .radio-input:checked + .option-label::before {
        border-color: #007bff; background-color: #007bff;
        box-shadow: 0 0 0 3px #fff inset;
    }
    
    .navigation-buttons { display: flex; justify-content: space-between; margin-top: 2.5rem; flex-shrink: 0; }
    .nav-btn {
        padding: 0.8rem 2rem; font-size: 1rem; font-weight: 600;
        border-radius: 10px; border: none; cursor: pointer;
        background-color: #007bff; color: white; transition: background-color 0.2s;
    }
    .nav-btn:hover { background-color: #0056b3; }
    .nav-btn:disabled { background-color: #ced4da; cursor: not-allowed; }
  `;

  if (!currentQuestion) {
    return (
      <div className="quiz-page-container">
        <p>Đang tải bài kiểm tra...</p>
      </div>
    );
  }

  return (
    <>
      <style>{quizStyles}</style>
      <div className="quiz-page-container">
        <div className="quiz-layout-container">
          <div className="quiz-main-content">
            <div className="quiz-content-card">
              <div className="quiz-header">
                <div className="quiz-header-main">
                  <h3>{currentSection.title}</h3>
                  <p>Câu hỏi {questionsCompleted} / {totalQuestions}</p>
                </div>
                <div className="quiz-search-container" ref={searchContainerRef}>
                  <button onClick={() => setIsSearchVisible(!isSearchVisible)} className="search-toggle-btn" title="Tìm kiếm câu hỏi">
                    <i className="fas fa-search"></i>
                  </button>
                  {isSearchVisible && (
                    <div className="search-dropdown">
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Nhập từ khóa câu hỏi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                      />
                      {searchQuery && (
                        <ul className="search-results-list">
                          {filteredQuestions.length > 0 ? (
                            filteredQuestions.map(({ question, sectionIndex, questionIndex }, index) => (
                              <li key={index} onClick={() => jumpToQuestion(sectionIndex, questionIndex)}>
                                <strong>{question.numberLabel}:</strong> {question.question}
                              </li>
                            ))
                          ) : (
                            <li className="no-results">Không tìm thấy câu hỏi nào.</li>
                          )}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <button className="back-btn" onClick={() => onQuizComplete(calculateScore(), totalQuestions)}>
                  Thoát
                </button>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${(questionsCompleted / totalQuestions) * 100}%` }}></div>
              </div>
              <div className="quiz-scrollable-area">
                <h4 className="question-text">{currentQuestion.question}</h4>
                <div className="options-list">
                  {currentQuestion.options.map((option, index) => {
                    const uniqueId = `q${currentQuestion.id}-opt${index}`;
                    return (
                      <div key={index} className="option-item">
                        <input
                          type="radio"
                          id={uniqueId}
                          name={`question-${currentQuestion.id}`}
                          value={option}
                          checked={userAnswers[currentQuestion.id] === option}
                          onChange={() => handleAnswerSelect(option)}
                          className="radio-input"
                        />
                        <label htmlFor={uniqueId} className="option-label">{option}</label>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="navigation-buttons">
                <button
                  className="nav-btn"
                  onClick={goToPreviousQuestion}
                  disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
                >
                  Quay lại
                </button>
                {isLastQuestion ? (
                  <button className="nav-btn" onClick={handleFinishQuiz}>
                    Nộp bài
                  </button>
                ) : (
                  <button className="nav-btn" onClick={goToNextQuestion}>
                    Tiếp theo
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="quiz-navigation-sidebar">
            <h3>Danh sách câu hỏi</h3>
            <div className="quiz-nav-sections">
              {sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="quiz-nav-section">
                  <h4>{section.title}</h4>
                  <div className="question-grid">
                    {section.questions.map((question, questionIndex) => {
                      const isAnswered = userAnswers[question.id] !== undefined;
                      const isCurrent = sectionIndex === currentSectionIndex && questionIndex === currentQuestionIndex;
                      
                      let className = 'question-grid-item';
                      if (isCurrent) {
                          className += ' current';
                      } else if (isAnswered) {
                          className += ' answered';
                      }
                      return (
                          <button
                              key={question.id}
                              className={className}
                              onClick={() => jumpToQuestion(sectionIndex, questionIndex)}
                          >
                              {question.numberLabel.replace('Câu ', '')}
                          </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Quiz; 