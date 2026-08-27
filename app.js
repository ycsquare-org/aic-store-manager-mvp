"use strict";

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const t = (source, variables = {}) => {
  if (window.AICI18n?.t) return window.AICI18n.t(source, variables);
  return String(source).replace(/\{\{(\w+)\}\}/g, (match, name) => (
    Object.hasOwn(variables, name) ? String(variables[name]) : match
  ));
};
const currentLocale = () => window.AICI18n?.getLocale?.() || "en-US";

const PROJECT = {
  id: "AIC-2006-0010",
  name: "Alibaba.com Store Manager",
};

const STORAGE_KEYS = {
  draft: "aic-2006-0010:draft",
  generated: "aic-2006-0010:generated",
  tasks: "aic-2006-0010:tasks",
};

const MAX_IMAGE_COUNT = 1;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CATEGORY_CODES = ["Knee Support", "Back Support", "Ankle Support", "Wrist Support", "Custom Orthopedic Brace"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const SCENE_LABELS = {
  auto: "Smart scene match",
  rehabilitation: "Rehabilitation clinic",
  training: "Sports training studio",
  outdoor: "Outdoor sports setting",
  studio: "Clean studio",
};
const DEMO_VIEWS = [
  { id: "front", labelKey: "Front view", dataUrl: "./demo/knee-brace-front.png" },
  { id: "three-quarter", labelKey: "45° feature view", dataUrl: "./demo/knee-brace-45.png" },
  { id: "side", labelKey: "Side profile", dataUrl: "./demo/knee-brace-side.png" },
];

function localizedDemoViews() {
  return DEMO_VIEWS.map((view) => ({ ...view, label: t(view.labelKey) }));
}

const form = $("#product-form");
const imageInput = $("#product-images");
const imageList = $("#image-list");
const imageEmptyState = $("#image-empty-state");
const imageError = $("#product-images-error");
const uploadZone = $("#upload-zone");
const generateButton = $("#generate-button");
const saveDraftButton = $("#save-draft");
const copyButton = $("#copy-content");
const exportButton = $("#export-package");
const previewState = $("#preview-state");
const previewStateText = $("#preview-state-text");
const previewSurface = $("#preview-surface");
const detailImageElement = $("#detail-page-image");
const detailImageEmpty = $("#detail-image-empty");
const angleGallery = $("#angle-gallery");
const angleResultBadge = $("#angle-result-badge");
const globalStatus = $("#global-status");
const toastRegion = $("#toast-region");
const taskTableBody = $("#task-table-body");
const taskEmptyState = $("#task-empty-state");

const appState = {
  activeFilter: "all",
  generated: null,
  generatedViews: [],
  detailImage: null,
  assetsStale: false,
  imageUrls: [],
  images: [],
  isGenerating: false,
  customTasks: [],
  restoredImageNames: [],
};

function tomorrowAsInputValue() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, "0"),
    String(tomorrow.getDate()).padStart(2, "0"),
  ].join("-");
}

function todayAsInputValue() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function safelyRead(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function safelyWrite(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast(t("Local storage is unavailable, but your content will remain on this page for now."), "error");
    return false;
  }
}

function announce(message) {
  globalStatus.textContent = "";
  window.requestAnimationFrame(() => {
    globalStatus.textContent = message;
  });
}

let toastTimer;

function showToast(message, type = "info") {
  window.clearTimeout(toastTimer);
  toastRegion.replaceChildren();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("aria-hidden", "true");

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = type === "success" ? "✓" : type === "error" ? "!" : "i";

  const text = document.createElement("span");
  text.textContent = message;
  toast.append(icon, text);
  toastRegion.append(toast);

  toastTimer = window.setTimeout(() => {
    toast.remove();
  }, 3800);
}

function setPreviewMessage(type, message) {
  previewState.hidden = !message;
  previewState.dataset.state = type;
  previewStateText.textContent = message || "";

  const icon = $(".preview-state-icon", previewState);
  if (icon) {
    icon.textContent = type === "success" ? "✓" : type === "error" ? "!" : "✦";
  }
}

function setGenerating(isGenerating) {
  appState.isGenerating = isGenerating;
  $$("input, select, textarea, button", form).forEach((control) => {
    if (isGenerating) {
      if (!Object.hasOwn(control.dataset, "disabledBeforeGeneration")) {
        control.dataset.disabledBeforeGeneration = String(control.disabled);
      }
      control.disabled = true;
    } else if (Object.hasOwn(control.dataset, "disabledBeforeGeneration")) {
      control.disabled = control.dataset.disabledBeforeGeneration === "true";
      delete control.dataset.disabledBeforeGeneration;
    }
  });
  generateButton.disabled = isGenerating;
  generateButton.setAttribute("aria-busy", String(isGenerating));
  previewSurface.setAttribute("aria-busy", String(isGenerating));
  previewSurface.classList.toggle("is-generating", isGenerating);

  if (isGenerating) {
    generateButton.replaceChildren();
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");
    generateButton.append(spinner, document.createTextNode(t("Generating scene images and detail page…")));
  } else {
    generateButton.replaceChildren();
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✦";
    const label = appState.generated
      ? t("Regenerate 3 scene images and detail page")
      : t("Generate 3 scene images and detail page");
    generateButton.append(icon, document.createTextNode(label));
  }
}

