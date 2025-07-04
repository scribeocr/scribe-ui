// import Konva from '../lib/konva/index.js';
import Konva from './konva/index.js';
import scribe from '../scribe.js/scribe.js';
// eslint-disable-next-line import/no-cycle
import {
  ScribeViewer,
} from '../viewer.js';
import { KonvaIText } from './viewerWordObjects.js';

const colColorsHex = ['#287bb5', '#19aa9a', '#099b57'];

/**
 * Converts a hex color to rgba with a specified alpha.
 * @param {string} hex - The hex color code.
 * @param {number} alpha - The alpha value for the rgba color.
 * @returns {string} The rgba color string.
 */
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const setAlpha = (color, alpha) => color.replace(/,\s*[\d.]+\)/, `,${alpha})`);

/**
 * Subclass of Konva.Rect that represents a layout box, which is a rectangle that represents a region of the page, along with an optional editable textbox.
 * The textbox is implemented by manually adding a second Konva object, that moves when the rectangle moves, and is deleted when the rectangle is deleted.
 * This was chosen rather than the built-in Konva "group" object, which appears to offer a cleaner way to group objects,
 * as preliminary testing showed the latter method was less performant and less flexible.
 */
export class KonvaLayout extends Konva.Rect {
  /**
   *
   * @param {LayoutDataColumn|LayoutRegion} layoutBox
   */
  constructor(layoutBox) {
    const origX = layoutBox.coords.left;
    const origY = layoutBox.coords.top;
    const width = layoutBox.coords.right - layoutBox.coords.left;
    const height = layoutBox.coords.bottom - layoutBox.coords.top;

    // `instanceof LayoutDataColumn` should not be used to determine the type of the layout box,
    // as this will fail for layout boxes that were created in another thread.
    const n = layoutBox.type === 'dataColumn' ? layoutBox.table.page.n : layoutBox.page.n;

    // "Order" boxes are blue, "exclude" boxes are red, data columns are uncolored, as the color is added by the table.
    let fill;
    let stroke;
    if (layoutBox.type === 'order') {
      fill = 'rgba(0,137,114,0.25)';
      stroke = 'rgba(0,137,114,0.4)';
    } else if (layoutBox.type === 'exclude') {
      fill = 'rgba(193,84,57,0.25)';
      stroke = 'rgba(0,137,114,0.4)';
    } else if (layoutBox.type === 'dataColumn') {
      const colIndex = layoutBox.table.boxes.findIndex((x) => x.id === layoutBox.id);
      const colorBase = colColorsHex[colIndex % colColorsHex.length];
      fill = hexToRgba(colorBase, 0.3);
    }

    super({
      x: origX,
      y: origY,
      width,
      height,
      fill,
      stroke,
      strokeWidth: 2,
      strokeScaleEnabled: false,
      draggable: true,
    });

    this.select = () => {
      this.stroke('rgba(40,123,181,1)');
      this.fill(setAlpha(this.fill(), 0.4));
    };

    this.deselect = () => {
      this.stroke('rgba(40,123,181,0.4)');
      this.fill(setAlpha(this.fill(), 0.25));
    };

    this.destroyRect = this.destroy;
    this.destroy = () => {
      if (this.label) this.label.destroy();
      this.label = undefined;
      // Deselect the box if it is selected.
      ScribeViewer.CanvasSelection.deselectDataColumnsByIds([this.layoutBox.id]);

      this.destroyRect();
      return this;
    };

    // `instanceof LayoutDataColumn` should not be used to determine the type of the layout box,
    // as this will fail for layout boxes that were created in another thread.
    if (layoutBox.type === 'order') {
      // Create dummy ocr data for the order box
      const pageObj = new scribe.utils.ocr.OcrPage(n, { width: 1, height: 1 });
      const box = {
        left: 0, right: 0, top: 0, bottom: 0,
      };
      const lineObjTemp = new scribe.utils.ocr.OcrLine(pageObj, box, [0, 0], 10, null);
      pageObj.lines = [lineObjTemp];
      const wordIDNew = scribe.utils.getRandomAlphanum(10);
      const wordObj = new scribe.utils.ocr.OcrWord(lineObjTemp, String(layoutBox.order), box, wordIDNew);
      wordObj.visualCoords = false;
      wordObj.style.size = 50;
      const label = new KonvaIText({
        x: origX + width * 0.5,
        yActual: origY + height * 0.5,
        word: wordObj,
        dynamicWidth: true,
        changeTextCallback: async (obj) => {
          layoutBox.order = parseInt(obj.word.text);
        },
        inputTextCallback: async (obj) => {
          if (!KonvaIText.input) return;
          // Empty is the only allowed non-numeric value.
          if (KonvaIText.input.textContent === '') return;
          if (!KonvaIText.input.textContent
            || /[^\d]/.test(KonvaIText.input.textContent)
            || parseInt(KonvaIText.input.textContent) < 0
            || parseInt(KonvaIText.input.textContent) > 99) {
            KonvaIText.input.innerHTML = KonvaIText.inputInnerHTMLLast;
            KonvaIText.setCursor(KonvaIText.inputCursorLast);
            return;
          }
        },
      });
      this.label = label;
    }

    this.layoutBox = layoutBox;

    this.addEventListener('transformend', () => {
      KonvaLayout.updateLayoutBoxes(this);
    });

    this.addEventListener('dragmove', () => {
      if (ScribeViewer.KonvaIText.input && ScribeViewer.KonvaIText.input.parentElement && ScribeViewer.KonvaIText.inputRemove) ScribeViewer.KonvaIText.inputRemove();
      if (this.label) {
        this.label.x(this.x() + this.width() * 0.5);
        this.label.yActual = this.y() + this.height() * 0.5;
        KonvaIText.updateWordCanvas(this.label);
      }
    });

    this.addEventListener('dragend', () => {
      KonvaLayout.updateLayoutBoxes(this);
    });
  }

  /**
   * Add controls for editing.
   * @param {KonvaLayout|KonvaDataColumn} konvaLayout
   */
  static updateLayoutBoxes(konvaLayout) {
    const n = konvaLayout.layoutBox.type === 'dataColumn' ? konvaLayout.layoutBox.table.page.n : konvaLayout.layoutBox.page.n;
    const width = konvaLayout.width() * konvaLayout.scaleX();
    const height = konvaLayout.height() * konvaLayout.scaleY();
    const right = konvaLayout.x() + width;
    const bottom = konvaLayout.y() + height;
    konvaLayout.layoutBox.coords = {
      left: konvaLayout.x(), top: konvaLayout.y(), right, bottom,
    };
    scribe.data.layoutRegions.pages[n].default = false;
    scribe.data.layoutDataTables.pages[n].default = false;
  }

