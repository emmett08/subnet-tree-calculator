/**
 * Visual export functionality (FR-083)
 * Export subnet tree visualizations to SVG/PNG/PDF formats
 */

/**
 * Export SVG element to SVG string (FR-083)
 * Extracts the SVG content from a DOM element and returns it as a string
 */
export function exportToSvg(svgElement: SVGElement): string {
  // Clone the SVG to avoid modifying the original
  const clone = svgElement.cloneNode(true) as SVGElement;
  
  // Add XML namespace if not present
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  
  // Serialize to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(clone);
}

/**
 * Download SVG as a file (FR-083)
 */
export function downloadSvg(svgElement: SVGElement, filename: string = 'subnet-tree.svg'): void {
  const svgString = exportToSvg(svgElement);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Export SVG to PNG using Canvas API (FR-083)
 * Note: This is a basic implementation. For production use, consider using
 * libraries like html2canvas or dom-to-image for better compatibility.
 */
export function exportToPng(
  svgElement: SVGElement,
  options: { width?: number; height?: number; scale?: number } = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { width, height, scale = 2 } = options;
    
    // Get SVG dimensions
    const svgRect = svgElement.getBoundingClientRect();
    const svgWidth = width || svgRect.width;
    const svgHeight = height || svgRect.height;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = svgWidth * scale;
    canvas.height = svgHeight * scale;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    // Scale for high DPI
    ctx.scale(scale, scale);
    
    // Create image from SVG
    const svgString = exportToSvg(svgElement);
    const img = new Image();
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      }, 'image/png');
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load SVG image'));
    };
    
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Download PNG file (FR-083)
 */
export async function downloadPng(
  svgElement: SVGElement,
  filename: string = 'subnet-tree.png',
  options?: { width?: number; height?: number; scale?: number }
): Promise<void> {
  const blob = await exportToPng(svgElement, options);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Export to PDF (FR-083)
 * Note: This is a placeholder. For production use, integrate jsPDF:
 * 
 * import { jsPDF } from 'jspdf';
 * 
 * export async function exportToPdf(svgElement: SVGElement, filename: string = 'subnet-tree.pdf'): Promise<void> {
 *   const pngBlob = await exportToPng(svgElement, { scale: 2 });
 *   const pngUrl = URL.createObjectURL(pngBlob);
 *   
 *   const img = new Image();
 *   img.src = pngUrl;
 *   await new Promise((resolve) => { img.onload = resolve; });
 *   
 *   const pdf = new jsPDF({
 *     orientation: img.width > img.height ? 'landscape' : 'portrait',
 *     unit: 'px',
 *     format: [img.width, img.height]
 *   });
 *   
 *   pdf.addImage(pngUrl, 'PNG', 0, 0, img.width, img.height);
 *   pdf.save(filename);
 *   
 *   URL.revokeObjectURL(pngUrl);
 * }
 */
export function exportToPdf(_svgElement: SVGElement, _filename: string = 'subnet-tree.pdf'): Promise<void> {
  return Promise.reject(new Error('PDF export requires jsPDF library. Install with: npm install jspdf'));
}