function splitList(value, separators = /[；;\n]+/) {
  return String(value || "")
    .split(separators)
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectedText(select) {
  return select.selectedOptions[0]?.textContent?.trim() || "";
}

function readProductData() {
  const autoPublish = $("#auto-publish").checked;
  const keywords = splitList($("#keywords").value, /[,，\n]+/);
  const sellingPoints = splitList($("#selling-points").value);

  return {
    autoPublish,
    category: $("#category").value,
    categoryLabel: selectedText($("#category")),
    certifications: $("#certifications").value.trim(),
    customization: $("#customization").value.trim(),
    dailyLimit: Number($("#daily-limit").value),
    imageNames: appState.images.map((file) => file.name),
    keywords,
    leadTime: Number($("#lead-time").value),
    maxPrice: Number($("#max-price").value),
    minPrice: Number($("#min-price").value),
    monthlyCapacity: Number($("#monthly-capacity").value),
    moq: Number($("#moq").value),
    productName: $("#product-name").value.trim(),
    publishTime: $("#publish-time").value,
    sampleDays: Number($("#sample-days").value),
    scene: $("#scene-preset").value,
    sceneLabel: t(SCENE_LABELS[$("#scene-preset").value] || SCENE_LABELS.auto),
    sellingPoints,
    sellingPointsRaw: $("#selling-points").value.trim(),
    startDate: $("#start-date").value,
    targetMarket: $("#target-market").value,
    targetMarketLabel: selectedText($("#target-market")),
  };
}

function money(value) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat(currentLocale(), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    : "—";
}

function integer(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat(currentLocale()).format(value) : "—";
}

function formatScheduleDate(value) {
  if (!value) return t("No date set");
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return t("No date set");
  return new Intl.DateTimeFormat(currentLocale(), { month: "long", day: "numeric" }).format(parsed);
}

function updateRuleSummary() {
  const enabled = $("#auto-publish").checked;
  const dailyLimit = $("#daily-limit").value || "—";
  const time = $("#publish-time").value || "—";
  const date = formatScheduleDate($("#start-date").value);
  const summary = enabled
    ? t("Starting {{date}}, publish {{count}} products daily at {{time}}", { date, count: dailyLimit, time })
    : t("Auto-publishing is off. Generated tasks will be saved for review.");
  $("#rule-summary").textContent = summary;
  $$(".rule-fields input").forEach((input) => {
    input.disabled = !enabled;
  });
}

function updatePriceAdjustmentPreview() {
  const percent = Number($("#price-adjust-percent").value);
  const minPrice = Number($("#min-price").value);
  const maxPrice = Number($("#max-price").value);
  const output = $("#price-adjust-preview");

  if (![percent, minPrice, maxPrice].every(Number.isFinite) || percent < -50 || percent > 100) {
    output.textContent = t("Enter a valid percentage from -50% to 100%.");
    return;
  }

  const factor = 1 + percent / 100;
  output.textContent = t("Preview: US${{min}}–{{max}} ({{percent}}%)", {
    min: money(minPrice * factor),
    max: money(maxPrice * factor),
    percent: `${percent > 0 ? "+" : ""}${percent}`,
  });
}

function updatePreview() {
  const data = readProductData();
  $("#preview-scene-label").textContent = data.sceneLabel;
  $("#detail-accessible-copy").textContent = [
    data.productName || "Adjustable Hinged Knee Brace for Sports Recovery",
    t("Price: US${{min}}–{{max}}", { min: money(data.minPrice), max: money(data.maxPrice) }),
    t("MOQ: {{value}} pieces", { value: integer(data.moq) }),
    t("Product images: 3 views · {{scene}}", { scene: data.sceneLabel }),
    data.sellingPoints.length ? `${t("Key Selling Points")}: ${data.sellingPoints.join("; ")}.` : t("Add key selling points."),
    `OEM: ${data.customization || "Logo, color, size, and packaging"}; ${t("Sample lead time: {{value}} days", { value: integer(data.sampleDays) })}; ${t("Monthly capacity: {{value}} pieces", { value: integer(data.monthlyCapacity) })}.`,
  ].join(" ");

  updateRuleSummary();
  updatePriceAdjustmentPreview();
}

function revokeImageUrls() {
  appState.imageUrls.forEach((url) => URL.revokeObjectURL(url));
  appState.imageUrls = [];
}

function renderImages() {
  revokeImageUrls();
  imageList.replaceChildren();

  if (!appState.images.length) {
    const empty = imageEmptyState || document.createElement("div");
    empty.className = "empty-image-slot";
    empty.id = "image-empty-state";
    const number = document.createElement("span");
    number.setAttribute("aria-hidden", "true");
    number.textContent = "1";
    empty.replaceChildren(number, document.createTextNode(t("The source image preserves product appearance and structure")));
    imageList.append(empty);
    return;
  }

  appState.images.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    appState.imageUrls.push(url);

    const figure = document.createElement("figure");
    figure.className = "image-thumb";

    const image = document.createElement("img");
    image.src = url;
    image.alt = t("{{name}}, source product image awaiting three-view scene generation", { name: file.name });

    const caption = document.createElement("figcaption");
    caption.textContent = t("Source image");

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "image-remove";
    remove.dataset.imageIndex = String(index);
    remove.setAttribute("aria-label", t("Remove image {{name}}", { name: file.name }));
    remove.textContent = "×";

    figure.append(image, caption, remove);
    imageList.append(figure);
  });

}

function safeDownloadName(value, fallback = "product") {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || fallback;
}