  /**
   * Update the UI to reflect the properties of the selected objects.
   * Should be called after new objects are selected.
   */
  static updateUI = () => { };
}

class KonvaRegionControlHorizontal extends Konva.Line {
  /**
   *
   * @param {KonvaRegion} konvaRegion
   */
  constructor(konvaRegion, top = true) {
    super({
      x: konvaRegion.layoutBox.coords.left,
      y: top ? konvaRegion.layoutBox.coords.top : konvaRegion.layoutBox.coords.bottom,
      points: [0, 0, konvaRegion.layoutBox.coords.right - konvaRegion.layoutBox.coords.left, 0],
      stroke: 'black',
      strokeWidth: 2,
      strokeScaleEnabled: false,
      draggable: true,
      dragBoundFunc(pos) {
        const newY = Math.max(this.boundTop, Math.min(this.boundBottom, pos.y));

        return {
          x: this.absolutePosition().x,
          y: newY,
        };
      },
      hitFunc(context, shape) {
        context.beginPath();
        context.rect(0, -3, shape.width(), 6);
        context.closePath();
        context.fillStrokeShape(shape);
      },

    });

    const n = konvaRegion.layoutBox.page.n;

    this.konvaRegion = konvaRegion;

    this.boundTop = 0;
    this.boundBottom = 10000;

    this.on('dragstart', () => {
      ScribeViewer.drag.isResizingColumns = true;

      const group = ScribeViewer.getOverlayGroup(n);

      if (top) {
        this.boundTop = group.getAbsoluteTransform().m[5];
        this.boundBottom = this.konvaRegion.bottomControl.getAbsolutePosition().y - 20;
      } else {
        this.boundTop = this.konvaRegion.topControl.getAbsolutePosition().y + 20;
        this.boundBottom = group.getAbsoluteTransform().m[5] + scribe.data.pageMetrics[n].dims.height * group.getAbsoluteScale().y;
      }
    });
    this.addEventListener('dragmove', () => {
      if (top) {
        this.konvaRegion.layoutBox.coords.top = this.y();

        this.konvaRegion.y(this.konvaRegion.layoutBox.coords.top);
        this.konvaRegion.height(this.konvaRegion.layoutBox.coords.bottom - this.konvaRegion.layoutBox.coords.top);

        this.konvaRegion.leftControl.y(this.konvaRegion.layoutBox.coords.top);
        this.konvaRegion.rightControl.y(this.konvaRegion.layoutBox.coords.top);
        this.konvaRegion.leftControl.points([0, 0, 0, konvaRegion.layoutBox.coords.bottom - this.konvaRegion.layoutBox.coords.top]);
        this.konvaRegion.rightControl.points([0, 0, 0, konvaRegion.layoutBox.coords.bottom - this.konvaRegion.layoutBox.coords.top]);
      } else {
        this.konvaRegion.layoutBox.coords.bottom = this.y();

        this.konvaRegion.height(this.konvaRegion.layoutBox.coords.bottom - this.konvaRegion.layoutBox.coords.top);

        this.konvaRegion.leftControl.points([0, 0, 0, konvaRegion.layoutBox.coords.bottom - this.konvaRegion.layoutBox.coords.top]);
        this.konvaRegion.rightControl.points([0, 0, 0, konvaRegion.layoutBox.coords.bottom - this.konvaRegion.layoutBox.coords.top]);
      }

      if (this.konvaRegion.label) {
        this.konvaRegion.label.x(this.konvaRegion.x() + this.konvaRegion.width() * 0.5);
        this.konvaRegion.label.yActual = this.konvaRegion.y() + this.konvaRegion.height() * 0.5;
        KonvaIText.updateWordCanvas(this.konvaRegion.label);
      }
    });
    this.addEventListener('dragend', () => {
      ScribeViewer.drag.isResizingColumns = false;
    });

    this.on('mouseover', () => {
      document.body.style.cursor = 'row-resize';
    });
    this.on('mouseout', () => {
      document.body.style.cursor = 'default';
    });
  }
}

class KonvaRegionControlVertical extends Konva.Line {
  /**
   *
   * @param {KonvaRegion} konvaRegion
   */
  constructor(konvaRegion, left = true) {
    super({
      x: left ? konvaRegion.layoutBox.coords.left : konvaRegion.layoutBox.coords.right,
      y: konvaRegion.layoutBox.coords.top,
      points: [0, 0, 0, konvaRegion.layoutBox.coords.bottom - konvaRegion.layoutBox.coords.top],
      stroke: 'black',
      strokeWidth: 2,
      strokeScaleEnabled: false,
      draggable: true,
      dragBoundFunc(pos) {
        const newX = Math.max(this.boundLeft, Math.min(this.boundRight, pos.x));

        // Restrict vertical movement by setting the y position to the initial y position.
        return {
          x: newX,
          y: this.absolutePosition().y,
        };
      },
      hitFunc(context, shape) {
        context.beginPath();
        context.rect(-3, 0, 6, shape.height());
        context.closePath();
        context.fillStrokeShape(shape);
      },
    });

    const n = konvaRegion.layoutBox.page.n;

    this.konvaRegion = konvaRegion;

    this.boundLeft = 0;
    this.boundRight = 10000;

    this.on('dragstart', () => {
      ScribeViewer.drag.isResizingColumns = true;

      const group = ScribeViewer.getOverlayGroup(n);

      if (left) {
        this.boundLeft = group.getAbsoluteTransform().m[4];
        this.boundRight = this.konvaRegion.rightControl.getAbsolutePosition().x - 20;
      } else {
        this.boundLeft = this.konvaRegion.leftControl.getAbsolutePosition().x + 20;
        this.boundRight = group.getAbsoluteTransform().m[4] + scribe.data.pageMetrics[n].dims.width * group.getAbsoluteScale().x;
      }
    });
    this.addEventListener('dragmove', () => {
      if (left) {
        this.konvaRegion.layoutBox.coords.left = this.x();
        this.konvaRegion.x(this.konvaRegion.layoutBox.coords.left);
        this.konvaRegion.width(this.konvaRegion.layoutBox.coords.right - this.konvaRegion.layoutBox.coords.left);

        this.konvaRegion.topControl.x(this.konvaRegion.layoutBox.coords.left);
        this.konvaRegion.bottomControl.x(this.konvaRegion.layoutBox.coords.left);
        this.konvaRegion.topControl.points([0, 0, konvaRegion.layoutBox.coords.right - this.konvaRegion.layoutBox.coords.left, 0]);
        this.konvaRegion.bottomControl.points([0, 0, konvaRegion.layoutBox.coords.right - this.konvaRegion.layoutBox.coords.left, 0]);
      } else {
        this.konvaRegion.layoutBox.coords.right = this.x();
        this.konvaRegion.width(this.konvaRegion.layoutBox.coords.right - this.konvaRegion.layoutBox.coords.left);

        this.konvaRegion.topControl.points([0, 0, konvaRegion.layoutBox.coords.right - konvaRegion.layoutBox.coords.left, 0]);
        this.konvaRegion.bottomControl.points([0, 0, konvaRegion.layoutBox.coords.right - konvaRegion.layoutBox.coords.left, 0]);
      }

      if (this.konvaRegion.label) {
        this.konvaRegion.label.x(this.konvaRegion.x() + this.konvaRegion.width() * 0.5);
        this.konvaRegion.label.yActual = this.konvaRegion.y() + this.konvaRegion.height() * 0.5;
        KonvaIText.updateWordCanvas(this.konvaRegion.label);
      }
    });
    this.addEventListener('dragend', () => {
      ScribeViewer.drag.isResizingColumns = false;
    });

    this.on('mouseover', () => {
      document.body.style.cursor = 'col-resize';
    });
    this.on('mouseout', () => {
      document.body.style.cursor = 'default';
    });
  }
}

