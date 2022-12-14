const puppeteer = require("puppeteer");
const TaskQueue = require("@goodware/task-queue");

const Koa = require("koa");
const app = new Koa();
const Router = require("@koa/router");

const router = new Router();

const TASK_QUEUE_SIZE = process.env.TASK_QUEUE_SIZE || 10;

async function getScreenshot(von, lastName) {
  const baseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://jeeponorder.com";

  try {
    const browser = await puppeteer.launch({
      userDataDir: ".puppeteercache",
      headless: true,
      args: [
        "--no-sandbox",
        "--autoplay-policy=user-gesture-required",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-client-side-phishing-detection",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-domain-reliability",
        "--disable-extensions",
        "--disable-features=AudioServiceOutOfProcess",
        "--disable-hang-monitor",
        "--disable-ipc-flooding-protection",
        "--disable-notifications",
        "--disable-offer-store-unmasked-wallet-cards",
        "--disable-popup-blocking",
        "--disable-print-preview",
        "--disable-prompt-on-repost",
        "--disable-renderer-backgrounding",
        "--disable-setuid-sandbox",
        "--disable-speech-api",
        "--disable-sync",
        "--hide-scrollbars",
        "--ignore-gpu-blacklist",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-first-run",
        "--no-pings",
        "--no-sandbox",
        "--no-zygote",
        "--password-store=basic",
        "--use-gl=swiftshader",
        "--use-mock-keychain",
      ],
      timeout: 10000,
    });
    const page = await browser.newPage();
    const dimension = 1300;
    await page.setViewport({ width: dimension, height: dimension });
    await page.setDefaultNavigationTimeout(0);
    await page.goto(
      `${baseUrl}/order-status/${von}/${lastName}?screenshot=true`
    );
    await page.waitForSelector("#screenshot-hook", { timeout: 0 });
    const screenshotHook = await page.$("#screenshot-hook");
    const base64 = await screenshotHook.screenshot({ encoding: "base64" });
    await browser.close();
    return `data:image/jpeg;base64,${base64}`;
  } catch (err) {
    console.error(err);
    return "";
  }
}

const taskQueue = new TaskQueue({ size: TASK_QUEUE_SIZE });

router.get("/screenshot/:von/:lastName", async (ctx) => {
  const { von, lastName } = ctx.params;
  const task = await taskQueue.push(() => getScreenshot(von, lastName));
  const screenshot = await task.promise;
  console.log(`GET /screenshot/${von}/${lastName}`);
  if (!screenshot) {
    ctx.throw("unable to get screenshot", 500);
  }
  ctx.body = { dataUrl: screenshot };
});

app.use(router.routes());

app.listen(process.env.PORT || 3001);