function triggerAssetDownload(asset, fallbackName) {
  if (!asset?.dataUrl && !asset?.blob) {
    showToast(t("This image has not been generated yet."), "error");
    return;
  }

  const temporaryUrl = asset.blob ? URL.createObjectURL(asset.blob) : "";
  const link = document.createElement("a");
  link.href = temporaryUrl || asset.dataUrl;
  link.download = asset.fileName || fallbackName;
  document.body.append(link);
  link.click();
  link.remove();
  if (temporaryUrl) window.setTimeout(() => URL.revokeObjectURL(temporaryUrl), 1000);
}

function renderAngleGallery(views, { demo = false } = {}) {
  angleGallery.replaceChildren();
  angleResultBadge.textContent = demo ? t("Demo") : t("Generated 3/3");
  angleResultBadge.classList.toggle("is-generated", !demo);

  views.forEach((view) => {
    const figure = document.createElement("figure");
    figure.className = "angle-card";

    const image = document.createElement("img");
    image.src = view.dataUrl;
    image.alt = t("{{product}}, {{view}}, {{scene}}", {
      product: readProductData().productName || "Knee brace",
      view: view.label,
      scene: readProductData().sceneLabel,
    });

    const caption = document.createElement("figcaption");
    const label = document.createElement("span");
    label.textContent = view.label;
    caption.append(label);

    if (!demo) {
      const download = document.createElement("button");
      download.type = "button";
      download.className = "angle-download";
      download.dataset.viewId = view.id;
      download.setAttribute("aria-label", t("Download {{label}} image", { label: view.label }));
      download.title = t("Download {{label}}", { label: view.label });
      download.textContent = "↓";
      caption.append(download);
    }

    figure.append(image, caption);
    angleGallery.append(figure);
  });
}

function renderOutputPlaceholders() {
  const labels = [t("Front view"), t("45° feature view"), t("Side profile")];
  angleGallery.replaceChildren();
  angleResultBadge.textContent = t("Not generated");
  angleResultBadge.classList.remove("is-generated");
  labels.forEach((label) => {
    const item = document.createElement("div");
    item.className = "angle-card angle-card-placeholder";
    const visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");
    const text = document.createElement("strong");
    text.textContent = label;
    item.append(visual, text);
    angleGallery.append(item);
  });
}

function showDetailImage(asset, { demo = false } = {}) {
  detailImageElement.src = asset.dataUrl;
  detailImageElement.alt = demo
    ? t("Demo knee brace detail image with three views, pricing, selling points, and OEM capabilities")
    : t("{{product}} detail image with three views, pricing, selling points, and OEM capabilities", { product: readProductData().productName });
  detailImageElement.hidden = false;
  detailImageEmpty.hidden = true;
  previewSurface.classList.remove("is-stale");
}

function showDetailPlaceholder(title, description) {
  detailImageElement.hidden = true;
  detailImageElement.removeAttribute("src");
  detailImageEmpty.hidden = false;
  $("strong", detailImageEmpty).textContent = title;
  $("small", detailImageEmpty).textContent = description;
}

function invalidateGeneratedAssets(message, { clearPreview = false } = {}) {
  const hadGeneratedAssets = Boolean(appState.generated || appState.detailImage || appState.generatedViews.length);
  appState.generated = null;
  appState.generatedViews = [];
  appState.detailImage = null;
  appState.assetsStale = appState.assetsStale || hadGeneratedAssets;
  copyButton.disabled = true;
  exportButton.disabled = true;
  previewSurface.dataset.staleLabel = t("Content changed · Regenerate");
  previewSurface.classList.toggle("is-stale", appState.assetsStale && !clearPreview);

  if (clearPreview) {
    appState.assetsStale = false;
    previewSurface.classList.remove("is-stale");
    showDetailPlaceholder(t("Awaiting detail image"), t("Submit to generate a downloadable PNG detail image"));
    renderOutputPlaceholders();
  }

  if (appState.assetsStale && message) setPreviewMessage("loading", message);
  if (!appState.isGenerating) setGenerating(false);
}

function canDecodeImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const finish = (result) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => finish(false);
    image.src = url;
  });
}

async function processImages(files) {
  const rejected = [];
  const candidates = files.slice(0, MAX_IMAGE_COUNT);

  if (files.length > MAX_IMAGE_COUNT) {
    rejected.push(t("Only 1 source image is needed. Additional images not added: {{count}}", { count: files.length - MAX_IMAGE_COUNT }));
  }

  candidates.forEach((file) => {
    if (!IMAGE_TYPES.has(file.type)) {
      rejected.push(t("{{name}}: JPG, PNG, or WebP only", { name: file.name }));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      rejected.push(t("{{name}}: exceeds 10 MB", { name: file.name }));
      return;
    }
    const existing = appState.images[0];
    const duplicate = existing && existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified;
    if (duplicate) {
      rejected.push(t("{{name}}: matches the current source image", { name: file.name }));
    }
  });

  const validCandidates = candidates.filter((file) =>
    IMAGE_TYPES.has(file.type) &&
    file.size <= MAX_IMAGE_SIZE &&
    !rejected.some((message) => message.includes(file.name)),
  );
  const decodeResults = await Promise.all(validCandidates.map(canDecodeImage));
  const accepted = validCandidates.filter((file, index) => {
    if (decodeResults[index]) return true;
    rejected.push(t("{{name}}: unreadable or damaged image", { name: file.name }));
    return false;
  });

  if (accepted.length) {
    const replaced = appState.images.length > 0;
    appState.images = [accepted[0]];
    renderImages();
    updatePreview();
    invalidateGeneratedAssets(t("The source image has changed. Regenerate the three views and detail image."), { clearPreview: true });
    imageInput.removeAttribute("aria-invalid");
    showToast(replaced ? t("Source image replaced. Regenerate the images.") : t("Source image added. You can now generate three views."), "success");
  }
  imageError.textContent = rejected.join("; ");

  if (rejected.length) {
    showToast(t("{{count}} image issue(s) found. Check the upload area for details.", { count: rejected.length }), "error");
  }
}