export class KonvaDataTableControl extends Konva.Line {
  /**
   *
   * @param {KonvaDataTable} konvaTable
   */
  constructor(konvaTable, top = true) {
    super({
      x: konvaTable.coords.left,
      y: top ? konvaTable.coords.top : konvaTable.coords.bottom,
      points: [0, 0, konvaTable.coords.right - konvaTable.coords.left, 0],
      stroke: 'black',
      strokeWidth: 2,
      strokeScaleEnabled: false,
      draggable: true,
      dragBoundFunc(pos) {
        const newY = Math.max(this.boundTop, Math.min(this.boundBottom, pos.y));

        return {
          x: this.absolutePosition().x,
          y: newY,
        };
      },
      hitFunc(context, shape) {
        context.beginPath();
        context.rect(0, -3, shape.width(), 6);
        context.closePath();
        context.fillStrokeShape(shape);
      },

    });

    const n = konvaTable.layoutDataTable.page.n;

    this.konvaTable = konvaTable;

    this.boundTop = 0;
    this.boundBottom = 10000;

    this.on('dragstart', () => {
      ScribeViewer.drag.isResizingColumns = true;

      const group = ScribeViewer.getOverlayGroup(n);

      if (top) {
        this.boundTop = group.getAbsoluteTransform().m[5];
        this.boundBottom = this.konvaTable.bottomControl.getAbsolutePosition().y - 20;
      } else {
        this.boundTop = this.konvaTable.topControl.getAbsolutePosition().y + 20;
        this.boundBottom = group.getAbsoluteTransform().m[5] + scribe.data.pageMetrics[n].dims.height * group.getAbsoluteScale().y;
      }
    });
    this.addEventListener('dragmove', () => {
      if (top) {
        this.konvaTable.coords.top = this.y();
        konvaTable.columns.forEach((column) => {
          column.layoutBox.coords.top = this.y();
          column.y(this.y());
          column.height(column.layoutBox.coords.bottom - this.y());
        });
        konvaTable.colLines.forEach((colLine) => {
          colLine.y(this.y());
          colLine.points([0, 0, 0, konvaTable.coords.bottom - konvaTable.coords.top]);
        });
      } else {
        this.konvaTable.coords.bottom = this.y();
        konvaTable.columns.forEach((column) => {
          column.layoutBox.coords.bottom = this.y();
          column.height(this.y() - column.layoutBox.coords.top);
        });
        konvaTable.colLines.forEach((colLine) => {
          colLine.points([0, 0, 0, konvaTable.coords.bottom - konvaTable.coords.top]);
        });
      }
    });
    this.addEventListener('dragend', () => {
      ScribeViewer.drag.isResizingColumns = false;
      renderLayoutDataTable(this.konvaTable.layoutDataTable);
    });

    this.on('mouseover', () => {
      document.body.style.cursor = 'row-resize';
    });
    this.on('mouseout', () => {
      document.body.style.cursor = 'default';
    });
  }
}

export class KonvaDataColSep extends Konva.Line {
  /**
   *
   * @param {KonvaDataColumn} columnLeft
   * @param {KonvaDataColumn} columnRight
   * @param {KonvaDataTable} konvaTable
   */
  constructor(columnLeft, columnRight, konvaTable) {
    const x = columnRight ? columnRight.layoutBox.coords.left : columnLeft.layoutBox.coords.right;
    const y = columnRight ? columnRight.layoutBox.coords.top : columnLeft.layoutBox.coords.top;
    super({
      x,
      y,
      points: [0, 0, 0, konvaTable.coords.bottom - konvaTable.coords.top],
      stroke: 'black',
      strokeWidth: 2,
      strokeScaleEnabled: false,
      draggable: true,
      dragBoundFunc(pos) {
        const newX = Math.max(this.boundLeft, Math.min(this.boundRight, pos.x));

        // Restrict vertical movement by setting the y position to the initial y position.
        return {
          x: newX,
          y: this.absolutePosition().y,
        };
      },
      hitFunc(context, shape) {
        context.beginPath();
        context.rect(-3, 0, 6, shape.height());
        context.closePath();
        context.fillStrokeShape(shape);
      },

    });

    const n = konvaTable.layoutDataTable.page.n;

    this.next = () => {
      const next = this.konvaTable.colLines.find((obj) => obj.x() > this.x());
      return next;
    };

    this.prev = () => {
      const prev = this.konvaTable.colLines.slice().reverse().find((obj) => obj.x() < this.x());
      return prev;
    };

    this.boundLeft = 0;
    this.boundRight = 10000;

    this.konvaTable = konvaTable;
    this.columnLeft = columnLeft;
    this.columnRight = columnRight;

    this.on('dragstart', () => {
      ScribeViewer.drag.isResizingColumns = true;

      const group = ScribeViewer.getOverlayGroup(n);

      const boundLeftNeighbor = this.prev()?.absolutePosition()?.x;
      const boundRightNeighbor = this.next()?.absolutePosition()?.x;

      const boundLeftRaw = boundLeftNeighbor ?? group.getAbsoluteTransform().m[4];
      const boundRightRaw = boundRightNeighbor ?? group.getAbsoluteTransform().m[4] + scribe.data.pageMetrics[n].dims.width * ScribeViewer.layerOverlay.getAbsoluteScale().x;

      // Add minimum width between columns to prevent lines from overlapping.
      const minColWidthAbs = Math.min((boundRightRaw - boundLeftRaw) / 3, 10);

      this.boundLeft = boundLeftRaw + minColWidthAbs;
      this.boundRight = boundRightRaw - minColWidthAbs;
    });
    this.addEventListener('dragmove', () => {
      if (this.columnLeft) {
        this.columnLeft.layoutBox.coords.right = this.x();
        this.columnLeft.width(this.columnLeft.layoutBox.coords.right - this.columnLeft.layoutBox.coords.left);
      } else {
        this.konvaTable.topControl.x(this.x());
        this.konvaTable.bottomControl.x(this.x());
        this.konvaTable.topControl.points([0, 0, konvaTable.coords.right - this.x(), 0]);
        this.konvaTable.bottomControl.points([0, 0, konvaTable.coords.right - this.x(), 0]);
      }

      if (this.columnRight) {
        this.columnRight.layoutBox.coords.left = this.x();
        this.columnRight.x(this.columnRight.layoutBox.coords.left);
        this.columnRight.width(this.columnRight.layoutBox.coords.right - this.columnRight.layoutBox.coords.left);
      } else {
        this.konvaTable.topControl.points([0, 0, this.x() - konvaTable.coords.left, 0]);
        this.konvaTable.bottomControl.points([0, 0, this.x() - konvaTable.coords.left, 0]);
      }
    });
    this.addEventListener('dragend', () => {
      ScribeViewer.drag.isResizingColumns = false;

      if (!this.columnLeft || !this.columnRight) {
        renderLayoutDataTable(this.konvaTable.layoutDataTable);
      } else {
        if (this.konvaTable.pageObj) {
          this.konvaTable.tableContent = scribe.utils.extractSingleTableContent(this.konvaTable.pageObj, this.konvaTable.layoutBoxesArr);
        }
        KonvaDataTable.colorTableWords(this.konvaTable);
      }
    });

    this.on('mouseover', () => {
      document.body.style.cursor = 'col-resize';
    });
    this.on('mouseout', () => {
      document.body.style.cursor = 'default';
    });
  }
}

