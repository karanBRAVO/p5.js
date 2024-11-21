/** 
 * API:
 *    loadFont("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap")
 *    loadFont("{ font-family: "Bricolage Grotesque", serif; font-optical-sizing: auto; font-weight: <weight> font-style: normal; font-variation-settings: "wdth" 100; });
 *    loadFont({ 
 *        fontFamily: '"Bricolage Grotesque", serif'; 
 *        fontOpticalSizing: 'auto';
 *        fontWeight: '<weight>';
 *        fontStyle: 'normal';
 *        fontVariationSettings: '"wdth" 100'; 
 *    });
 *    loadFont("https://fonts.gstatic.com/s/bricolagegrotesque/v1/pxiAZBhjZQIdd8jGnEotWQ.woff2");
 *    loadFont("./path/to/localFont.ttf");
 *    loadFont("system-font-name");
 * 
 *   
 *   NEXT:
 *     extract axes from font file
 * 
 *   TEST: 
 *    const font = new FontFace("Inter", "url(./fonts/inter-latin-variable-full-font.woff2)", {
        style: "oblique 0deg 10deg",
        weight: "100 900",
        display: 'fallback'
      });
*/

// pf.Font = {font, fontData, name, path}: font is either a string or a FontFace object, fontData is the optional 
//  Typr raw font data, name is the font name, and path is the font path or url. ???

/**
 * This module defines the <a href="#/p5.Font">p5.Font</a> class and P5 methods for
 * loading fonts from files and urls, and extracting points from their paths.
 */
import Typr from './lib/Typr.js';

function font(p5, fn) {

  const validFontTypes = ['ttf', 'otf', 'woff', 'woff2'];
  const validFontTypesRe = new RegExp(`\\.(${validFontTypes.join('|')})`, 'i');
  const extractFontNameRe = new RegExp(`([^/]+)(\\.(?:${validFontTypes.join('|')}))`, 'i');
  const invalidFontError = 'Sorry, only TTF, OTF, WOFF and WOFF2 files are supported.';

  p5.Font = class Font {

    constructor(p, font, name, path, data) {
      if (!('loadBytes' in p)) {
        throw Error('p5 instance is required');
      }
      if (!(font instanceof FontFace)) {
        throw Error('FontFace is required');
      }
      this._pInst = p;
      this.font = font;
      this.name = name;
      this.path = path;
      this.data = data;
    }

    metadata() {
      return this.data?.name || {};
    }

    fontBounds(...args) { // alias for p5.fontBounds
      return this._pInst.fontBounds(...args);
    }

    textBounds(...args) { // alias for p5.textBounds
      return this._pInst.textBounds(...args);
    }

    textToPoints(str, x, y, width, height) {
      let font = this.data;
      let shape = Typr.U.shape(font, str);
      let path = Typr.U.shapeToPath(font, shape);
      let dpr = window["devicePixelRatio"] || 1;
      let fontSize = this._pInst.states.textSize;
      let scale = fontSize * dpr / font.head.unitsPerEm;
      let pts = [];
      for (let i = 0; i < path.crds.length; i += 2) {
        pts.push({ x: x + path.crds[i] * scale, y: y + path.crds[i + 1] * -scale });
      }
      return pts;
    }

    /**
     * Load a font and returns a p5.Font instance. The font can be specified by its path or a url.
     * Optional arguments include the font name, descriptors for the FontFace object, 
     * and callbacks for success and error.
     * @param  {...any} args - path, name, onSuccess, onError, descriptors
     * @returns a Promise that resolves with a p5.Font instance
     */
    static async loadFont(...args/*path, name, onSuccess, onError, descriptors*/) {

      let { path, name, success, error, descriptors } = parseCreateArgs(...args);

      const extractFontName = (font, path) => {
        let meta = font?.name;

        // use the metadata if we have it
        if (meta) {
          if (meta.fullName) {
            return meta.fullName;
          }
          if (meta.familyName) {
            return meta.familyName;
          }
        }

        // if not, extract the name from the path
        let matches = extractFontNameRe.exec(path);
        if (matches && matches.length >= 3) {
          return matches[1];
        }

        // give up and return the full path
        return path;
      };

      let pfont;
      try {
        // load the raw font bytes
        let result = await fn.loadBytes(path);

        // parse the font data
        let fonts = Typr.parse(result.bytes);
        if (fonts.length !== 1) throw Error('Invalid font data');

        // make sure we have a valid name
        name = name || extractFontName(fonts[0], path);
        
        // create a FontFace object and pass it to the p5.Font constructor
        pfont = await p5.Font.create(name, path, descriptors, fonts[0]);

      } catch (err) {
        // failed to parse the font, load it as a simple FontFace
        try {
          // create a FontFace object and pass it to p5.Font
          pfont = await p5.Font.create(name, path, descriptors);
        }
        catch (err) {
          if (error) {
            error(err);
          }
          throw err;
        }
      }
      if (success) {
        success(pfont);
      }

      return pfont;
    }

    static async create(name, path, descriptors, rawFont) {
      let ff = new FontFace(name, rawFont?._data || path, descriptors);
      if (ff.status !== 'loaded') {
        await ff.load();
      }
      document.fonts.add(ff);

      return new p5.Font(fn, ff, name, path, rawFont);
    }

    static async createX(...args/*path, name, onSuccess, onError, descriptors*/) { // tmp

      let { path, name, success, error, descriptors } = parseCreateArgs(...args);

      return await new Promise((resolve, reject) => {
        let pfont = new p5.Font(this/*p5 instance*/, name, path, descriptors);
        pfont.load().then(() => {
          if (document?.fonts) {
            document.fonts.add(pfont.font);
          }
          if (typeof success === 'function') {
            success(pfont);
          }
          else {
            resolve(pfont);
          }
        }, err => {
          p5._friendlyFileLoadError(4, path);
          if (error) {
            error(err);
          } else {
            reject(err);
          }
        });
      });
    };

    static async list(log = false) { // tmp
      if (log) {
        console.log('There are', document.fonts.size, 'font-faces\n');
        let loaded = 0;
        for (let fontFace of document.fonts.values()) {
          console.log('FontFace: {');
          for (let property in fontFace) {
            console.log('  ' + property + ': ' + fontFace[property]);
          }
          console.log('}\n');
          if (fontFace.status === 'loaded') {
            loaded++;
          }
        }
        console.log(loaded + ' loaded');
      }
      return await Array.from(document.fonts);
    }
  }// end p5.Font

  function parseCreateArgs(...args/*path, name, onSuccess, onError*/) {

    // parse the path
    let path = args.shift();
    if (typeof path !== 'string' || path.length === 0) {
      p5._friendlyError(invalidFontError, 'p5.loadFont'); // ?
    }

    // parse the name
    let name;
    if (typeof args[0] === 'string') {
      name = args.shift();
    }

    // get the callbacks/descriptors if any
    let success, error, descriptors;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === 'function') {
        if (!success) {
          success = arg;
        } else {
          error = arg;
        }
      }
      else if (typeof arg === 'object') {
        descriptors = arg;
      }
    }

    return { path, name, success, error, descriptors };
  }

  // attach as p5.loadFont
  fn.loadFont = p5.Font.loadFont;
};

export default font;

if (typeof p5 !== 'undefined') {
  font(p5, p5.prototype);
}