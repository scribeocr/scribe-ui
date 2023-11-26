// This file contains utility functions for calculating statistics using Opentype.js font objects.
// The only import/dependency this file should have (aside from importing misc utility functions) should be fontObjects.js.

/**
 * Calculates font size by comparing provided character height to font metrics.
 * 
 * @param {fontContainerFont} font
 * @param {number} charHeightActual - Actual, measured height of character in pixels.
 * @param {string} [compChar='o'] - Character to compare `charHeightActual` against (default is 'o').
 * @returns {Promise<number>} A promise that resolves to the calculated font size.
 * 
 * Note: The default value "o" corresponds to the x-height stat better than "x" does. 
 */
export async function getFontSize(font, charHeightActual, compChar = "o"){

  const fontOpentypeI = await font.opentype;

  const charMetrics = fontOpentypeI.charToGlyph(compChar).getMetrics();
  const charHeight = (charMetrics.yMax - charMetrics.yMin) * (1 / fontOpentypeI.unitsPerEm);

  return Math.round(charHeightActual / charHeight);

}

/**
 * @typedef WordMetrics
 * @type {object}
 * @property {number} visualWidth - Width of printed characters in px (does not include left/right bearings).
 * @property {number} leftSideBearing - Width of left bearing in px.
 * @property {number} rightSideBearing - Width of right bearing in px.
 */
/**  
 * @param {string} wordText
 * @param {fontContainerFont} font
 * @param {number} fontSize
 * @async 
 * @return {Promise<WordMetrics>} 
 */
export async function calcWordMetrics(wordText, font, fontSize){

  // // Calculate font glyph metrics for precise positioning
  const fontOpentypeI = await font.opentype;

  let wordWidth1 = 0;
  const wordTextArr = wordText.split("");
  for (let i=0; i<wordTextArr.length; i++) {
    const charI = wordTextArr[i];
    const charJ = wordTextArr[i+1];
    wordWidth1 += fontOpentypeI.charToGlyph(charI).advanceWidth;
    if (charJ) wordWidth1 += fontOpentypeI.getKerningValue(fontOpentypeI.charToGlyph(charI),fontOpentypeI.charToGlyph(charJ));
  }

  const wordLastGlyphMetrics = fontOpentypeI.charToGlyph(wordText.substr(-1)).getMetrics();
  const wordFirstGlyphMetrics = fontOpentypeI.charToGlyph(wordText.substr(0,1)).getMetrics();

  const wordLeftBearing = wordFirstGlyphMetrics.leftSideBearing;
  const wordRightBearing = wordLastGlyphMetrics.rightSideBearing;

  const wordWidthPx = (wordWidth1 - wordRightBearing - wordLeftBearing) * (fontSize / fontOpentypeI.unitsPerEm);
  const wordLeftBearingPx = wordLeftBearing * (fontSize / fontOpentypeI.unitsPerEm);
  const wordRightBearingPx = wordRightBearing * (fontSize / fontOpentypeI.unitsPerEm);

  return {"visualWidth": wordWidthPx, "leftSideBearing": wordLeftBearingPx, "rightSideBearing": wordRightBearingPx}

}


/**
 * Calculates char spacing required for the specified word to be rendered at specified width.
 * 
 * @param {string} wordText - 
 * @param {fontContainerFont} font
 * @param {number} fontSize - 
 * @param {number} actualWidth - The actual width the word should be scaled to
 */
export async function calcCharSpacing(wordText, font, fontSize, actualWidth) {
  if(wordText.length < 2) return 0;

  const wordWidth = (await calcWordMetrics(wordText, font, fontSize))["visualWidth"];

  const charSpacing = Math.round((actualWidth - wordWidth) / (wordText.length - 1)*1e3)/1e3;

  return charSpacing;

}

/**
 * Calculate font size for word.
 * Returns null for any word where the default size for the line should be used.
 * This function differs from accessing the `word.font` property in that
 * @param {ocrWord} word
 * @param {fontContainerAll} fontContainer
 */
export const calcWordFontSize = async (word, fontContainer) => {

  // TODO: Figure out how to get types to work with this
  const font = fontContainer[word.font || globalSettings.defaultFont]["normal"];

  if (word.size) {
      return word.size;
  } else if (word.sup) {
      return await getFontSize(font, word.bbox[3] - word.bbox[1], "1");
  } else if (word.dropcap) {
      return await getFontSize(font, word.bbox[3] - word.bbox[1], word.text.slice(0, 1));
  } else {
      return null;
  }
}

// Font size, unlike other characteristics (e.g. bbox and baseline), does not come purely from pixels on the input image. 
// This is because different fonts will create different sized characters even when the nominal "font size" is identical. 
// Therefore, the appropriate font size must be calculated using (1) the character stats from the input image and 
// (2) stats regarding the font being used. 
/**
* Get or calculate font size for line.
* This value will either be (1) a manually set value or (2) a value calculated using line metrics.
* @param {ocrLine} line
 * @param {fontContainerAll} fontContainer
*/
export const calcLineFontSize = async (line, fontContainer) => {

  if (line._size) return line._size;

  if (line._sizeCalc) return line._sizeCalc;

  // The font of the first word is used (if present), otherwise the default font is used.
  const font = fontContainer[line.words[0]?.font || globalSettings.defaultFont]["normal"];

  // Font size is calculated using either (1) the ascender height or (2) the x-height.
  // If both metrics are present both are used and the result is averaged.
  if (line.ascHeight && !line.xHeight) {
      line._sizeCalc = await getFontSize(font, line.ascHeight, "A");
  } else if (!line.ascHeight && line.xHeight) {
      line._sizeCalc = await getFontSize(font, line.xHeight, "o");
  } else if (line.ascHeight && line.xHeight) {
      const size1 = await getFontSize(font, line.ascHeight, "A");
      const size2 = await getFontSize(font, line.xHeight, "o");
      line._sizeCalc = Math.floor((size1 + size2) / 2);
  } 

  return line._sizeCalc;

}
