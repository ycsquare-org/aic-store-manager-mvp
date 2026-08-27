"use strict";

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

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
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const SCENE_LABELS = {
  auto: "Smart scene match",
  rehabilitation: "Rehabilitation clinic",
  training: "Sports training studio",
  outdoor: "Outdoor sports setting",
  studio: "Clean studio",
};
const DEMO_VIEWS = [
  { id: "front", label: "Front view", dataUrl: "./demo/knee-brace-front.png" },
  { id: "three-quarter", label: "45° feature view", dataUrl: "./demo/knee-brace-45.png" },
  { id: "side", label: "Side profile", dataUrl: "./demo/knee-brace-side.png" },
];

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
    showToast("Local storage is unavailable, but your content will remain on this page for now.", "error");
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
    generateButton.append(spinner, document.createTextNode("Generating scene images and detail page…"));
  } else {
    generateButton.replaceChildren();
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✦";
    const label = appState.generated
      ? "Regenerate 3 scene images and detail page"
      : "Generate 3 scene images and detail page";
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
    sceneLabel: SCENE_LABELS[$("#scene-preset").value] || SCENE_LABELS.auto,
    sellingPoints,
    sellingPointsRaw: $("#selling-points").value.trim(),
    startDate: $("#start-date").value,
    targetMarket: $("#target-market").value,
  };
}

function money(value) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    : "—";
}

function integer(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat("en-US").format(value) : "—";
}

function formatScheduleDate(value) {
  if (!value) return "No date set";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "No date set";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(parsed);
}

function updateRuleSummary() {
  const enabled = $("#auto-publish").checked;
  const dailyLimit = $("#daily-limit").value || "—";
  const time = $("#publish-time").value || "—";
  const date = formatScheduleDate($("#start-date").value);
  const summary = enabled
    ? `Starting ${date}, publish ${dailyLimit} products daily at ${time}`
    : "Auto-publishing is off. Generated tasks will be saved for review.";
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
    output.textContent = "Enter a valid percentage from -50% to 100%.";
    return;
  }

  const factor = 1 + percent / 100;
  output.textContent = `Preview: US$${money(minPrice * factor)}–${money(maxPrice * factor)} (${percent > 0 ? "+" : ""}${percent}%)`;
}