/**
 *
 * @param {number} n
 * @returns
 */
export function renderLayoutDataTables(n) {
  if (!scribe.data.layoutDataTables.pages[n].tables) return;
  // ScribeCanvas.destroyLayoutDataTables();
  Object.values(scribe.data.layoutDataTables.pages[n].tables).forEach((table) => {
    renderLayoutDataTable(table);
  });

  ScribeViewer.layerOverlay.batchDraw();
}

export class KonvaDataTable {
  /**
   * @param {OcrPage|undefined} pageObj - The page object that the table is on.
   *    This can be undefined in the fringe case where the user makes layout boxes without any OCR data.
   * @param {InstanceType<typeof scribe.layout.LayoutDataTable>} layoutDataTable
   * @param {boolean} [lockColumns=true]
   */
  constructor(pageObj, layoutDataTable, lockColumns = true) {
    // The `columns` array is expected to be sorted left to right in other code.
    this.layoutBoxesArr = Object.values(layoutDataTable.boxes).sort((a, b) => a.coords.left - b.coords.left);

    const tableLeft = Math.min(...this.layoutBoxesArr.map((x) => x.coords.left));
    const tableRight = Math.max(...this.layoutBoxesArr.map((x) => x.coords.right));
    const tableTop = Math.min(...this.layoutBoxesArr.map((x) => x.coords.top));
    const tableBottom = Math.max(...this.layoutBoxesArr.map((x) => x.coords.bottom));

    this.coords = {
      left: tableLeft, top: tableTop, right: tableRight, bottom: tableBottom,
    };

    this.pageObj = pageObj;

    this.layoutDataTable = layoutDataTable;
    this.lockColumns = lockColumns;

    this.columns = this.layoutBoxesArr.map((layoutBox) => new KonvaDataColumn(layoutBox, this));

    /**
     * Removes the table from the canvas.
     * Does not impact the underlying data.
     */
    this.destroy = () => {
      this.columns.forEach((column) => column.destroy());
      this.colLines.forEach((colLine) => colLine.destroy());
      this.rowLines.forEach((rowLine) => rowLine.destroy());
      this.rowSpans.forEach((rowSpan) => rowSpan.destroy());

      this.topControl.destroy();
      this.bottomControl.destroy();

      // Restore colors of words that were colored by this table.
      const wordIdArr = this.tableContent?.rowWordArr.flat().flat().map((x) => x.id) || [];
      const canvasDeselectWords = ScribeViewer.getKonvaWords().filter((x) => wordIdArr.includes(x.word.id));
      canvasDeselectWords.forEach((x) => {
        const { fill, opacity } = scribe.utils.ocr.getWordFillOpacity(x.word, scribe.opt.displayMode,
          scribe.opt.confThreshMed, scribe.opt.confThreshHigh, scribe.opt.overlayOpacity);

        x.fill(fill);
        x.opacity(opacity);
      });

      return this;
    };

    /**
     * Delete the table, both from the layout data and from the canvas.
     */
    this.delete = () => {
      const tableIndex = scribe.data.layoutDataTables.pages[this.layoutDataTable.page.n].tables.findIndex((x) => x.id === this.layoutDataTable.id);
      scribe.data.layoutDataTables.pages[this.layoutDataTable.page.n].tables.splice(tableIndex, 1);
      this.destroy();
      scribe.data.layoutRegions.pages[this.layoutDataTable.page.n].default = false;
      scribe.data.layoutDataTables.pages[this.layoutDataTable.page.n].default = false;
    };

    const group = ScribeViewer.getOverlayGroup(layoutDataTable.page.n);

    /** @type {Array<KonvaDataColSep>} */
    this.colLines = [];
    for (let i = 0; i <= this.columns.length; i++) {
      const colLine = new KonvaDataColSep(this.columns[i - 1], this.columns[i], this);
      this.colLines.push(colLine);
      group.add(colLine);
    }

    this.topControl = new KonvaDataTableControl(this, true);
    this.bottomControl = new KonvaDataTableControl(this, false);

    group.add(this.topControl);
    group.add(this.bottomControl);

    /** @type {Array<InstanceType<typeof Konva.Line>>} */
    this.rowLines = [];

    this.rowSpans = [];

    /** @type {?ReturnType<typeof scribe.utils.extractSingleTableContent>} */
    this.tableContent = null;

    if (pageObj) {
      this.tableContent = scribe.utils.extractSingleTableContent(pageObj, this.layoutBoxesArr);

      this.rowLines = this.tableContent.rowBottomArr.map((rowBottom) => new Konva.Line({
        points: [tableLeft, rowBottom, tableRight, rowBottom],
        stroke: 'rgba(0,0,0,0.25)',
        strokeWidth: 2,
        strokeScaleEnabled: false,
      }));

      KonvaDataTable.colorTableWords(this);

      this.rowLines.forEach((rowLine) => {
        group.add(rowLine);
      });
    }

    ScribeViewer.layerOverlay.batchDraw();
  }

