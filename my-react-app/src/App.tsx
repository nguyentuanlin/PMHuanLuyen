import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import PdfViewer from './PdfViewer';
import PdfDataService from './PdfDataService';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// ++ NEW COMPONENT FOR SNMP STATUS
function SystemStatusViewer() {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      // Gọi đến backend service chạy trên cổng 3001
      fetch('http://localhost:3001/api/device-status')
        .then(response => {
          if (!response.ok) {
            // Lấy thông điệp lỗi từ body của backend nếu có
            return response.json().then(err => { throw new Error(err.error || 'Network response was not ok') });
          }
          return response.json();
        })
        .then(data => {
          setStatus(data);
          setError(null); // Clear previous error on success
        })
        .catch(err => {
          console.error("Fetch error:", err);
          setError(err.message);
        });
    }, 5000); // Lặp lại việc lấy dữ liệu mỗi 5 giây

    return () => clearInterval(interval); // Dọn dẹp khi component bị unmount
  }, []); // Chạy 1 lần khi component được mount

  let content;
  if (error) {
    content = <p style={{ color: 'red' }}>Lỗi khi lấy dữ liệu: {error}</p>;
  } else if (!status) {
    content = <p>Đang tải dữ liệu giám sát...</p>;
  } else {
    // Chuyển đổi uptime từ giây thành ngày, giờ, phút, giây
    const uptimeInSeconds = status.uptimeInSeconds || 0;
    const days = Math.floor(uptimeInSeconds / (3600*24));
    const hours = Math.floor(uptimeInSeconds % (3600*24) / 3600);
    const minutes = Math.floor(uptimeInSeconds % 3600 / 60);
    const seconds = Math.floor(uptimeInSeconds % 60);
    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    content = (
      <>
        <p><strong>Mô tả:</strong> {status.description || 'N/A'}</p>
        <p><strong>Thời gian hoạt động:</strong> {uptimeString}</p>
      </>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      background: 'rgba(255, 255, 255, 0.9)',
      padding: '10px 20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      border: '1px solid #ccc',
      zIndex: 1000,
      maxWidth: '400px',
      fontSize: '14px'
    }}>
      <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '5px', fontSize: '16px' }}>Trạng thái thiết bị SNMP</h3>
      {content}
    </div>
  );
}

// New Chatbot component
function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{text: string, sender: 'user' | 'bot'}[]>([
    {text: 'Xin chào! Tôi là trợ lý ảo. Tôi có thể giúp gì cho bạn về tổng đài Softswitch?', sender: 'bot'}
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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

  // Initialize Google Generative AI
  const API_KEY = 'AIzaSyBffgZToiwQU0g9_XUMMr4k78bdqaH9D00';
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMessage = {text: inputText, sender: 'user' as const};
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      let responseText: string;
      const pdfService = PdfDataService.getInstance();

      if (isInitialized && pdfService) {
        // Step 1: Retrieve context from documents
        const searchResults = pdfService.searchContent(inputText);
        
        if (searchResults.length > 0) {
          // Step 2 & 3: Augment and Generate with Gemini
          const context = searchResults
            .map(r => `Trích từ tài liệu "${r.title}":\n${r.text}`)
            .join('\n\n---\n\n');

          const prompt = `Bạn là một trợ lý ảo chuyên gia về hệ thống tổng đài EWSD. 
Dựa vào bối cảnh được cung cấp dưới đây, hãy trả lời câu hỏi của người dùng một cách chính xác và súc tích bằng tiếng Việt. 
Nếu thông tin không có trong bối cảnh, hãy trả lời rằng "Tôi không tìm thấy thông tin này trong các tài liệu hiện có."

BỐI CẢNH:
---
${context}
---

CÂU HỎI: ${inputText}

TRẢ LỜI:`;

          const result = await model.generateContent(prompt);
          responseText = result.response.text();

        } else {
          // Fallback if no relevant documents are found
          responseText = 'Rất tiếc, tôi không tìm thấy tài liệu nào liên quan đến câu hỏi của bạn. Bạn có thể thử hỏi khác đi không?';
        }
      } else {
        // Fallback if PDF service is not ready
        responseText = 'Hệ thống đang khởi tạo, vui lòng đợi trong giây lát...';
      }
      
      setMessages(prev => [...prev, {text: responseText, sender: 'bot'}]);

    } catch (error) {
      console.error("Error generating response with Gemini:", error);
      setMessages(prev => [...prev, {text: "❌ Rất tiếc, đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau.", sender: 'bot'}]);
    } finally {
      setIsLoading(false);
    }
  };

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
              Trợ lý ảo EWSD
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
              onClick={handleSendMessage}
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

function App() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  // Add state for mobile menu
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  
  // Create a ref for the search container
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
    { title: '3. Quản lý số liệu tổng đài (File excel)', path: '/document/2/3. Quản lý số liệu tổng đài.xlsx', category: 'Khai thác sử dụng tổng đài Softswitch' },
    { title: '4. Nhật ký kỹ thuật (file excel)', path: '/document/2/4. Nhật ký kỹ thuật.xlsx', category: 'Khai thác sử dụng tổng đài Softswitch' },
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
          
          <nav className="main-nav">
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
                  <div className="submenu">
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/5/1. Thi kiểm tra NVCM nhóm 1.pdf'); }}>
                      1. Thi kiểm tra NVCM nhóm 1
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/5/2. Thi kiểm tra NVCM nhóm 2.pdf'); }}>
                      2. Thi kiểm tra NVCM nhóm 2
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/5/3. Thi kiểm tra NVCM nhóm 3.pdf'); }}>
                      3. Thi kiểm tra NVCM nhóm 3
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/5/4. Thi kiểm tra NVCM nhóm 4.pdf'); }}>
                      4. Thi kiểm tra NVCM nhóm 4
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/5/5. Thi kiểm tra NVCM nhóm 5.pdf'); }}>
                      5. Thi kiểm tra NVCM nhóm 5
                    </div>
                    <div className="submenu-item" onClick={(e) => { e.stopPropagation(); openPdf('/document/5/6. Thi kiểm tra NVCM nhóm 6.pdf'); }}>
                      6. Thi kiểm tra NVCM nhóm 6
                    </div>
                  </div>
                )}
              </li>
            </ul>
          </nav>
        </header>

        {selectedPdf && (
          <div className="pdf-modal">
            <div className="pdf-modal-content">
              <PdfViewer pdfUrl={selectedPdf} onClose={closePdf} />
            </div>
          </div>
        )}

        {/* ++ ADD THE NEW SNMP STATUS VIEWER */}
        {/* <SystemStatusViewer /> */}

        {/* Add only the chatbot component */}
        <Chatbot />
      </div>
    </>
  );
}

export default App;