function clearValidation() {
  $$("[aria-invalid='true']", form).forEach((field) => field.removeAttribute("aria-invalid"));
  $$(".field-error", form).forEach((error) => {
    error.textContent = "";
  });
}

function markInvalid(input, errorElement, message, errors) {
  input.setAttribute("aria-invalid", "true");
  errorElement.textContent = message;
  errors.push(input);
}

function hasAtMostTwoDecimals(value) {
  return Math.abs(value * 100 - Math.round(value * 100)) < Number.EPSILON * 1000;
}

function validateForm() {
  clearValidation();
  const errors = [];
  const data = readProductData();

  if (!appState.images.length) {
    markInvalid(imageInput, imageError, t("Upload at least 1 product image."), errors);
  }

  const productName = $("#product-name");
  if (!data.productName) {
    markInvalid(productName, $("#product-name-error"), t("Enter an English product name."), errors);
  } else if (data.productName.length < 8) {
    markInvalid(productName, $("#product-name-error"), t("Product name must be at least 8 characters."), errors);
  } else if (data.productName.length > 120) {
    markInvalid(productName, $("#product-name-error"), t("Product name must be no more than 120 characters."), errors);
  }

  const category = $("#category");
  if (!data.category) {
    markInvalid(category, $("#category-error"), t("Select a product category."), errors);
  }

  const keywords = $("#keywords");
  if (!data.keywords.length) {
    markInvalid(keywords, $("#keywords-error"), t("Enter at least 1 English search keyword."), errors);
  } else if (data.keywords.length > 5) {
    markInvalid(keywords, $("#keywords-error"), t("Enter no more than 5 keywords."), errors);
  }

  const sellingPoints = $("#selling-points");
  if (!data.sellingPointsRaw) {
    markInvalid(sellingPoints, $("#selling-points-error"), t("Enter at least 2 verifiable selling points."), errors);
  } else if (data.sellingPoints.length < 2) {
    markInvalid(sellingPoints, $("#selling-points-error"), t("Separate at least 2 selling points with semicolons."), errors);
  }

  const sampleDays = $("#sample-days");
  const monthlyCapacity = $("#monthly-capacity");
  const oemNumberError = $("#oem-number-error");
  if (!Number.isInteger(data.sampleDays) || data.sampleDays < 1 || data.sampleDays > 60) {
    markInvalid(sampleDays, oemNumberError, t("Sample lead time must be an integer from 1 to 60 days."), errors);
  } else if (!Number.isInteger(data.monthlyCapacity) || data.monthlyCapacity < 1 || data.monthlyCapacity > 9999999) {
    markInvalid(monthlyCapacity, oemNumberError, t("Monthly capacity must be an integer from 1 to 9,999,999."), errors);
  }

  const moq = $("#moq");
  const leadTime = $("#lead-time");
  const tradeNumberError = $("#trade-number-error");
  if (!Number.isInteger(data.moq) || data.moq < 1 || data.moq > 999999) {
    markInvalid(moq, tradeNumberError, t("MOQ must be an integer from 1 to 999,999."), errors);
  } else if (!Number.isInteger(data.leadTime) || data.leadTime < 1 || data.leadTime > 365) {
    markInvalid(leadTime, tradeNumberError, t("Lead time must be an integer from 1 to 365 days."), errors);
  }

  const minPrice = $("#min-price");
  const maxPrice = $("#max-price");
  const priceError = $("#price-error");
  if (!Number.isFinite(data.minPrice) || data.minPrice < 0.01 || data.minPrice > 999999.99) {
    markInvalid(minPrice, priceError, t("Minimum price must be between 0.01 and 999,999.99."), errors);
  } else if (!Number.isFinite(data.maxPrice) || data.maxPrice < 0.01 || data.maxPrice > 999999.99) {
    markInvalid(maxPrice, priceError, t("Maximum price must be between 0.01 and 999,999.99."), errors);
  } else if (!hasAtMostTwoDecimals(data.minPrice) || !hasAtMostTwoDecimals(data.maxPrice)) {
    minPrice.setAttribute("aria-invalid", "true");
    maxPrice.setAttribute("aria-invalid", "true");
    priceError.textContent = t("Prices can have no more than 2 decimal places.");
    errors.push(minPrice);
  } else if (data.maxPrice < data.minPrice) {
    minPrice.setAttribute("aria-invalid", "true");
    maxPrice.setAttribute("aria-invalid", "true");
    priceError.textContent = t("Maximum price cannot be lower than minimum price.");
    errors.push(maxPrice);
  }

  if (data.autoPublish) {
    const dailyLimit = $("#daily-limit");
    const publishTime = $("#publish-time");
    const startDate = $("#start-date");
    if (!Number.isInteger(data.dailyLimit) || data.dailyLimit < 1 || data.dailyLimit > 20) {
      dailyLimit.setAttribute("aria-invalid", "true");
      $("#schedule-error").textContent = t("Daily publishing limit must be an integer from 1 to 20.");
      errors.push(dailyLimit);
    } else if (!data.publishTime) {
      publishTime.setAttribute("aria-invalid", "true");
      $("#schedule-error").textContent = t("Choose a daily publishing time.");
      errors.push(publishTime);
    } else if (!data.startDate) {
      startDate.setAttribute("aria-invalid", "true");
      $("#schedule-error").textContent = t("Choose an auto-publishing start date.");
      errors.push(startDate);
    } else if (data.startDate < todayAsInputValue()) {
      startDate.setAttribute("aria-invalid", "true");
      $("#schedule-error").textContent = t("Start date cannot be earlier than today.");
      errors.push(startDate);
    }
  }

  if (errors.length) {
    const firstError = errors[0];
    firstError.focus({ preventScroll: true });
    firstError.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
    const message = t("Required fields to complete: {{count}}.", { count: new Set(errors).size });
    setPreviewMessage("error", message);
    showToast(message, "error");
    announce(message);
    return null;
  }

  return data;
}