  /**
   * Calculate what words are in each column and color them accordingly.
   * @param {KonvaDataTable} konvaDataTable
   */
  static colorTableWords(konvaDataTable) {
    if (!konvaDataTable.tableContent) return;

    const group = ScribeViewer.getOverlayGroup(konvaDataTable.layoutDataTable.page.n);

    konvaDataTable.rowSpans.forEach((rowSpan) => rowSpan.destroy());

    /** @type {Array<Array<string>>} */
    const colWordIdArr = [];
    for (let i = 0; i < konvaDataTable.columns.length; i++) {
      colWordIdArr.push([]);
    }

    for (let i = 0; i < konvaDataTable.tableContent.rowWordArr.length; i++) {
      const row = konvaDataTable.tableContent.rowWordArr[i];
      for (let j = 0; j < row.length; j++) {
        const wordArr = row[j];
        if (wordArr.length === 0) continue;
        colWordIdArr[j].push(...wordArr.map((word) => (word.id)));
        const wordBoxArr = wordArr.map((word) => word.bbox);
        const spanBox = scribe.utils.ocr.calcBboxUnion(wordBoxArr);
        const colorBase = colColorsHex[j % colColorsHex.length];
        const fillCol = hexToRgba(colorBase, 0.3);
        const stroke = fillCol;

        const rowSpan = new Konva.Rect({
          x: spanBox.left,
          y: spanBox.top,
          width: spanBox.right - spanBox.left,
          height: spanBox.bottom - spanBox.top,
          fill: fillCol,
          stroke,
          strokeWidth: 1,
          listening: false,
        });
        konvaDataTable.rowSpans.push(rowSpan);
        group.add(rowSpan);
      }
    }

    const canvasWords = ScribeViewer.getKonvaWords();
    for (let i = 0; i < colWordIdArr.length; i++) {
      const colWordIndex = colWordIdArr[i];
      const colorBase = colColorsHex[i % colColorsHex.length];
      const fillCol = setAlpha(colorBase, 1);
      canvasWords.filter((x) => colWordIndex.includes(x.word.id)).forEach((x) => {
        x.fill(fillCol);
        x.opacity(1);
      });
    }
  }
}

/**
 * Render a layout data table on the canvas.
 * If the data table already exists on the canvas, it is automatically removed.
 * @param {InstanceType<typeof scribe.layout.LayoutDataTable>} layoutDataTable
 */
export function renderLayoutDataTable(layoutDataTable) {
  if (!layoutDataTable || Object.keys(layoutDataTable.boxes).length === 0) {
    console.log(`Skipping table ${layoutDataTable?.id} as it has no boxes`);
    return;
  }

  const konvaLayoutExisting = ScribeViewer.getKonvaDataTables().find((x) => x.layoutDataTable.id === layoutDataTable.id);

  const wordIdOldArr = konvaLayoutExisting?.tableContent?.rowWordArr.flat().flat().map((x) => x.id);

  if (konvaLayoutExisting) konvaLayoutExisting.destroy();

  const konvaLayout = new KonvaDataTable(scribe.data.ocr.active[layoutDataTable.page.n], layoutDataTable);

  // Reset the color for words that are no longer in the table.
  if (wordIdOldArr) {
    const wordIdNewArr = konvaLayout.tableContent?.rowWordArr.flat().flat().map((x) => x.id) || [];
    const wordIdDeselectArr = wordIdOldArr.filter((x) => !wordIdNewArr.includes(x));
    const canvasDeselectWords = ScribeViewer.getKonvaWords().filter((x) => wordIdDeselectArr.includes(x.word.id));
    canvasDeselectWords.forEach((x) => {
      // const { fill, opacity } = getWordFillOpacityGUI(x.word);
      const { fill, opacity } = scribe.utils.ocr.getWordFillOpacity(x.word, scribe.opt.displayMode,
        scribe.opt.confThreshMed, scribe.opt.confThreshHigh, scribe.opt.overlayOpacity);

      x.fill(fill);
      x.opacity(opacity);
    });
  }

  konvaLayout.columns.forEach((column) => {
    const group = ScribeViewer.getOverlayGroup(column.konvaTable.layoutDataTable.page.n);
    group.add(column);
  });
  konvaLayout.colLines.forEach((colLine) => colLine.moveToTop());
  konvaLayout.topControl.moveToTop();
  konvaLayout.bottomControl.moveToTop();
}

export class KonvaRegion extends KonvaLayout {
  /**
   *
   * @param {LayoutRegion} layoutBox
   */
  constructor(layoutBox) {
    super(layoutBox);

    this.layoutBox = layoutBox;

    this.topControl = new KonvaRegionControlHorizontal(this, true);
    this.bottomControl = new KonvaRegionControlHorizontal(this, false);

    this.leftControl = new KonvaRegionControlVertical(this, true);
    this.rightControl = new KonvaRegionControlVertical(this, false);

    const group = ScribeViewer.getOverlayGroup(layoutBox.page.n);

    group.add(this.topControl);
    group.add(this.bottomControl);
    group.add(this.leftControl);
    group.add(this.rightControl);

    this.addEventListener('dragmove', () => {
      this.topControl.x(this.x());
      this.topControl.y(this.y());
      this.bottomControl.x(this.x());
      this.bottomControl.y(this.y() + this.height());
      this.leftControl.x(this.x());
      this.leftControl.y(this.y());
      this.rightControl.x(this.x() + this.width());
      this.rightControl.y(this.y());
    });

    this.destroyLayout = this.destroy;

    /**
     * Removes the region from the canvas.
     * Does not impact the underlying data.
     */
    this.destroy = () => {
      this.topControl.destroy();
      this.bottomControl.destroy();
      this.leftControl.destroy();
      this.rightControl.destroy();

      this.destroyLayout();

      return this;
    };
  }
}

