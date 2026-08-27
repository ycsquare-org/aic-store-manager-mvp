import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const requiredFiles = [
  "index.html",
  "styles.css",
  "i18n.js",
  "image-studio.js",
  "app.js",
  "package.json",
  "vercel.json",
  "public/og-en.png",
  "public/demo/knee-brace-front.png",
  "public/demo/knee-brace-45.png",
  "public/demo/knee-brace-side.png",
];
const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) failures.push(`Missing required file: ${file}`);
}

const html = readFileSync(join(root, "index.html"), "utf8");
const css = readFileSync(join(root, "styles.css"), "utf8");
const script = readFileSync(join(root, "app.js"), "utf8");
const i18n = readFileSync(join(root, "i18n.js"), "utf8");
const imageStudio = readFileSync(join(root, "image-studio.js"), "utf8");
let packageConfig = {};
let vercelConfig = {};

try {
  packageConfig = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  vercelConfig = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
} catch (error) {
  failures.push(`Unable to parse JSON configuration: ${error.message}`);
}

const checks = [
  [html.includes('<html lang="en">'), "The page is missing its English language declaration"],
  [html.includes('name="viewport"'), "The page is missing a mobile viewport"],
  [(html.match(/<h1\b/g) || []).length === 1, "The page must contain exactly one main heading"],
  [html.includes('<main id="main-content"'), "The page is missing its main landmark"],
  [html.includes('id="main-content" tabindex="-1"'), "The skip-link target cannot receive keyboard focus"],
  [html.includes('class="skip-link"'), "The page is missing a keyboard skip link"],
  [html.includes('aria-live="polite"'), "The page is missing a status announcement region"],
  [html.includes('id="product-form"'), "The product task form is missing"],
  [html.includes('id="preview-surface"'), "The detail-page preview is missing"],
  [html.includes('id="detail-page-image"'), "The detail-image output is missing"],
  [html.includes('id="angle-gallery"'), "The three-view output is missing"],
  [html.includes('id="task-table-body"'), "The publishing schedule is missing"],
  [css.includes(":focus-visible"), "Visible focus styles are missing"],
  [css.includes("prefers-reduced-motion: reduce"), "Reduced-motion preferences are not respected"],
  [css.includes("forced-colors: active"), "Forced-colors support is missing"],
  [css.includes("@media (max-width: 620px)"), "The mobile layout is missing"],
  [script.includes("validateForm"), "Input validation is missing"],
  [script.includes("generateDetail"), "The generation state is missing"],
  [script.includes("generateSceneViews"), "The three-view generation flow is missing"],
  [html.includes('id="language-selector"'), "The language selector is missing"],
  [i18n.includes('"zh-CN"') && i18n.includes("es:") && i18n.includes("de:"), "The four-language dictionary is incomplete"],
  [script.includes("aic:languagechange"), "Dynamic content is not refreshed after a language change"],
  [imageStudio.includes("generateDetailLongImage"), "Long detail-image generation is missing"],
  [script.includes("copyGeneratedContent"), "Copy feedback is missing"],
  [script.includes("downloadGeneratedPackage"), "Export feedback is missing"],
  [script.includes("simulate-failure"), "Failure and retry demo states are missing"],
  [packageConfig.scripts?.build === "node scripts/build.mjs", "package.json is missing the deployable build command"],
  [packageConfig.scripts?.check?.includes("validate.mjs"), "package.json is missing the full validation command"],
  [vercelConfig.outputDirectory === "dist", "The Vercel output directory is not dist"],
  [vercelConfig.buildCommand === "npm run build", "The Vercel build command is incorrect"],
  [!/(lorem ipsum|placeholder text)/i.test(html), "The page contains meaningless placeholder copy"],
  [!/<[^>]+tabindex="[1-9]/.test(html), "A positive tabindex may break keyboard navigation order"],
  [!/\p{Script=Han}/u.test(html.replace(/<option value="zh-CN">[\s\S]*?<\/option>/, "")), "Unexpected Chinese copy exists outside the language selector"],
];

checks.forEach(([passes, message]) => {
  if (!passes) failures.push(message);
});

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicates.length) failures.push(`Duplicate IDs: ${duplicates.join(", ")}`);

const labelTargets = new Set(
  [...html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map((match) => match[1]),
);
const labeledByWrapping = new Set(
  [...html.matchAll(/<label[^>]*>[\s\S]*?<input[^>]*\sid="([^"]+)"[\s\S]*?<\/label>/g)].map(
    (match) => match[1],
  ),
);
const formControls = [...html.matchAll(/<(input|select|textarea)[^>]*\sid="([^"]+)"[^>]*>/g)]
  .map((match) => ({ id: match[2], tag: match[0] }))
  .filter(({ tag }) => !/type="hidden"/.test(tag));
const unlabeled = formControls
  .filter(({ id }) => !labelTargets.has(id) && !labeledByWrapping.has(id))
  .map(({ id }) => id);
if (unlabeled.length) failures.push(`Controls missing visible labels: ${unlabeled.join(", ")}`);

const translationSources = new Set(
  [...i18n.matchAll(/^\s*\["((?:\\.|[^"\\])*)",/gm)].map((match) => JSON.parse(`"${match[1]}"`)),
);
const literalTranslationCalls = [...`${script}\n${imageStudio}`.matchAll(/\b(?:t|tr)\("((?:\\.|[^"\\])*)"/g)]
  .map((match) => JSON.parse(`"${match[1]}"`));
const missingTranslations = [...new Set(literalTranslationCalls.filter((source) => !translationSources.has(source)))];
if (missingTranslations.length) {
  failures.push(`Translation dictionary is missing ${missingTranslations.length} source string(s): ${missingTranslations.join(" | ")}`);
}

const ogPath = join(root, "public", "og-en.png");
if (existsSync(ogPath) && statSync(ogPath).size < 20_000) {
  failures.push("The social preview image is unusually small and may be damaged");
}
if (existsSync(ogPath)) {
  const png = readFileSync(ogPath);
  const isPng = png.subarray(1, 4).toString("ascii") === "PNG";
  const width = isPng && png.length >= 24 ? png.readUInt32BE(16) : 0;
  const height = isPng && png.length >= 24 ? png.readUInt32BE(20) : 0;
  if (!isPng || width !== 1200 || height !== 630) {
    failures.push(`The social preview image must be 1200×630; received ${width}×${height}`);
  }
}

if (failures.length) {
  console.error("Validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Validation passed: ${requiredFiles.length} files, ${ids.length} unique IDs, ${formControls.length} labeled controls.`);
