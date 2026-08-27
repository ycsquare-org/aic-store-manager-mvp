import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const projectRoot = resolve(process.cwd());
const outputRoot = resolve(projectRoot, "dist");

if (!outputRoot.startsWith(`${projectRoot}${sep}`) || relative(projectRoot, outputRoot) !== "dist") {
  throw new Error("Refusing to build outside the project directory.");
}

rmSync(outputRoot, { force: true, recursive: true });
mkdirSync(outputRoot, { recursive: true });

for (const file of ["i18n.js", "app.js", "image-studio.js", "styles.css"]) {
  copyFileSync(join(projectRoot, file), join(outputRoot, file));
}

const publicRoot = join(projectRoot, "public");
if (existsSync(publicRoot)) {
  cpSync(publicRoot, outputRoot, { recursive: true });
}

const systemProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
const configuredOrigin = process.env.PUBLIC_SITE_URL?.trim();
const candidateOrigin = configuredOrigin || (systemProductionHost ? `https://${systemProductionHost}` : "");
let trustedOrigin = "";

if (candidateOrigin) {
  const parsed = new URL(candidateOrigin);
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("PUBLIC_SITE_URL must be a trusted HTTP(S) origin without credentials.");
  }
  trustedOrigin = parsed.origin;
}

let html = readFileSync(join(projectRoot, "index.html"), "utf8");
const socialMetadata = trustedOrigin
  ? [
      `<meta property="og:image" content="${trustedOrigin}/og-en.png" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="Alibaba.com Store Manager workspace preview" />`,
      `<meta name="twitter:image" content="${trustedOrigin}/og-en.png" />`,
      `<meta name="twitter:image:alt" content="Alibaba.com Store Manager workspace preview" />`,
    ].join("\n    ")
  : "";

html = html.replace("<!-- social-preview-image -->", socialMetadata);
writeFileSync(join(outputRoot, "index.html"), html, "utf8");

const manifest = {
  builtAt: new Date().toISOString(),
  files: ["index.html", "styles.css", "i18n.js", "image-studio.js", "app.js", ...(existsSync(join(outputRoot, "og-en.png")) ? ["og-en.png"] : [])],
  project: "AIC-2006-0010",
};
const manifestPath = join(outputRoot, "build-manifest.json");
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Built ${manifest.files.length} deployable files in dist/.`);
if (!trustedOrigin) {
  console.log("Social image metadata will be added automatically on Vercel or when PUBLIC_SITE_URL is set.");
}
