import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
}

export function PDFViewer({ open, onClose, pdfUrl, title }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.8);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function zoomIn() {
    setScale(prev => Math.min(prev + 0.1, 2.0));
  }

  function zoomOut() {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] h-[90vh] bg-black/95 backdrop-blur-xl border-white/10 flex flex-col" aria-describedby="pdf-viewer-description">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white">{title}</DialogTitle>
        </DialogHeader>
        <p id="pdf-viewer-description" className="sr-only">PDF document viewer with zoom and navigation controls</p>
        
        <div className="flex flex-col flex-1 min-h-0">
          {/* Controls */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">
                {numPages} {numPages === 1 ? 'page' : 'pages'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-300">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                disabled={scale >= 2.0}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* PDF Display - All Pages */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-gray-900/50 rounded-lg">
            <div className="flex flex-col items-center gap-4 p-4">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="text-gray-400 flex items-center justify-center h-full">Loading PDF...</div>
                }
                error={
                  <div className="text-red-400 flex items-center justify-center h-full">Failed to load PDF</div>
                }
              >
                {Array.from(new Array(numPages), (_el, index) => (
                  <div key={`page_${index + 1}`} className="shadow-lg mb-4 last:mb-0">
                    <Page
                      pageNumber={index + 1}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      width={Math.min(window.innerWidth * 0.7, 800)}
                    />
                  </div>
                ))}
              </Document>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
