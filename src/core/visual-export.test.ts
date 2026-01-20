import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToSvg, downloadSvg, exportToPng, downloadPng, exportToPdf } from './visual-export';

describe('visual-export', () => {
  let svgElement: SVGElement;

  beforeEach(() => {
    // Create a mock SVG element
    svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttribute('width', '200');
    svgElement.setAttribute('height', '100');
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '40');
    circle.setAttribute('fill', 'red');
    
    svgElement.appendChild(circle);
  });

  describe('exportToSvg', () => {
    it('should export SVG element to string', () => {
      const svgString = exportToSvg(svgElement);
      
      expect(svgString).toContain('<svg');
      expect(svgString).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svgString).toContain('<circle');
      expect(svgString).toContain('cx="50"');
      expect(svgString).toContain('cy="50"');
      expect(svgString).toContain('r="40"');
    });

    it('should add xmlns attribute if not present', () => {
      const svgString = exportToSvg(svgElement);
      expect(svgString).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('should not modify original SVG element', () => {
      const originalHtml = svgElement.outerHTML;
      exportToSvg(svgElement);
      expect(svgElement.outerHTML).toBe(originalHtml);
    });
  });

  describe('downloadSvg', () => {
    it('should create download link and trigger download', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      } as unknown as HTMLAnchorElement;
      
      createElementSpy.mockReturnValue(mockLink);
      
      downloadSvg(svgElement, 'test.svg');
      
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(mockLink.download).toBe('test.svg');
      expect(mockLink.click).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
      
      createElementSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('exportToPng', () => {
    it('should reject with error message about canvas context', async () => {
      // Mock getBoundingClientRect
      vi.spyOn(svgElement, 'getBoundingClientRect').mockReturnValue({
        width: 200,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 200,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });
      
      // Mock canvas creation to return null context
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(null),
        toBlob: vi.fn()
      };
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);
      
      await expect(exportToPng(svgElement)).rejects.toThrow('Failed to get canvas context');
    });
  });

  describe('downloadPng', () => {
    it('should reject when exportToPng fails', async () => {
      vi.spyOn(svgElement, 'getBoundingClientRect').mockReturnValue({
        width: 200,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 200,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });
      
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(null),
        toBlob: vi.fn()
      };
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);
      
      await expect(downloadPng(svgElement, 'test.png')).rejects.toThrow('Failed to get canvas context');
    });
  });

  describe('exportToPdf', () => {
    it('should reject with error message about jsPDF', async () => {
      await expect(exportToPdf(svgElement, 'test.pdf')).rejects.toThrow(
        'PDF export requires jsPDF library'
      );
    });
  });
});