function buildDetailCopy(data) {
  const points = data.sellingPoints.map((point, index) => `${index + 1}. ${point}`).join("\n");
  const schedule = data.autoPublish
    ? t("{{date}} at {{time}}, {{count}} products per day", {
        date: formatScheduleDate(data.startDate),
        time: data.publishTime,
        count: data.dailyLimit,
      })
    : t("Auto-publishing is off; awaiting manual review");

  return [
    data.productName,
    "",
    t("Category: {{value}}", { value: data.categoryLabel || t(data.category) }),
    t("Price: US${{min}}–{{max}}", { min: money(data.minPrice), max: money(data.maxPrice) }),
    t("MOQ: {{value}} pieces", { value: integer(data.moq) }),
    t("Lead time: {{value}} days", { value: integer(data.leadTime) }),
    t("Product images: 3 views · {{scene}}", { scene: data.sceneLabel }),
    "",
    t("KEY BUYING POINTS"),
    points,
    "",
    t("OEM / ODM CAPABILITY"),
    t("Customization: {{value}}", { value: data.customization || t("Logo, color, size and packaging") }),
    t("Sample lead time: {{value}} days", { value: integer(data.sampleDays) }),
    t("Monthly capacity: {{value}} pieces", { value: integer(data.monthlyCapacity) }),
    t("Quality certifications: {{value}}", { value: data.certifications || t("Available on request") }),
    t("Main market: {{value}}", { value: data.targetMarketLabel || t(data.targetMarket) }),
    "",
    t("Publishing plan: {{value}}", { value: schedule }),
  ].join("\n");
}

function draftFromForm() {
  const draft = {};
  $$('input:not([type="file"]), select, textarea', form).forEach((field) => {
    draft[field.id] = field.type === "checkbox" ? field.checked : field.value;
  });
  draft.imageNames = appState.images.map((file) => file.name);
  draft.savedAt = new Date().toISOString();
  return draft;
}

function saveDraft({ quiet = false } = {}) {
  const saved = safelyWrite(STORAGE_KEYS.draft, draftFromForm());
  if (saved && !quiet) {
    const message = appState.images.length
      ? t("Draft saved. You will need to select the local image again after refreshing.")
      : t("Draft saved in this browser.");
    showToast(message, "success");
    announce(message);
  }
  return saved;
}

function restoreDraft() {
  const draft = safelyRead(STORAGE_KEYS.draft, null);
  if (!draft) return false;

  Object.entries(draft).forEach(([id, value]) => {
    const field = document.getElementById(id);
    if (!field || id === "product-images") return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value;
  });

  if (Array.isArray(draft.imageNames) && draft.imageNames.length) {
    appState.restoredImageNames = [...draft.imageNames];
    imageError.textContent = t("This draft references {{count}} image(s) ({{names}}). For browser security, please select the file again.", {
      count: draft.imageNames.length,
      names: draft.imageNames.join(", "),
    });
  }
  return true;
}

function createTaskRow(task) {
  const row = document.createElement("tr");
  row.dataset.status = task.status;
  row.dataset.taskId = task.id;

  const productCell = document.createElement("td");
  productCell.dataset.label = t("Product");
  const name = document.createElement("strong");
  name.textContent = task.name;
  const category = document.createElement("small");
  const categoryCode = task.categoryCode || CATEGORY_CODES.find((value) => String(task.category || "").includes(value));
  category.textContent = t(categoryCode || task.category || "");
  productCell.append(name, category);

  const timeCell = document.createElement("td");
  timeCell.dataset.label = t("Scheduled time");
  timeCell.textContent = task.startDate && task.publishTime
    ? `${formatScheduleDate(task.startDate)} ${task.publishTime}`
    : t(task.time || "Awaiting manual review");

  const priceCell = document.createElement("td");
  priceCell.dataset.label = t("Price");
  priceCell.textContent = Number.isFinite(task.minPrice) && Number.isFinite(task.maxPrice)
    ? `US$${money(task.minPrice)}–${money(task.maxPrice)}`
    : task.price;

  const completenessCell = document.createElement("td");
  completenessCell.dataset.label = t("Content completeness");
  const progress = document.createElement("div");
  progress.className = "progress";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", t("Content completeness"));
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", "100");
  progress.setAttribute("aria-valuenow", String(task.completeness));
  const progressValue = document.createElement("span");
  progressValue.style.width = `${task.completeness}%`;
  const percentage = document.createElement("small");
  percentage.textContent = `${task.completeness}%`;
  progress.append(progressValue);
  completenessCell.append(progress, percentage);

  const statusCell = document.createElement("td");
  statusCell.dataset.label = t("Status");
  const status = document.createElement("span");
  status.className = `state-badge state-${task.status}`;
  status.textContent = task.status === "published"
    ? t("Published")
    : task.status === "failed"
      ? t("Needs attention")
      : task.status === "draft"
        ? t("Awaiting review")
        : t("Scheduled");
  statusCell.append(status);

  const actionCell = document.createElement("td");
  const action = document.createElement("button");
  action.type = "button";
  action.className = "text-button";
  action.dataset.taskAction = task.status === "failed" ? "retry" : "view";
  action.textContent = task.status === "failed" ? t("Fix") : t("View");
  actionCell.append(action);

  row.append(productCell, timeCell, priceCell, completenessCell, statusCell, actionCell);
  return row;
}

