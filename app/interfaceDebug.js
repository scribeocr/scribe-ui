/* eslint-disable import/no-cycle */

import { renderPageStatic } from '../scribe.js/js/debug.js';
import scribe from '../scribe.js/scribe.js';
import { elem } from './elems.js';
import {
  ScribeCanvas,
  stateGUI,
} from '../viewer/viewerCanvas.js';
import { saveAs } from './utils/utils.js';

/**
 * Print the code needed to access a specific OCR word.
 * This is useful for generating automated tests.
 * @param {OcrWord} word
 */
const printOcrWordCode = (word) => {
  if (!scribe.data.ocr.active[stateGUI.cp.n]) return;
  let i = 0;
  let j = 0;
  for (i = 0; i < scribe.data.ocr.active[stateGUI.cp.n].lines.length; i++) {
    const line = scribe.data.ocr.active[stateGUI.cp.n].lines[i];
    for (j = 0; j < line.words.length; j++) {
      if (line.words[j].id === word.id) {
        console.log(`scribe.data.ocr.active[${stateGUI.cp.n}].lines[${i}].words[${j}]`);
        return;
      }
    }
  }
};

export function printSelectedWords(printOCR = true) {
  const selectedObjects = ScribeCanvas.CanvasSelection.getKonvaWords();
  if (!selectedObjects) return;
  for (let i = 0; i < selectedObjects.length; i++) {
    if (printOCR) {
      printOcrWordCode(selectedObjects[i].word);
      console.log(selectedObjects[i].word);
    } else {
      console.log(selectedObjects[i]);
    }
  }
}

const ctxDebug = /** @type {CanvasRenderingContext2D} */ (/** @type {HTMLCanvasElement} */ (document.getElementById('g')).getContext('2d'));

export async function showDebugImages() {
  /** @type {Array<Array<CompDebugBrowser>>} */
  const compDebugArrArr = [];

  const compDebugArr1 = scribe.data.debug.debugImg?.['Tesseract Combined']?.[stateGUI.cp.n];
  const compDebugArr2 = scribe.data.debug.debugImg?.Combined?.[stateGUI.cp.n];
  const compDebugArr3 = scribe.data.debug.debugImg?.recognizeArea?.[stateGUI.cp.n];

  if (compDebugArr1 && compDebugArr1.length > 0) compDebugArrArr.push(compDebugArr1);
  if (compDebugArr2 && compDebugArr2.length > 0) compDebugArrArr.push(compDebugArr2);
  if (compDebugArr3 && compDebugArr3.length > 0) compDebugArrArr.push(compDebugArr3);

  if (compDebugArrArr.length > 0) await scribe.utils.drawDebugImages({ ctx: ctxDebug, compDebugArrArr, context: 'browser' });
}

export async function evalSelectedLine() {
  const selectedObjects = ScribeCanvas.CanvasSelection.getKonvaWords();
  if (!selectedObjects || selectedObjects.length === 0) return;

  const word0 = selectedObjects[0].word;

  const res = await scribe.evalOCRPage({ page: word0.line, view: true });

  await scribe.utils.drawDebugImages({ ctx: ctxDebug, compDebugArrArr: [[res.debug[0]]], context: 'browser' });
}

export async function downloadCanvas() {
  const dims = scribe.data.pageMetrics[stateGUI.cp.n].dims;

  const startX = ScribeCanvas.layerText.x() > 0 ? Math.round(ScribeCanvas.layerText.x()) : 0;
  const startY = ScribeCanvas.layerText.y() > 0 ? Math.round(ScribeCanvas.layerText.y()) : 0;
  const width = dims.width * ScribeCanvas.layerText.scaleX();
  const height = dims.height * ScribeCanvas.layerText.scaleY();

  const canvasDataStr = ScribeCanvas.stage.toDataURL({
    x: startX, y: startY, width, height,
  });

  const fileName = `${elem.download.downloadFileName.value.replace(/\.\w{1,4}$/, '')}_canvas_${String(stateGUI.cp.n)}.png`;
  const imgBlob = scribe.utils.imageStrToBlob(canvasDataStr);
  saveAs(imgBlob, fileName);
}

