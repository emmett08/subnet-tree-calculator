/// <reference types="cypress" />

describe('Subnet Tree Calculator - Complete Demo', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(2000); // Wait for app to fully load
  });

  it('demonstrates all use-cases in a single movie', () => {
    // ========================================
    // SECTION 1: Introduction & Initial State
    // ========================================
    cy.wait(2000); // Pause to show initial state

    // ========================================
    // SECTION 2: IPv4 Basic Operations
    // ========================================

    // Verify SVG is rendered
    cy.get('svg').should('be.visible');
    cy.wait(1500);

    // Split the root node multiple times
    cy.get('.stc__button--ok').first().click();
    cy.wait(2000);

    cy.get('.stc__button--ok').first().click();
    cy.wait(2000);

    cy.get('.stc__button--ok').first().click();
    cy.wait(2000);

    // ========================================
    // SECTION 3: View Controls
    // ========================================

    // Fit view
    cy.get('.stc__button').contains('Fit').click();
    cy.wait(2000);

    // ========================================
    // SECTION 4: Change Base CIDR
    // ========================================

    // Change to a different IPv4 network
    cy.get('input[placeholder*="e.g."]').clear().type('192.168.0.0/24');
    cy.wait(1000);

    cy.get('.stc__button--primary').click();
    cy.wait(2500);

    // Split the new network
    cy.get('.stc__button--ok').first().click();
    cy.wait(1500);
    cy.get('.stc__button--ok').first().click();
    cy.wait(2000);
    
    // ========================================
    // SECTION 5: Max Depth Control
    // ========================================

    // Change max depth
    cy.get('input[type="number"]').clear().type('8');
    cy.wait(1500);

    // ========================================
    // SECTION 6: IPv6 Mode
    // ========================================

    // Switch to IPv6
    cy.contains('label', 'IPv6').find('input[type="radio"]').click();
    cy.wait(3000); // Wait for IPv6 to load

    // Verify IPv6 CIDR is loaded
    cy.get('svg').should('be.visible');
    cy.wait(2000);

    // Split IPv6 network multiple times
    cy.get('.stc__button--ok').first().click();
    cy.wait(2000);

    cy.get('.stc__button--ok').first().click();
    cy.wait(2000);

    cy.get('.stc__button--ok').first().click();
    cy.wait(2000);

    // Fit view to see the whole IPv6 tree
    cy.get('.stc__button').contains('Fit').click();
    cy.wait(2000);

    // ========================================
    // SECTION 7: Dark Theme
    // ========================================

    // Enable dark theme
    cy.contains('label', 'Dark theme').find('input[type="checkbox"]').click();
    cy.wait(3000); // Wait to show dark theme

    // Fit view in dark theme
    cy.get('.stc__button').contains('Fit').click();
    cy.wait(1500);

    // ========================================
    // SECTION 8: Back to IPv4 with Dark Theme
    // ========================================

    // Switch back to IPv4 with dark theme
    cy.contains('label', 'IPv4').find('input[type="radio"]').click();
    cy.wait(3000);

    // Perform operations in dark theme
    cy.get('.stc__button--ok').first().click();
    cy.wait(1500);
    cy.get('.stc__button--ok').first().click();
    cy.wait(2000);
    cy.get('.stc__button--ok').first().click();
    cy.wait(2000);

    // ========================================
    // SECTION 9: Final View
    // ========================================

    // Fit view for final showcase
    cy.get('.stc__button').contains('Fit').click();
    cy.wait(3000);

    // End with a clean view
    cy.wait(2000);
  });
});