function renderCustomTasks() {
  $$("tr[data-custom-task='true']", taskTableBody).forEach((row) => row.remove());
  [...appState.customTasks].reverse().forEach((task) => {
    const row = createTaskRow(task);
    row.dataset.customTask = "true";
    taskTableBody.prepend(row);
  });
  applyTaskFilter(appState.activeFilter);
}

function addOrUpdateTask(data) {
  const id = data.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `task-${Date.now()}`;
  const task = {
    categoryCode: data.category,
    completeness: 100,
    id,
    maxPrice: data.maxPrice,
    minPrice: data.minPrice,
    name: data.productName,
    publishTime: data.autoPublish ? data.publishTime : "",
    startDate: data.autoPublish ? data.startDate : "",
    status: data.autoPublish ? "scheduled" : "draft",
    time: data.autoPublish ? "" : "Awaiting manual review",
  };
  const existing = appState.customTasks.findIndex((item) => item.id === id);
  if (existing >= 0) appState.customTasks.splice(existing, 1, task);
  else appState.customTasks.push(task);
  safelyWrite(STORAGE_KEYS.tasks, appState.customTasks);
  renderCustomTasks();
  return existing < 0;
}

function applyTaskFilter(filter) {
  appState.activeFilter = filter;
  const rows = $$("tr[data-status]", taskTableBody);
  let visibleCount = 0;
  rows.forEach((row) => {
    const matches = filter === "all" || row.dataset.status === filter;
    row.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  taskEmptyState.hidden = visibleCount > 0;
}

function syncMetrics() {
  const customScheduled = appState.customTasks.filter((task) => task.status === "scheduled").length;
  $("#metric-scheduled").textContent = String(3 + customScheduled);
}

async function generateDetail(data) {
  appState.generated = null;
  appState.generatedViews = [];
  appState.detailImage = null;
  appState.assetsStale = false;
  copyButton.disabled = true;
  exportButton.disabled = true;
  previewSurface.classList.remove("is-stale");
  try {
    window.localStorage.removeItem(STORAGE_KEYS.generated);
  } catch {
    // The new result can still be generated when storage is unavailable.
  }
  setGenerating(true);
  renderOutputPlaceholders();
  showDetailPlaceholder(t("Generating detail image"), t("Creating three scene images, then arranging pricing, selling points, and OEM capabilities"));
  setPreviewMessage("loading", t("Generating image 1 of 3: Front view…"));
  announce(t("Generating three scene images and the detail image. Please wait."));

  const delay = reducedMotion.matches ? 120 : 360;
  await new Promise((resolve) => window.setTimeout(resolve, delay));

  if ($("#simulate-failure").checked) {
    $("#simulate-failure").checked = false;
    setGenerating(false);
    setPreviewMessage("error", t("Image generation failed: the demo service is temporarily unavailable. Your content was preserved; select the main button to retry."));
    showToast(t("Image generation failed. Your content was preserved; use the main button to retry."), "error");
    announce(t("Image generation failed. Your content was preserved and you can retry."));
    return;
  }

  try {
    if (!window.AICImageStudio?.generateSceneViews || !window.AICImageStudio?.generateDetailLongImage) {
      throw new Error("Image rendering module failed to load");
    }

    const views = await window.AICImageStudio.generateSceneViews({
      sourceUrl: appState.imageUrls[0],
      scene: data.sceneLabel,
      productName: data.productName,
      category: data.category,
    });
    if (!Array.isArray(views) || views.length !== 3) {
      throw new Error("Expected 3 generated views");
    }

    appState.generatedViews = views;
    renderAngleGallery(views);
    setPreviewMessage("loading", t("All three scene images are ready. Building the detail image…"));

    const detailImage = await window.AICImageStudio.generateDetailLongImage({ data, views });
    appState.detailImage = detailImage;
    showDetailImage(detailImage);

    const generatedAt = new Date().toISOString();
    appState.generated = {
      ...data,
      detailCopy: buildDetailCopy(data),
      detailImageFileName: detailImage.fileName,
      generatedAt,
      projectId: PROJECT.id,
      viewFileNames: views.map((view) => view.fileName),
    };

    safelyWrite(STORAGE_KEYS.generated, appState.generated);
    saveDraft({ quiet: true });
    addOrUpdateTask(data);
    syncMetrics();
    copyButton.disabled = false;
    exportButton.disabled = false;
    $$(".stepper li").forEach((step) => step.classList.add("completed"));
    setGenerating(false);

    const scheduleMessage = data.autoPublish
      ? t("Three scene images and the detail image are ready. Publishing is scheduled for {{date}} at {{time}}.", {
          date: formatScheduleDate(data.startDate),
          time: data.publishTime,
        })
      : t("Three scene images and the detail image are ready and saved for manual review.");
    setPreviewMessage("success", scheduleMessage);
    showToast(scheduleMessage, "success");
    announce(scheduleMessage);
  } catch (error) {
    setGenerating(false);
    copyButton.disabled = true;
    exportButton.disabled = true;
    const detail = error instanceof Error ? t(error.message) : t("Unknown error");
    setPreviewMessage("error", t("Image generation failed: {{detail}}. Your content was preserved; please retry.", { detail }));
    showToast(t("Image generation failed. Your source content and completed views were preserved."), "error");
    announce(t("Image generation failed. You can retry."));
  }
}

async function copyGeneratedContent() {
  if (!appState.generated || appState.assetsStale) {
    showToast(t("Generate the latest detail image before copying the description."), "error");
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(appState.generated.detailCopy);
    } else {
      const fallback = document.createElement("textarea");
      fallback.value = appState.generated.detailCopy;
      fallback.setAttribute("readonly", "");
      fallback.className = "clipboard-fallback";
      document.body.append(fallback);
      fallback.select();
      const copied = document.execCommand("copy");
      fallback.remove();
      if (!copied) throw new Error("Copy command failed");
    }
    showToast(t("Product description copied. It is ready to paste into your publishing dashboard."), "success");
    announce(t("Product description copied."));
  } catch {
    showToast(t("Copy failed. Select and copy the description manually from the preview."), "error");
    announce(t("Product description could not be copied."));
  }
}

function downloadGeneratedPackage() {
  if (!appState.generated || !appState.detailImage || appState.assetsStale) {
    showToast(t("Generate the latest detail image before downloading the PNG."), "error");
    return;
  }

  try {
    triggerAssetDownload(
      appState.detailImage,
      `${PROJECT.id}-${safeDownloadName(appState.generated.productName)}-detail.png`,
    );
    showToast(t("Detail-page PNG downloaded. It is ready for your Alibaba.com product page."), "success");
    announce(t("Detail-page PNG downloaded."));
  } catch {
    showToast(t("Export failed. Allow downloads in your browser and try again."), "error");
    announce(t("Detail image download failed."));
  }
}

function applyPriceAdjustment() {
  const percentInput = $("#price-adjust-percent");
  const feedback = $("#price-adjust-feedback");
  const percent = Number(percentInput.value);
  const minPriceInput = $("#min-price");
  const maxPriceInput = $("#max-price");
  const minPrice = Number(minPriceInput.value);
  const maxPrice = Number(maxPriceInput.value);

  feedback.className = "inline-feedback";
  if (!Number.isFinite(percent) || percent < -50 || percent > 100 || percent === 0) {
    percentInput.setAttribute("aria-invalid", "true");
    feedback.classList.add("is-error");
    feedback.textContent = t("Enter a non-zero adjustment from -50% to 100%.");
    percentInput.focus();
    return;
  }
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || minPrice <= 0 || maxPrice < minPrice) {
    feedback.classList.add("is-error");
    feedback.textContent = t("Enter a valid current price range first.");
    minPriceInput.focus();
    return;
  }

  const nextMin = Math.min(999999.99, Math.max(0.01, minPrice * (1 + percent / 100)));
  const nextMax = Math.min(999999.99, Math.max(nextMin, maxPrice * (1 + percent / 100)));
  minPriceInput.value = nextMin.toFixed(2);
  maxPriceInput.value = nextMax.toFixed(2);
  percentInput.removeAttribute("aria-invalid");
  feedback.classList.add("is-success");
  feedback.textContent = t("Adjusted from US${{oldMin}}–{{oldMax}} to US${{newMin}}–{{newMax}}.", {
    oldMin: money(minPrice),
    oldMax: money(maxPrice),
    newMin: money(nextMin),
    newMax: money(nextMax),
  });
  invalidateGeneratedAssets(t("Price updated. Regenerate the three views and detail image."));
  updatePreview();
  showToast(t("Price {{direction}} by {{percent}}%. You can still edit it before generating.", {
    direction: t(percent > 0 ? "increased" : "decreased"),
    percent: Math.abs(percent),
  }), "success");
  announce(t("Price updated successfully."));
}