export async function downloadImage(n) {
  const image = scribe.opt.colorMode === 'binary' ? await scribe.data.image.getBinary(n) : await scribe.data.image.getNative(n);
  const filenameBase = `${elem.download.downloadFileName.value.replace(/\.\w{1,4}$/, '')}`;

  const fileName = `${filenameBase}_${String(n).padStart(3, '0')}.${image.format}`;
  const imgBlob = scribe.utils.imageStrToBlob(image.src);
  saveAs(imgBlob, fileName);
}

export async function downloadCurrentImage() {
  await downloadImage(stateGUI.cp.n);
}

export async function downloadAllImages() {
  const binary = scribe.opt.colorMode === 'binary';
  for (let i = 0; i < scribe.data.image.pageCount; i++) {
    await downloadImage(i);
    // Not all files will be downloaded without a delay between downloads
    await new Promise((r) => setTimeout(r, 200));
  }
}

elem.info.downloadStaticVis.addEventListener('click', async () => {
  const fileName = `${elem.download.downloadFileName.value.replace(/\.\w{1,4}$/, '')}.png`;
  const pngBlob = await renderPageStatic(scribe.data.ocr.active[stateGUI.cp.n]);
  saveAs(pngBlob, fileName);
});

elem.info.downloadPDFFonts.addEventListener('click', async () => {
  const muPDFScheduler = await scribe.data.image.muPDFScheduler;
  if (!muPDFScheduler) return;
  muPDFScheduler.extractAllFonts().then(async (x) => {
    for (let i = 0; i < x.length; i++) {
      saveAs(x[i], `font_${String(i).padStart(2, '0')}.ttf`);
    }
  });
});

export function getExcludedText() {
  for (let i = 0; i <= scribe.data.ocr.active.length; i++) {
    const textArr = getExcludedTextPage(scribe.data.ocr.active[i], scribe.data.layoutRegions.pages[i]);

    if (textArr.length > 0) {
      textArr.map((x) => console.log(`${x} [Page ${String(i)}]`));
    }
  }
}

// Get array of text that will be excluded from exports due to "exclude" layout boxes.
// This was largely copy/pasted from `reorderHOCR` for convenience, so should be rewritten at some point.

/**
 * @param {OcrPage} pageA
 * @param {LayoutPage} layoutObj
 * @param {boolean} [applyExclude=true]
 */
export function getExcludedTextPage(pageA, layoutObj, applyExclude = true) {
  const excludedArr = [];

  if (!layoutObj?.boxes || Object.keys(layoutObj?.boxes).length === 0) return excludedArr;

  const orderArr = Array(pageA.lines.length);

  // 10 assumed to be lowest priority for text included in the output and is assigned to any word that does not overlap with a "order" layout box
  orderArr.fill(10);

  for (let i = 0; i < pageA.lines.length; i++) {
    const lineA = pageA.lines[i];

    for (const [id, obj] of Object.entries(layoutObj.boxes)) {
      const overlap = scribe.utils.calcBoxOverlap(lineA.bbox, obj.coords);
      if (overlap > 0.5) {
        if (obj.type === 'order') {
          orderArr[i] = obj.order;
        } else if (obj.type === 'exclude' && applyExclude) {
          const { words } = lineA;
          let text = '';
          for (let j = 0; j < words.length; j++) {
            text += `${words[j].text} `;
          }
          excludedArr.push(text);
        }
      }
    }
  }

  return excludedArr;
}

// function lookupKerning(letterA, letterB) {
//   return fontMetricsObj.SerifDefault.normal.kerning[`${letterA.charCodeAt(0)},${letterB.charCodeAt(0)}`];
// }
