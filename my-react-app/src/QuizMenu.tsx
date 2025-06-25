import React from 'react';

interface QuizMenuProps {
  startQuiz: (quizId: string) => void;
}

const QuizMenu: React.FC<QuizMenuProps> = ({ startQuiz }) => {
  return (
    <div className="submenu">
      <div className="submenu-item" onClick={(e) => { e.stopPropagation(); startQuiz('nhom1'); }}>
        1. Thi kiểm tra NVCM nhóm 1
      </div>
      <div className="submenu-item" onClick={(e) => { e.stopPropagation(); startQuiz('nhom2'); }}>
        2. Thi kiểm tra NVCM nhóm 2
      </div>
      <div className="submenu-item" onClick={(e) => { e.stopPropagation(); startQuiz('nhom3'); }}>
        3. Thi kiểm tra NVCM nhóm 3
      </div>
      <div className="submenu-item" onClick={(e) => { e.stopPropagation(); startQuiz('nhom4'); }}>
        4. Thi kiểm tra NVCM nhóm 4
      </div>
      <div className="submenu-item" onClick={(e) => { e.stopPropagation(); startQuiz('nhom5'); }}>
        5. Thi kiểm tra NVCM nhóm 5
      </div>
      <div className="submenu-item" onClick={(e) => { e.stopPropagation(); startQuiz('nhom6'); }}>
        6. Thi kiểm tra NVCM nhóm 6
      </div>
    </div>
  );
};

export default QuizMenu; 