export type BrowserSignals = {
  userAgent: string;
  language: string;
  languages: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  screen: string;
  timezone: string;
  webgl: string;
  canvas: string;
};

const CLIENT_KEY = "sweater-browser";

export function browserId(): string {
  const existing = localStorage.getItem(CLIENT_KEY);
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing)) {
    return existing.toLowerCase();
  }
  const id = crypto.randomUUID();
  localStorage.setItem(CLIENT_KEY, id);
  return id;
}

function canvasSignal(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return "";
    context.fillStyle = "#0032a0";
    context.fillRect(0, 0, 240, 64);
    context.font = "18px Georgia";
    context.fillStyle = "#dec197";
    context.fillText("GVSU IT sweater", 12, 28);
    context.strokeStyle = "#0ecbf0";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(200, 36, 16, 0, Math.PI * 1.6);
    context.stroke();
    context.fillStyle = "#13155c";
    context.fillRect(12, 40, 80, 10);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

function webglSignal(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return String(gl.getParameter(gl.VERSION) ?? "");
    const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return `${vendor}|${renderer}`.slice(0, 180);
  } catch {
    return "";
  }
}

export function collectSignals(): BrowserSignals {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    userAgent: navigator.userAgent.slice(0, 300),
    language: navigator.language.slice(0, 40),
    languages: navigator.languages.slice(0, 8).join(",").slice(0, 180),
    platform: navigator.platform.slice(0, 80),
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: nav.deviceMemory || 0,
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}@${window.devicePixelRatio}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    webgl: webglSignal(),
    canvas: canvasSignal(),
  };
}