export class KonvaDataColumn extends KonvaLayout {
  /**
   *
   * @param {LayoutDataColumn} layoutBox
   * @param {KonvaDataTable} konvaTable
   */
  constructor(layoutBox, konvaTable) {
    super(layoutBox);
    // Overwrite layoutBox so type inference works correctly, and `layoutBox` gets type `LayoutDataColumn` instead of `LayoutBox`.
    this.layoutBox = layoutBox;
    this.konvaTable = konvaTable;
    this.draggable(false);
    this.select = () => {
      this.fill(setAlpha(this.fill(), 0.5));
      this.fillEnabled(true);
    };
    this.deselect = () => {
      this.fill(setAlpha(this.fill(), 0.3));
      this.strokeEnabled(false);
    };

    /**
     * Delete the column, both from the layout data and from the canvas.
     */
    this.delete = () => {
      const colIndexI = this.layoutBox.table.boxes.findIndex((x) => x.id === this.layoutBox.id);
      this.layoutBox.table.boxes.splice(colIndexI, 1);
      this.destroy();
      scribe.data.layoutRegions.pages[layoutBox.table.page.n].default = false;
      scribe.data.layoutDataTables.pages[layoutBox.table.page.n].default = false;
      if (this.layoutBox.table.boxes.length === 0) {
        const tableIndex = scribe.data.layoutDataTables.pages[layoutBox.table.page.n].tables.findIndex((x) => x.id === this.layoutBox.table.id);
        scribe.data.layoutDataTables.pages[layoutBox.table.page.n].tables.splice(tableIndex, 1);
        this.konvaTable.destroy();
      }
    };

    this.next = () => {
      const next = this.konvaTable.columns.find((x) => x.x() > this.x());
      return next;
    };

    this.prev = () => {
      const prev = this.konvaTable.columns.slice().reverse().find((x) => x.x() < this.x());
      return prev;
    };
  }
}

/**
 *
 * @param {Array<KonvaDataColumn>} selectedDataColumns
 * @returns
 */
export const checkDataColumnsAdjacent = (selectedDataColumns) => {
  selectedDataColumns.sort((a, b) => a.x() - b.x());
  const selectedDataColumnsIds = selectedDataColumns.map((x) => x.layoutBox.id);
  let colI = selectedDataColumns[0];
  let adjacent = true;
  for (let i = 1; i < selectedDataColumns.length; i++) {
    const colINext = colI.next();
    if (!colINext || !selectedDataColumnsIds.includes(colINext.layoutBox.id)) {
      adjacent = false;
      break;
    }
    colI = colINext;
  }
  return adjacent;
};

/**
 *
 * @param {LayoutDataTable} table
 */
const getAdjacentTables = (table) => {
  const adjacentTables = [];

  const tableBox = scribe.utils.calcTableBbox(table);

  const tableYMid = (tableBox.top + tableBox.bottom) / 2;

  // Filter to tables that have vertial overlap, and sort by horizontal position.
  const tablesBoxesAll = scribe.data.layoutDataTables.pages[table.page.n].tables.map((x) => scribe.utils.calcTableBbox(x));
  const tables = scribe.data.layoutDataTables.pages[table.page.n].tables.filter((x, i) => tablesBoxesAll[i].top < tableYMid && tablesBoxesAll[i].bottom > tableYMid).sort((a, b) => {
    const boxA = scribe.utils.calcTableBbox(a);
    const boxB = scribe.utils.calcTableBbox(b);
    return boxA.left - boxB.left;
  });

  const index = tables.findIndex((x) => x.id === table.id);

  if (index > 0) adjacentTables.push(tables[index - 1]);
  if (index < tables.length - 1) adjacentTables.push(tables[index + 1]);
  return adjacentTables;
};

/**
 *
 * @param {Array<LayoutDataTable>} dataTables
 * @returns
 */
export const checkDataTablesAdjacent = (dataTables) => {
  for (let i = 0; i < dataTables.length - 1; i++) {
    const table = dataTables[i];
    const tableNext = dataTables[i + 1];
    const adjacentTableIds = getAdjacentTables(table).map((x) => x.id);

    if (!adjacentTableIds.includes(tableNext.id)) {
      return false;
    }
  }

  return true;
};

/**
 *
 * @param {Array<KonvaDataColumn>} columns
 */
export const mergeDataColumns = (columns) => {
  // Double-check that columns are adjacent before merging.
  // The selection may change between the time when the user clicks the context menu and when this function is called.
  if (!columns || columns.length < 2 || !checkDataColumnsAdjacent(columns)) return;

  // Make copy so `.delete()` doesn't affect the loop.
  columns = columns.slice();

  const table = columns[0].konvaTable.layoutDataTable;

  // Expand leftmost column to include the width of all columns.
  columns.sort((a, b) => a.x() - b.x());
  columns[0].layoutBox.coords.right = columns[columns.length - 1].layoutBox.coords.right;

  for (let i = 1; i < columns.length; i++) {
    columns[i].delete();
  }

  columns[0].konvaTable.destroy();

  renderLayoutDataTable(table);
};

/**
 * Cleans a table to conform to the following rules:
 * 1. Columns must have no space between them (no overlap, no gap).
 * 2. Columns must have the same height.
 * This function is run after combining tables, as combining separate tables results in columns that do not conform to these rules.
 * @param {LayoutDataTable} table
 */
const cleanLayoutDataColumns = (table) => {
  const columnsArr = table.boxes;
  columnsArr.sort((a, b) => a.coords.left - b.coords.left);

  // Step 1: If columns overlap by a small amount, separate them.
  for (let i = 0; i < columnsArr.length - 1; i++) {
    const column = columnsArr[i];
    const nextColumn = columnsArr[i + 1];

    const gap = nextColumn.coords.left - column.coords.right;

    if (gap < 0 && gap >= 10) {
      const midpoint = Math.round(column.coords.right + gap / 2);
      column.coords.right = midpoint;
      nextColumn.coords.left = midpoint;
    }
  }

  // Step 2: If columns overlap by a large amount, delete one of them.
  for (let i = 0; i < columnsArr.length - 1; i++) {
    const column = columnsArr[i];
    const nextColumn = columnsArr[i + 1];

    column.coords.top = Math.min(column.coords.top, nextColumn.coords.top);
    column.coords.bottom = Math.max(column.coords.bottom, nextColumn.coords.bottom);

    const gap = nextColumn.coords.left - column.coords.right;

    if (gap < 0) {
      columnsArr.splice(i + 1, 1);
      i--;
    }
  }

  // Step 3: If columns have a gap between them, expand the columns to fill the gap.
  for (let i = 0; i < columnsArr.length - 1; i++) {
    const column = columnsArr[i];
    const nextColumn = columnsArr[i + 1];

    const gap = nextColumn.coords.left - column.coords.right;

    if (gap > 0) {
      const midpoint = Math.round(column.coords.right + gap / 2);
      column.coords.right = midpoint;
      nextColumn.coords.left = midpoint;
    }
  }

  // Step 4: Standardize all columns to the same height.
  const tableTop = Math.min(...columnsArr.map((x) => x.coords.top));
  const tableBottom = Math.max(...columnsArr.map((x) => x.coords.bottom));

  columnsArr.forEach((x) => {
    x.coords.top = tableTop;
    x.coords.bottom = tableBottom;
  });

  // Replace table boxes with cleaned columns.
  table.boxes = columnsArr;
};

