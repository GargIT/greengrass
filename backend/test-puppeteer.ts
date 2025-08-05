import puppeteer from "puppeteer";

async function testPuppeteer() {
  console.log("🧪 Testing Puppeteer with container-optimized settings...");

  try {
    console.log("🚀 Launching browser...");
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-default-apps",
        "--no-default-browser-check",
        "--disable-translate",
        "--disable-sync",
        "--hide-scrollbars",
        "--mute-audio",
      ],
      executablePath: process.env.CHROME_BIN || undefined,
      ignoreDefaultArgs: ["--disable-extensions"],
    });

    console.log("✅ Browser launched successfully!");

    console.log("📄 Creating page...");
    const page = await browser.newPage();

    console.log("🎨 Setting HTML content...");
    await page.setContent(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test PDF</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #2e7d32; }
        </style>
      </head>
      <body>
        <h1>Gröngräset PDF Test</h1>
        <p>This is a test PDF generated at ${new Date().toISOString()}</p>
        <p>If you can see this, Puppeteer is working correctly!</p>
      </body>
      </html>
    `,
      { waitUntil: "networkidle0" }
    );

    console.log("📋 Generating PDF...");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "1cm",
        right: "1cm",
        bottom: "1cm",
        left: "1cm",
      },
    });

    console.log(`✅ PDF generated successfully! Size: ${pdf.length} bytes`);

    await page.close();
    await browser.close();
    console.log("🧹 Browser closed");

    console.log("🎉 Puppeteer test completed successfully!");
  } catch (error) {
    console.error("❌ Puppeteer test failed:", error);
    process.exit(1);
  }
}

testPuppeteer();
