/**
 * Visual layout tests for FR-051: Ensure leaf nodes never overlap visually
 */

import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { SubnetTreeCalculator } from './SubnetTreeCalculator';

describe('Visual Layout Tests (FR-051)', () => {
  /**
   * Helper to check if two bounding boxes overlap
   */
  function boxesOverlap(box1: DOMRect, box2: DOMRect): boolean {
    return !(
      box1.right < box2.left ||
      box1.left > box2.right ||
      box1.bottom < box2.top ||
      box1.top > box2.bottom
    );
  }

  /**
   * Helper to get all leaf node elements from the SVG
   */
  function getLeafNodes(container: HTMLElement): SVGGElement[] {
    const allNodes = container.querySelectorAll<SVGGElement>('g.subnet-node');
    const leafNodes: SVGGElement[] = [];
    
    allNodes.forEach(node => {
      // A leaf node is one that has no children in the tree structure
      // We can identify this by checking if it's at the deepest level
      // or by checking the data structure
      const isLeaf = !node.querySelector('g.subnet-node');
      if (isLeaf || node.classList.contains('leaf')) {
        leafNodes.push(node);
      }
    });
    
    return leafNodes;
  }

  it('should not have overlapping leaf nodes in a simple split', async () => {
    const { container } = render(
      <SubnetTreeCalculator initialCidr="10.0.0.0/24" initialMaxDepth={2} />
    );

    // Wait for D3 to render
    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    // Get all node groups (using the actual class name from the component)
    const nodes = container.querySelectorAll<SVGGElement>('g.stc__node');
    expect(nodes.length).toBeGreaterThan(0);

    // Get bounding boxes for all nodes
    const boxes: DOMRect[] = [];
    nodes.forEach(node => {
      const bbox = node.getBoundingClientRect();
      boxes.push(bbox);
    });

    // Check for overlaps
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const overlap = boxesOverlap(boxes[i]!, boxes[j]!);
        if (overlap) {
          // Allow small overlaps due to stroke width (< 2px)
          const box1 = boxes[i]!;
          const box2 = boxes[j]!;
          const overlapX = Math.min(box1.right, box2.right) - Math.max(box1.left, box2.left);
          const overlapY = Math.min(box1.bottom, box2.bottom) - Math.max(box1.top, box2.top);
          const overlapArea = overlapX * overlapY;
          
          // Fail if overlap is significant (> 4 square pixels)
          expect(overlapArea).toBeLessThan(4);
        }
      }
    }
  });

  it('should not have overlapping leaf nodes in a deep tree', async () => {
    const { container } = render(
      <SubnetTreeCalculator initialCidr="192.168.0.0/22" initialMaxDepth={4} />
    );

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    const nodes = container.querySelectorAll<SVGGElement>('g.stc__node');
    expect(nodes.length).toBeGreaterThan(0);

    const boxes: DOMRect[] = [];
    nodes.forEach(node => {
      const bbox = node.getBoundingClientRect();
      boxes.push(bbox);
    });

    // Check for overlaps
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const overlap = boxesOverlap(boxes[i]!, boxes[j]!);
        if (overlap) {
          const box1 = boxes[i]!;
          const box2 = boxes[j]!;
          const overlapX = Math.min(box1.right, box2.right) - Math.max(box1.left, box2.left);
          const overlapY = Math.min(box1.bottom, box2.bottom) - Math.max(box1.top, box2.top);
          const overlapArea = overlapX * overlapY;
          
          expect(overlapArea).toBeLessThan(4);
        }
      }
    }
  });

  it('should maintain separation with IPv6 addresses', async () => {
    const { container } = render(
      <SubnetTreeCalculator initialCidr="2001:db8::/48" initialMaxDepth={3} />
    );

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    const nodes = container.querySelectorAll<SVGGElement>('g.stc__node');
    expect(nodes.length).toBeGreaterThan(0);

    const boxes: DOMRect[] = [];
    nodes.forEach(node => {
      const bbox = node.getBoundingClientRect();
      boxes.push(bbox);
    });

    // Check for overlaps
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const overlap = boxesOverlap(boxes[i]!, boxes[j]!);
        if (overlap) {
          const box1 = boxes[i]!;
          const box2 = boxes[j]!;
          const overlapX = Math.min(box1.right, box2.right) - Math.max(box1.left, box2.left);
          const overlapY = Math.min(box1.bottom, box2.bottom) - Math.max(box1.top, box2.top);
          const overlapArea = overlapX * overlapY;
          
          expect(overlapArea).toBeLessThan(4);
        }
      }
    }
  });
});

