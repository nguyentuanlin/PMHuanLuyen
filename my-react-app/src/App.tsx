import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import PdfViewer from './PdfViewer';
import PdfDataService from './PdfDataService';
import Quiz, { QuizSection } from './Quiz';
import QuizMenu from './QuizMenu';

// Hàm chuyển đổi text markdown đơn giản sang HTML
const formatMessage = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  
  return lines.map((line, index) => {
    if (line.trim() === '') {
      return <div key={index} className="message-line" style={{ height: '0.5em' }} />;
    }
    
    // Xử lý các dòng trong danh sách
    const listItemMatch = line.match(/^\s*•\s(.*)/);
    if (listItemMatch) {
      let content: React.ReactNode = listItemMatch[1];
      // Bold
      content = content.toString().split(/\*(.*?)\*/g).map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
      // Italic
      content = React.Children.toArray(content).map((seg: any) => typeof seg === 'string' ? seg.split(/_(.*?)_/g).map((part, i) => i % 2 === 1 ? <em key={i}>{part}</em> : part) : seg);

      return (
          <div key={index} className="message-line list-item">
              <span className="bullet">•</span>
              <span className="text-content">{content}</span>
          </div>
      )
    }

    // Xử lý các dòng khác
    let content: React.ReactNode = line;
    // Bold
    content = content.toString().split(/\*(.*?)\*/g).map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
    // Italic
    content = React.Children.toArray(content).map((seg: any) => typeof seg === 'string' ? seg.split(/_(.*?)_/g).map((part, i) => i % 2 === 1 ? <em key={i}>{part}</em> : part) : seg);

    return (
      <div key={index} className="message-line">
        {content}
      </div>
    );
  });
};

