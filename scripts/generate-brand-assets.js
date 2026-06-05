#!/usr/bin/env node
/**
 * Generates the InterlinedList brand asset kit into public/brand/.
 *
 * Sources:
 *   public/logo-dark.svg          — icon mark, transparent bg, dark fills
 *   public/logo-light.svg         — icon mark, transparent bg, light/white fills
 *   .claude/logo/interlinedlist-logo-text.png — full logotype, white bg
 *
 * Outputs (public/brand/):
 *   icon/     — square icon mark at standard sizes × three background variants
 *   logotype/ — horizontal logotype at standard widths × three background variants
 *   svg/      — source SVG files
 *   interlinedlist-brand-kit.zip — everything above in one archive
 *
 * Usage: node scripts/generate-brand-assets.js
 */

const sharp = require('sharp');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRAND_DIR = path.join(ROOT, 'public', 'brand');
const ICON_DIR = path.join(BRAND_DIR, 'icon');
const LOGOTYPE_DIR = path.join(BRAND_DIR, 'logotype');
const SVG_DIR = path.join(BRAND_DIR, 'svg');

const DARK_SVG = path.join(ROOT, 'public', 'logo-dark.svg');
const LIGHT_SVG = path.join(ROOT, 'public', 'logo-light.svg');
const LOGOTYPE_PNG = path.join(ROOT, '.claude', 'logo', 'interlinedlist-logo-text.png');
const ZIP_PATH = path.join(BRAND_DIR, 'interlinedlist-brand-kit.zip');

// ─── helpers ──────────────────────────────────────────────────────────────────

function mkdir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function solidBackground(w, h, r, g, b) {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r, g, b } },
  })
    .png()
    .toBuffer();
}

async function renderSvgTransparent(svgPath, size) {
  return sharp(svgPath).resize(size, size).png().toBuffer();
}

async function compositeOnBackground(logoBuf, bgBuf) {
  return sharp(bgBuf)
    .composite([{ input: logoBuf, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function write(buf, filePath) {
  fs.writeFileSync(filePath, buf);
  console.log('  wrote', path.relative(ROOT, filePath));
}

// ─── icon mark ────────────────────────────────────────────────────────────────

const ICON_SIZES = [512, 256, 192, 180, 128, 64, 32, 16];
const ICON_BG_SIZES = [512, 256, 128, 64]; // sizes for on-white / on-black

async function generateIcons() {
  mkdir(ICON_DIR);
  console.log('\nGenerating icon assets...');

  for (const size of ICON_SIZES) {
    // dark fills on transparent
    const darkBuf = await renderSvgTransparent(DARK_SVG, size);
    await write(darkBuf, path.join(ICON_DIR, `icon-dark-transparent-${size}.png`));

    // light fills on transparent (for placement on dark surfaces)
    if (size >= 32) {
      const lightBuf = await renderSvgTransparent(LIGHT_SVG, size);
      await write(lightBuf, path.join(ICON_DIR, `icon-light-transparent-${size}.png`));
    }
  }

  for (const size of ICON_BG_SIZES) {
    const darkBuf = await renderSvgTransparent(DARK_SVG, size);
    const lightBuf = await renderSvgTransparent(LIGHT_SVG, size);

    // dark logo on white background
    const whiteBg = await solidBackground(size, size, 255, 255, 255);
    await write(await compositeOnBackground(darkBuf, whiteBg), path.join(ICON_DIR, `icon-on-white-${size}.png`));

    // light logo on black background
    const blackBg = await solidBackground(size, size, 0, 0, 0);
    await write(await compositeOnBackground(lightBuf, blackBg), path.join(ICON_DIR, `icon-on-black-${size}.png`));

    // dark logo on ocean-blue brand background (#0F4C5F)
    const oceanBg = await solidBackground(size, size, 15, 76, 95);
    await write(await compositeOnBackground(darkBuf, oceanBg), path.join(ICON_DIR, `icon-on-ocean-${size}.png`));
  }
}

// ─── logotype ─────────────────────────────────────────────────────────────────

// Source: 2150 × 528 px
const LOGOTYPE_WIDTHS = [1200, 600, 400, 200];

async function stripWhiteBackground(inputPath) {
  const tmp = path.join(BRAND_DIR, '_logotype-transparent-tmp.png');
  execSync(`magick "${inputPath}" -fuzz 5% -transparent white "${tmp}"`);
  const buf = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  return buf;
}

async function generateLogotypes() {
  mkdir(LOGOTYPE_DIR);
  console.log('\nGenerating logotype assets...');

  const transparentBuf = await stripWhiteBackground(LOGOTYPE_PNG);

  for (const w of LOGOTYPE_WIDTHS) {
    const h = Math.round(w * (528 / 2150));

    const resized = await sharp(transparentBuf).resize(w, h).png().toBuffer();
    await write(resized, path.join(LOGOTYPE_DIR, `logotype-transparent-${w}w.png`));

    if (w >= 400) {
      // on white
      const whiteBg = await solidBackground(w, h, 255, 255, 255);
      await write(
        await compositeOnBackground(resized, whiteBg),
        path.join(LOGOTYPE_DIR, `logotype-on-white-${w}w.png`),
      );

      // on black
      const blackBg = await solidBackground(w, h, 0, 0, 0);
      await write(
        await compositeOnBackground(resized, blackBg),
        path.join(LOGOTYPE_DIR, `logotype-on-black-${w}w.png`),
      );

      // on ocean blue (#0F4C5F)
      const oceanBg = await solidBackground(w, h, 15, 76, 95);
      await write(
        await compositeOnBackground(resized, oceanBg),
        path.join(LOGOTYPE_DIR, `logotype-on-ocean-${w}w.png`),
      );
    }
  }
}

// ─── SVG sources ──────────────────────────────────────────────────────────────

function copySourceSvgs() {
  mkdir(SVG_DIR);
  console.log('\nCopying SVG sources...');
  for (const [src, dest] of [
    [DARK_SVG, path.join(SVG_DIR, 'logo-dark.svg')],
    [LIGHT_SVG, path.join(SVG_DIR, 'logo-light.svg')],
  ]) {
    fs.copyFileSync(src, dest);
    console.log('  wrote', path.relative(ROOT, dest));
  }
}

// ─── ZIP ──────────────────────────────────────────────────────────────────────

function buildZip() {
  console.log('\nBuilding ZIP...');
  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
  execSync(
    `cd "${BRAND_DIR}" && zip -r "interlinedlist-brand-kit.zip" icon/ logotype/ svg/ -x "*.DS_Store"`,
  );
  const size = (fs.statSync(ZIP_PATH).size / 1024).toFixed(1);
  console.log(`  wrote interlinedlist-brand-kit.zip (${size} KB)`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('InterlinedList brand asset generator');
  console.log('Output:', BRAND_DIR);
  mkdir(BRAND_DIR);

  await generateIcons();
  await generateLogotypes();
  copySourceSvgs();
  buildZip();

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
