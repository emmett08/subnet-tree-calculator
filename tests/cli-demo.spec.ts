import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Subnet Tree Calculator - CLI Demo
 * 
 * This test demonstrates all CLI use cases:
 * 1. Parse command - single and multiple CIDRs
 * 2. Meta command - subnet metadata
 * 3. Split command - binary splitting
 * 4. VLSM command - variable length subnet masking
 * 5. Export command - JSON, CSV, Markdown, Terraform
 * 6. IPv6 support
 * 7. Error handling
 * 
 * This creates a visual recording by rendering terminal output to a web page
 */

test.describe('Subnet Tree Calculator - CLI Demo', () => {
  test('demonstrates all CLI use-cases', async ({ page }) => {
    // Create a simple HTML page to display CLI output
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            background: #0d1117;
            color: #c9d1d9;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 14px;
            padding: 20px;
            margin: 0;
          }
          .terminal {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 20px;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .command {
            color: #58a6ff;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .output {
            color: #8b949e;
            margin-left: 0;
          }
          .section-title {
            color: #7ee787;
            font-size: 18px;
            font-weight: bold;
            margin: 30px 0 15px 0;
            border-bottom: 2px solid #30363d;
            padding-bottom: 8px;
          }
          .success {
            color: #7ee787;
          }
          .error {
            color: #f85149;
          }
        </style>
      </head>
      <body>
        <h1 style="color: #58a6ff; margin-bottom: 30px;">🌐 Subnet Tree Calculator - CLI Demo</h1>
        <div id="content"></div>
      </body>
      </html>
    `);

    const content = page.locator('#content');
    
    // Helper function to add section
    const addSection = async (title: string) => {
      await content.evaluate((el, t) => {
        el.innerHTML += `<div class="section-title">${t}</div>`;
      }, title);
      await page.waitForTimeout(1500);
    };
    
    // Helper function to run command and display output
    const runCommand = async (cmd: string, description?: string) => {
      await content.evaluate((el, c) => {
        el.innerHTML += `<div class="terminal"><div class="command">$ ${c}</div></div>`;
      }, cmd);
      await page.waitForTimeout(800);
      
      try {
        const { stdout, stderr } = await execAsync(cmd, { cwd: process.cwd() });
        const output = stdout || stderr;
        
        await content.evaluate((el, o) => {
          const terminals = el.querySelectorAll('.terminal');
          const lastTerminal = terminals[terminals.length - 1];
          lastTerminal.innerHTML += `<div class="output">${o}</div>`;
        }, output);
      } catch (error: any) {
        await content.evaluate((el, e) => {
          const terminals = el.querySelectorAll('.terminal');
          const lastTerminal = terminals[terminals.length - 1];
          lastTerminal.innerHTML += `<div class="output error">${e}</div>`;
        }, error.message);
      }
      
      await page.waitForTimeout(2000);
    };

    // ========================================
    // SECTION 1: Parse Command
    // ========================================
    await addSection('1. Parse Command - Single CIDR');
    await runCommand('node dist/cli.js parse 192.168.0.0/24');
    
    await addSection('2. Parse Command - Multiple CIDRs');
    await runCommand('node dist/cli.js parse 192.168.0.0/24 10.0.0.0/8 172.16.0.0/12');
    
    await addSection('3. Parse Command - IPv6');
    await runCommand('node dist/cli.js parse 2001:db8::/32');
    
    // ========================================
    // SECTION 2: Meta Command
    // ========================================
    await addSection('4. Meta Command - Subnet Metadata');
    await runCommand('node dist/cli.js meta 10.0.0.0/16');
    
    await addSection('5. Meta Command - Multiple Subnets');
    await runCommand('node dist/cli.js meta 192.168.1.0/24 192.168.2.0/24');
    
    // ========================================
    // SECTION 3: Split Command
    // ========================================
    await addSection('6. Split Command - Binary Split');
    await runCommand('node dist/cli.js split 10.0.0.0/16');
    
    await addSection('7. Split Command - Multiple Subnets');
    await runCommand('node dist/cli.js split 192.168.0.0/24 172.16.0.0/16');
    
    // ========================================
    // SECTION 4: VLSM Command
    // ========================================
    await addSection('8. VLSM Command - Variable Length Subnet Masking');
    await runCommand('node dist/cli.js vlsm 10.0.0.0/16 1000 500 250 100');
    
    // ========================================
    // SECTION 5: Export Commands
    // ========================================
    await addSection('9. Export to JSON');
    await runCommand('node dist/cli.js export json 192.168.0.0/24');
    
    await addSection('10. Export to CSV');
    await runCommand('node dist/cli.js export csv 192.168.0.0/24 10.0.0.0/16');
    
    await addSection('11. Export to Markdown');
    await runCommand('node dist/cli.js export md 192.168.0.0/24 10.0.0.0/16 172.16.0.0/12');
    
    await addSection('12. Export to Terraform');
    await runCommand('node dist/cli.js export tf 10.0.0.0/16');
    
    // ========================================
    // SECTION 6: Help Command
    // ========================================
    await addSection('13. Help Command');
    await runCommand('node dist/cli.js help');
    
    // Final pause to show complete output
    await page.waitForTimeout(3000);
  });
});