function restoreGenerated() {
  const generated = safelyRead(STORAGE_KEYS.generated, null);
  if (!generated?.detailCopy) return;
  appState.generated = null;
  appState.generatedViews = [];
  appState.detailImage = null;
  appState.assetsStale = false;
  copyButton.disabled = true;
  exportButton.disabled = true;
  setGenerating(false);
  setPreviewMessage("loading", t("Your previous content was restored. Images are not stored in the browser; select the source image again and regenerate."));
}

async function initializeDemoPreview() {
  const demoViews = localizedDemoViews();
  renderAngleGallery(demoViews, { demo: true });
  if (!window.AICImageStudio?.generateDetailLongImage) {
    showDetailPlaceholder(t("Demo detail image unavailable"), t("You can still complete the product details after uploading a source image"));
    return;
  }

  const formData = readProductData();
  const demoData = {
    ...formData,
    category: "Knee Support",
    categoryLabel: t("Knee Support"),
    productName: "Adjustable Hinged Knee Brace for Sports Recovery",
    scene: "rehabilitation",
    sceneLabel: t(SCENE_LABELS.rehabilitation),
    sellingPoints: [
      "Dual aluminum hinges deliver stable medial and lateral support",
      "Breathable mesh improves comfort for extended wear",
      "Logo, color, size and packaging are available for OEM orders",
    ],
  };

  try {
    const demoDetail = await window.AICImageStudio.generateDetailLongImage({
      data: demoData,
      views: demoViews,
    });
    if (appState.images.length || appState.isGenerating) return;
    showDetailImage(demoDetail, { demo: true });
  } catch {
    if (!appState.images.length) {
      showDetailPlaceholder(t("Demo detail image unavailable"), t("Upload a source image, then select Generate to try again"));
    }
  }
}

