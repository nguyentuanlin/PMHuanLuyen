import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// Use the PDFDocumentProxy type from the same version as react-pdf is using
import type { PDFDocumentProxy } from 'react-pdf/node_modules/pdfjs-dist';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PdfViewer.css';

// Set the worker source path to the local worker file we copied
pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf-worker/pdf.worker.js`;

// Define options with multiple possible paths for resources
const getPdfOptions = () => {
  return {
    cMapUrl: `${window.location.origin}/cmaps/`,
    standardFontDataUrl: `${window.location.origin}/standard_fonts/`,
    isEvalSupported: true,
    useSystemFonts: true
  };
};

const pdfOptions = getPdfOptions();

interface PdfViewerProps {
  pdfUrl: string;
  onClose: () => void;
}

// Type for search results
interface SearchResult {
  pageNumber: number;
  text: string;
  position: { top: number; left: number; }
  matchStart: number;
  matchEnd: number;
}

// SVG Icon Components
const OpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>
    <path d="M9 3v18"/>
    <path d="M14 3v18"/>
  </svg>
);

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const PrintIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

const PreviousIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const NextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ZoomInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);

const ZoomOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);

const ZoomIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const LoadingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-loading-icon">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl, onClose }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [searchText, setSearchText] = useState<string>('');
  const [scale, setScale] = useState<number>(1.8);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAllPages, setShowAllPages] = useState<boolean>(true);
  const documentRef = useRef<HTMLDivElement>(null);
  const [quality, setQuality] = useState<number>(2);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  // Calculate optimal canvas size based on screen resolution
  const [canvasWidth, setCanvasWidth] = useState<number>(window.innerWidth * 0.85);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string>(pdfUrl);

  useEffect(() => {
    const handleResize = () => {
      setCanvasWidth(window.innerWidth * 0.85);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!numPages || showAllPages) return;
      
      if (e.key === 'ArrowLeft') {
        previousPage();
      } else if (e.key === 'ArrowRight') {
        nextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [numPages, pageNumber, showAllPages]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
    console.log(`Document loaded successfully with ${numPages} pages`);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    setError(`Lỗi khi tải PDF: ${error.message}`);
    setLoading(false);
  }

  function changePage(offset: number) {
    if (!numPages) return;
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
      
      // Scroll to the page if in single page mode
      if (!showAllPages && documentRef.current) {
        documentRef.current.scrollTop = 0;
      }
    }
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function zoomIn() {
    setScale(prevScale => Math.min(prevScale + 0.2, 3.5));
  }

  function zoomOut() {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  }

  function resetZoom() {
    setScale(1.8);
  }

  function togglePageView() {
    setShowAllPages(!showAllPages);
    console.log("Toggle page view:", !showAllPages);
  }

  // Effect to perform search when searchText changes
  useEffect(() => {
    // Clear any existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    // Don't search if text is empty or PDF isn't loaded
    if (!searchText.trim() || !pdfDocument) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // Set a new timeout for debouncing
    const timeout = setTimeout(() => {
      performSearch(searchText);
    }, 300); // 300ms debounce
    
    setDebounceTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchText, pdfDocument]);

  // Move search logic to a separate function
  async function performSearch(text: string) {
    if (!text.trim() || !pdfDocument) return;
    
    setIsSearching(true);
    setShowSearchResults(true);
    setSearchResults([]);
    
    console.log("Searching for:", text);
    
    const results: SearchResult[] = [];
    
    try {
      // Search through each page
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        try {
          const page = await pdfDocument.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          
          // Find all occurrences of the search text
          const searchRegex = new RegExp(text, 'gi');
          let match;
          
          while ((match = searchRegex.exec(pageText)) !== null) {
            // Get some context around the match
            const startIndex = Math.max(0, match.index - 30);
            const endIndex = Math.min(pageText.length, match.index + text.length + 30);
            const contextText = pageText.substring(startIndex, endIndex);
            
            // Mark the match position relative to the context
            const matchStartInContext = match.index - startIndex;
            const matchEndInContext = matchStartInContext + text.length;
            
            results.push({
              pageNumber: i,
              text: contextText,
              position: {
                top: 0,
                left: 0
              },
              matchStart: matchStartInContext,
              matchEnd: matchEndInContext
            });
          }
        } catch (error) {
          console.error(`Error searching page ${i}:`, error);
        }
      }
    } finally {
      setSearchResults(results);
      setIsSearching(false);
    }
  }
  
  // Navigate to a specific search result
  function navigateToSearchResult(result: SearchResult) {
    if (!showAllPages) {
      setPageNumber(result.pageNumber);
    } else if (documentRef.current) {
      // Find the page container
      const pageElement = documentRef.current.querySelector(
        `.pdf-page-container:nth-child(${result.pageNumber})`
      );
      
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
  
  function closeSearchResults() {
    setShowSearchResults(false);
  }

  function toggleQuality() {
    setQuality(quality === 2 ? 1 : 2);
    console.log("Quality set to:", quality === 2 ? "Standard" : "High");
  }

  // Load the PDF document for searching
  useEffect(() => {
    if (!currentPdfUrl) return;
    
    const loadingTask = pdfjs.getDocument({
      url: currentPdfUrl,
      ...pdfOptions
    });
    
    loadingTask.promise
      .then((doc: PDFDocumentProxy) => {
        setPdfDocument(doc);
      })
      .catch((err: Error) => {
        console.error("Error loading PDF document for search:", err);
      });
      
    return () => {
      loadingTask.destroy();
    };
  }, [currentPdfUrl]);

  // Handle file open
  const handleOpenClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setCurrentPdfUrl(fileUrl);
      setLoading(true);
      setError(null);
      console.log("Opening new PDF:", file.name);

      // Debounce search
      const timeout = setTimeout(async () => {
        const loadingTask = pdfjs.getDocument(fileUrl);
        
        loadingTask.promise
          .then((doc: PDFDocumentProxy) => {
            setPdfDocument(doc);
          })
          .catch((err: Error) => {
            console.error("Error loading PDF document for search:", err);
          });
      }, 300);

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target) {
          // ... existing code ...
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle save as
  const handleSaveAs = async () => {
    try {
      // Fetch the PDF file
      const response = await fetch(currentPdfUrl);
      const blob = await response.blob();
      
      // Create a download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      
      // Extract filename from URL or use default
      const filename = currentPdfUrl.split('/').pop() || 'document.pdf';
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log("Saving PDF as:", filename);
    } catch (error) {
      console.error("Error saving PDF:", error);
      alert("Không thể tải xuống tệp PDF. Vui lòng thử lại sau.");
    }
  };

  // Handle print
  const handlePrint = async () => {
    try {
      if (!pdfDocument) {
        console.warn("PDF document not loaded yet, skipping print.");
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print the document.');
        return;
      }

      printWindow.document.write('<html><head><title>Print</title></head><body>');
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          
          await page.render(renderContext).promise;
          const imgData = canvas.toDataURL('image/png');
          printWindow.document.write(`<img src="${imgData}" style="width: 100%;" />`);
        }
      }

      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    } catch (err: any) {
      console.error("Error during print:", err);
      setError(`Lỗi khi in: ${err.message}`);
    }
  };

  // Render all pages function
  const renderAllPages = () => {
    if (!numPages) return null;
    
    console.log(`Rendering all ${numPages} pages with quality ${quality}`);
    return Array.from(
      new Array(numPages),
      (el, index) => (
        <div className="pdf-page-container" key={`page_${index + 1}`}>
          <div className="pdf-page-number">Trang {index + 1}</div>
          <Page 
            key={`page_${index + 1}`}
            pageNumber={index + 1} 
            scale={scale}
            className="pdf-page"
            width={canvasWidth}
          />
        </div>
      )
    );
  };

  // Custom loading and error components
  const LoadingMessage = () => (
    <div className="pdf-message">
      <div className="pdf-message-content">
        <div className="pdf-message-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div className="pdf-message-text">Đang tải PDF...</div>
      </div>
    </div>
  );

  const ErrorMessage = ({ error }: { error: string }) => (
    <div className="pdf-message">
      <div className="pdf-message-content">
        <div className="pdf-message-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="pdf-message-text">{error}</div>
      </div>
    </div>
  );

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer-header">
        <div className="title">PDF Viewer</div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="toolbar">
        <div className="file-section">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".pdf" 
            style={{ display: 'none' }} 
          />
          <button title="Open" className="toolbar-btn" onClick={handleOpenClick}>
            <OpenIcon />
            <span>Open</span>
          </button>
          <button title="Save As" className="toolbar-btn" onClick={handleSaveAs} disabled={!numPages}>
            <SaveIcon />
            <span>Save As</span>
          </button>
          <button title="Print" className="toolbar-btn" onClick={handlePrint} disabled={!numPages}>
            <PrintIcon />
            <span>Print</span>
          </button>
        </div>
        
        <div className="navigation-section">
          <button 
            title="Previous" 
            className="toolbar-btn" 
            onClick={previousPage} 
            disabled={pageNumber <= 1 || !numPages || showAllPages}
          >
            <PreviousIcon />
            <span>Previous</span>
          </button>
          <button 
            title="Next" 
            className="toolbar-btn" 
            onClick={nextPage} 
            disabled={!numPages || pageNumber >= numPages || showAllPages}
          >
            <NextIcon />
            <span>Next</span>
          </button>
          <button 
            title={showAllPages ? "Single Page" : "All Pages"} 
            className="toolbar-btn" 
            onClick={togglePageView}
            disabled={!numPages}
          >
            <span>{showAllPages ? "Single Page" : "All Pages"}</span>
          </button>
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Tìm kiếm trong tài liệu..." 
              value={searchText} 
              onChange={(e) => setSearchText(e.target.value)} 
              disabled={!numPages}
            />
            {isSearching && (
              <div className="search-loading-indicator">
                <LoadingIcon />
              </div>
            )}
          </div>
        </div>
        
        <div className="zoom-section">
          <button 
            title="Zoom Out" 
            className="toolbar-btn" 
            onClick={zoomOut} 
            disabled={!numPages}
          >
            <ZoomOutIcon />
            <span>Zoom Out</span>
          </button>
          <button 
            title="Zoom In" 
            className="toolbar-btn" 
            onClick={zoomIn}
            disabled={!numPages}
          >
            <ZoomInIcon />
            <span>Zoom In</span>
          </button>
        </div>
      </div>
      
      {showSearchResults && searchResults.length > 0 && (
        <div className="search-results-panel">
          <div className="search-results-header">
            <h3>Kết quả tìm kiếm cho "{searchText}" ({searchResults.length})</h3>
            <button onClick={closeSearchResults} className="close-search-btn">×</button>
          </div>
          <div className="search-results-list">
            {searchResults.map((result, index) => (
              <div 
                key={index} 
                className="search-result-item"
                onClick={() => navigateToSearchResult(result)}
              >
                <div className="search-result-page">Trang {result.pageNumber}</div>
                <div className="search-result-content" dangerouslySetInnerHTML={{
                  __html: result.text.substring(0, result.matchStart) + 
                          '<span class="search-highlight">' + 
                          result.text.substring(result.matchStart, result.matchEnd) + 
                          '</span>' + 
                          result.text.substring(result.matchEnd)
                }} />
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="pdf-content" ref={documentRef}>
        {error ? (
          <ErrorMessage error={error} />
        ) : (
          <Document
            file={currentPdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<LoadingMessage />}
            error={<ErrorMessage error="Không thể tải PDF. Vui lòng kiểm tra đường dẫn và thử lại." />}
            {...{ options: pdfOptions } as any}
          >
            {numPages && showAllPages ? (
              // Render all pages when showAllPages is true
              renderAllPages()
            ) : numPages ? (
              // Render only the current page when showAllPages is false
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                className="pdf-page"
                width={canvasWidth}
              />
            ) : null}
          </Document>
        )}
      </div>
      
      <div className="pdf-footer">
        {numPages ? (
          <p>
            {showAllPages 
              ? `Hiển thị tất cả ${numPages} trang` 
              : `Trang ${pageNumber} / ${numPages}`}
          </p>
        ) : (
          <p>&nbsp;</p>
        )}
      </div>
    </div>
  );
};

export default PdfViewer; 