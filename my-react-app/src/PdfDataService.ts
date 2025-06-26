import { pdfjs } from 'react-pdf';

// Define types for our data structure
export interface PdfContent {
  title: string;
  path: string;
  content: string;
  category: string;
}

interface DocumentItem {
  title: string;
  path: string;
  category: string;
  rawText: string;
  chunks: string[];
}

// MenuItem definition to be used by the service
interface MenuItem {
    title: string;
    path?: string; // Path is optional
    category: string;
}

// Singleton service to manage PDF content
class PdfDataService {
  private static instance: PdfDataService;
  private pdfContents: PdfContent[] = [];
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private documents: DocumentItem[] = [];

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): PdfDataService {
    if (!PdfDataService.instance) {
      PdfDataService.instance = new PdfDataService();
    }
    return PdfDataService.instance;
  }

  public async initialize(menuItems: MenuItem[]): Promise<void> {
    if (this.isInitialized) {
      console.log("PDF data service is already initialized.");
      return;
    }

    console.log("Initializing PDF data service...");
      
    // Filter out items that don't have a path, as they cannot be processed.
    const itemsToLoad = menuItems.filter(item => item.path && item.path.endsWith('.pdf'));

    const loadPromises = itemsToLoad.map(async (item) => {
      try {
        // Since we filtered, item.path is guaranteed to be a string here.
        const fullPath = `${process.env.PUBLIC_URL}${item.path!}`;
        const response = await fetch(fullPath);
        if (!response.ok) {
          console.error(`Error loading PDF ${item.title}:`, response.statusText);
          return;
        }

        const content = await this.extractTextFromPdf(fullPath);
          this.pdfContents.push({
          title: item.title,
          path: item.path!,
            content: content,
          category: item.category
          });
        console.log(`Loaded PDF: ${item.title}`);
        } catch (error) {
        console.error(`Error loading PDF ${item.title}:`, error);
      }
    });

    await Promise.all(loadPromises);
    this.isInitialized = true;
    console.log("PDF Data Service initialization complete");
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