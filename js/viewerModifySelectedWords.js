import scribe from '../scribe.js/scribe.js';
// eslint-disable-next-line import/no-cycle
import { ScribeViewer } from '../viewer.js';

export function deleteSelectedWord() {
  const selectedObjects = ScribeViewer.CanvasSelection.getKonvaWords();
  const selectedN = selectedObjects.length;

  /** @type {Object<string, Array<string>>} */
  const selectedIds = {};
  for (let i = 0; i < selectedN; i++) {
    const wordIdI = selectedObjects[i].word.id;
    const n = selectedObjects[i].word.line.page.n;
    if (!selectedIds[n]) selectedIds[n] = [];
    selectedIds[n].push(wordIdI);
    selectedObjects[i].destroy();
  }

  for (const [n, ids] of Object.entries(selectedIds)) {
    scribe.utils.ocr.deletePageWords(scribe.data.ocr.active[n], ids);
  }

  ScribeViewer.destroyControls();

  ScribeViewer.layerText.batchDraw();

  // Re-render the page if the user has selected the option to outline lines to update the line boxes.
  if (ScribeViewer.opt.outlineLines) ScribeViewer.displayPage(ScribeViewer.state.cp.n);
}

/**
 *
 * @param {'left'|'right'} side
 * @param {number} amount
 * @returns
 */
export function modifySelectedWordBbox(side, amount) {
  // const words = ScribeCanvas.getKonvaWords();
  const selectedWords = ScribeViewer.CanvasSelection.getKonvaWords();
  if (selectedWords.length !== 1) return;
  const selectedWord = selectedWords[0];

  selectedWord.word.bbox[side] += amount;
  if (side === 'left') selectedWord.x(selectedWord.x() + amount);
  ScribeViewer.KonvaIText.updateWordCanvas(selectedWord);
}

/**
 *
 * @param {('normal'|'italic'|'bold')} style
 */
export async function modifySelectedWordStyle(style) {
  const selectedObjects = ScribeViewer.CanvasSelection.getKonvaWords();
  if (!selectedObjects || selectedObjects.length === 0) return;

  if (ScribeViewer.KonvaIText.inputRemove) ScribeViewer.KonvaIText.inputRemove();

  // If first word style already matches target style, disable the style.
  const enable = selectedObjects[0].word.style !== style;
  const newStyle = enable ? style : 'normal';

  const selectedN = selectedObjects.length;
  for (let i = 0; i < selectedN; i++) {
    const wordI = selectedObjects[i];

    wordI.word.style = newStyle;

    // wordI.fontStyle = newStyle;

    const fontI = scribe.data.font.getFont(wordI.fontFamilyLookup, newStyle);

    wordI.fontFaceName = fontI.fontFaceName;
    wordI.fontFaceStyle = fontI.fontFaceStyle;
    wordI.fontFaceWeight = fontI.fontFaceWeight;
    wordI.smallCapsMult = fontI.smallCapsMult;

    wordI.fontFamilyLookup = fontI.family;

    await ScribeViewer.KonvaIText.updateWordCanvas(wordI);
  }

  ScribeViewer.layerText.batchDraw();
  ScribeViewer.KonvaOcrWord.updateUI();
}

/**
 *
 * @param {string|number} fontSizeStr - String containing (1) 'plus', (2) 'minus', or (3) a numeric size.
 */
export async function modifySelectedWordFontSize(fontSizeStr) {
  const selectedObjects = ScribeViewer.CanvasSelection.getKonvaWords();
  if (!selectedObjects || selectedObjects.length === 0) return;

  let fontSize;
  if (fontSizeStr === 'plus') {
    fontSize = selectedObjects[0].fontSize + 1;
  } else if (fontSizeStr === 'minus') {
    fontSize = selectedObjects[0].fontSize - 1;
  } else if (typeof fontSizeStr === 'number') {
    fontSize = fontSizeStr;
  } else {
    fontSize = parseFloat(fontSizeStr);
  }

  const selectedN = selectedObjects.length;
  for (let i = 0; i < selectedN; i++) {
    const wordI = selectedObjects[i];

    // If multiple words are selected, the change in font size only applies to the non-superscript words.
    // Without this behavior, selecting a large area and standardizing the font size would result in
    // the superscripted text becoming the same size as the non-superscript text.
    if (selectedN > 1 && wordI.word.sup) continue;

    wordI.word.size = fontSize;

    wordI.fontSize = fontSize;

    await ScribeViewer.KonvaIText.updateWordCanvas(wordI);
  }
  ScribeViewer.layerText.batchDraw();
  ScribeViewer.KonvaOcrWord.updateUI();
}

export async function modifySelectedWordFontFamily(fontName) {
  const selectedObjects = ScribeViewer.CanvasSelection.getKonvaWords();
  if (!selectedObjects) return;

  const selectedN = selectedObjects.length;
  for (let i = 0; i < selectedN; i++) {
    const wordI = selectedObjects[i];

    const fontI = scribe.data.font.getFont(fontName, wordI.word.style);

    if (fontName === 'Default') {
      wordI.word.font = null;
    } else {
      wordI.word.font = fontName;
    }

    wordI.fontFaceName = fontI.fontFaceName;
    wordI.fontFaceStyle = fontI.fontFaceStyle;
    wordI.fontFaceWeight = fontI.fontFaceWeight;
    wordI.smallCapsMult = fontI.smallCapsMult;

    wordI.fontFamilyLookup = fontI.family;

    await ScribeViewer.KonvaIText.updateWordCanvas(wordI);
  }
  ScribeViewer.layerText.batchDraw();
}

/**
 *
 * @param {boolean} enable
 */
export function modifySelectedWordSuper(enable) {
  const selectedObjects = ScribeViewer.CanvasSelection.getKonvaWords();
  if (!selectedObjects || selectedObjects.length === 0) return;
  const selectedN = selectedObjects.length;
  for (let i = 0; i < selectedN; i++) {
    const wordI = selectedObjects[i];
    // wordI.word.sup = !wordI.word.sup;
    wordI.word.sup = enable;
  }

  ScribeViewer.displayPage(ScribeViewer.state.cp.n);
}

/**
 *
 * @param {boolean} enable
 */
export async function modifySelectedWordSmallCaps(enable) {
  const selectedObjects = ScribeViewer.CanvasSelection.getKonvaWords();
  if (!selectedObjects || selectedObjects.length === 0) return;
  const selectedN = selectedObjects.length;

  for (let i = 0; i < selectedN; i++) {
    const wordI = selectedObjects[i];
    wordI.word.smallCaps = enable;
    await ScribeViewer.KonvaIText.updateWordCanvas(wordI);
  }
  ScribeViewer.layerText.batchDraw();
}