function updatePreview() {
  const data = readProductData();
  $("#preview-scene-label").textContent = data.sceneLabel;
  $("#detail-accessible-copy").textContent = [
    data.productName || "Adjustable Hinged Knee Brace for Sports Recovery",
    `Price: US$${money(data.minPrice)}–${money(data.maxPrice)}. MOQ: ${integer(data.moq)} pieces.`,
    `${data.sceneLabel} product images: front, 45°, and side views.`,
    data.sellingPoints.length ? `Key selling points: ${data.sellingPoints.join("; ")}.` : "Add key selling points.",
    `OEM: ${data.customization || "Logo, color, size, and packaging"}; sample lead time: ${integer(data.sampleDays)} days; monthly capacity: ${integer(data.monthlyCapacity)} pieces.`,
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
    empty.replaceChildren(number, document.createTextNode("The source image preserves product appearance and structure"));
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
    image.alt = `${file.name}, source product image awaiting three-view scene generation`;

    const caption = document.createElement("figcaption");
    caption.textContent = "Source image";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "image-remove";
    remove.dataset.imageIndex = String(index);
    remove.setAttribute("aria-label", `Remove image ${file.name}`);
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
    showToast("This image has not been generated yet.", "error");
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
  angleResultBadge.textContent = demo ? "Demo" : "Generated 3/3";
  angleResultBadge.classList.toggle("is-generated", !demo);

  views.forEach((view) => {
    const figure = document.createElement("figure");
    figure.className = "angle-card";

    const image = document.createElement("img");
    image.src = view.dataUrl;
    image.alt = `${readProductData().productName || "Knee brace"}, ${view.label}, ${readProductData().sceneLabel}`;

    const caption = document.createElement("figcaption");
    const label = document.createElement("span");
    label.textContent = view.label;
    caption.append(label);

    if (!demo) {
      const download = document.createElement("button");
      download.type = "button";
      download.className = "angle-download";
      download.dataset.viewId = view.id;
      download.setAttribute("aria-label", `Download ${view.label} image`);
      download.title = `Download ${view.label}`;
      download.textContent = "↓";
      caption.append(download);
    }

    figure.append(image, caption);
    angleGallery.append(figure);
  });
}

function renderOutputPlaceholders() {
  const labels = ["Front view", "45° feature view", "Side profile"];
  angleGallery.replaceChildren();
  angleResultBadge.textContent = "Not generated";
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
    ? "Demo knee brace detail image with three views, pricing, selling points, and OEM capabilities"
    : `${readProductData().productName} detail image with three views, pricing, selling points, and OEM capabilities`;
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
  previewSurface.classList.toggle("is-stale", appState.assetsStale && !clearPreview);

  if (clearPreview) {
    appState.assetsStale = false;
    previewSurface.classList.remove("is-stale");
    showDetailPlaceholder("Awaiting detail image", "Submit to generate a downloadable PNG detail image");
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
    rejected.push(`Only 1 source image is needed. Additional images not added: ${files.length - MAX_IMAGE_COUNT}`);
  }

  candidates.forEach((file) => {
    if (!IMAGE_TYPES.has(file.type)) {
      rejected.push(`${file.name}: JPG, PNG, or WebP only`);
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      rejected.push(`${file.name}: exceeds 10 MB`);
      return;
    }
    const existing = appState.images[0];
    const duplicate = existing && existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified;
    if (duplicate) {
      rejected.push(`${file.name}: matches the current source image`);
    }
  });

  const validCandidates = candidates.filter((file) =>
    IMAGE_TYPES.has(file.type) &&
    file.size <= MAX_IMAGE_SIZE &&
    !rejected.some((message) => message.startsWith(`${file.name}:`)),
  );
  const decodeResults = await Promise.all(validCandidates.map(canDecodeImage));
  const accepted = validCandidates.filter((file, index) => {
    if (decodeResults[index]) return true;
    rejected.push(`${file.name}: unreadable or damaged image`);
    return false;
  });

  if (accepted.length) {
    const replaced = appState.images.length > 0;
    appState.images = [accepted[0]];
    renderImages();
    updatePreview();
    invalidateGeneratedAssets("The source image has changed. Regenerate the three views and detail image.", { clearPreview: true });
    imageInput.removeAttribute("aria-invalid");
    showToast(replaced ? "Source image replaced. Regenerate the images." : "Source image added. You can now generate three views.", "success");
  }
  imageError.textContent = rejected.join("; ");

  if (rejected.length) {
    showToast(`${rejected.length} image issue(s) found. Check the upload area for details.`, "error");
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
    markInvalid(imageInput, imageError, "Upload at least 1 product image.", errors);
  }

  const productName = $("#product-name");
  if (!data.productName) {
    markInvalid(productName, $("#product-name-error"), "Enter an English product name.", errors);
  } else if (data.productName.length < 8) {
    markInvalid(productName, $("#product-name-error"), "Product name must be at least 8 characters.", errors);
  } else if (data.productName.length > 120) {
    markInvalid(productName, $("#product-name-error"), "Product name must be no more than 120 characters.", errors);
  }

  const category = $("#category");
  if (!data.category) {
    markInvalid(category, $("#category-error"), "Select a product category.", errors);
  }

  const keywords = $("#keywords");
  if (!data.keywords.length) {
    markInvalid(keywords, $("#keywords-error"), "Enter at least 1 English search keyword.", errors);
  } else if (data.keywords.length > 5) {
    markInvalid(keywords, $("#keywords-error"), "Enter no more than 5 keywords.", errors);
  }

  const sellingPoints = $("#selling-points");
  if (!data.sellingPointsRaw) {
    markInvalid(sellingPoints, $("#selling-points-error"), "Enter at least 2 verifiable selling points.", errors);
  } else if (data.sellingPoints.length < 2) {
    markInvalid(sellingPoints, $("#selling-points-error"), "Separate at least 2 selling points with semicolons.", errors);
  }

  const sampleDays = $("#sample-days");
  const monthlyCapacity = $("#monthly-capacity");
  const oemNumberError = $("#oem-number-error");
  if (!Number.isInteger(data.sampleDays) || data.sampleDays < 1 || data.sampleDays > 60) {
    markInvalid(sampleDays, oemNumberError, "Sample lead time must be an integer from 1 to 60 days.", errors);
  } else if (!Number.isInteger(data.monthlyCapacity) || data.monthlyCapacity < 1 || data.monthlyCapacity > 9999999) {
    markInvalid(monthlyCapacity, oemNumberError, "Monthly capacity must be an integer from 1 to 9,999,999.", errors);
  }

  const moq = $("#moq");
  const leadTime = $("#lead-time");
  const tradeNumberError = $("#trade-number-error");
  if (!Number.isInteger(data.moq) || data.moq < 1 || data.moq > 999999) {
    markInvalid(moq, tradeNumberError, "MOQ must be an integer from 1 to 999,999.", errors);
  } else if (!Number.isInteger(data.leadTime) || data.leadTime < 1 || data.leadTime > 365) {
    markInvalid(leadTime, tradeNumberError, "Lead time must be an integer from 1 to 365 days.", errors);
  }

  const minPrice = $("#min-price");
  const maxPrice = $("#max-price");
  const priceError = $("#price-error");
  if (!Number.isFinite(data.minPrice) || data.minPrice < 0.01 || data.minPrice > 999999.99) {
    markInvalid(minPrice, priceError, "Minimum price must be between 0.01 and 999,999.99.", errors);
  } else if (!Number.isFinite(data.maxPrice) || data.maxPrice < 0.01 || data.maxPrice > 999999.99) {
    markInvalid(maxPrice, priceError, "Maximum price must be between 0.01 and 999,999.99.", errors);
  } else if (!hasAtMostTwoDecimals(data.minPrice) || !hasAtMostTwoDecimals(data.maxPrice)) {
    minPrice.setAttribute("aria-invalid", "true");
    maxPrice.setAttribute("aria-invalid", "true");
    priceError.textContent = "Prices can have no more than 2 decimal places.";
    errors.push(minPrice);
  } else if (data.maxPrice < data.minPrice) {
    minPrice.setAttribute("aria-invalid", "true");
    maxPrice.setAttribute("aria-invalid", "true");
    priceError.textContent = "Maximum price cannot be lower than minimum price.";
    errors.push(maxPrice);
  }

  if (data.autoPublish) {
    const dailyLimit = $("#daily-limit");
    const publishTime = $("#publish-time");
    const startDate = $("#start-date");
    if (!Number.isInteger(data.dailyLimit) || data.dailyLimit < 1 || data.dailyLimit > 20) {
      dailyLimit.setAttribute("aria-invalid", "true");
      $("#schedule-error").textContent = "Daily publishing limit must be an integer from 1 to 20.";
      errors.push(dailyLimit);
    } else if (!data.publishTime) {
      publishTime.setAttribute("aria-invalid", "true");
      $("#schedule-error").textContent = "Choose a daily publishing time.";
      errors.push(publishTime);
    } else if (!data.startDate) {
      startDate.setAttribute("aria-invalid", "true");
      $("#schedule-error").textContent = "Choose an auto-publishing start date.";
      errors.push(startDate);
    } else if (data.startDate < todayAsInputValue()) {
      startDate.setAttribute("aria-invalid", "true");
      $("#schedule-error").textContent = "Start date cannot be earlier than today.";
      errors.push(startDate);
    }
  }

  if (errors.length) {
    const firstError = errors[0];
    firstError.focus({ preventScroll: true });
    firstError.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
    const message = `Complete ${new Set(errors).size} required field(s) before generating.`;
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
    ? `${formatScheduleDate(data.startDate)} at ${data.publishTime}, ${data.dailyLimit} products per day`
    : "Auto-publishing is off; awaiting manual review";

  return [
    data.productName,
    "",
    `Category: ${data.category}`,
    `Price: US$${money(data.minPrice)}–${money(data.maxPrice)}`,
    `MOQ: ${integer(data.moq)} pieces`,
    `Lead time: ${integer(data.leadTime)} days`,
    `Product images: 3 views · ${data.sceneLabel}`,
    "",
    "KEY BUYING POINTS",
    points,
    "",
    "OEM / ODM CAPABILITY",
    `Customization: ${data.customization || "Logo, color, size and packaging"}`,
    `Sample lead time: ${integer(data.sampleDays)} days`,
    `Monthly capacity: ${integer(data.monthlyCapacity)} pieces`,
    `Quality certifications: ${data.certifications || "Available on request"}`,
    `Main market: ${data.targetMarket}`,
    "",
    `Publishing plan: ${schedule}`,
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
      ? "Draft saved. You will need to select the local image again after refreshing."
      : "Draft saved in this browser.";
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
    imageError.textContent = `This draft references ${draft.imageNames.length} image(s) (${draft.imageNames.join(", ")}). For browser security, please select the file again.`;
  }
  return true;
}

function createTaskRow(task) {
  const row = document.createElement("tr");
  row.dataset.status = task.status;
  row.dataset.taskId = task.id;

  const productCell = document.createElement("td");
  productCell.dataset.label = "Product";
  const name = document.createElement("strong");
  name.textContent = task.name;
  const category = document.createElement("small");
  category.textContent = task.category;
  productCell.append(name, category);

  const timeCell = document.createElement("td");
  timeCell.dataset.label = "Scheduled time";
  timeCell.textContent = task.time;

  const priceCell = document.createElement("td");
  priceCell.dataset.label = "Price";
  priceCell.textContent = task.price;

  const completenessCell = document.createElement("td");
  completenessCell.dataset.label = "Content completeness";
  const progress = document.createElement("div");
  progress.className = "progress";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", "Content completeness");
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
  statusCell.dataset.label = "Status";
  const status = document.createElement("span");
  status.className = `state-badge state-${task.status}`;
  status.textContent = task.status === "published"
    ? "Published"
    : task.status === "failed"
      ? "Needs attention"
      : task.status === "draft"
        ? "Awaiting review"
        : "Scheduled";
  statusCell.append(status);

  const actionCell = document.createElement("td");
  const action = document.createElement("button");
  action.type = "button";
  action.className = "text-button";
  action.dataset.taskAction = task.status === "failed" ? "retry" : "view";
  action.textContent = task.status === "failed" ? "Fix" : "View";
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
    category: data.categoryLabel || data.category,
    completeness: 100,
    id,
    name: data.productName,
    price: `US$${money(data.minPrice)}–${money(data.maxPrice)}`,
    status: data.autoPublish ? "scheduled" : "draft",
    time: data.autoPublish ? `${formatScheduleDate(data.startDate)} ${data.publishTime}` : "Awaiting manual review",
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
  showDetailPlaceholder("Generating detail image", "Creating three scene images, then arranging pricing, selling points, and OEM capabilities");
  setPreviewMessage("loading", "Generating image 1 of 3: Front view…");
  announce("Generating three scene images and the detail image. Please wait.");

  const delay = reducedMotion.matches ? 120 : 360;
  await new Promise((resolve) => window.setTimeout(resolve, delay));

  if ($("#simulate-failure").checked) {
    $("#simulate-failure").checked = false;
    setGenerating(false);
    setPreviewMessage("error", "Image generation failed: the demo service is temporarily unavailable. Your content was preserved; select the main button to retry.");
    showToast("Image generation failed. Your content was preserved; use the main button to retry.", "error");
    announce("Image generation failed. Your content was preserved and you can retry.");
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
    setPreviewMessage("loading", "All three scene images are ready. Building the detail image…");

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
      ? `Three scene images and the detail image are ready. Publishing is scheduled for ${formatScheduleDate(data.startDate)} at ${data.publishTime}.`
      : "Three scene images and the detail image are ready and saved for manual review.";
    setPreviewMessage("success", scheduleMessage);
    showToast(scheduleMessage, "success");
    announce(scheduleMessage);
  } catch (error) {
    setGenerating(false);
    copyButton.disabled = true;
    exportButton.disabled = true;
    const detail = error instanceof Error ? error.message : "Unknown error";
    setPreviewMessage("error", `Image generation failed: ${detail}. Your content was preserved; please retry.`);
    showToast("Image generation failed. Your source content and completed views were preserved.", "error");
    announce("Image generation failed. You can retry.");
  }
}

async function copyGeneratedContent() {
  if (!appState.generated || appState.assetsStale) {
    showToast("Generate the latest detail image before copying the description.", "error");
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
    showToast("Product description copied. It is ready to paste into your publishing dashboard.", "success");
    announce("Product description copied.");
  } catch {
    showToast("Copy failed. Select and copy the description manually from the preview.", "error");
    announce("Product description could not be copied.");
  }
}

function downloadGeneratedPackage() {
  if (!appState.generated || !appState.detailImage || appState.assetsStale) {
    showToast("Generate the latest detail image before downloading the PNG.", "error");
    return;
  }

  try {
    triggerAssetDownload(
      appState.detailImage,
      `${PROJECT.id}-${safeDownloadName(appState.generated.productName)}-detail.png`,
    );
    showToast("Detail-page PNG downloaded. It is ready for your Alibaba.com product page.", "success");
    announce("Detail-page PNG downloaded.");
  } catch {
    showToast("Export failed. Allow downloads in your browser and try again.", "error");
    announce("Detail image download failed.");
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
    feedback.textContent = "Enter a non-zero adjustment from -50% to 100%.";
    percentInput.focus();
    return;
  }
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || minPrice <= 0 || maxPrice < minPrice) {
    feedback.classList.add("is-error");
    feedback.textContent = "Enter a valid current price range first.";
    minPriceInput.focus();
    return;
  }

  const nextMin = Math.min(999999.99, Math.max(0.01, minPrice * (1 + percent / 100)));
  const nextMax = Math.min(999999.99, Math.max(nextMin, maxPrice * (1 + percent / 100)));
  minPriceInput.value = nextMin.toFixed(2);
  maxPriceInput.value = nextMax.toFixed(2);
  percentInput.removeAttribute("aria-invalid");
  feedback.classList.add("is-success");
  feedback.textContent = `Adjusted from US$${money(minPrice)}–${money(maxPrice)} to US$${money(nextMin)}–${money(nextMax)}.`;
  invalidateGeneratedAssets("Price updated. Regenerate the three views and detail image.");
  updatePreview();
  showToast(`Price ${percent > 0 ? "increased" : "decreased"} by ${Math.abs(percent)}%. You can still edit it before generating.`, "success");
  announce("Price updated successfully.");
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
  setPreviewMessage("loading", "Your previous content was restored. Images are not stored in the browser; select the source image again and regenerate.");
}

async function initializeDemoPreview() {
  renderAngleGallery(DEMO_VIEWS, { demo: true });
  if (!window.AICImageStudio?.generateDetailLongImage) {
    showDetailPlaceholder("Demo detail image unavailable", "You can still complete the product details after uploading a source image");
    return;
  }

  const formData = readProductData();
  const demoData = {
    ...formData,
    category: "Knee Support",
    categoryLabel: "Knee Support",
    productName: "Adjustable Hinged Knee Brace for Sports Recovery",
    scene: "rehabilitation",
    sceneLabel: SCENE_LABELS.rehabilitation,
    sellingPoints: [
      "Dual aluminum hinges deliver stable medial and lateral support",
      "Breathable mesh improves comfort for extended wear",
      "Logo, color, size and packaging are available for OEM orders",
    ],
  };

  try {
    const demoDetail = await window.AICImageStudio.generateDetailLongImage({
      data: demoData,
      views: DEMO_VIEWS,
    });
    if (appState.images.length || appState.isGenerating) return;
    showDetailImage(demoDetail, { demo: true });
  } catch {
    if (!appState.images.length) {
      showDetailPlaceholder("Demo detail image unavailable", "Upload a source image, then select Generate to try again");
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
    announce("Your saved product draft was restored.");
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
      invalidateGeneratedAssets("Product content changed. Regenerate the three views and detail image.");
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
  invalidateGeneratedAssets("Source image removed. Upload an image before generating again.", { clearPreview: true });
  void initializeDemoPreview();
  showToast(`${removed.name} was removed from the image list.`, "info");
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
    showToast("This view needs to be regenerated.", "error");
    return;
  }
  triggerAssetDownload(view, `${safeDownloadName(readProductData().productName)}-${view.id}.png`);
  showToast(`${view.label} downloaded.`, "success");
  announce(`${view.label} downloaded.`);
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
  const name = $("td strong", row)?.textContent || "This product";

  if (action.dataset.taskAction === "retry") {
    $("#product-name").value = name;
    $("#min-price").focus({ preventScroll: true });
    $("#min-price").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
    updatePreview();
    showToast("Product loaded. Review the pricing, then regenerate.", "info");
    announce("Product requiring attention loaded.");
  } else {
    $(".preview-card")?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
    showToast(`The detail preview for ${name} is in the Create Task section.`, "info");
  }
});

window.addEventListener("beforeunload", revokeImageUrls);

initialize();
