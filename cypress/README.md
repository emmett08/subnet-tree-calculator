# Cypress E2E Testing for Subnet Tree Calculator

This directory contains Cypress end-to-end tests for the Subnet Tree Calculator application, including a comprehensive demo video that showcases all use-cases.

## 📹 Demo Video

The main test file `cypress/e2e/subnet-tree-demo.cy.ts` creates a complete demonstration video showing:

### Use Cases Covered

1. **Initial State & IPv4 Basics**
   - Default IPv4 network (10.0.0.0/16)
   - Node selection
   - Basic split operations

2. **Tree Operations**
   - Multiple split operations
   - Node selection and navigation
   - Tree growth visualization

3. **Zoom & Pan Controls**
   - Zoom in/out functionality
   - Fit view to canvas
   - Navigation controls

4. **Merge Operations**
   - Merging sibling nodes
   - Tree simplification

5. **CIDR Management**
   - Changing base CIDR
   - Applying new network configurations
   - Different network sizes (e.g., /24, /16)

6. **Max Depth Control**
   - Adjusting maximum tree depth
   - Depth limit visualization

7. **IPv6 Support**
   - Switching to IPv6 mode
   - IPv6 address display (2001:db8::/48)
   - IPv6 subnet operations

8. **Theme Switching**
   - Dark theme toggle
   - Theme persistence across operations

9. **Combined Features**
   - IPv4 with dark theme
   - Multiple operations in sequence
   - Complex tree structures

10. **Final Showcase**
    - Complete tree visualization
    - All features demonstrated

## 🚀 Running the Tests

### Generate Demo Video

To create the MP4 demo video:

```bash
npm run cypress:demo
```

This command will:

1. Start the development server
2. Wait for it to be ready
3. Run the Cypress test
4. Generate an MP4 video in `cypress/videos/`

### Interactive Mode

To open Cypress in interactive mode:

```bash
npm run cypress:open
```

### Headless Mode

To run all Cypress tests in headless mode:

```bash
npm run cypress:run
```

## 📁 Output

After running the tests, you'll find:

- **Video**: `cypress/videos/subnet-tree-demo.cy.ts.mp4`
- **Screenshots** (if any failures): `cypress/screenshots/`

## ⚙️ Configuration

The Cypress configuration is in `cypress.config.ts`:

- **Video**: Enabled with compression level 32
- **Viewport**: 1920x1080 (Full HD)
- **Base URL**: [localhost:5173](http://localhost:5173)
- **Default timeout**: 10 seconds

## 📝 Test Structure

The demo test is organized into 9 sections, each demonstrating specific features:

1. Introduction & Initial State (2s)
2. IPv4 Basic Operations - Multiple splits (8s)
3. View Controls - Fit view (2s)
4. Change Base CIDR - Switch to 192.168.0.0/24 (7s)
5. Max Depth Control - Adjust to 8 (1.5s)
6. IPv6 Mode - Multiple splits (12s)
7. Dark Theme - Enable and fit view (4.5s)
8. Back to IPv4 with Dark Theme - Multiple operations (10.5s)
9. Final View - Fit and pause (5s)

**Total Duration**: ~55 seconds

## 🎬 Video Quality

The generated MP4 video features:

- **Resolution**: 1920x1080 (Full HD)
- **Compression**: Level 32 (good balance between quality and file size)
- **Format**: MP4 (H.264)
- **Smooth transitions** between operations
- **Clear visibility** of all UI elements

## 🔧 Customization

To modify the demo:

1. Edit `cypress/e2e/subnet-tree-demo.cy.ts`
2. Adjust wait times with `cy.wait(milliseconds)`
3. Add or remove sections as needed
4. Change viewport size in `cypress.config.ts`

## 📚 Additional Resources

- [Cypress Documentation](https://docs.cypress.io)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Video Recording](https://docs.cypress.io/guides/guides/screenshots-and-videos)
