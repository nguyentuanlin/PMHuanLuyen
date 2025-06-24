/// <reference types="react-scripts" />

declare module 'pdfjs-dist/build/pdf.worker.entry';

declare module 'react-pdf' {
  import { FC, ReactElement } from 'react';
  
  export interface DocumentProps {
    file: string | Uint8Array | ArrayBuffer;
    onLoadSuccess?: ({ numPages }: { numPages: number }) => void;
    onLoadError?: (error: Error) => void;
    error?: string | ReactElement;
    loading?: string | ReactElement;
    children?: React.ReactNode;
  }

  export interface PageProps {
    pageNumber: number;
    scale?: number;
    width?: number;
    height?: number;
    rotate?: number;
    canvasBackground?: string;
    className?: string;
    error?: string | ReactElement;
    loading?: string | ReactElement;
    onLoadSuccess?: () => void;
    onLoadError?: (error: Error) => void;
  }

  export const Document: FC<DocumentProps>;
  export const Page: FC<PageProps>;
  export const pdfjs: any;
}
