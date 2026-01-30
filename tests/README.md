# Playwright E2E Testing & Demo Videos

This directory contains Playwright end-to-end tests for the Subnet Tree Calculator, including comprehensive demo videos that showcase all use-cases for both the web UI and CLI.

## 📹 Demo Videos

The tests generate high-quality video demonstrations:

### 1. Web UI Demo (`web-demo.spec.ts`)
**Video**: `videos/web-demo.webm` (4.4 MB, ~53 seconds)

Demonstrates all web UI features:
- ✅ Initial state & IPv4 basics
- ✅ Tree operations (split, merge)
- ✅ Zoom & pan controls
- ✅ Base CIDR changes
- ✅ Max depth control
- ✅ IPv6 mode
- ✅ Dark theme
- ✅ Combined operations

### 2. CLI Demo (`cli-demo.spec.ts`)
**Video**: `videos/cli-demo.webm` (3.4 MB, ~60 seconds)

Demonstrates all CLI features:
- ✅ Parse command (single & multiple CIDRs)
- ✅ Meta command (subnet metadata)
- ✅ Split command (binary splitting)
- ✅ VLSM command (variable length subnet masking)
- ✅ Export commands (JSON, CSV, Markdown, Terraform)
- ✅ IPv6 support
- ✅ Help command

## 🚀 Running the Tests

### Generate Both Demo Videos
```bash
npm run playwright:demo
```

This will:
1. Run both web and CLI tests
2. Generate videos in `test-results/`
3. Copy videos to `videos/` directory with clean names

### Run Individual Tests

**Web UI Demo Only:**
```bash
npm run playwright:web
```

**CLI Demo Only:**
```bash
npm run playwright:cli
```

**All Tests:**
```bash
npm run playwright
```

### Interactive Mode

Open Playwright UI for debugging:
```bash
npm run playwright:ui
```

### View Test Report

After running tests:
```bash
npm run playwright:report
```

## 📁 Output

After running tests, you'll find:

- **Videos**: `videos/web-demo.webm` and `videos/cli-demo.webm`
- **Test Results**: `test-results/` (detailed results for each test)
- **HTML Report**: `playwright-report/` (interactive test report)
- **Screenshots**: Captured on test failures

## ⚙️ Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Video**: Always enabled with 1920x1080 resolution
- **Viewport**: 1920x1080 (Full HD)
- **Base URL**: http://localhost:5173
- **Browser**: Chromium (Chrome)
- **Workers**: 1 (sequential execution for clean videos)
- **Timeout**: 120 seconds per test

## 📝 Test Structure

### Web Demo Test
Located in `tests/web-demo.spec.ts`

**Sections:**
1. Introduction & Initial State (2s)
2. IPv4 Basic Operations - Multiple splits (6s)
3. View Controls - Fit view (2s)
4. Change Base CIDR - Switch to 192.168.0.0/24 (5s)
5. Max Depth Control - Adjust to 8 (1.5s)
6. IPv6 Mode - Multiple splits (10s)
7. Dark Theme - Enable and fit view (4.5s)
8. Back to IPv4 with Dark Theme - Multiple operations (8.5s)
9. Final View - Fit and pause (5s)

**Total Duration**: ~53 seconds

### CLI Demo Test
Located in `tests/cli-demo.spec.ts`

**Sections:**
1. Parse - Single CIDR
2. Parse - Multiple CIDRs
3. Parse - IPv6
4. Meta - Subnet metadata
5. Meta - Multiple subnets
6. Split - Binary split
7. Split - Multiple subnets
8. VLSM - Variable length subnet masking
9. Export - JSON format
10. Export - CSV format
11. Export - Markdown format
12. Export - Terraform format
13. Help command

**Total Duration**: ~60 seconds

## 🎬 Video Quality

The generated videos feature:

- **Format**: WebM (VP9 codec)
- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 25 fps
- **Quality**: High (Playwright default)
- **File Size**: 3-5 MB per video
- **Smooth transitions** between operations
- **Clear visibility** of all UI elements and terminal output

## 🔄 Converting to MP4

MP4 videos are automatically generated alongside WebM videos for broader compatibility.

### Automatic Conversion

Run tests and convert to MP4 in one command:
```bash
npm run playwright:demo:mp4
```

This will:
1. Run both Playwright tests
2. Copy WebM videos to `videos/` directory
3. Convert both videos to MP4 format

### Manual Conversion

Convert existing WebM videos to MP4:

```bash
# Convert both videos
npm run videos:convert

# Convert web demo only
npm run videos:convert:web

# Convert CLI demo only
npm run videos:convert:cli
```

### Output Files

After conversion, you'll have both formats:
- `videos/web-demo.webm` (4.4 MB) - Original WebM
- `videos/web-demo.mp4` (1.5 MB) - Converted MP4
- `videos/cli-demo.webm` (3.4 MB) - Original WebM
- `videos/cli-demo.mp4` (762 KB) - Converted MP4

**Note**: MP4 files are significantly smaller due to H.264 compression while maintaining excellent quality.

## 🔧 Customization

### Modify Demo Content

Edit the test files:
- `tests/web-demo.spec.ts` - Web UI demo
- `tests/cli-demo.spec.ts` - CLI demo

### Adjust Timing

Change `await page.waitForTimeout(milliseconds)` values to speed up or slow down the demo.

### Change Video Settings

Edit `playwright.config.ts`:
```typescript
video: {
  mode: 'on',  // 'on' | 'off' | 'retain-on-failure'
  size: { width: 1920, height: 1080 }
}
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Video Recording](https://playwright.dev/docs/videos)
- [Test Reporters](https://playwright.dev/docs/test-reporters)

## 🆚 Playwright vs Cypress

**Why we migrated from Cypress to Playwright:**

✅ **Better video quality** - More control over encoding  
✅ **Faster execution** - 2-3x faster than Cypress  
✅ **CLI testing support** - Can test terminal applications  
✅ **Multiple browsers** - Chromium, Firefox, WebKit  
✅ **Better debugging** - Built-in trace viewer  
✅ **No deprecated dependencies** - Modern, actively maintained  
✅ **Better TypeScript support** - First-class integration  

## 🎯 Use Cases

These demo videos are perfect for:

- 📺 **Product demonstrations**
- 📖 **Documentation and tutorials**
- 🎓 **Training materials**
- 🐛 **Bug reports** (showing expected vs actual behavior)
- 📊 **Presentations and pitches**
- 🔍 **Code reviews** (showing feature functionality)

