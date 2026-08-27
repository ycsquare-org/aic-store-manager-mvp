(function createAICImageStudio(global) {
  "use strict";

  const OUTPUT_SIZE = 1000;
  const DETAIL_WIDTH = 900;
  const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
  const VIEW_DEFINITIONS = Object.freeze([
    { id: "front", label: "Front View", fileSuffix: "front" },
    { id: "angle", label: "45° Feature View", fileSuffix: "45-angle" },
    { id: "side", label: "Side Structure View", fileSuffix: "side" },
  ]);

  // Important: a single uploaded photo cannot reveal unseen product surfaces. True novel
  // front/45°/side viewpoints require a server-side image-generation model. This local,
  // browser-only renderer creates honest scene-composition previews from the supplied photo.

  function assertCanvasSupport() {
    if (!global.document?.createElement) {
      throw new Error("AIC Image Studio requires a browser with Canvas support.");
    }
    const canvas = global.document.createElement("canvas");
    if (!canvas.getContext?.("2d")) {
      throw new Error("Your browser does not support Canvas 2D, so images cannot be generated.");
    }
  }

  function createCanvas(width, height) {
    const canvas = global.document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeText(value, fallback = "") {
    const text = String(value ?? "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();
    return text || fallback;
  }

  function safeFileBase(value) {
    const source = normalizeText(value, "product").toLowerCase();
    let safe = source;
    try {
      safe = source.replace(new RegExp("[^\\p{L}\\p{N}]+", "gu"), "-");
    } catch {
      safe = source.replace(/[^a-z0-9\u3400-\u9fff]+/g, "-");
    }
    return safe.replace(/^-+|-+$/g, "").slice(0, 54) || "product";
  }

  function setFont(ctx, size, weight = 400) {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  }

  function roundedRectPath(ctx, x, y, width, height, radius) {
    const r = clamp(Number(radius) || 0, 0, Math.min(width, height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function fillRoundedRect(ctx, x, y, width, height, radius, fill) {
    roundedRectPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function strokeRoundedRect(ctx, x, y, width, height, radius, stroke, lineWidth = 1) {
    roundedRectPath(ctx, x, y, width, height, radius);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function isCjk(character) {
    const code = character.codePointAt(0);
    return (
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    );
  }

  function tokenizeText(text) {
    const tokens = [];
    let buffer = "";
    const flush = () => {
      if (buffer) tokens.push(buffer);
      buffer = "";
    };

    for (const character of Array.from(String(text))) {
      if (character === "\n") {
        flush();
        tokens.push("\n");
      } else if (/\s/.test(character)) {
        flush();
        tokens.push(" ");
      } else if (isCjk(character)) {
        flush();
        tokens.push(character);
      } else {
        buffer += character;
      }
    }
    flush();
    return tokens;
  }

  function splitOversizeToken(ctx, token, maxWidth) {
    const chunks = [];
    let chunk = "";
    for (const character of Array.from(token)) {
      const next = chunk + character;
      if (chunk && ctx.measureText(next).width > maxWidth) {
        chunks.push(chunk);
        chunk = character;
      } else {
        chunk = next;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  }

  function ellipsize(ctx, line, maxWidth) {
    const suffix = "…";
    let result = line.trimEnd();
    while (result && ctx.measureText(result + suffix).width > maxWidth) {
      result = Array.from(result).slice(0, -1).join("");
    }
    return `${result}${suffix}`;
  }

  function wrapText(ctx, value, maxWidth, maxLines = Infinity) {
    const text = normalizeText(value);
    if (!text) return [];
    const tokens = tokenizeText(text);
    const lines = [];
    let line = "";
    let truncated = false;

    const pushLine = () => {
      if (line.trim()) lines.push(line.trim());
      line = "";
    };

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token === "\n") {
        pushLine();
        if (lines.length >= maxLines) {
          truncated = index < tokens.length - 1;
          break;
        }
        continue;
      }
      if (token === " " && !line) continue;

      let parts = [token];
      if (token !== " " && ctx.measureText(token).width > maxWidth) {
        parts = splitOversizeToken(ctx, token, maxWidth);
      }

      for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
        const part = parts[partIndex];
        const candidate = line + part;
        if (!line || ctx.measureText(candidate).width <= maxWidth) {
          line = candidate;
        } else {
          pushLine();
          if (lines.length >= maxLines) {
            truncated = true;
            break;
          }
          line = part === " " ? "" : part;
        }
      }
      if (truncated) break;
    }

    if (!truncated && line.trim() && lines.length < maxLines) pushLine();
    if ((truncated || line.trim()) && lines.length === maxLines && lines.length) {
      lines[lines.length - 1] = ellipsize(ctx, lines[lines.length - 1], maxWidth);
    }
    return lines;
  }

  function drawTextLines(ctx, lines, x, y, lineHeight, color, align = "left") {
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
    ctx.textAlign = "left";
    return lines.length * lineHeight;
  }

  function drawWrappedText(ctx, value, x, y, maxWidth, lineHeight, color, maxLines = Infinity) {
    const lines = wrapText(ctx, value, maxWidth, maxLines);
    return drawTextLines(ctx, lines, x, y, lineHeight, color);
  }

  function drawImageCover(ctx, image, x, y, width, height) {
    const sourceWidth = image.naturalWidth || image.videoWidth || image.width;
    const sourceHeight = image.naturalHeight || image.videoHeight || image.height;
    if (!sourceWidth || !sourceHeight) return;
    const scale = Math.max(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawRoundedImage(ctx, image, x, y, width, height, radius) {
    ctx.save();
    roundedRectPath(ctx, x, y, width, height, radius);
    ctx.clip();
    drawImageCover(ctx, image, x, y, width, height);
    ctx.restore();
  }

  function dataUrlToBlob(dataUrl) {
    const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/i.exec(dataUrl);
    if (!match) throw new Error("The generated image data is invalid.");
    const mimeType = match[1] || "image/png";
    const payload = match[3];
    const binary = match[2] ? global.atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType });
  }

  async function canvasToPng(canvas) {
    let dataUrl;
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch (error) {
      throw new Error(`Image export failed: ${error?.message || "please use a locally uploaded image"}`);
    }

    const blob = await new Promise((resolve) => {
      if (typeof canvas.toBlob !== "function") {
        resolve(null);
        return;
      }
      canvas.toBlob(resolve, "image/png");
    });

    return { dataUrl, blob: blob || dataUrlToBlob(dataUrl) };
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      if (!source) {
        reject(new Error("Please upload a product image first."));
        return;
      }

      if (global.HTMLImageElement && source instanceof global.HTMLImageElement) {
        if (source.complete && source.naturalWidth > 0) {
          resolve({ image: source, cleanup() {} });
          return;
        }
      }

      if (
        (global.HTMLCanvasElement && source instanceof global.HTMLCanvasElement) ||
        (global.ImageBitmap && source instanceof global.ImageBitmap)
      ) {
        resolve({ image: source, cleanup() {} });
        return;
      }

      const image = new Image();
      let objectUrl = "";
      let timer = 0;
      const cleanup = () => {
        global.clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };

      image.onload = () => {
        global.clearTimeout(timer);
        if (!(image.naturalWidth > 0 && image.naturalHeight > 0)) {
          cleanup();
          reject(new Error("The product image dimensions are invalid."));
          return;
        }
        resolve({ image, cleanup });
      };
      image.onerror = () => {
        cleanup();
        reject(new Error("Unable to read the product image. Please upload a JPG, PNG, or WebP file again."));
      };

      try {
        if (source instanceof Blob) {
          objectUrl = URL.createObjectURL(source);
          image.src = objectUrl;
        } else {
          const sourceText = String(source);
          if (/^https?:\/\//i.test(sourceText)) image.crossOrigin = "anonymous";
          image.src = sourceText;
        }
      } catch {
        cleanup();
        reject(new Error("Unable to access the product image source."));
        return;
      }

      timer = global.setTimeout(() => {
        cleanup();
        reject(new Error("Product image loading timed out. Please use a smaller image and try again."));
      }, 20000);
    });
  }

  function colorDistanceSquared(data, offset, color) {
    const red = data[offset] - color[0];
    const green = data[offset + 1] - color[1];
    const blue = data[offset + 2] - color[2];
    return red * red + green * green + blue * blue;
  }

  function sampleCornerColor(data, width, height) {
    const patch = Math.max(2, Math.min(10, Math.round(Math.min(width, height) * 0.018)));
    const corners = [
      [0, 0],
      [width - patch, 0],
      [0, height - patch],
      [width - patch, height - patch],
    ];
    const samples = [];
    for (const [startX, startY] of corners) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let count = 0;
      for (let y = startY; y < startY + patch; y += 1) {
        for (let x = startX; x < startX + patch; x += 1) {
          const offset = (y * width + x) * 4;
          red += data[offset];
          green += data[offset + 1];
          blue += data[offset + 2];
          alpha += data[offset + 3];
          count += 1;
        }
      }
      samples.push([red / count, green / count, blue / count, alpha / count]);
    }

    const average = [0, 1, 2, 3].map(
      (channel) => samples.reduce((sum, sample) => sum + sample[channel], 0) / samples.length,
    );
    const spread = Math.max(
      ...samples.map((sample) =>
        Math.sqrt(
          (sample[0] - average[0]) ** 2 +
            (sample[1] - average[1]) ** 2 +
            (sample[2] - average[2]) ** 2,
        ),
      ),
    );
    return { average, spread };
  }

  function removeUniformEdgeBackground(imageData, width, height, background) {
    const data = imageData.data;
    const threshold = 50;
    const thresholdSquared = threshold * threshold;
    const total = width * height;
    const removed = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    const enqueueIfBackground = (index) => {
      if (removed[index]) return;
      const offset = index * 4;
      if (data[offset + 3] < 12 || colorDistanceSquared(data, offset, background) <= thresholdSquared) {
        removed[index] = 1;
        queue[tail] = index;
        tail += 1;
      }
    };

    for (let x = 0; x < width; x += 1) {
      enqueueIfBackground(x);
      enqueueIfBackground((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
      enqueueIfBackground(y * width);
      enqueueIfBackground(y * width + width - 1);
    }

    while (head < tail) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      if (x > 0) enqueueIfBackground(index - 1);
      if (x < width - 1) enqueueIfBackground(index + 1);
      if (y > 0) enqueueIfBackground(index - width);
      if (y < height - 1) enqueueIfBackground(index + width);
    }

    const removedRatio = tail / total;
    if (removedRatio < 0.025 || removedRatio > 0.94) return false;

    for (let index = 0; index < total; index += 1) {
      if (removed[index]) data[index * 4 + 3] = 0;
    }
    return true;
  }

  function findAlphaBounds(imageData, width, height) {
    const data = imageData.data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let transparentPixels = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha < 245) transparentPixels += 1;
        if (alpha > 10) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX < minX || maxY < minY) return null;
    const padding = Math.max(2, Math.round(Math.min(width, height) * 0.008));
    return {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.min(width, maxX + padding + 1) - Math.max(0, minX - padding),
      height: Math.min(height, maxY + padding + 1) - Math.max(0, minY - padding),
      hasTransparency: transparentPixels / (width * height) > 0.015,
    };
  }

  function prepareProductImage(image) {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, 1400 / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    let bounds = { x: 0, y: 0, width, height, hasTransparency: false };
    let isolated = false;
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const initialBounds = findAlphaBounds(imageData, width, height);
      const corner = sampleCornerColor(imageData.data, width, height);
      const [red, green, blue, alpha] = corner.average;
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      const neutralSpread = Math.max(red, green, blue) - Math.min(red, green, blue);
      const likelyPlainLightBackground = alpha > 245 && corner.spread < 24 && luminance > 196 && neutralSpread < 38;

      if (initialBounds?.hasTransparency) {
        isolated = true;
      } else if (likelyPlainLightBackground) {
        isolated = removeUniformEdgeBackground(imageData, width, height, corner.average);
        if (isolated) ctx.putImageData(imageData, 0, 0);
      }
      bounds = findAlphaBounds(isolated ? imageData : ctx.getImageData(0, 0, width, height), width, height) || bounds;
      isolated = isolated || bounds.hasTransparency;
    } catch {
      // A cross-origin image may be drawable but unreadable. It remains in a clean photo card.
      isolated = false;
    }

    return { canvas, bounds, isolated };
  }

  function inferSceneKind(scene, category) {
    const value = `${normalizeText(scene)} ${normalizeText(category)}`.toLowerCase();
    if (/(studio|catalog|clean|棚拍|纯净|白底)/.test(value)) return "studio";
    if (/(factory|workshop|production|manufactur|工厂|车间|生产)/.test(value)) return "factory";
    if (/(clinic|hospital|medical|rehab|physio|诊所|医院|康复|理疗)/.test(value)) return "clinic";
    if (/(office|desk|work|办公|久坐|工位)/.test(value)) return "office";
    if (/(outdoor|trail|running|hiking|户外|跑步|登山)/.test(value)) return "outdoor";
    if (/(home|daily|家居|日常)/.test(value)) return "home";
    if (/(back|waist|lumbar|护腰|腰)/.test(value)) return "office";
    if (/(custom|orthopedic|矫形|支具)/.test(value)) return "clinic";
    return "sports";
  }

  const SCENE_COLORS = Object.freeze({
    sports: { top: "#e8f2f1", bottom: "#f7faf9", floor: "#cbded9", accent: "#087f72", dark: "#153b3a" },
    clinic: { top: "#e8f3f7", bottom: "#f9fbfc", floor: "#dbe9ee", accent: "#1679a8", dark: "#16384b" },
    office: { top: "#edf1f4", bottom: "#fbfbfa", floor: "#d9d5ce", accent: "#9d6a3d", dark: "#2d3a42" },
    outdoor: { top: "#cce8f3", bottom: "#f8fbf5", floor: "#b9d1ad", accent: "#347f55", dark: "#173e2b" },
    factory: { top: "#e9edf0", bottom: "#fafbfc", floor: "#cfd5da", accent: "#e1722f", dark: "#26343e" },
    home: { top: "#f1ede6", bottom: "#fcfaf6", floor: "#d9cab7", accent: "#b87556", dark: "#44372f" },
    studio: { top: "#f1f3f5", bottom: "#ffffff", floor: "#dfe3e7", accent: "#4d5967", dark: "#222b34" },
  });

  function drawAmbientBackground(ctx, colors, viewIndex) {
    const gradient = ctx.createLinearGradient(0, 0, 1000, 1000);
    gradient.addColorStop(0, colors.top);
    gradient.addColorStop(0.72, colors.bottom);
    gradient.addColorStop(1, "#ffffff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 1000);

    const glow = ctx.createRadialGradient(780 - viewIndex * 70, 170, 10, 780 - viewIndex * 70, 170, 410);
    glow.addColorStop(0, "rgba(255,255,255,0.92)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(250, 0, 750, 670);

    ctx.fillStyle = colors.floor;
    ctx.globalAlpha = 0.44;
    ctx.beginPath();
    ctx.moveTo(0, 690);
    ctx.lineTo(1000, 615 + viewIndex * 18);
    ctx.lineTo(1000, 1000);
    ctx.lineTo(0, 1000);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawSportsScene(ctx, colors, viewIndex) {
    ctx.save();
    ctx.globalAlpha = 0.54;
    fillRoundedRect(ctx, 68, 150, 280, 350, 26, "rgba(255,255,255,0.82)");
    ctx.fillStyle = "rgba(31,91,86,0.12)";
    ctx.fillRect(90, 175, 112, 300);
    ctx.fillRect(214, 175, 112, 300);
    ctx.strokeStyle = "rgba(21,59,58,0.18)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(208, 175);
    ctx.lineTo(208, 475);
    ctx.stroke();

    ctx.fillStyle = colors.dark;
    fillRoundedRect(ctx, 705, 550 - viewIndex * 15, 210, 32, 16, colors.dark);
    fillRoundedRect(ctx, 750, 580 - viewIndex * 15, 18, 120, 9, colors.dark);
    fillRoundedRect(ctx, 862, 580 - viewIndex * 15, 18, 120, 9, colors.dark);
    ctx.fillStyle = colors.accent;
    fillRoundedRect(ctx, 730, 713, 190, 22, 11, colors.accent);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawClinicScene(ctx, colors, viewIndex) {
    ctx.save();
    ctx.globalAlpha = 0.62;
    fillRoundedRect(ctx, 62, 165, 250, 360, 22, "rgba(255,255,255,0.88)");
    ctx.strokeStyle = "rgba(22,56,75,0.13)";
    ctx.lineWidth = 3;
    for (let y = 250; y < 500; y += 82) {
      ctx.beginPath();
      ctx.moveTo(62, y);
      ctx.lineTo(312, y);
      ctx.stroke();
    }
    ctx.fillStyle = colors.accent;
    ctx.fillRect(165, 194, 44, 112);
    ctx.fillRect(131, 228, 112, 44);

    fillRoundedRect(ctx, 700 - viewIndex * 28, 535, 245, 66, 24, "#ffffff");
    ctx.fillStyle = "rgba(22,56,75,0.32)";
    fillRoundedRect(ctx, 734 - viewIndex * 28, 602, 18, 115, 9, "rgba(22,56,75,0.32)");
    fillRoundedRect(ctx, 892 - viewIndex * 28, 602, 18, 115, 9, "rgba(22,56,75,0.32)");
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawOfficeScene(ctx, colors, viewIndex) {
    ctx.save();
    ctx.globalAlpha = 0.58;
    fillRoundedRect(ctx, 55, 140, 315, 365, 20, "rgba(255,255,255,0.78)");
    ctx.fillStyle = "rgba(93,125,139,0.13)";
    ctx.fillRect(78, 165, 128, 315);
    ctx.fillRect(220, 165, 128, 315);
    ctx.fillStyle = colors.dark;
    fillRoundedRect(ctx, 670 - viewIndex * 25, 540, 300, 30, 12, colors.dark);
    fillRoundedRect(ctx, 710 - viewIndex * 25, 570, 18, 160, 9, colors.dark);
    fillRoundedRect(ctx, 915 - viewIndex * 25, 570, 18, 160, 9, colors.dark);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    fillRoundedRect(ctx, 750, 455, 130, 86, 12, "rgba(255,255,255,0.85)");
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(815, 540);
    ctx.lineTo(815, 580);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawOutdoorScene(ctx, colors, viewIndex) {
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.beginPath();
    ctx.arc(805 - viewIndex * 45, 180, 82, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#78a488";
    ctx.beginPath();
    ctx.moveTo(0, 550);
    ctx.quadraticCurveTo(180, 390, 365, 560);
    ctx.quadraticCurveTo(540, 360, 730, 555);
    ctx.quadraticCurveTo(860, 430, 1000, 565);
    ctx.lineTo(1000, 740);
    ctx.lineTo(0, 740);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(0, 790);
    ctx.bezierCurveTo(265, 665, 640, 875, 1000, 710);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawFactoryScene(ctx, colors, viewIndex) {
    ctx.save();
    ctx.globalAlpha = 0.54;
    ctx.strokeStyle = "rgba(38,52,62,0.12)";
    ctx.lineWidth = 2;
    for (let x = 60; x < 950; x += 74) {
      ctx.beginPath();
      ctx.moveTo(x, 120);
      ctx.lineTo(x, 720);
      ctx.stroke();
    }
    for (let y = 140; y < 720; y += 74) {
      ctx.beginPath();
      ctx.moveTo(45, y);
      ctx.lineTo(955, y);
      ctx.stroke();
    }
    ctx.fillStyle = colors.dark;
    fillRoundedRect(ctx, 650 - viewIndex * 18, 575, 310, 38, 12, colors.dark);
    for (let x = 690; x < 925; x += 74) {
      ctx.beginPath();
      ctx.arc(x, 632, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = colors.accent;
    fillRoundedRect(ctx, 84, 568, 168, 146, 18, colors.accent);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawHomeScene(ctx, colors, viewIndex) {
    ctx.save();
    ctx.globalAlpha = 0.58;
    fillRoundedRect(ctx, 58, 175, 285, 325, 26, "rgba(255,255,255,0.76)");
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(210, 280, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(210, 280, 53, 0, Math.PI * 2);
    ctx.fill();
    fillRoundedRect(ctx, 680 - viewIndex * 25, 540, 280, 132, 38, "rgba(116,88,68,0.26)");
    fillRoundedRect(ctx, 730 - viewIndex * 25, 635, 28, 98, 14, "rgba(68,55,47,0.34)");
    fillRoundedRect(ctx, 890 - viewIndex * 25, 635, 28, 98, 14, "rgba(68,55,47,0.34)");
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawStudioScene(ctx, colors, viewIndex) {
    ctx.save();
    const glow = ctx.createRadialGradient(500, 420, 40, 500, 420, 390);
    glow.addColorStop(0, "rgba(255,255,255,0.96)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(90, 30, 820, 760);
    ctx.globalAlpha = 0.34;
    fillRoundedRect(ctx, 220 + viewIndex * 18, 650, 560, 48, 24, colors.dark);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawSceneBackground(ctx, sceneKind, viewIndex) {
    const colors = SCENE_COLORS[sceneKind] || SCENE_COLORS.sports;
    drawAmbientBackground(ctx, colors, viewIndex);
    const renderer = {
      sports: drawSportsScene,
      clinic: drawClinicScene,
      office: drawOfficeScene,
      outdoor: drawOutdoorScene,
      factory: drawFactoryScene,
      home: drawHomeScene,
      studio: drawStudioScene,
    }[sceneKind];
    renderer(ctx, colors, viewIndex);
    return colors;
  }

  function productDrawSize(bounds, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
    return { width: bounds.width * scale, height: bounds.height * scale };
  }

  function drawProduct(ctx, prepared, definition) {
    const variants = {
      front: { cx: 510, cy: 480, maxWidth: 580, maxHeight: 570, rotation: 0, scaleX: 1, skew: 0 },
      angle: { cx: 598, cy: 475, maxWidth: 555, maxHeight: 585, rotation: -0.055, scaleX: 0.88, skew: -0.1 },
      side: { cx: 410, cy: 475, maxWidth: 515, maxHeight: 620, rotation: 0.035, scaleX: 0.64, skew: 0.035 },
    };
    const variant = variants[definition.id];
    const size = productDrawSize(prepared.bounds, variant.maxWidth, variant.maxHeight);

    ctx.save();
    ctx.translate(variant.cx, variant.cy);
    ctx.rotate(variant.rotation);
    ctx.transform(variant.scaleX, 0, variant.skew, 1, 0, 0);

    if (!prepared.isolated) {
      ctx.shadowColor = "rgba(14,30,38,0.16)";
      ctx.shadowBlur = 36;
      ctx.shadowOffsetY = 18;
      fillRoundedRect(ctx, -size.width / 2 - 18, -size.height / 2 - 18, size.width + 36, size.height + 36, 30, "#ffffff");
      ctx.shadowColor = "transparent";
      roundedRectPath(ctx, -size.width / 2, -size.height / 2, size.width, size.height, 20);
      ctx.clip();
    } else {
      ctx.shadowColor = "rgba(12,31,38,0.30)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 18;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const source = prepared.bounds;
    ctx.drawImage(
      prepared.canvas,
      source.x,
      source.y,
      source.width,
      source.height,
      -size.width / 2,
      -size.height / 2,
      size.width,
      size.height,
    );
    ctx.restore();
  }

  function drawCompositionGuides(ctx, definition, colors) {
    ctx.save();
    if (definition.id === "front") {
      const shadow = ctx.createRadialGradient(500, 738, 20, 500, 738, 260);
      shadow.addColorStop(0, "rgba(20,45,48,0.20)");
      shadow.addColorStop(1, "rgba(20,45,48,0)");
      ctx.fillStyle = shadow;
      ctx.fillRect(210, 680, 580, 120);
    } else if (definition.id === "angle") {
      ctx.strokeStyle = colors.accent;
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(602, 475, 320, -1.22, 1.05);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(190, 455);
      ctx.lineTo(290, 455);
      ctx.lineTo(316, 430);
      ctx.stroke();
    } else {
      ctx.strokeStyle = colors.accent;
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.56;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(720, 245);
      ctx.lineTo(720, 695);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(705, 255);
      ctx.lineTo(720, 235);
      ctx.lineTo(735, 255);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(705, 685);
      ctx.lineTo(720, 705);
      ctx.lineTo(735, 685);
      ctx.closePath();
      ctx.fill();
      setFont(ctx, 18, 700);
      ctx.fillText("PROFILE", 750, 462);
    }
    ctx.restore();
  }

  function drawViewMetadata(ctx, definition, productName, category, sceneLabel, colors, index) {
    fillRoundedRect(ctx, 54, 50, 235, 44, 22, "rgba(255,255,255,0.82)");
    setFont(ctx, 16, 700);
    ctx.fillStyle = colors.dark;
    ctx.textBaseline = "middle";
    ctx.fillText(`VIEW 0${index + 1} / 03`, 76, 72);

    setFont(ctx, 15, 600);
    ctx.textAlign = "right";
    ctx.fillStyle = colors.dark;
    ctx.globalAlpha = 0.72;
    ctx.fillText("B2B SCENE COMPOSITION", 946, 72);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";

    const panelGradient = ctx.createLinearGradient(0, 770, 0, 1000);
    panelGradient.addColorStop(0, "rgba(255,255,255,0)");
    panelGradient.addColorStop(0.28, "rgba(255,255,255,0.90)");
    panelGradient.addColorStop(1, "rgba(255,255,255,0.98)");
    ctx.fillStyle = panelGradient;
    ctx.fillRect(0, 750, 1000, 250);

    setFont(ctx, 18, 700);
    ctx.fillStyle = colors.accent;
    ctx.textBaseline = "top";
    ctx.fillText(ellipsize(ctx, `${definition.label} · ${sceneLabel}`, 690), 60, 828);
    setFont(ctx, 35, 700);
    const nameLines = wrapText(ctx, productName, 720, 2);
    drawTextLines(ctx, nameLines, 60, 865, 43, "#12272c");

    setFont(ctx, 15, 600);
    ctx.fillStyle = "#627276";
    ctx.textAlign = "right";
    ctx.fillText(ellipsize(ctx, normalizeText(category, "OEM / ODM PRODUCT"), 290), 940, 920);
    ctx.textAlign = "left";
  }

  async function renderSceneView(prepared, definition, meta, index) {
    const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const colors = drawSceneBackground(ctx, meta.sceneKind, index);
    drawCompositionGuides(ctx, definition, colors);
    drawProduct(ctx, prepared, definition);
    drawViewMetadata(ctx, definition, meta.productName, meta.category, meta.sceneLabel, colors, index);
    const output = await canvasToPng(canvas);
    return {
      id: definition.id,
      label: definition.label,
      fileName: `${meta.fileBase}-${definition.fileSuffix}.png`,
      dataUrl: output.dataUrl,
      blob: output.blob,
    };
  }

  function normalizeList(value, fallback = []) {
    if (Array.isArray(value)) {
      const normalized = value.map((item) => normalizeText(item)).filter(Boolean);
      return normalized.length ? normalized : [...fallback];
    }
    const normalized = String(value ?? "")
      .split(/[；;\n]+/)
      .map((item) => normalizeText(item))
      .filter(Boolean);
    return normalized.length ? normalized : [...fallback];
  }

  function formatInteger(value, fallback = "—") {
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number) : fallback;
  }

  function formatPrice(value) {
    const number = Number(value);
    return Number.isFinite(number)
      ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number)
      : "—";
  }

  function normalizeDetailData(data = {}) {
    const category = normalizeText(data.categoryLabel || data.category, "Orthopedic Support");
    const defaults = [
      "Stable support engineered to balance mobility with all-day comfort",
      "Materials, sizing, and packaging optimized for volume procurement",
      "Custom branding, colors, sizes, and packaging available",
    ];
    return {
      productName: normalizeText(data.productName || data.name, "OEM Orthopedic Support Product"),
      category,
      minPrice: formatPrice(data.minPrice),
      maxPrice: formatPrice(data.maxPrice),
      moq: formatInteger(data.moq),
      leadTime: formatInteger(data.leadTime),
      sampleDays: formatInteger(data.sampleDays),
      monthlyCapacity: formatInteger(data.monthlyCapacity),
      targetMarket: normalizeText(data.targetMarket, "Global B2B Market"),
      sellingPoints: normalizeList(data.sellingPoints || data.sellingPointsRaw, defaults).slice(0, 8),
      customization: normalizeText(data.customization, "Logo, color, size, and packaging customization"),
      certifications: normalizeList(data.certifications, ["Quality documents available on request"]).slice(0, 8),
    };
  }

  async function loadViewImages(views) {
    const candidates = Array.isArray(views) ? views.slice(0, 3) : [];
    const loaded = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const view = candidates[index] || {};
      const source = view.dataUrl || view.blob || view.url;
      if (!source) continue;
      try {
        const result = await loadImage(source);
        loaded.push({ image: result.image, cleanup: result.cleanup, label: normalizeText(view.label, VIEW_DEFINITIONS[index]?.label) });
      } catch {
        // A missing individual view does not block the long-image export; a placeholder is drawn.
      }
    }
    return loaded;
  }

  function measureCardRows(ctx, items, width, fontSize, lineHeight, basePadding) {
    setFont(ctx, fontSize, 600);
    const cards = items.map((text) => {
      const lines = wrapText(ctx, text, width - basePadding * 2 - 40, 5);
      return { text, lines, height: Math.max(112, lines.length * lineHeight + basePadding * 2) };
    });
    const rows = [];
    for (let index = 0; index < cards.length; index += 2) {
      const pair = cards.slice(index, index + 2);
      rows.push({ cards: pair, height: Math.max(...pair.map((card) => card.height)) });
    }
    return rows;
  }

  function buildDetailLayout(ctx, detail) {
    const sellingRows = measureCardRows(ctx, detail.sellingPoints, 376, 22, 32, 25);
    const certRows = measureCardRows(ctx, detail.certifications, 376, 20, 29, 23);
    setFont(ctx, 24, 500);
    const customizationLines = wrapText(ctx, detail.customization, 700, 8);

    let y = 0;
    const layout = {};
    layout.header = { y, height: 94 };
    y += layout.header.height;
    layout.hero = { y, height: 875 };
    y += layout.hero.height;
    layout.trade = { y, height: 190 };
    y += layout.trade.height;
    layout.views = { y, height: 475 };
    y += layout.views.height;
    const sellingCardsHeight = sellingRows.reduce((sum, row) => sum + row.height, 0) + Math.max(0, sellingRows.length - 1) * 18;
    layout.selling = { y, height: 164 + sellingCardsHeight + 72, rows: sellingRows };
    y += layout.selling.height;
    layout.oem = { y, height: Math.max(610, 492 + customizationLines.length * 34), customizationLines };
    y += layout.oem.height;
    const certCardsHeight = certRows.reduce((sum, row) => sum + row.height, 0) + Math.max(0, certRows.length - 1) * 18;
    layout.certifications = { y, height: 160 + certCardsHeight + 68, rows: certRows };
    y += layout.certifications.height;
    layout.footer = { y, height: 168 };
    y += layout.footer.height;
    return { ...layout, height: Math.ceil(y) };
  }

  function drawSectionHeading(ctx, eyebrow, title, x, y, color = "#10272f", accent = "#087f72") {
    setFont(ctx, 15, 700);
    ctx.fillStyle = accent;
    ctx.textBaseline = "top";
    ctx.fillText(eyebrow.toUpperCase(), x, y);
    setFont(ctx, 38, 720);
    ctx.fillStyle = color;
    ctx.fillText(title, x, y + 31);
  }

  function drawHeader(ctx, section, detail) {
    ctx.fillStyle = "#0a2530";
    ctx.fillRect(0, section.y, DETAIL_WIDTH, section.height);
    ctx.fillStyle = "#2bd1b0";
    ctx.beginPath();
    ctx.arc(55, 47, 16, 0, Math.PI * 2);
    ctx.fill();
    setFont(ctx, 19, 750);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText("OEM PRODUCT STUDIO", 84, 47);
    setFont(ctx, 14, 600);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.fillText(ellipsize(ctx, detail.category, 390), 845, 47);
    ctx.textAlign = "left";
  }

  function drawHero(ctx, section, detail, viewImages) {
    const gradient = ctx.createLinearGradient(0, section.y, DETAIL_WIDTH, section.y + section.height);
    gradient.addColorStop(0, "#e9f4f1");
    gradient.addColorStop(1, "#f8faf9");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, section.y, DETAIL_WIDTH, section.height);

    const imageX = 48;
    const imageY = section.y + 42;
    const imageWidth = 804;
    const imageHeight = 548;
    ctx.shadowColor = "rgba(13,42,47,0.16)";
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 18;
    fillRoundedRect(ctx, imageX, imageY, imageWidth, imageHeight, 34, "#dfeceb");
    ctx.shadowColor = "transparent";
    if (viewImages[0]) {
      drawRoundedImage(ctx, viewImages[0].image, imageX, imageY, imageWidth, imageHeight, 34);
    } else {
      setFont(ctx, 24, 650);
      ctx.fillStyle = "#587177";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PRODUCT IMAGE", DETAIL_WIDTH / 2, imageY + imageHeight / 2);
      ctx.textAlign = "left";
    }

    const overlay = ctx.createLinearGradient(0, imageY + 260, 0, imageY + imageHeight);
    overlay.addColorStop(0, "rgba(5,28,35,0)");
    overlay.addColorStop(1, "rgba(5,28,35,0.46)");
    ctx.save();
    roundedRectPath(ctx, imageX, imageY, imageWidth, imageHeight, 34);
    ctx.clip();
    ctx.fillStyle = overlay;
    ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
    ctx.restore();

    const cardX = 72;
    const cardY = section.y + 535;
    const cardWidth = 756;
    const cardHeight = 286;
    ctx.shadowColor = "rgba(13,42,47,0.13)";
    ctx.shadowBlur = 38;
    ctx.shadowOffsetY = 14;
    fillRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 28, "#ffffff");
    ctx.shadowColor = "transparent";

    setFont(ctx, 14, 750);
    const categoryBadge = `${detail.category} · OEM / ODM`;
    const categoryBadgeWidth = Math.min(510, ctx.measureText(categoryBadge).width + 40);
    fillRoundedRect(ctx, cardX + 30, cardY + 28, categoryBadgeWidth, 38, 19, "#e7f7f3");
    ctx.fillStyle = "#087f72";
    ctx.textBaseline = "middle";
    ctx.fillText(ellipsize(ctx, categoryBadge, categoryBadgeWidth - 40), cardX + 50, cardY + 47);

    setFont(ctx, 42, 740);
    const titleLines = wrapText(ctx, detail.productName, cardWidth - 60, 3);
    drawTextLines(ctx, titleLines, cardX + 30, cardY + 86, 51, "#10272f");
    setFont(ctx, 16, 550);
    ctx.fillStyle = "#65757a";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      ellipsize(ctx, `Designed for ${detail.targetMarket} procurement`, cardWidth - 60),
      cardX + 30,
      cardY + cardHeight - 28,
    );
  }

  function drawTrade(ctx, section, detail) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, section.y, DETAIL_WIDTH, section.height);
    const top = section.y + 30;
    setFont(ctx, 14, 750);
    ctx.fillStyle = "#738187";
    ctx.textBaseline = "top";
    ctx.fillText("REFERENCE PRICE", 54, top);
    setFont(ctx, 36, 760);
    ctx.fillStyle = "#10272f";
    ctx.fillText(`US$${detail.minPrice}–${detail.maxPrice}`, 54, top + 34);

    ctx.strokeStyle = "#dce5e7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(480, top + 4);
    ctx.lineTo(480, top + 120);
    ctx.stroke();

    setFont(ctx, 14, 750);
    ctx.fillStyle = "#738187";
    ctx.fillText("MOQ", 530, top);
    setFont(ctx, 30, 750);
    ctx.fillStyle = "#10272f";
    ctx.fillText(`${detail.moq} pcs`, 530, top + 35);
    setFont(ctx, 15, 600);
    ctx.fillStyle = "#65757a";
    ctx.fillText(`${detail.leadTime} days lead time`, 530, top + 88);
  }

  function drawViews(ctx, section, viewImages) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, section.y, DETAIL_WIDTH, section.height);
    drawSectionHeading(ctx, "PRODUCT VIEWS", "Three Buyer-Ready Product Views", 54, section.y + 42);
    const gap = 18;
    const cardWidth = 252;
    const imageSize = 252;
    const startY = section.y + 135;
    for (let index = 0; index < 3; index += 1) {
      const x = 54 + index * (cardWidth + gap);
      fillRoundedRect(ctx, x, startY, cardWidth, imageSize, 24, "#edf3f3");
      if (viewImages[index]) drawRoundedImage(ctx, viewImages[index].image, x, startY, cardWidth, imageSize, 24);
      else {
        setFont(ctx, 16, 650);
        ctx.fillStyle = "#789095";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(VIEW_DEFINITIONS[index].label, x + cardWidth / 2, startY + imageSize / 2);
        ctx.textAlign = "left";
      }
      setFont(ctx, 16, 720);
      ctx.fillStyle = "#20383e";
      ctx.textBaseline = "top";
      ctx.fillText(viewImages[index]?.label || VIEW_DEFINITIONS[index].label, x + 2, startY + imageSize + 18);
    }
  }

  function drawSellingPoints(ctx, section) {
    ctx.fillStyle = "#f1f5f5";
    ctx.fillRect(0, section.y, DETAIL_WIDTH, section.height);
    drawSectionHeading(ctx, "WHY BUYERS CHOOSE IT", "Key Benefits for B2B Buyers", 54, section.y + 48);
    let y = section.y + 150;
    let number = 1;
    for (const row of section.rows) {
      row.cards.forEach((card, column) => {
        const x = 54 + column * 394;
        fillRoundedRect(ctx, x, y, 376, row.height, 24, "#ffffff");
        fillRoundedRect(ctx, x + 22, y + 22, 38, 38, 19, "#0b8577");
        setFont(ctx, 16, 760);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(number).padStart(2, "0"), x + 41, y + 41);
        ctx.textAlign = "left";
        setFont(ctx, 22, 620);
        drawTextLines(ctx, card.lines, x + 78, y + 24, 32, "#20383e");
        number += 1;
      });
      y += row.height + 18;
    }
  }

  function drawOem(ctx, section, detail) {
    const gradient = ctx.createLinearGradient(0, section.y, DETAIL_WIDTH, section.y + section.height);
    gradient.addColorStop(0, "#0a2833");
    gradient.addColorStop(1, "#103f45");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, section.y, DETAIL_WIDTH, section.height);

    drawSectionHeading(ctx, "OEM / ODM CAPABILITY", "From Sampling to Volume Delivery", 54, section.y + 52, "#ffffff", "#42d8b9");
    const metricY = section.y + 156;
    const metrics = [
      { label: "SAMPLE LEAD TIME", value: `${detail.sampleDays} days` },
      { label: "MONTHLY CAPACITY", value: `${detail.monthlyCapacity} pcs` },
      { label: "TARGET MARKET", value: detail.targetMarket },
    ];
    metrics.forEach((metric, index) => {
      const x = 54 + index * 263;
      fillRoundedRect(ctx, x, metricY, 242, 142, 22, "rgba(255,255,255,0.08)");
      setFont(ctx, 12, 730);
      ctx.fillStyle = "rgba(255,255,255,0.58)";
      ctx.textBaseline = "top";
      ctx.fillText(metric.label, x + 20, metricY + 24);
      setFont(ctx, index === 2 ? 22 : 28, 740);
      const valueLines = wrapText(ctx, metric.value, 202, 2);
      drawTextLines(ctx, valueLines, x + 20, metricY + 61, index === 2 ? 30 : 36, "#ffffff");
    });

    const copyY = metricY + 190;
    setFont(ctx, 15, 720);
    ctx.fillStyle = "#42d8b9";
    ctx.textBaseline = "top";
    ctx.fillText("CUSTOMIZATION OPTIONS", 54, copyY);
    setFont(ctx, 25, 520);
    drawTextLines(ctx, section.customizationLines, 54, copyY + 40, 34, "rgba(255,255,255,0.90)");

    const processY = Math.min(section.y + section.height - 96, copyY + 88 + section.customizationLines.length * 34);
    const steps = ["Requirements Review", "Sample Development", "Quality Inspection", "Volume Delivery"];
    ctx.strokeStyle = "rgba(66,216,185,0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(92, processY);
    ctx.lineTo(808, processY);
    ctx.stroke();
    steps.forEach((step, index) => {
      const x = 92 + index * 239;
      ctx.fillStyle = "#42d8b9";
      ctx.beginPath();
      ctx.arc(x, processY, 9, 0, Math.PI * 2);
      ctx.fill();
      setFont(ctx, 15, 650);
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.textAlign = index === 0 ? "left" : index === steps.length - 1 ? "right" : "center";
      ctx.textBaseline = "top";
      ctx.fillText(step, x, processY + 23);
    });
    ctx.textAlign = "left";
  }

  function drawCertifications(ctx, section) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, section.y, DETAIL_WIDTH, section.height);
    drawSectionHeading(ctx, "QUALITY ASSURANCE", "Certifications & Quality Documentation", 54, section.y + 46);
    let y = section.y + 145;
    for (const row of section.rows) {
      row.cards.forEach((card, column) => {
        const x = 54 + column * 394;
        fillRoundedRect(ctx, x, y, 376, row.height, 22, "#f5f8f8");
        ctx.fillStyle = "#0b8577";
        ctx.beginPath();
        ctx.arc(x + 42, y + 42, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x + 34, y + 42);
        ctx.lineTo(x + 40, y + 48);
        ctx.lineTo(x + 51, y + 35);
        ctx.stroke();
        setFont(ctx, 20, 650);
        drawTextLines(ctx, card.lines, x + 76, y + 25, 29, "#20383e");
      });
      y += row.height + 18;
    }
  }

  function drawFooter(ctx, section, detail) {
    ctx.fillStyle = "#eef4f3";
    ctx.fillRect(0, section.y, DETAIL_WIDTH, section.height);
    setFont(ctx, 24, 750);
    ctx.fillStyle = "#10272f";
    ctx.textBaseline = "top";
    ctx.fillText("READY FOR YOUR OEM PROJECT", 54, section.y + 44);
    setFont(ctx, 15, 550);
    ctx.fillStyle = "#65757a";
    ctx.fillText("Final prices, lead times, and certificates are subject to order confirmation.", 54, section.y + 88);
    fillRoundedRect(ctx, 704, section.y + 46, 142, 54, 27, "#0b8577");
    setFont(ctx, 15, 750);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OEM READY", 775, section.y + 73);
    ctx.textAlign = "left";
  }

  async function generateSceneViews({ sourceUrl, scene, productName, category } = {}) {
    assertCanvasSupport();
    const loaded = await loadImage(sourceUrl);
    try {
      const prepared = prepareProductImage(loaded.image);
      const normalizedProductName = normalizeText(productName, "OEM Orthopedic Support Product");
      const normalizedCategory = normalizeText(category, "Orthopedic Support");
      const normalizedScene = normalizeText(scene);
      const sceneKind = inferSceneKind(normalizedScene, normalizedCategory);
      const sceneNames = {
        sports: "Sports Rehabilitation Setting",
        clinic: "Professional Rehabilitation Setting",
        office: "Workplace Support Setting",
        outdoor: "Outdoor Sports Setting",
        factory: "Manufacturing Capability Setting",
        home: "Everyday Use Setting",
        studio: "Clean Studio Setting",
      };
      const meta = {
        productName: normalizedProductName,
        category: normalizedCategory,
        sceneKind,
        sceneLabel: normalizedScene || sceneNames[sceneKind],
        fileBase: safeFileBase(normalizedProductName),
      };
      return Promise.all(VIEW_DEFINITIONS.map((definition, index) => renderSceneView(prepared, definition, meta, index)));
    } finally {
      loaded.cleanup();
    }
  }

  async function generateDetailLongImage({ data, views } = {}) {
    assertCanvasSupport();
    const detail = normalizeDetailData(data || {});
    const loadedViews = await loadViewImages(views);
    try {
      const measurementCanvas = createCanvas(DETAIL_WIDTH, 10);
      const measurementContext = measurementCanvas.getContext("2d");
      const layout = buildDetailLayout(measurementContext, detail);
      const canvas = createCanvas(DETAIL_WIDTH, layout.height);
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawHeader(ctx, layout.header, detail);
      drawHero(ctx, layout.hero, detail, loadedViews);
      drawTrade(ctx, layout.trade, detail);
      drawViews(ctx, layout.views, loadedViews);
      drawSellingPoints(ctx, layout.selling);
      drawOem(ctx, layout.oem, detail);
      drawCertifications(ctx, layout.certifications);
      drawFooter(ctx, layout.footer, detail);

      const output = await canvasToPng(canvas);
      return {
        fileName: `${safeFileBase(detail.productName)}-detail-long.png`,
        dataUrl: output.dataUrl,
        blob: output.blob,
        width: canvas.width,
        height: canvas.height,
      };
    } finally {
      loadedViews.forEach((view) => view.cleanup());
    }
  }

  global.AICImageStudio = Object.freeze({
    generateSceneViews,
    generateDetailLongImage,
  });
})(window);
