/// <reference types="cypress" />

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to wait for a specific amount of time
       * @example cy.waitFor(2000)
       */
      waitFor(ms: number): Chainable<void>;
    }
  }
}

Cypress.Commands.add('waitFor', (ms: number) => {
  cy.wait(ms);
});

export {};