function initialize() {
  const startDate = $("#start-date");
  startDate.min = todayAsInputValue();
  if (!startDate.value) startDate.value = tomorrowAsInputValue();

  const restoredDraft = restoreDraft();
  appState.customTasks = safelyRead(STORAGE_KEYS.tasks, []);
  if (!Array.isArray(appState.customTasks)) appState.customTasks = [];
  renderCustomTasks();
  syncMetrics();
  restoreGenerated();
  renderImages();
  updatePreview();
  initializeDemoPreview();

  if (restoredDraft) {
    announce(t("Your saved product draft was restored."));
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (appState.isGenerating) return;
  const data = validateForm();
  if (data) await generateDetail(data);
});

form.addEventListener("input", (event) => {
  if (event.target.matches("input, select, textarea")) {
    event.target.removeAttribute("aria-invalid");
    const describedBy = event.target.getAttribute("aria-describedby") || "";
    describedBy.split(/\s+/).forEach((id) => {
      const element = document.getElementById(id);
      if (element?.classList.contains("field-error")) element.textContent = "";
    });
    if (!appState.isGenerating) {
      invalidateGeneratedAssets(t("Product content changed. Regenerate the three views and detail image."));
    }
    updatePreview();
  }
});

imageInput.addEventListener("change", async () => {
  await processImages([...imageInput.files]);
  imageInput.value = "";
});

imageList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-image-index]");
  if (!removeButton) return;
  const index = Number(removeButton.dataset.imageIndex);
  const removed = appState.images[index];
  appState.images.splice(index, 1);
  renderImages();
  updatePreview();
  invalidateGeneratedAssets(t("Source image removed. Upload an image before generating again."), { clearPreview: true });
  void initializeDemoPreview();
  showToast(t("{{name}} was removed from the image list.", { name: removed.name }), "info");
});

["dragenter", "dragover"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.remove("is-dragging");
  });
});

uploadZone.addEventListener("drop", (event) => {
  void processImages([...event.dataTransfer.files]);
});

saveDraftButton.addEventListener("click", () => saveDraft());
copyButton.addEventListener("click", copyGeneratedContent);
exportButton.addEventListener("click", downloadGeneratedPackage);
angleGallery.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view-id]");
  if (!button) return;
  const view = appState.generatedViews.find((item) => item.id === button.dataset.viewId);
  if (!view) {
    showToast(t("This view needs to be regenerated."), "error");
    return;
  }
  triggerAssetDownload(view, `${safeDownloadName(readProductData().productName)}-${view.id}.png`);
  showToast(t("{{label}} downloaded.", { label: view.label }), "success");
  announce(t("{{label}} downloaded.", { label: view.label }));
});
$("#apply-price-adjustment").addEventListener("click", applyPriceAdjustment);

$$(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".filter-button").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    applyTaskFilter(button.dataset.filter);
  });
});

taskTableBody.addEventListener("click", (event) => {
  const action = event.target.closest("[data-task-action]");
  if (!action) return;
  const row = action.closest("tr");
  const name = $("td strong", row)?.textContent || t("This product");

  if (action.dataset.taskAction === "retry") {
    $("#product-name").value = name;
    $("#min-price").focus({ preventScroll: true });
    $("#min-price").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
    updatePreview();
    showToast(t("Product loaded. Review the pricing, then regenerate."), "info");
    announce(t("Product requiring attention loaded."));
  } else {
    $(".preview-card")?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
    showToast(t("The detail preview for {{name}} is in the Create Task section.", { name }), "info");
  }
});

window.addEventListener("aic:languagechange", (event) => {
  clearValidation();
  $("#price-adjust-feedback").textContent = "";
  renderCustomTasks();
  renderImages();
  updatePreview();
  setGenerating(appState.isGenerating);

  if (!appState.images.length && appState.restoredImageNames.length) {
    imageError.textContent = t("This draft references {{count}} image(s) ({{names}}). For browser security, please select the file again.", {
      count: appState.restoredImageNames.length,
      names: appState.restoredImageNames.join(", "),
    });
  }

  if (appState.generated || appState.detailImage || appState.generatedViews.length) {
    invalidateGeneratedAssets(t("Interface language changed. Regenerate the three views and detail image."));
    renderOutputPlaceholders();
  } else if (!appState.images.length) {
    if (!previewState.hidden) {
      setPreviewMessage("loading", t("Your previous content was restored. Images are not stored in the browser; select the source image again and regenerate."));
    }
    void initializeDemoPreview();
  } else {
    renderOutputPlaceholders();
  }

  if (event.detail?.announce !== false) {
    announce(t("Interface language changed to {{language}}.", { language: event.detail?.label || "" }));
  }
});

window.addEventListener("beforeunload", revokeImageUrls);

initialize();