// New Chatbot component
function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{text: string, sender: 'user' | 'bot'}[]>([
    {text: 'Xin chào! Tôi là trợ lý ảo A40. Tôi có thể giúp gì cho bạn về tổng đài Softswitch?', sender: 'bot'}
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const suggestedQuestions = [
    "Cấu trúc tổng đài Softswitch là gì?",
    "Kỹ thuật chuyển mạch gói VoIP là gì?",
    "Việc bảo quản, bảo dưỡng tổng đài Softswitch gồm những gì?",
  ];

  // Reference to all menu items (PDF documents)
  const allMenuItems = useMemo(() => [
    // Kiến thức về chuyển mạch
    { title: '1. Cơ sở kỹ thuật về máy điện thoại', path: '/document/1/1. Cơ sở kỹ thuật về máy điện thoại.pdf', category: 'Kiến thức về chuyển mạch' },
    { title: '2. Kỹ thuật chuyển mạch gói VoIP', path: '/document/1/5. Kỹ thuật chuyển mạch gói.pdf', category: 'Kiến thức về chuyển mạch' },
    { title: '3. Báo hiệu trong mạng điện thoại', path: '/document/1/6. Báo hiệu trong mạng điện thoại.pdf', category: 'Kiến thức về chuyển mạch' },
    { title: '4. Cơ sở kỹ thuật về chuyển mạch', path: '/document/1/7. Cơ sở kỹ thuật chuyển mạch.pdf', category: 'Kiến thức về chuyển mạch' },
    { title: '5. Tổng quan tổng đài Softswitch', path: '/document/1/3. Tổng quan về Tổng đài điện tử KTS.pdf', category: 'Kiến thức về chuyển mạch' },
  ], []);

  // Initialize PDF data service
  useEffect(() => {
    const initService = async () => {
      try {
        const pdfService = PdfDataService.getInstance();
        await pdfService.initialize(allMenuItems);
        setIsInitialized(true);
        console.log("PDF data service initialized successfully");
      } catch (error) {
        console.error("Failed to initialize PDF data service:", error);
      }
    };
    
    initService();
  }, [allMenuItems]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const messageToSend = (messageOverride || inputText).trim();
    if (!messageToSend) return;
    
    const userMessage = {text: messageToSend, sender: 'user' as const};
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      let responseText: string;
      const pdfService = PdfDataService.getInstance();

      if (isInitialized && pdfService) {
        // Step 1: Retrieve context from documents
        const searchResults = pdfService.searchContent(messageToSend);
        
        let systemPrompt: string;
        let userPrompt: string;

        if (searchResults.length > 0) {
          // Case 1: Context found, act as a document expert
          const context = searchResults
            .map(r => `Trích từ tài liệu "${r.title}":\n${r.text}`)
            .join('\n\n---\n\n');

          systemPrompt = `Bạn là một trợ lý ảo chuyên gia về hệ thống tổng đài Softswitch.
Nhiệm vụ của bạn là cung cấp câu trả lời rõ ràng, có cấu trúc cho người dùng.

**QUY TẮC TRẢ LỜI:**
1.  **Luôn trả lời bằng tiếng Việt.**
2.  **Ưu tiên hàng đầu:** Dựa vào thông tin trong "BỐI CẢNH" được cung cấp để trả lời câu hỏi.
3.  **Cấu trúc câu trả lời:**
    *   **Giới thiệu:** Bắt đầu bằng một câu giới thiệu ngắn gọn, trực tiếp vào vấn đề.
    *   **Các ý chính:** Trình bày các điểm chính hoặc các bước bằng cách sử dụng danh sách có dấu gạch đầu dòng (\`•\`). Mỗi ý nên rõ ràng và súc tích.
    *   **Kết luận:** Kết thúc bằng một đoạn tóm tắt ngắn gọn hoặc một kết luận hợp lý.
4.  **Nếu không có bối cảnh:** Nếu "BỐI CẢNH" không chứa thông tin liên quan hoặc không được cung cấp, hãy trả lời câu hỏi dựa trên kiến thức chung của bạn về Softswitch và các chủ đề liên quan, nhưng vẫn tuân thủ cấu trúc trên.
5.  **Giọng văn:** Chuyên nghiệp, hữu ích và dễ hiểu.`;
          
          userPrompt = `Dựa vào bối cảnh dưới đây (nếu có liên quan), hãy trả lời câu hỏi sau.

BỐI CẢNH:
---
${context}
---

CÂU HỎI: ${messageToSend}

TRẢ LỜI:`;

        } else {
          // Case 2: No context found, act as a general-purpose assistant
          systemPrompt = `Bạn là một trợ lý ảo đa năng, hữu ích.

**QUY TẮC TRẢ LỜI:**
1.  **Luôn trả lời bằng tiếng Việt.**
2.  **Cấu trúc câu trả lời:**
    *   **Giới thiệu:** Bắt đầu bằng một câu giới thiệu ngắn gọn, trực tiếp vào vấn đề.
    *   **Các ý chính:** Trình bày các điểm chính hoặc các bước bằng cách sử dụng danh sách có dấu gạch đầu dòng (\`•\`). Mỗi ý nên rõ ràng và súc tích.
    *   **Kết luận:** Kết thúc bằng một đoạn tóm tắt ngắn gọn hoặc một kết luận hợp lý.
3.  **Giọng văn:** Chuyên nghiệp, hữu ích và dễ hiểu.`;
          
          userPrompt = messageToSend;
        }

        // --- UNIFIED GROQ API CALL ---
        const GROQ_API_KEY = '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';

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            model: "llama3-8b-8192"
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Groq API Error:", errorData);
          throw new Error(`Groq API error: ${response.statusText}`);
        }
        
        const result = await response.json();
        responseText = result.choices[0]?.message?.content || "Không nhận được phản hồi hợp lệ từ AI.";
        // --- END OF GROQ API CALL ---

      } else {
        // Fallback if PDF service is not ready
        responseText = 'Hệ thống đang khởi tạo, vui lòng đợi trong giây lát...';
      }
      
      setMessages(prev => [...prev, {text: responseText, sender: 'bot'}]);

    } catch (error) {
      console.error("Error generating response with AI:", error);
      setMessages(prev => [...prev, {text: "❌ Rất tiếc, đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau.", sender: 'bot'}]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    handleSendMessage(question);
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="chatbot-container">
      {/* Chat toggle button */}
      <button 
        className={`chat-toggle-button ${isOpen ? 'is-open' : ''}`}
        onClick={toggleChat}
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <i className="fas fa-times"></i>
        ) : (
          <img 
            src={`${process.env.PUBLIC_URL}/asset/image-removebg-preview.png`} 
            alt="Chat" 
            className="chat-icon" 
          />
        )}
      </button>
      
      {/* Chat window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-title">
              Trợ lý ảo A40
              {!isInitialized && (
                <span className="loading-indicator" title="Đang tải dữ liệu">
                  <i className="fas fa-sync fa-spin"></i>
                </span>
              )}
            </div>
            <button className="chat-close-btn" onClick={toggleChat}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.sender}`}>
                {message.sender === 'bot' 
                  ? formatMessage(message.text)
                  : message.text}
              </div>
            ))}
            {messages.length === 1 && !isLoading && (
              <div className="suggested-questions">
                <p className="suggestion-title">Gợi ý cho bạn:</p>
                {suggestedQuestions.map((q, i) => (
                  <button key={i} className="suggestion-btn" onClick={() => handleSuggestionClick(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            {isLoading && (
              <div className="message bot loading">
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Nhập câu hỏi..."
              disabled={isLoading}
            />
            <button 
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputText.trim()}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Define the menu item data structure
interface MenuItem {
  title: string;
  path?: string; // PDF path
  category: string; // Category/section name
}

// ++ FUNCTION TO PARSE QUIZ FILES
const parseQuizFile = (text: string, title: string): QuizSection => {
    const questions: { id: number, numberLabel: string, question: string, options: string[], answer: string }[] = [];
    const lines = text.replace(/\r/g, '').split('\n');

    let i = 0;
    while (i < lines.length) {
        const line = lines[i]?.trim();

        // Find the start of a question
        if (line && line.match(/^Câu \d+/)) {
            const numberLabel = line;
            i++; // Move to the next line

            // Find question text (next non-empty line)
            let questionText = '';
            while (i < lines.length && !lines[i]?.trim()) { i++; } // Skip empty lines
            if (i < lines.length) {
                questionText = lines[i]?.trim();
                i++;
            }

            const options: string[] = [];
            let answer = '';

            // Loop until we find the next question or end of file
            while (i < lines.length && !lines[i]?.trim().match(/^Câu \d+/)) {
                const currentLine = lines[i]?.trim();

                if (!currentLine) { // Skip empty lines
                    i++;
                    continue;
                }

                // Check for an option (e.g., "A)")
                if (currentLine.match(/^[A-H]\)/)) {
                    let optionText = currentLine;
                    
                    // If option text is on a separate line
                    if (optionText.length <= 2) {
                        let nextLineIndex = i + 1;
                        // Find next non-empty line
                        while (nextLineIndex < lines.length && !lines[nextLineIndex]?.trim()) {
                            nextLineIndex++;
                        }

                        if (nextLineIndex < lines.length) {
                            const nextLineText = lines[nextLineIndex]?.trim();
                            // If the next line is not another option or the answer key
                            if (!nextLineText.match(/^[A-H]\)/) && !nextLineText.startsWith('Đáp án')) {
                                optionText += ` ${nextLineText}`;
                                i = nextLineIndex; // Move parser to the line with option text
                            }
                        }
                    }
                    options.push(optionText);
                } 
                // Check for the answer line
                else if (currentLine.startsWith('Đáp án')) {
                    let nextLineIndex = i + 1;
                    // Find next non-empty line for the answer
                    while (nextLineIndex < lines.length && !lines[nextLineIndex]?.trim()) {
                        nextLineIndex++;
                    }

                    if (nextLineIndex < lines.length) {
                        answer = lines[nextLineIndex]?.trim();
                    }
                    // Break from this inner loop once answer is found
                    break;
                }
                i++;
            }

            // Only add the question if it's valid
            if (questionText && options.length > 0 && answer) {
                questions.push({
                    id: questions.length + 1,
                    numberLabel,
                    question: questionText,
                    options,
                    answer,
                });
            }
             // The outer loop will continue from the new 'i' position
        } else {
            i++;
        }
    }
    
    // Add a check here before returning
    if (questions.length === 0 && lines.length > 10) { 
        console.warn(`Parsing finished for "${title}", but no questions were found. The file format might be incorrect.`);
    }

    return { title, questions };
};

function App() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  // Add state for mobile menu
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  
  // ++ QUIZ STATE
  const [quizSections, setQuizSections] = useState<QuizSection[] | null>(null);
  const [showQuiz, setShowQuiz] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<{score: number, total: number} | null>(null);

  // Create a ref for the search container
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Collect all menu items for search
  const allMenuItems: MenuItem[] = useMemo(() => [
    // Kiến thức về chuyển mạch
    { title: '1. Cơ sở kỹ thuật về máy điện thoại', path: '/document/1/1. Cơ sở kỹ thuật về máy điện thoại.pdf', category: 'Kiến thức về chuyển mạch' },
    { title: '2. Kỹ thuật chuyển mạch gói VoIP', path: '/document/1/5. Kỹ thuật chuyển mạch gói.pdf', category: 'Kiến thức về chuyển mạch' },
    { title: '3. Báo hiệu trong mạng điện thoại', path: '/document/1/6. Báo hiệu trong mạng điện thoại.pdf', category: 'Kiến thức về chuyển mạch' },
    { title: '4. Cơ sở kỹ thuật về chuyển mạch', path: '/document/1/7. Cơ sở kỹ thuật chuyển mạch.pdf', category: 'Kiến thức về chuyển mạch' },
    { title: '5. Tổng quan tổng đài Softswitch', path: '/document/1/3. Tổng quan về Tổng đài điện tử KTS.pdf', category: 'Kiến thức về chuyển mạch' },
    
    // Khai thác sử dụng tổng đài Softswitch
    { title: '1. Cấu trúc tổng đài Softswitch', path: '/document/2/1. Cấu trúc tổng đài Softswitch.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '2. HSKT tổng đài Softswitch', path: '/document/2/2. HSKT tổng đài Softswitch.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '3. Quản lý số liệu tổng đài ', path: '/document/2/3. Quản lý số liệu tổng đài.xlsx', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '4. Nhật ký kỹ thuật ', path: '/document/2/4. Nhật ký kỹ thuật.xlsx', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '5. Khai thác, sử dụng tổng đài Softswitch', path: '/document/2/5. Khai thác, sử dụng tổng đài Softswitch.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '6. Hướng dẫn Backup-Restore', path: '/document/2/6. Hướng dẫn Backup-Restore.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '7. Hướng dẫn khai thác sử dụng OVOC', path: '/document/2/7. Hướng dẫn khai thác sử dụng OVOC.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '8. Hướng dẫn khai thác sử dụng IMG-2020', path: '/document/2/8. Hướng dẫn khai thác sử dụng IMG-2020.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
    
    // Tài liệu khai thác
    { title: '1. Khai thác, sử dụng bộ tập trung thuê bao AG', path: '/document/3/1. Khai thác, sử dụng bộ tập trung thuê bao AG.pdf', category: 'Tài liệu khai thác' },
    { title: '2. Khai thác, sử dụng tổng đài TP-64', path: '/document/3/2. Khai thác, sử dụng tổng đài TP-64.pdf', category: 'Tài liệu khai thác' },
    { title: '3. Khai thác, sử dụng tổng đài TP-128', path: '/document/3/3. Khai thác, sử dụng tổng đài TP-128.pdf', category: 'Tài liệu khai thác' },
    { title: '4. Khai thác, sử dụng tổng đài TP-256', path: '/document/3/4. Khai thác, sử dụng tổng đài TP-256.pdf', category: 'Tài liệu khai thác' },
    { title: '5. Khai thác, sử dụng tổng đài TP-512', path: '/document/3/5. Khai thác, sử dụng tổng đài TP-512.pdf', category: 'Tài liệu khai thác' },
    { title: '6. Khai thác, sử dụng tổng đài IP-512', path: '/document/3/6. Khai thác, sử dụng tổng đài IP-512.pdf', category: 'Tài liệu khai thác' },
    
    // Bảo quản, bảo dưỡng
    { title: '1. Bảo quản, bảo dưỡng tổng đài Softswitch', path: '/document/4/1. Bảo quản, bảo dưỡng tổng đài Softswitch.pdf', category: 'Bảo quản, bảo dưỡng' },
    { title: '2. Bảo quản, bảo dưỡng bộ tập trung thuê bao AG', path: '/document/4/2. Bảo quản, bảo dưỡng bộ tập trung thuê bao AG.pdf', category: 'Bảo quản, bảo dưỡng' },
    { title: '3. Bảo quản, bảo dưỡng tổng đài TP-64', path: '/document/4/3. Bảo quản, bảo dưỡng tổng đài TP-64.pdf', category: 'Bảo quản, bảo dưỡng' },
    { title: '4. Bảo quản, bảo dưỡng tổng đài TP-128', path: '/document/4/4. Bảo quản, bảo dưỡng tổng đài TP-128.pdf', category: 'Bảo quản, bảo dưỡng' },
    { title: '5. Bảo quản, bảo dưỡng tổng đài TP-256', path: '/document/4/5. Bảo quản, bảo dưỡng tổng đài TP-256.pdf', category: 'Bảo quản, bảo dưỡng' },
    { title: '6. Bảo quản, bảo dưỡng tổng đài TP-512', path: '/document/4/6. Bảo quản, bảo dưỡng tổng đài TP-512.pdf', category: 'Bảo quản, bảo dưỡng' },
    { title: '7. Bảo quản, bảo dưỡng tổng đài IP-512', path: '/document/4/7. Bảo quản, bảo dưỡng tổng đài IP-512.pdf', category: 'Bảo quản, bảo dưỡng' },
    
    // Thi kiểm tra
    { title: '1. Thi kiểm tra NVCM nhóm 1', path: '/document/5/1. Thi kiểm tra NVCM nhóm 1.pdf', category: 'Thi kiểm tra' },
    { title: '2. Thi kiểm tra NVCM nhóm 2', path: '/document/5/2. Thi kiểm tra NVCM nhóm 2.pdf', category: 'Thi kiểm tra' },
    { title: '3. Thi kiểm tra NVCM nhóm 3', path: '/document/5/3. Thi kiểm tra NVCM nhóm 3.pdf', category: 'Thi kiểm tra' },
    { title: '4. Thi kiểm tra NVCM nhóm 4', path: '/document/5/4. Thi kiểm tra NVCM nhóm 4.pdf', category: 'Thi kiểm tra' },
    { title: '5. Thi kiểm tra NVCM nhóm 5', path: '/document/5/5. Thi kiểm tra NVCM nhóm 5.pdf', category: 'Thi kiểm tra' },
    { title: '6. Thi kiểm tra NVCM nhóm 6', path: '/document/5/6. Thi kiểm tra NVCM nhóm 6.pdf', category: 'Thi kiểm tra' },
    
    // Khai thác Softswitch (subcategory)
    { title: '1. Khai báo Adress và Account', path: '/document/2/3-1. Khai báo Adress và Account.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '2. Khai báo Routing', path: '/document/2/3-2. Khai báo Routing.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '3. Khai báo Emergency Config', path: '/document/2/3-3. Khai báo Emergency Config.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '4. Hướng dẫn sử dụng Support', path: '/document/2/3-4. Hướng dẫn sử dụng Support.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '5. Hướng dẫn sử dụng System', path: '/document/2/3-5. Hướng dẫn sử dụng System.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '6. Hướng dẫn sử dụng Admin Center', path: '/document/2/3-6. Hướng dẫn sử dụng Admin Center.pdf', category: 'Khai thác sử dụng tổng đài Softswitch' },
  ], []);

  // Filter menu items based on search query
  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const normalizedSearchQuery = searchQuery.toLowerCase().trim();
    
    return allMenuItems.filter(item => 
      item.title.toLowerCase().includes(normalizedSearchQuery) || 
      item.category.toLowerCase().includes(normalizedSearchQuery)
    );
  }, [searchQuery, allMenuItems]);

  useEffect(() => {
    // Set background image directly
    document.body.style.backgroundImage = `url(${process.env.PUBLIC_URL}/asset/anhnen.JPG)`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    
    setLoaded(true);

    // Add event listener to handle window resize
    const handleResize = () => {
      // Close mobile menu when resizing to desktop
      if (window.innerWidth > 768 && showMobileMenu) {
        setShowMobileMenu(false);
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      // Clean up when component unmounts
      document.body.style.backgroundImage = '';
      window.removeEventListener('resize', handleResize);
    };
  }, [showMobileMenu]);

  useEffect(() => {
    // Show search results when there's a query and hide when empty
    setShowSearchResults(searchQuery.trim().length > 0);
    
    // Close active menu when searching
    if (searchQuery.trim().length > 0) {
      setActiveMenu(null);
    }
  }, [searchQuery]);

  // Add click outside listener to close search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
        setSearchQuery('');
      }
      
      // Close active menu when clicking outside of nav
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = (menu: string) => {
    // If we're on mobile and clicking the same menu that's already active, just close it
    if (activeMenu === menu && window.innerWidth <= 768) {
      setActiveMenu(null);
    } else {
      setActiveMenu(activeMenu === menu ? null : menu);
    }
    // Close search results when opening a menu
    setSearchQuery('');
    // Close mobile menu when selecting an item only if submenu is present
    if (window.innerWidth <= 768 && menu !== activeMenu) {
      // Don't close mobile menu when toggling, only when actually selecting an item
      // setShowMobileMenu(false);
    }
  };

  const openPdf = (pdfPath: string) => {
    // Encode the URL to handle special characters
    const encodedPath = encodeURI(pdfPath);
    console.log('Opening PDF:', process.env.PUBLIC_URL + encodedPath);
    setSelectedPdf(process.env.PUBLIC_URL + encodedPath);
    // Clear search when opening a PDF
    setSearchQuery('');
  };

  const closePdf = () => {
    setSelectedPdf(null);
  };
  
  // ++ FUNCTION TO START A QUIZ
  const startQuiz = async (quizId: string) => {
    const quizGroups: { [key: string]: { files: string[], titles: string[] } } = {
      'nhom1': {
        files: [
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 1/1. LTCS.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 1/2. LTCN.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 1/3. ĐLTT.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 1/4. CTKT.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 1/5. N,KCT.txt',
        ],
        titles: [ 'Lý thuyết cơ sở', 'Lý thuyết chuyển mạch', 'Đường dây thông tin', 'Chuyển mạch kỹ thuật số', 'Kênh và kết cuối' ]
      },
      'nhom2': {
        files: [
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 2/1. LTCS.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 2/2. LTCN.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 2/3. ĐLTT.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 2/4. CTKT.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 2/5. N,KCT.txt',
        ],
        titles: [ 'Lý thuyết cơ sở', 'Lý thuyết chuyển mạch', 'Đường dây thông tin', 'Chuyển mạch kỹ thuật số', 'Kênh và kết cuối' ]
      },
      'nhom3': {
        files: [
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 3/1. LTCS.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 3/2. LTCN.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 3/3. ĐLTT.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 3/4. CTKT.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 3/5. N,KCT.txt',
        ],
        titles: [ 'Lý thuyết cơ sở', 'Lý thuyết chuyển mạch', 'Đường dây thông tin', 'Chuyển mạch kỹ thuật số', 'Kênh và kết cuối' ]
      },
      'nhom4': {
        files: [
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 4/1. LTCS.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 4/2. LTCN.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 4/3. ĐLTT.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 4/4. CTKT.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 4/5. N,KCT.txt',
        ],
        titles: [ 'Lý thuyết cơ sở', 'Lý thuyết chuyển mạch', 'Đường dây thông tin', 'Chuyển mạch kỹ thuật số', 'Kênh và kết cuối' ]
      },
      'nhom5': {
        files: [
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 5/1. LTCS.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 5/2. LTCN.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 5/3. ĐLTT.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 5/4. CTKT.txt',
          '/document/06. Tổng đài đã sửa_2025328641/06. Tổng đài đã sửa/ok Nhóm 5/5. N,KCT.txt',
        ],
        titles: [ 'Lý thuyết cơ sở', 'Lý thuyết chuyển mạch', 'Đường dây thông tin', 'Chuyển mạch kỹ thuật số', 'Kênh và kết cuối' ]
      },
    };

    const selectedGroup = quizGroups[quizId];

    if (selectedGroup) {
      try {
        const sections: QuizSection[] = [];
        for (let i = 0; i < selectedGroup.files.length; i++) {
          const response = await fetch(process.env.PUBLIC_URL + selectedGroup.files[i]);
          if (!response.ok) {
            throw new Error(`Failed to load quiz file: ${selectedGroup.files[i]}`);
          }
          const text = await response.text();
          const section = parseQuizFile(text, selectedGroup.titles[i]);
          sections.push(section);
        }
        
        const totalQuestions = sections.reduce((total, section) => total + section.questions.length, 0);
        if (totalQuestions === 0) {
            // If parsing succeeds but finds no questions, show the error modal.
            setQuizResult({ score: 0, total: 0 });
            return;
        }

        setQuizSections(sections);
        setShowQuiz(true);
        setSelectedPdf(null); // Close any open PDF

      } catch (error) {
        console.error("Lỗi khi tải dữ liệu bài kiểm tra:", error);
        // If fetching files fails, show the error modal.
        setQuizResult({ score: 0, total: 0 });
      }
    } else if (quizId === 'nhom6') {
        alert('Chức năng đang được phát triển');
    }
  };

  const handleQuizComplete = (score: number, total: number) => {
    setShowQuiz(false);
    setQuizSections(null);
    setQuizResult({ score, total });
  };

  const getResultMessage = (score: number, total: number) => {
    if (total === 0) {
        return (
            <div className="result-message-container">
                <p className="result-message neutral">
                    Không thể tải câu hỏi hoặc bài kiểm tra này không có câu hỏi nào.
                </p>
            </div>
        );
    }
    const percentage = (score / total) * 100;

    if (percentage >= 80) {
        return (
            <div className="result-message-container">
                <span className="result-icon">🎉</span>
                <p className="result-message success">
                    Xuất sắc! Bạn đã làm rất tốt!
                </p>
            </div>
        );
    } else if (percentage >= 50) {
        return (
            <div className="result-message-container">
                <span className="result-icon">👍</span>
                <p className="result-message decent">
                    Khá lắm! Hãy tiếp tục cố gắng nhé!
                </p>
            </div>
        );
    } else {
        return (
            <div className="result-message-container">
                <span className="result-icon">💪</span>
                <p className="result-message encouragement">
                    Đừng bỏ cuộc! Ôn tập lại và thử lại nào. Bạn sẽ làm được!
                </p>
            </div>
        );
    }
  };

  // ++ RENDER QUIZ AS A FULL PAGE
  if (showQuiz && quizSections) {
    return <Quiz sections={quizSections} onQuizComplete={handleQuizComplete} />;
  }

  return (
    <>
      <div className="background-image"></div>
      <div className={`App ${loaded ? 'loaded' : ''}`}>
        <header className="App-header">
          <div className="header-banner">
            <img 
              src={`${process.env.PUBLIC_URL}/asset/Ảnh khung.jpg`}
              alt="Header Banner" 
              className="header-banner-img"
            />
          </div>
          
          <nav className="main-nav" ref={navRef}>
            {/* Mobile menu toggle button */}
            <button 
              className="mobile-menu-toggle" 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle menu"
            >
              <i className={`fas ${showMobileMenu ? 'fa-times' : 'fa-bars'}`}></i>
            </button>
            
            {/* Search box for mobile view - at the top */}
            <div className="compact-search-container" ref={searchContainerRef}>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Tìm kiếm tài liệu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="compact-search-input"
                />
                <i className="search-icon fas fa-search"></i>
              </div>
              
              {showSearchResults && filteredMenuItems.length > 0 && (
                <div className="compact-search-results">
                  <div className="search-results-list">
                    {filteredMenuItems.map((item, index) => (
                      <div 
                        key={index}
                        className="search-result-item"
                        onClick={() => item.path && openPdf(item.path)}
                      >
                        <div className="search-result-title">
                          <span className="search-result-category-tag">{item.category}</span>
                          <span style={{ width: '100%' }}>{item.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showSearchResults && filteredMenuItems.length === 0 && searchQuery.trim() !== '' && (
                <div className="compact-search-results">
                  <div className="search-results-list">
                    <div className="search-result-item">
                      <div className="search-result-title">
                        Không tìm thấy kết quả phù hợp
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <ul className={`menu-list ${showMobileMenu ? 'show' : ''}`}>
              <li 
                className={`menu-item ${activeMenu === 'kienthuc' ? 'active' : ''}`}
                onClick={() => toggleMenu('kienthuc')}
              >
                <i className="menu-icon fas fa-book"></i>
                Kiến thức về chuyển mạch
                {activeMenu === 'kienthuc' && !showSearchResults && (
                  <div className="submenu">
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/1/1. Cơ sở kỹ thuật về máy điện thoại.pdf'); }}>
                      1. Cơ sở kỹ thuật về máy điện thoại
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/1/5. Kỹ thuật chuyển mạch gói.pdf'); }}>
                      2. Kỹ thuật chuyển mạch gói VoIP
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/1/6. Báo hiệu trong mạng điện thoại.pdf'); }}>
                      3. Báo hiệu trong mạng điện thoại
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/1/7. Cơ sở kỹ thuật chuyển mạch.pdf'); }}>
                      4. Cơ sở kỹ thuật về chuyển mạch
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/1/3. Tổng quan về Tổng đài điện tử KTS.pdf'); }}>
                      5. Tổng quan tổng đài Softswitch
                    </div>
                  </div>
                )}
              </li>
              <li 
                className={`menu-item ${activeMenu === 'khaithac' ? 'active' : ''}`}
                onClick={() => toggleMenu('khaithac')}
              >
                <i className="menu-icon fas fa-server"></i>
                Khai thác sử dụng tổng đài Softswitch
                {activeMenu === 'khaithac' && !showSearchResults && (
                  <div className="submenu">
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/1. Cấu trúc tổng đài Softswitch.pdf'); }}>
                      1. Cấu trúc tổng đài Softswitch
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/2. HSKT tổng đài Softswitch.pdf'); }}>
                      2. HSKT tổng đài Softswitch
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/3. Quản lý số liệu tổng đài.xlsx'); }}>
                      3. Quản lý số liệu tổng đài (File excel)
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/4. Nhật ký kỹ thuật.xlsx'); }}>
                      4. Nhật ký kỹ thuật (file excel)
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/5. Khai thác, sử dụng tổng đài Softswitch.pdf'); }}>
                      5. Khai thác, sử dụng tổng đài Softswitch
                      <div className="submenu-level2">
                        <div className="submenu-item-level2" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/3-1. Khai báo Adress và Account.pdf'); }}>
                          1. Khai báo Adress và Account
                        </div>
                        <div className="submenu-item-level2" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/3-2. Khai báo Routing.pdf'); }}>
                          2. Khai báo Routing
                        </div>
                        <div className="submenu-item-level2" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/3-3. Khai báo Emergency Config.pdf'); }}>
                          3. Khai báo Emergency Config
                        </div>
                        <div className="submenu-item-level2" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/3-4. Hướng dẫn sử dụng Support.pdf'); }}>
                          4. Hướng dẫn sử dụng Support
                        </div>
                        <div className="submenu-item-level2" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/3-5. Hướng dẫn sử dụng System.pdf'); }}>
                          5. Hướng dẫn sử dụng System
                        </div>
                        <div className="submenu-item-level2" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/3-6. Hướng dẫn sử dụng Admin Center.pdf'); }}>
                          6. Hướng dẫn sử dụng Admin Center
                        </div>
                      </div>
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/6. Hướng dẫn Backup-Restore.pdf'); }}>
                      6. Hướng dẫn Backup-Restore
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/7. Hướng dẫn khai thác sử dụng OVOC.pdf'); }}>
                      7. Hướng dẫn khai thác sử dụng OVOC
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/2/8. Hướng dẫn khai thác sử dụng IMG-2020.pdf'); }}>
                      8. Hướng dẫn khai thác sử dụng IMG-2020
                    </div>
                  </div>
                )}
              </li>
              <li 
                className={`menu-item ${activeMenu === 'tailieu' ? 'active' : ''}`}
                onClick={() => toggleMenu('tailieu')}
              >
                <i className="menu-icon fas fa-file-alt"></i>
                Tài liệu khai thác
                {activeMenu === 'tailieu' && !showSearchResults && (
                  <div className="submenu">
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/3/1. Khai thác, sử dụng bộ tập trung thuê bao AG.pdf'); }}>
                      1. Khai thác, sử dụng bộ tập trung thuê bao AG
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/3/2. Khai thác, sử dụng tổng đài TP-64.pdf'); }}>
                      2. Khai thác, sử dụng tổng đài TP-64
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/3/3. Khai thác, sử dụng tổng đài TP-128.pdf'); }}>
                      3. Khai thác, sử dụng tổng đài TP-128
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/3/4. Khai thác, sử dụng tổng đài TP-256.pdf'); }}>
                      4. Khai thác, sử dụng tổng đài TP-256
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/3/5. Khai thác, sử dụng tổng đài TP-512.pdf'); }}>
                      5. Khai thác, sử dụng tổng đài TP-512
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/3/6. Khai thác, sử dụng tổng đài IP-512.pdf'); }}>
                      6. Khai thác, sử dụng tổng đài IP-512
                    </div>
                  </div>
                )}
              </li>
              <li 
                className={`menu-item ${activeMenu === 'baoquan' ? 'active' : ''}`}
                onClick={() => toggleMenu('baoquan')}
              >
                <i className="menu-icon fas fa-tools"></i>
                Bảo quản, bảo dưỡng
                {activeMenu === 'baoquan' && !showSearchResults && (
                  <div className="submenu">
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/4/1. Bảo quản, bảo dưỡng tổng đài Softswitch.pdf'); }}>
                      1. Bảo quản, bảo dưỡng tổng đài Softswitch
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/4/2. Bảo quản, bảo dưỡng bộ tập trung thuê bao AG.pdf'); }}>
                      2. Bảo quản, bảo dưỡng bộ tập trung thuê bao AG
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/4/3. Bảo quản, bảo dưỡng tổng đài TP-64.pdf'); }}>
                      3. Bảo quản, bảo dưỡng tổng đài TP-64
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/4/4. Bảo quản, bảo dưỡng tổng đài TP-128.pdf'); }}>
                      4. Bảo quản, bảo dưỡng tổng đài TP-128
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/4/5. Bảo quản, bảo dưỡng tổng đài TP-256.pdf'); }}>
                      5. Bảo quản, bảo dưỡng tổng đài TP-256
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/4/6. Bảo quản, bảo dưỡng tổng đài TP-512.pdf'); }}>
                      6. Bảo quản, bảo dưỡng tổng đài TP-512
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/4/7. Bảo quản, bảo dưỡng tổng đài IP-512.pdf'); }}>
                      7. Bảo quản, bảo dưỡng tổng đài IP-512
                    </div>
                  </div>
                )}
              </li>
              <li 
                className={`menu-item ${activeMenu === 'thikiem' ? 'active' : ''}`}
                onClick={() => toggleMenu('thikiem')}
              >
                <i className="menu-icon fas fa-clipboard-check"></i>
                Thi kiểm tra
                {activeMenu === 'thikiem' && !showSearchResults && (
                  <QuizMenu startQuiz={startQuiz} />
                )}
              </li>
            </ul>
          </nav>
        </header>

        {selectedPdf && !showQuiz && (
          <div className="pdf-modal">
            <div className="pdf-modal-content">
              <PdfViewer pdfUrl={selectedPdf} onClose={closePdf} />
            </div>
          </div>
        )}

        {quizResult && (
          <div className="quiz-result-modal">
              <div className="quiz-result-content">
                  <h3 className="result-title">Kết quả bài kiểm tra</h3>
                  <p className="result-score">
                      Điểm của bạn: <strong>{quizResult.score} / {quizResult.total}</strong>
                  </p>
                  {getResultMessage(quizResult.score, quizResult.total)}
                  <button className="result-close-btn" onClick={() => setQuizResult(null)}>
                      OK
                  </button>
              </div>
          </div>
        )}

        <Chatbot />
      </div>
    </>
  );
}

export default App;
