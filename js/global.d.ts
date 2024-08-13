declare global {

    // OCR objects
    type OcrPage = import("./objects/ocrObjects.js").OcrPage;
    type OcrLine = import("./objects/ocrObjects.js").OcrLine;
    type OcrWord = import("./objects/ocrObjects.js").OcrWord;
    type OcrChar = import("./objects/ocrObjects.js").OcrChar;

    // Font objects
    type FontMetricsFont = import("./objects/fontMetricsObjects.js").FontMetricsFont;
    type FontMetricsRawFamily = import("./objects/fontMetricsObjects.js").FontMetricsRawFamily;
    type FontMetricsFamily = import("./objects/fontMetricsObjects.js").FontMetricsFamily;
    type FontMetricsRawFont = import("./objects/fontMetricsObjects.js").FontMetricsRawFont;
    type FontContainerFont = import("./containers/fontContainer.js").FontContainerFont;
    type FontContainerFamily = import("./containers/fontContainer.js").FontContainerFamily;

    type FontContainerFamilyBuiltIn = {
        normal: FontContainerFont;
        italic: FontContainerFont;
        bold: FontContainerFont;
    };

    type FontContainerFamilyUpload = {
        normal: FontContainerFont | null;
        italic: FontContainerFont | null;
        bold: FontContainerFont | null;
    };

    type FontContainerFamily = FontContainerFamilyBuiltIn | FontContainerFamilyUpload;

    type FontContainer = {
        Carlito: FontContainerFamilyBuiltIn;
        Century: FontContainerFamilyBuiltIn;
        Garamond: FontContainerFamilyBuiltIn;
        Palatino: FontContainerFamilyBuiltIn;
        NimbusRomNo9L: FontContainerFamilyBuiltIn;
        NimbusSans: FontContainerFamilyBuiltIn;
        [key: string]: FontContainerFamily;
    };

    type fontSrcBuiltIn = {
        normal: string | ArrayBuffer;
        italic: string | ArrayBuffer;
        bold: string | ArrayBuffer;
    };

    type fontSrcUpload = {
        normal: string | ArrayBuffer | null;
        italic: string | ArrayBuffer | null;
        bold: string | ArrayBuffer | null;
    };

    type opentypeFont = import("../lib/opentype.module.js").Font;
    type opentypeGlyph = import("../lib/opentype.module.js").Glyph;
    type GeneralScheduler = import("./generalWorkerMain.js").GeneralScheduler;

    type dims = {
        height: number;
        width: number;
    };

    type bbox = {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };

    type PageMetrics = import("./objects/pageMetricsObjects.js").PageMetrics;

    type EvalMetrics = {
        total: number;
        correct: number;
        incorrect: number;
        missed: number;
        extra: number;
        correctLowConf: number;
        incorrectHighConf: number;
    };
    /**
     * Represents a comparison debug object with image data and error metrics.
     * Raw errors are calculated purely based on visual overlap. Words where most pixels overlap with the underlying image will have low raw error.
     * Adjusted errors are calculated by applying ad-hoc adjustments to raw errors. The intent of these adjustments is to penalize patterns of letters
     * that are visually similar to other letters but unlikely to occur in correct recognition results.
     */
    type CompDebugBrowser = {
        context: 'browser';
        imageRaw: Blob; // The raw image blob.
        imageA: Blob; // The first image blob for comparison.
        imageB: Blob; // The second image blob for comparison.
        dims: dims; // Dimensions object specifying size or other dimensional data.
        errorRawA: number; // Raw error of "A" words, calculated purely based on visual overlap.
        errorRawB: number; // Raw error of "B" words, similar to errorRawA.
        errorAdjA: number | null; // Adjusted error of "A" words. Null until calculated.
        errorAdjB: number | null; // Adjusted error of "B" words. Null until calculated.
    };

    /**
     * Represents a comparison debug object with image data and error metrics.
     * Raw errors are calculated purely based on visual overlap. Words where most pixels overlap with the underlying image will have low raw error.
     * Adjusted errors are calculated by applying ad-hoc adjustments to raw errors. The intent of these adjustments is to penalize patterns of letters
     * that are visually similar to other letters but unlikely to occur in correct recognition results.
     */
    type CompDebugNode = {
        context: 'node';
        imageRaw: import('canvas').Image; // The raw image.
        imageA: import('canvas').Image; // The first image for comparison.
        imageB: import('canvas').Image; // The second image for comparison.
        dims: dims; // Dimensions object specifying size or other dimensional data.
        errorRawA: number; // Raw error of "A" words, calculated purely based on visual overlap.
        errorRawB: number; // Raw error of "B" words, similar to errorRawA.
        errorAdjA: number | null; // Adjusted error of "A" words. Null until calculated.
        errorAdjB: number | null; // Adjusted error of "B" words. Null until calculated.
    };

    type ProgressMessage = ProgressMessageConvert | ProgressMessageGeneral;

    type ProgressMessageGeneral = {
        type: 'export' | 'importImage' | 'importPDF' | 'render';
        n: number;
        info: {};
    }

    type ProgressMessageConvert = {
        type: 'convert';
        n: number;
        info: {
            engineName: string;
        };
    }


    type ProgressBar = import("../gui/utils/progressBars.js").ProgressBar;

    type FileNode = import("./import/nodeAdapter.js").FileNode;

    // Layout objects
    type LayoutPage = import("./objects/layoutObjects.js").LayoutPage;
    type LayoutDataTablePage = import("./objects/layoutObjects.js").LayoutDataTablePage;
    type LayoutDataTable = import("./objects/layoutObjects.js").LayoutDataTable;
    type LayoutDataColumn = import("./objects/layoutObjects.js").LayoutDataColumn;
    type LayoutRegion = import("./objects/layoutObjects.js").LayoutRegion;

}

export { };
