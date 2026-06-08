const {
  chromium
} = require("C:/Users/OrdiOne/Desktop/LinkedInProject/linkedin-agent-frontend/node_modules/playwright");
const path = require("path");

async function capture(file, selector, outName, width) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const filePath = path.resolve(__dirname, file);
  await page.goto("file:///" + filePath.replace(/\\/g, "/"));
  await page.setViewportSize({ width: width || 1200, height: 900 });
  await page.waitForLoadState("networkidle");
  const el = await page.$(selector);
  await el.screenshot({ path: path.join(__dirname, outName), type: "png" });
  await browser.close();
  console.log("✅ Saved:", outName);
}

(async () => {
  await capture("tools-table.html", ".wrap", "devops-toolchain.png", 1140);
  await capture("pipeline-flow.html", ".page", "devops-pipeline.png", 1160);
  await capture("pipeline-pro.html", ".page", "devops-pipeline-pro.png", 1240);
  await capture(
    "pipeline-diagram-v2.html",
    ".wrap",
    "devops-diagram-v2.png",
    1840
  );
})();