/**
 *
 * @param {number} n
 */
export function renderLayoutBoxes(n) {
  const group = ScribeViewer.getOverlayGroup(n);
  group.destroyChildren();

  const angle = scribe.data.pageMetrics[n].angle || 0;
  const textRotation = scribe.opt.autoRotate ? 0 : angle;

  group.rotation(textRotation);

  if (!ScribeViewer.overlayGroupsRenderIndices.includes(n)) ScribeViewer.overlayGroupsRenderIndices.push(n);

  Object.values(scribe.data.layoutRegions.pages[n].boxes).forEach((box) => {
    const konvaLayout = new KonvaRegion(box);
    group.add(konvaLayout);
    if (konvaLayout.label) group.add(konvaLayout.label);
    konvaLayout.topControl.moveToTop();
    konvaLayout.bottomControl.moveToTop();
    konvaLayout.leftControl.moveToTop();
    konvaLayout.rightControl.moveToTop();
  });
  renderLayoutDataTables(n);

  ScribeViewer.layerOverlay.batchDraw();
}

export function setLayoutBoxInclusionLevelClick(level) {
  // Save the selected boxes to reselect them after re-rendering.
  const selectedRegions = ScribeViewer.CanvasSelection.getKonvaRegions();
  const selectedDataColumns = ScribeViewer.CanvasSelection.getKonvaDataColumns();

  const changedPages = {};

  const selectedArr = selectedRegions.map((x) => x.layoutBox.id);
  selectedArr.push(...selectedDataColumns.map((x) => x.layoutBox.id));

  selectedRegions.forEach((x) => {
    if (x.layoutBox.inclusionLevel !== level) changedPages[x.layoutBox.page.n] = true;
    x.layoutBox.inclusionLevel = level;
  });

  selectedDataColumns.forEach((x) => {
    if (x.layoutBox.inclusionLevel !== level) changedPages[x.layoutBox.table.page.n] = true;
    x.layoutBox.inclusionLevel = level;
  });

  Object.keys(changedPages).forEach((n) => {
    renderLayoutBoxes(Number(n));
    ScribeViewer.CanvasSelection.selectLayoutBoxesById(selectedArr);
  });
}

export function setLayoutBoxInclusionRuleClick(rule) {
  // Save the selected boxes to reselect them after re-rendering.
  const selectedRegions = ScribeViewer.CanvasSelection.getKonvaRegions();
  const selectedDataColumns = ScribeViewer.CanvasSelection.getKonvaDataColumns();

  const changedPages = {};

  const selectedArr = selectedRegions.map((x) => x.layoutBox.id);
  selectedArr.push(...selectedDataColumns.map((x) => x.layoutBox.id));

  selectedRegions.forEach((x) => {
    if (x.layoutBox.inclusionRule !== rule) changedPages[x.layoutBox.page.n] = true;
    x.layoutBox.inclusionRule = rule;
  });
  selectedDataColumns.forEach((x) => {
    if (x.layoutBox.inclusionRule !== rule) changedPages[x.layoutBox.table.page.n] = true;
    x.layoutBox.inclusionRule = rule;
  });

  Object.keys(changedPages).forEach((n) => {
    renderLayoutBoxes(Number(n));
    ScribeViewer.CanvasSelection.selectLayoutBoxesById(selectedArr);
  });
}

/**
 *
 * @param {Array<LayoutDataTable>} tables
 */
export const mergeDataTables = (tables) => {
  // Double-check that columns are adjacent before merging.
  // The selection may change between the time when the user clicks the context menu and when this function is called.
  if (!tables || tables.length < 2 || !checkDataTablesAdjacent(tables)) return;

  const tableFirst = tables[0];

  const n = tableFirst.page.n;

  for (let i = 1; i < tables.length; i++) {
    tables[i].boxes.forEach((x) => {
      x.table = tableFirst;
      tableFirst.boxes.push(x);
    });
    const tableIndex = scribe.data.layoutDataTables.pages[n].tables.findIndex((x) => x.id === tables[i].id);
    scribe.data.layoutDataTables.pages[n].tables.splice(tableIndex, 1);
  }
  scribe.data.layoutRegions.pages[n].default = false;
  scribe.data.layoutDataTables.pages[n].default = false;

  cleanLayoutDataColumns(tableFirst);

  renderLayoutBoxes(n);
};

/**
 *
 * @param {KonvaDataColumn} column
 * @param {number} x - Point to split the column at
 */
export const splitDataColumn = (column, x) => {
  if (!column) return;

  // Add minimum width between columns to prevent lines from overlapping.
  const minColWidthAbs = Math.min((column.layoutBox.coords.right - column.layoutBox.coords.left) / 3, 10);

  // If the split point is outside the column, split at the center.
  if (x <= (column.layoutBox.coords.left + minColWidthAbs) || x >= (column.layoutBox.coords.right - minColWidthAbs)) {
    x = Math.round(column.layoutBox.coords.left + (column.layoutBox.coords.right - column.layoutBox.coords.left) / 2);
  }

  const bboxLeft = {
    left: column.layoutBox.coords.left, top: column.layoutBox.coords.top, right: x, bottom: column.layoutBox.coords.bottom,
  };
  const bboxRight = {
    left: x, top: column.layoutBox.coords.top, right: column.layoutBox.coords.right, bottom: column.layoutBox.coords.bottom,
  };

  column.layoutBox.coords = bboxLeft;

  const layoutBoxLeft = new scribe.layout.LayoutDataColumn(bboxRight, column.layoutBox.table);

  column.konvaTable.layoutDataTable.boxes.push(layoutBoxLeft);

  column.konvaTable.layoutDataTable.boxes.sort((a, b) => a.coords.left - b.coords.left);

  column.konvaTable.destroy();
  renderLayoutDataTable(column.konvaTable.layoutDataTable);
};

/**
 * Splits a table into two or three tables.
 * All columns in `columns` are inserted into a new table, all columns to the left of `columns` are inserted into a new table,
 * and all columns to the right of `columns` are inserted into a new table.
 * The old table is removed.
 * @param {Array<KonvaDataColumn>} columns
 */
