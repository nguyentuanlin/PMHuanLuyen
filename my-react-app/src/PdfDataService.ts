import { pdfjs } from 'react-pdf';

// Define types for our data structure
export interface PdfContent {
  title: string;
  path: string;
  content: string;
  category: string;
}

// Singleton service to manage PDF content
class PdfDataService {
  private static instance: PdfDataService;
  private pdfContents: PdfContent[] = [];
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): PdfDataService {
    if (!PdfDataService.instance) {
      PdfDataService.instance = new PdfDataService();
    }
    return PdfDataService.instance;
  }

  public async initialize(pdfList: { title: string; path: string; category: string }[]): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve();
    }
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise<void>(async (resolve) => {
      console.log("Initializing PDF Data Service...");
      
      // Make sure PDF.js worker is set
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf-worker/pdf.worker.js`;
      }

      // Load first 5 PDFs for demonstration (to avoid loading all at once)
      const pdfListToLoad = pdfList.slice(0, 5);
      
      for (const pdfInfo of pdfListToLoad) {
        try {
          const content = await this.extractTextFromPdf(`${process.env.PUBLIC_URL}${pdfInfo.path}`);
          this.pdfContents.push({
            title: pdfInfo.title,
            path: pdfInfo.path,
            content: content,
            category: pdfInfo.category
          });
          console.log(`Loaded PDF: ${pdfInfo.title}`);
        } catch (error) {
          console.error(`Error loading PDF ${pdfInfo.title}:`, error);
        }
      }

      console.log("PDF Data Service initialization complete");
      this.isInitialized = true;
      resolve();
    });

    return this.initializationPromise;
  }

  private async extractTextFromPdf(url: string): Promise<string> {
    try {
      // Load the PDF file
      const pdf = await pdfjs.getDocument(url).promise;
      
      let fullText = '';
      
      // Extract text from first 5 pages for demonstration
      const maxPages = Math.min(5, pdf.numPages);
      
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + ' ';
      }
      
      return fullText;
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      return '';
    }
  }

  public searchContent(query: string): { text: string, title: string, path: string }[] {
    if (!this.isInitialized) {
      console.warn("PDF Data Service not initialized yet");
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const searchTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 2);
    
    if (searchTerms.length === 0) return [];

    const results: { text: string, title: string, path: string, score: number }[] = [];

    // Search through each PDF content
    for (const pdf of this.pdfContents) {
      const normalizedContent = pdf.content.toLowerCase();
      
      // Calculate a simple relevance score
      let score = 0;
      let bestSnippet = '';
      
      for (const term of searchTerms) {
        if (normalizedContent.includes(term)) {
          score += 1;
          
          // Find a larger, more contextual snippet
          const termIndex = normalizedContent.indexOf(term);
          const snippetWindow = 500; // Increased window for more context

          let startIndex = Math.max(0, termIndex - Math.floor(snippetWindow / 2));
          let endIndex = Math.min(normalizedContent.length, termIndex + term.length + Math.floor(snippetWindow / 2));

          // Adjust to avoid cutting words
          if (startIndex > 0) {
              const spaceIndex = normalizedContent.lastIndexOf(' ', startIndex);
              if (spaceIndex !== -1) startIndex = spaceIndex + 1;
          }
          if (endIndex < normalizedContent.length) {
              const spaceIndex = normalizedContent.indexOf(' ', endIndex);
              if (spaceIndex !== -1) endIndex = spaceIndex;
          }
          
          bestSnippet = pdf.content.substring(startIndex, endIndex).trim();
        }
      }
      
      if (score > 0 && bestSnippet) {
        results.push({
          text: bestSnippet,
          title: pdf.title,
          path: pdf.path,
          score: score
        });
      }
    }
    
    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    
    // Return top 2 results to provide focused context
    return results.slice(0, 2).map(({ text, title, path }) => ({ text, title, path }));
  }
}

export default PdfDataService; 