export const splitDataTable = (columns) => {
  // For this function to be run, `columns` must be a subset of the columns in a single table, and the columns must be adjacent.
  if (!columns || columns.length === 0 || columns.length === columns[0].layoutBox.table.boxes.length || !checkDataColumnsAdjacent(columns)) return;

  columns.sort((a, b) => a.x() - b.x());

  const n = columns[0].layoutBox.table.page.n;

  const layoutDataColumns0 = columns[0].layoutBox.table.boxes.filter((x) => x.coords.left < columns[0].layoutBox.coords.left);
  const layoutDataColumns1 = columns.map((x) => x.layoutBox);
  const layoutDataColumns2 = columns[0].layoutBox.table.boxes.filter((x) => x.coords.left > columns[columns.length - 1].layoutBox.coords.left);

  // Remove old table
  const tableExisting = layoutDataColumns1[0].table;
  const tableIndex = scribe.data.layoutDataTables.pages[n].tables.findIndex((x) => x.id === tableExisting.id);
  scribe.data.layoutDataTables.pages[n].tables.splice(tableIndex, 1);

  [layoutDataColumns0, layoutDataColumns1, layoutDataColumns2].forEach((layoutDataColumns) => {
    if (layoutDataColumns.length === 0) return;

    const table = new scribe.layout.LayoutDataTable(columns[0].layoutBox.table.page);

    layoutDataColumns.forEach((layoutDataColumn) => {
      layoutDataColumn.table = table;
      table.boxes.push(layoutDataColumn);
    });

    scribe.data.layoutDataTables.pages[n].tables.push(table);
  });

  scribe.data.layoutRegions.pages[n].default = false;
  scribe.data.layoutDataTables.pages[n].default = false;

  renderLayoutDataTables(n);
};

/**
 * @param {number} n - Page number.
 * @param {Object} box
 * @param {number} box.width
 * @param {number} box.height
 * @param {number} box.left
 * @param {number} box.top
 */
export function addLayoutBox(n, box, type) {
  // Maximum priority for boxes that already exist
  const maxPriority = Math.max(...Object.values(scribe.data.layoutRegions.pages[n].boxes).map((layoutRegion) => layoutRegion.order), -1);

  const bbox = {
    left: box.left, top: box.top, right: box.left + box.width, bottom: box.top + box.height,
  };

  const region = new scribe.layout.LayoutRegion(scribe.data.layoutRegions.pages[n], maxPriority + 1, bbox, type);

  scribe.data.layoutRegions.pages[n].boxes[region.id] = region;

  renderLayoutBoxes(n);
}

/**
 * @param {number} n - Page number.
 * @param {Object} box
 * @param {number} box.width
 * @param {number} box.height
 * @param {number} box.left
 * @param {number} box.top
 */
export function addLayoutDataTable(n, box) {
  const bbox = {
    left: box.left, top: box.top, right: box.left + box.width, bottom: box.top + box.height,
  };

  const lines = scribe.data.ocr.active[n].lines.filter((line) => scribe.utils.calcBoxOverlap(line.bbox, bbox) > 0.5);

  let columnBboxArr;
  if (lines.length > 0) {
    const lineBoxes = lines.map((line) => line.bbox);
    const columnBoundArr = scribe.utils.calcColumnBounds(lineBoxes);
    columnBboxArr = columnBoundArr.map((column) => ({
      left: column.left,
      top: bbox.top,
      right: column.right,
      bottom: bbox.bottom,
    }));

    // Expand column bounds so there is no empty space between columns.
    columnBboxArr[0].left = bbox.left;
    columnBboxArr[columnBboxArr.length - 1].right = bbox.right;
    for (let i = 0; i < columnBboxArr.length - 1; i++) {
      const boundRight = (columnBboxArr[i].right + columnBboxArr[i + 1].left) / 2;
      columnBboxArr[i].right = boundRight;
      columnBboxArr[i + 1].left = boundRight;
    }
  } else {
    columnBboxArr = [{ ...bbox }];
  }

  const dataTable = new scribe.layout.LayoutDataTable(scribe.data.layoutDataTables.pages[n]);

  columnBboxArr.forEach((columnBbox) => {
    const layoutBox = new scribe.layout.LayoutDataColumn(columnBbox, dataTable);
    dataTable.boxes.push(layoutBox);
  });

  scribe.data.layoutDataTables.pages[n].tables.push(dataTable);

  scribe.data.layoutRegions.pages[n].default = false;
  scribe.data.layoutDataTables.pages[n].default = false;

  renderLayoutDataTable(dataTable);
}

/**
 * Apply the layout regions from one page to range of other pages.
 * @param {number} srcN - Page number of the source layout.
 * @param {number} minN - Minimum page number to apply the layout to.
 * @param {number} maxN - Maximum page number to apply the layout to (inclusive).
 */
function applyLayoutRegions(srcN, minN, maxN) {
  const srcRegions = scribe.data.layoutRegions.pages[srcN].boxes;
  for (let i = minN; i <= maxN; i++) {
    if (i === srcN) continue;
    const boxes = structuredClone(srcRegions);
    for (const [key, value] of Object.entries(boxes)) {
      value.id = scribe.utils.getRandomAlphanum(10);
      value.page = scribe.data.layoutRegions.pages[i];
    }
    scribe.data.layoutRegions.pages[i].boxes = boxes;
    if (Math.abs(i - ScribeViewer.state.cp.n) < 2) {
      ScribeViewer.layout.renderLayoutBoxes(i);
    }
  }
}

/**
 * Apply the layout data tables from one page to range of other pages.
 * @param {number} srcN - Page number of the source layout.
 * @param {number} minN - Minimum page number to apply the layout to.
 * @param {number} maxN - Maximum page number to apply the layout to (inclusive).
 */
function applyLayoutDataTables(srcN, minN, maxN) {
  const srcTables = scribe.data.layoutDataTables.pages[srcN].tables;
  for (let i = minN; i <= maxN; i++) {
    if (i === srcN) continue;
    const tables = structuredClone(srcTables);
    tables.forEach((x) => {
      x.id = scribe.utils.getRandomAlphanum(10);
      x.page = scribe.data.layoutDataTables.pages[i];
    });
    scribe.data.layoutDataTables.pages[i].tables = tables;
    if (Math.abs(i - ScribeViewer.state.cp.n) < 2) {
      ScribeViewer.layout.renderLayoutBoxes(i);
    }
  }
}

export class layout {
  static renderLayoutBoxes = renderLayoutBoxes;

  static setLayoutBoxInclusionLevelClick = setLayoutBoxInclusionLevelClick;

  static setLayoutBoxInclusionRuleClick = setLayoutBoxInclusionRuleClick;

  static mergeDataTables = mergeDataTables;

  static splitDataColumn = splitDataColumn;

  static splitDataTable = splitDataTable;

  static addLayoutBox = addLayoutBox;

  static addLayoutDataTable = addLayoutDataTable;

  static applyLayoutRegions = applyLayoutRegions;

  static applyLayoutDataTables = applyLayoutDataTables;
}
