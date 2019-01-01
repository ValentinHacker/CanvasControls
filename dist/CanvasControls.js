"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@babel/polyfill");
/**
 * @file CanvasControls.ts
 * @copyright Valen. H. 2k18
 * @author Valen.H. <alternativexxxy@gmail.com>
 */
/**
 * The root of the main library
 * @module CanvasControls
 * @license ISC
 * @global
 */
var CanvasControls;
(function (CanvasControls) {
    /**
     * If `dest` lacks a property that `targ` has then that property is copied into `dest`
     * @function
    */
    function inherit(dest, targ, condition = (dest, targ, prop) => dest[prop] === undefined && (dest[prop] = targ[prop])) {
        for (let i in targ) {
            condition(dest, targ, i);
        }
        return dest;
    } //inherit
    /**
     * Restrict number's range
     * @function
     */
    function bound(n, m, M) {
        return n > M ? M : (n < m ? m : n);
    } //bound
    /**
     * A holder for all errors
     * @namespace
     */
    let Errors;
    (function (Errors) {
        Errors.ENOTCANV = new TypeError("Not an HTMLCanvasElement.");
        Errors.ENOTCTX = new TypeError("Not a CanvasRenderingContext2D.");
        Errors.ENOTNUMARR2 = new TypeError("Not an Array of 2-at-least Numbers.");
    })(Errors = CanvasControls.Errors || (CanvasControls.Errors = {})); //Errors
    /**
     * A wrapper for the targeted canvas element
     * @class
     * @implements {Opts.ControllableCanvasOptions}
     * @prop {HTMLCanvasElement} target=firstCanvOccurInDoc - Bound canvas
     * @prop {CanvasRenderingContext2D} context?=target.getContext("2d") - The 2d context created out of `target`
     * @prop {number[]} trans=0,0 - Translation
     * @prop {number[]} scl=1,1 - Scaling
     * @prop {number[]} rot=0,0 - Rotation
     * @prop {number[]} pin?=this.target.width/2,this.target.height/2 - Pseudo-center
     * @prop {number[]} transBound=-Infinity,-Infinity,Infinity,Infinity - Max translation boundaries
     * @prop {boolean} dragEnabled=false - Enable translation on drag
     * @prop {boolean} pinchEnabled=false - Enable scaling on 2-finger pinch (1 finger only shall move)
     * @prop {boolean} pinchSwipeEnabled=false - Enable rotation on 2-finger pinch (both fingers shall move)
     * @prop {boolean} wheelEnabled=false - Enable scaling on mouse wheel
     * @prop {boolean} panEnabled=false - Enable translation based on mouse/finger distance from pin (pseudo-center)
     * @prop {boolean} tiltEnabled=false - Enable translation on device movement
     * @prop {boolean} eventsReversed=false - Toggle reverse-operations
     * @prop {boolean} useRight=false - Use right click as main
     * @prop {number[]} _coordinates - Current event coordinates
     * @prop {number} transSpeed=1 - Translation speed factor
     * @prop {number} sclSpeed=1 - Scaling speed factor
     * @prop {Opts.ControllableCanvasAdapters} _adapts - Map of all currently attached control event adapters
     */
    class ControllableCanvas {
        /**
         * ControllableCanvas constructor
         * @param {Opts.ControllableCanvasOptions} opts?=ControllableCanvas.defaultOpts - ControllableCanvas Options
         * @constructor
         */
        constructor(opts = ControllableCanvas.defaultOpts) {
            inherit(opts, ControllableCanvas.defaultOpts);
            if (!(opts.target instanceof HTMLCanvasElement)) {
                throw Errors.ENOTCANV;
            }
            else if ([opts.trans, opts.scl, opts.transBounds, opts.sclBounds].some(arr => !(arr instanceof Array || arr instanceof Float32Array || arr instanceof Float64Array) || arr.length < 2 || Array.from(arr).some((num) => isNaN(num) || num === ''))) {
                throw Errors.ENOTNUMARR2;
            }
            inherit(opts._adapts, ControllableCanvas.defaultOpts._adapts);
            if (opts.pin === undefined) {
                opts.pin = [opts.target.width / 2, opts.target.height / 2];
            }
            else if (!(opts.pin instanceof Array || opts.pin instanceof Float32Array || opts.pin instanceof Float64Array) || opts.pin.length < 2 || Array.from(opts.pin).some((num) => isNaN(num) || num === '')) {
                throw Errors.ENOTNUMARR2;
            }
            this.target = opts.target;
            this.context = this.target.getContext("2d");
            this._adapts = {};
            inherit(this._adapts, opts._adapts);
            this.rot = opts.rot * 1;
            this.transSpeed = opts.transSpeed * 1;
            this.sclSpeed = opts.sclSpeed * 1;
            this.trans = Array.from(opts.trans).map(Number);
            this.scl = Array.from(opts.scl).map(Number);
            this.pin = Array.from(opts.pin).map(Number);
            this.transBounds = Array.from(opts.transBounds).map(Number); // x, y, X, Y
            this.sclBounds = Array.from(opts.sclBounds).map(Number); // x, y, X, Y
            this.dragEnabled = !!opts.dragEnabled;
            this.pinchEnabled = !!opts.pinchEnabled;
            this.pinchSwipeEnabled = !!opts.pinchSwipeEnabled;
            this.wheelEnabled = !!opts.wheelEnabled;
            this.panEnabled = !!opts.panEnabled;
            this.tiltEnabled = !!opts.tiltEnabled;
            this.eventsReversed = !!opts.eventsReversed;
            this.useRight = !!opts.useRight;
            this._handled = false;
            this._mobile = ControllableCanvas.isMobile;
            this._pressed = false;
            this._coordinates = [0, 0];
            if (!ControllableCanvas._linepix)
                ControllableCanvas._linepix = ControllableCanvas.lineToPix;
        } //ctor
        get ratio() {
            return this.target.width / this.target.height;
        } //g-ratio
        get min() {
            return Math.min(this.target.width, this.target.height);
        } //g-min
        get max() {
            return Math.max(this.target.width, this.target.height);
        } //g-max
        /**
         * Enable controls, call only once
         * @param {boolean} force?=false - Force handle
         * @returns {boolean} bound? - whether bind suceeded or it was already bound earlier
         */
        handle(force = false) {
            if (!this._handled || force) {
                this._mobile ? this._mobileAdapt() : this._pcAdapt();
                return this._handled = true;
            }
            return false;
        } //handle
        /**
         * Re-apply internal transformations
         * @returns {ControllableCanvas} this - For method chaining
         */
        retransform() {
            this.context.setTransform(1, 0, 0, 1, 0, 0);
            this.context.translate(this.trans[0], this.trans[1]);
            this.context.scale(this.scl[0], this.scl[1]);
            this.context.rotate(this.rot);
            return this;
        } //retransform
        /**
         * Intermediate translation function for iconic translate before the real
         * @param {number} x=0 - x translation
         * @param {number} y=0 - y translation
         * @param {boolean} abs?=false - abslute translation or relative to current
         * @returns {number[]} trans - Returns current total translation
         */
        translate(x = 0, y = 0, abs = false) {
            let by = [x, y];
            return this.trans = this.trans.map((trn, idx) => bound(Number(!abs ? (trn + by[idx]) : by[idx]), this.transBounds[idx], this.transBounds[idx + 2]));
        } //translate
        /**
         * Intermediate scaling function for iconic scale before the real
         * @param {number} x=1 - x scale
         * @param {number} y=x - y scale
         * @param {boolean} abs?=false - abslute scale or relative to current
         * @returns {number[]} scl - Returns current total scaling
         */
        scale(x = 1, y = x, abs = false) {
            let by = [x, y];
            return this.scl = this.scl.map((scl, idx) => bound(Number(!abs ? (scl * by[idx]) : by[idx]), this.sclBounds[idx], this.sclBounds[idx + 2]));
        } //scale
        _mobileAdapt() {
            if (!this._adapts.drag && this.dragEnabled) {
                this.target.addEventListener("touchstart", (e) => ControllableCanvas.dragMobileStart(e, this), { passive: false });
                this.target.addEventListener("touchmove", this._adapts.drag = (e) => ControllableCanvas.dragMobileMove(e, this), { passive: false });
                this.target.addEventListener("touchend", (e) => ControllableCanvas.dragMobileEnd(e, this), { passive: false });
            }
            if (!this._adapts.pinch) {
            }
            if (!this._adapts.pinchSwipe) {
            }
            if (!this._adapts.tilt) {
            }
        } //_mobileAdapt
        _pcAdapt() {
            if (!this._adapts.drag && this.dragEnabled) {
                this.target.addEventListener("mousemove", this._adapts.drag = (e) => ControllableCanvas.dragPC(e, this));
                this.target.addEventListener("mousedown", (e) => this._pressed = true);
                this.target.addEventListener("mouseup", (e) => this._pressed = false);
                if (this.useRight)
                    this.target.addEventListener("contextmenu", (e) => e.preventDefault(), { capture: true, passive: false });
            }
            if (!this._adapts.wheel && this.wheelEnabled) {
                this.target.addEventListener("wheel", this._adapts.wheel = (e) => ControllableCanvas.wheel(e, this));
            }
            if (!this._adapts.tilt) {
            }
        } //_pcAdapt
        static dragPC(event, cc) {
            if ((!cc.useRight && (("buttons" in event) && (event.buttons & 2) === 2) || (("which" in event) && event.which === 3) || (("button" in event) && event.button === 2)) || (cc.useRight && (("buttons" in event) && (event.buttons & 2) !== 2) && (("which" in event) && event.which !== 3) && (("button" in event) && event.button !== 2))) {
                return;
            }
            event.preventDefault();
            let coords = [event.clientX - cc.target.offsetLeft, event.clientY - cc.target.offsetTop];
            if (cc._pressed) {
                cc.translate(event.movementX * cc.transSpeed, event.movementY * cc.transSpeed);
            }
            cc._coordinates = coords;
        } //dragPC
        static dragMobileMove(event, cc) {
            event.preventDefault();
            let coords = [event.targetTouches[0].clientX - cc.target.offsetLeft, event.targetTouches[0].clientY - cc.target.offsetTop];
            if (event.targetTouches.length === 1) {
                cc.translate(coords[0] - cc._coordinates[0], coords[1] - cc._coordinates[1]);
            }
            cc._coordinates = coords;
        } //dragMobileMove
        static dragMobileStart(event, cc) {
            event.preventDefault();
            cc._coordinates = [event.targetTouches[0].clientX - cc.target.offsetLeft, event.targetTouches[0].clientY - cc.target.offsetTop];
        } //dragMobileStart
        static dragMobileEnd(event, cc) {
            event.preventDefault();
            if (event.targetTouches.length == 1) {
                ControllableCanvas.dragMobileStart(event, cc);
            }
        } //dragMobileEnd
        static wheel(event, cc) {
            let d = 1 - cc.sclSpeed * ControllableCanvas.fixDelta(event.deltaMode, event.deltaY) / cc.max, coords = [event.clientX - cc.target.offsetLeft - cc.trans[0], event.clientY - cc.target.offsetTop - cc.trans[1]], ncoord = coords.map((c, idx) => c * (1 - d));
            cc.translate(...ncoord);
            cc.scale(d, d);
            console.log(ncoord, coords);
        } //wheel
        static get isMobile() {
            if (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i)
                || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)
                || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i)) {
                return true;
            }
            else {
                return false;
            }
        } //detectMobile
        static get lineToPix() {
            let r, iframe = document.createElement("iframe");
            iframe.src = '#';
            document.body.appendChild(iframe);
            let iwin = iframe.contentWindow, idoc = iwin.document;
            idoc.open();
            idoc.write('<!DOCTYPE html><html><head></head><body><p>a</p></body></html>');
            idoc.close();
            let span = idoc.body.firstElementChild;
            r = span.offsetHeight;
            document.body.removeChild(iframe);
            return r;
        } //lineToPix
        static fixDelta(mode, deltaY) {
            if (mode === 1) {
                return ControllableCanvas._linepix * deltaY;
            }
            else if (mode === 2) {
                return window.innerHeight;
            }
            else {
                return deltaY;
            }
        } //fixDelta
    } //ControllableCanvas
    /**
     * Default options for ControllableCanvas
     * @readonly
     * @static
     */
    ControllableCanvas.defaultOpts = {
        target: document.getElementsByTagName("canvas")[0],
        trans: [0, 0],
        scl: [1, 1],
        rot: 0,
        dragEnabled: false,
        pinchEnabled: false,
        pinchSwipeEnabled: false,
        wheelEnabled: false,
        panEnabled: false,
        tiltEnabled: false,
        eventsReversed: false,
        useRight: false,
        transSpeed: 1,
        sclSpeed: 1,
        sclBounds: [0, 0, Infinity, Infinity],
        transBounds: [-Infinity, -Infinity, Infinity, Infinity],
        _adapts: {
            drag: false,
            pinch: false,
            pinchSwipe: false,
            wheel: false,
            pan: false,
            tilt: false
        }
    };
    CanvasControls.ControllableCanvas = ControllableCanvas;
})(CanvasControls = exports.CanvasControls || (exports.CanvasControls = {})); //CanvasControls
exports.default = CanvasControls.ControllableCanvas;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FudmFzQ29udHJvbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvQ2FudmFzQ29udHJvbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwyQkFBeUI7QUFFekI7Ozs7R0FJRztBQUdIOzs7OztHQUtHO0FBQ0gsSUFBYyxjQUFjLENBaWIzQjtBQWpiRCxXQUFjLGNBQWM7SUFFM0I7OztNQUdFO0lBQ0YsU0FBUyxPQUFPLENBQUMsSUFBUSxFQUFFLElBQVEsRUFBRSxZQUFzQixDQUFDLElBQVEsRUFBRSxJQUFRLEVBQUUsSUFBWSxFQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxSixLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRTtZQUNuQixTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztTQUN6QjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQyxDQUFDLFNBQVM7SUFFWDs7O09BR0c7SUFDSCxTQUFTLEtBQUssQ0FBQyxDQUFTLEVBQUUsQ0FBUyxFQUFFLENBQVM7UUFDN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQyxDQUFDLENBQUMsT0FBTztJQXNGVDs7O09BR0c7SUFDSCxJQUFpQixNQUFNLENBSXRCO0lBSkQsV0FBaUIsTUFBTTtRQUNULGVBQVEsR0FBYyxJQUFJLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ2pFLGNBQU8sR0FBYyxJQUFJLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ3RFLGtCQUFXLEdBQWMsSUFB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LFVBQVUsRUFBRSxDQUFDO1FBQ2IsUUFBUSxFQUFFLENBQUM7UUFDWCxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUM7UUFDckMsV0FBVyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQztRQUN2RCxPQUFPLEVBQUU7WUFDUixJQUFJLEVBQUUsS0FBSztZQUNYLEtBQUssRUFBRSxLQUFLO1lBQ1osVUFBVSxFQUFFLEtBQUs7WUFDakIsS0FBSyxFQUFFLEtBQUs7WUFDWixHQUFHLEVBQUUsS0FBSztZQUNWLElBQUksRUFBRSxLQUFLO1NBQ1g7S0FDRCxDQUFDO0lBeERVLGlDQUFrQixxQkFrUzlCLENBQUE7QUFFRixDQUFDLEVBamJhLGNBQWMsR0FBZCxzQkFBYyxLQUFkLHNCQUFjLFFBaWIzQixDQUFDLGdCQUFnQjtBQUVsQixrQkFBZSxjQUFjLENBQUMsa0JBQWtCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgXCJAYmFiZWwvcG9seWZpbGxcIjtcblxuLyoqXG4gKiBAZmlsZSBDYW52YXNDb250cm9scy50c1xuICogQGNvcHlyaWdodCBWYWxlbi4gSC4gMmsxOFxuICogQGF1dGhvciBWYWxlbi5ILiA8YWx0ZXJuYXRpdmV4eHh5QGdtYWlsLmNvbT5cbiAqL1xuXG5cbi8qKlxuICogVGhlIHJvb3Qgb2YgdGhlIG1haW4gbGlicmFyeVxuICogQG1vZHVsZSBDYW52YXNDb250cm9sc1xuICogQGxpY2Vuc2UgSVNDXG4gKiBAZ2xvYmFsXG4gKi9cbmV4cG9ydCBtb2R1bGUgQ2FudmFzQ29udHJvbHMge1xuXG5cdC8qKlxuXHQgKiBJZiBgZGVzdGAgbGFja3MgYSBwcm9wZXJ0eSB0aGF0IGB0YXJnYCBoYXMgdGhlbiB0aGF0IHByb3BlcnR5IGlzIGNvcGllZCBpbnRvIGBkZXN0YFxuXHQgKiBAZnVuY3Rpb25cblx0Ki9cblx0ZnVuY3Rpb24gaW5oZXJpdChkZXN0OiB7fSwgdGFyZzoge30sIGNvbmRpdGlvbjogRnVuY3Rpb24gPSAoZGVzdDoge30sIHRhcmc6IHt9LCBwcm9wOiBzdHJpbmcpOiBhbnkgPT4gZGVzdFtwcm9wXSA9PT0gdW5kZWZpbmVkICYmIChkZXN0W3Byb3BdID0gdGFyZ1twcm9wXSkpOiB7fSB7XG5cdFx0Zm9yIChsZXQgaSBpbiB0YXJnKSB7XG5cdFx0XHRjb25kaXRpb24oZGVzdCwgdGFyZywgaSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlc3Q7XG5cdH0gLy9pbmhlcml0XG5cblx0LyoqXG5cdCAqIFJlc3RyaWN0IG51bWJlcidzIHJhbmdlXG5cdCAqIEBmdW5jdGlvblxuXHQgKi9cblx0ZnVuY3Rpb24gYm91bmQobjogbnVtYmVyLCBtOiBudW1iZXIsIE06IG51bWJlcik6IG51bWJlciB7XG5cdFx0cmV0dXJuIG4gPiBNID8gTSA6IChuIDwgbSA/IG0gOiBuKTtcblx0fSAvL2JvdW5kXG5cblxuXHQvKipcblx0ICogQSBuYW1lc3BhY2UgdGhhdCBob2xkcyBhbGwgb3B0aW9ucyBhbmQgaW50ZXJmYWNlcyBvZiB0aGUgbW9kdWxlXG5cdCAqIEBuYW1lc3BhY2Vcblx0ICogQGlubmVyXG5cdCAqL1xuXHRleHBvcnQgZGVjbGFyZSBuYW1lc3BhY2UgT3B0cyB7XG5cblx0XHQvKipcblx0XHQgKiBBIHdyYXBwZXIgZm9yIHRoZSB0YXJnZXRlZCBjYW52YXMgZWxlbWVudFxuXHRcdCAqIEBpbnRlcmZhY2Vcblx0XHQgKiBAaW5uZXJcblx0XHQgKiBAcHJvcCB7SFRNTENhbnZhc0VsZW1lbnR9IHRhcmdldD1maXJzdENhbnZPY2N1ckluRG9jIC0gQm91bmQgY2FudmFzXG5cdFx0ICogQHByb3Age251bWJlcltdfSB0cmFucz0wLDAgLSBUcmFuc2xhdGlvblxuXHRcdCAqIEBwcm9wIHtudW1iZXJbXX0gc2NsPTEsMSAtIFNjYWxpbmdcblx0XHQgKiBAcHJvcCB7bnVtYmVyW119IHJvdD0wLDAgLSBSb3RhdGlvblxuXHRcdCAqIEBwcm9wIHtudW1iZXJbXX0gcGluPz10aGlzLnRhcmdldC53aWR0aC8yLHRoaXMudGFyZ2V0LmhlaWdodC8yIC0gUHNldWRvLWNlbnRlclxuXHRcdCAqIEBwcm9wIHtudW1iZXJbXX0gdHJhbnNCb3VuZD0tSW5maW5pdHksLUluZmluaXR5LEluZmluaXR5LEluZmluaXR5IC0gTWF4IHRyYW5zbGF0aW9uIGJvdW5kYXJpZXNcblx0XHQgKiBAcHJvcCB7Ym9vbGVhbn0gZHJhZ0VuYWJsZWQ9ZmFsc2UgLSBFbmFibGUgdHJhbnNsYXRpb24gb24gZHJhZ1xuXHRcdCAqIEBwcm9wIHtib29sZWFufSBwaW5jaEVuYWJsZWQ9ZmFsc2UgLSBFbmFibGUgc2NhbGluZyBvbiAyLWZpbmdlciBwaW5jaCAoMSBmaW5nZXIgb25seSBzaGFsbCBtb3ZlKVxuXHRcdCAqIEBwcm9wIHtib29sZWFufSBwaW5jaFN3aXBlRW5hYmxlZD1mYWxzZSAtIEVuYWJsZSByb3RhdGlvbiBvbiAyLWZpbmdlciBwaW5jaCAoYm90aCBmaW5nZXJzIHNoYWxsIG1vdmUpXG5cdFx0ICogQHByb3Age2Jvb2xlYW59IHdoZWVsRW5hYmxlZD1mYWxzZSAtIEVuYWJsZSBzY2FsaW5nIG9uIG1vdXNlIHdoZWVsXG5cdFx0ICogQHByb3Age2Jvb2xlYW59IHBhbkVuYWJsZWQ9ZmFsc2UgLSBFbmFibGUgdHJhbnNsYXRpb24gYmFzZWQgb24gbW91c2UvZmluZ2VyIGRpc3RhbmNlIGZyb20gcGluIChwc2V1ZG8tY2VudGVyKVxuXHRcdCAqIEBwcm9wIHtib29sZWFufSB0aWx0RW5hYmxlZD1mYWxzZSAtIEVuYWJsZSB0cmFuc2xhdGlvbiBvbiBkZXZpY2UgbW92ZW1lbnRcblx0XHQgKiBAcHJvcCB7Ym9vbGVhbn0gZXZlbnRzUmV2ZXJzZWQ9ZmFsc2UgLSBUb2dnbGUgcmV2ZXJzZS1vcGVyYXRpb25zXG5cdFx0ICogQHByb3Age2Jvb2xlYW59IHVzZVJpZ2h0PWZhbHNlIC0gVXNlIHJpZ2h0IGNsaWNrIGFzIG1haW5cblx0XHQgKiBAcHJvcCB7bnVtYmVyfSB0cmFuc1NwZWVkPTEgLSBUcmFuc2xhdGlvbiBzcGVlZCBmYWN0b3Jcblx0XHQgKiBAcHJvcCB7bnVtYmVyfSBzY2xTcGVlZD0xIC0gU2NhbGluZyBzcGVlZCBmYWN0b3Jcblx0XHQgKiBAcHJvcCB7T3B0cy5Db250cm9sbGFibGVDYW52YXNBZGFwdGVyc30gX2FkYXB0cyAtIE1hcCBvZiBhbGwgY3VycmVudGx5IGF0dGFjaGVkIGNvbnRyb2wgZXZlbnQgYWRhcHRlcnNcblx0XHQgKi9cblx0XHRleHBvcnQgaW50ZXJmYWNlIENvbnRyb2xsYWJsZUNhbnZhc09wdGlvbnMge1xuXHRcdFx0dGFyZ2V0OiBIVE1MQ2FudmFzRWxlbWVudDtcblx0XHRcdHRyYW5zOiBudW1iZXJbXTtcblx0XHRcdHNjbDogbnVtYmVyW107XG5cdFx0XHRyb3Q6IG51bWJlcjtcblx0XHRcdGRyYWdFbmFibGVkOiBib29sZWFuO1xuXHRcdFx0cGluY2hFbmFibGVkOiBib29sZWFuO1xuXHRcdFx0cGluY2hTd2lwZUVuYWJsZWQ6IGJvb2xlYW47XG5cdFx0XHR3aGVlbEVuYWJsZWQ6IGJvb2xlYW47XG5cdFx0XHRwYW5FbmFibGVkOiBib29sZWFuO1xuXHRcdFx0dGlsdEVuYWJsZWQ6IGJvb2xlYW47XG5cdFx0XHRldmVudHNSZXZlcnNlZDogYm9vbGVhbjtcblx0XHRcdHVzZVJpZ2h0OiBib29sZWFuO1xuXHRcdFx0dHJhbnNCb3VuZHM6IG51bWJlcltdO1xuXHRcdFx0c2NsQm91bmRzOiBudW1iZXJbXTtcblx0XHRcdHRyYW5zU3BlZWQ6IG51bWJlcjtcblx0XHRcdHNjbFNwZWVkOiBudW1iZXI7XG5cdFx0XHRfYWRhcHRzOiBDb250cm9sbGFibGVDYW52YXNBZGFwdGVycztcblx0XHRcdFtwcm9wOiBzdHJpbmddOiBhbnk7XG5cdFx0fSAvL0NvbnRyb2xsYWJsZUNhbnZhc09wdGlvbnNcblxuXHRcdC8qKlxuXHRcdCAqIE06IG1vYmlsZVxuXHRcdCAqIFA6IHBjXG5cdFx0ICogTVA6IGJvdGhcblx0XHQgKiBcblx0XHQgKiBkcmFnOlxuXHRcdCAqXHRQOiBtb3VzZSAgaG9sZCAmIG1vdmVcblx0XHQgKlx0TTogdG91Y2ggIGhvbGQgJiBtb3ZlXG5cdFx0ICogcGluY2g6XG5cdFx0ICpcdHRvdWNoICAyLWZpbmdlciAmIDEtbW92ZVxuXHRcdCAqIHBpbmNoU3dpcGU6XG5cdFx0ICpcdHRvdWNoICAyLWZpbmdlciAmIDItbW92ZVxuXHRcdCAqIHdoZWVsOlxuXHRcdCAqXHR3aGVlbCAgbW92ZSAgW3BjIHBpbmNoLWVxdWl2YWxlbnRdXG5cdFx0ICogcGFuOlxuXHRcdCAqXHRkaXNwb3NpdGlvbiBmcm9tIGNlbnRlciBjYXVzZXMgY29uc3RhbnQgdHJhbnNsYXRpb25cblx0XHQgKiB0aWx0OlxuXHRcdCAqXHRkZXZpY2Vtb3Rpb24gIGNhdXNlcyBwYW5uaW5nKlxuXHRcdCAqXHRcblx0XHQgKiBAaW50ZXJmYWNlXG5cdFx0ICogQGlubmVyXG5cdFx0ICovXG5cdFx0ZXhwb3J0IGludGVyZmFjZSBDb250cm9sbGFibGVDYW52YXNBZGFwdGVycyB7XG5cdFx0XHRkcmFnPzogRnVuY3Rpb24gfCBib29sZWFuOyAgLy9NUFxuXHRcdFx0cGluY2g/OiBGdW5jdGlvbiB8IGJvb2xlYW47ICAvL01cblx0XHRcdHBpbmNoU3dpcGU/OiBGdW5jdGlvbiB8IGJvb2xlYW47ICAvL01cblx0XHRcdHdoZWVsPzogRnVuY3Rpb24gfCBib29sZWFuOyAgLy9QXG5cdFx0XHRwYW4/OiBGdW5jdGlvbiB8IGJvb2xlYW47ICAvL01QXG5cdFx0XHR0aWx0PzogRnVuY3Rpb24gfCBib29sZWFuOyAgLy9NUFxuXHRcdFx0W3Byb3A6IHN0cmluZ106IGFueTtcblx0XHR9XG5cdH0gLy9PcHRzXG5cblx0LyoqXG5cdCAqIEEgaG9sZGVyIGZvciBhbGwgZXJyb3JzXG5cdCAqIEBuYW1lc3BhY2Vcblx0ICovXG5cdGV4cG9ydCBuYW1lc3BhY2UgRXJyb3JzIHtcblx0XHRleHBvcnQgY29uc3QgRU5PVENBTlY6IFR5cGVFcnJvciA9IG5ldyBUeXBlRXJyb3IoXCJOb3QgYW4gSFRNTENhbnZhc0VsZW1lbnQuXCIpO1xuXHRcdGV4cG9ydCBjb25zdCBFTk9UQ1RYOiBUeXBlRXJyb3IgPSBuZXcgVHlwZUVycm9yKFwiTm90IGEgQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELlwiKTtcblx0XHRleHBvcnQgY29uc3QgRU5PVE5VTUFSUjI6IFR5cGVFcnJvciA9IG5ldyBUeXBlRXJyb3IoXCJOb3QgYW4gQXJyYXkgb2YgMi1hdC1sZWFzdCBOdW1iZXJzLlwiKTtcblx0fSAvL0Vycm9yc1xuXG5cdFxuXHQvKipcblx0ICogQSB3cmFwcGVyIGZvciB0aGUgdGFyZ2V0ZWQgY2FudmFzIGVsZW1lbnRcblx0ICogQGNsYXNzXG5cdCAqIEBpbXBsZW1lbnRzIHtPcHRzLkNvbnRyb2xsYWJsZUNhbnZhc09wdGlvbnN9XG5cdCAqIEBwcm9wIHtIVE1MQ2FudmFzRWxlbWVudH0gdGFyZ2V0PWZpcnN0Q2Fudk9jY3VySW5Eb2MgLSBCb3VuZCBjYW52YXNcblx0ICogQHByb3Age0NhbnZhc1JlbmRlcmluZ0NvbnRleHQyRH0gY29udGV4dD89dGFyZ2V0LmdldENvbnRleHQoXCIyZFwiKSAtIFRoZSAyZCBjb250ZXh0IGNyZWF0ZWQgb3V0IG9mIGB0YXJnZXRgXG5cdCAqIEBwcm9wIHtudW1iZXJbXX0gdHJhbnM9MCwwIC0gVHJhbnNsYXRpb25cblx0ICogQHByb3Age251bWJlcltdfSBzY2w9MSwxIC0gU2NhbGluZ1xuXHQgKiBAcHJvcCB7bnVtYmVyW119IHJvdD0wLDAgLSBSb3RhdGlvblxuXHQgKiBAcHJvcCB7bnVtYmVyW119IHBpbj89dGhpcy50YXJnZXQud2lkdGgvMix0aGlzLnRhcmdldC5oZWlnaHQvMiAtIFBzZXVkby1jZW50ZXJcblx0ICogQHByb3Age251bWJlcltdfSB0cmFuc0JvdW5kPS1JbmZpbml0eSwtSW5maW5pdHksSW5maW5pdHksSW5maW5pdHkgLSBNYXggdHJhbnNsYXRpb24gYm91bmRhcmllc1xuXHQgKiBAcHJvcCB7Ym9vbGVhbn0gZHJhZ0VuYWJsZWQ9ZmFsc2UgLSBFbmFibGUgdHJhbnNsYXRpb24gb24gZHJhZ1xuXHQgKiBAcHJvcCB7Ym9vbGVhbn0gcGluY2hFbmFibGVkPWZhbHNlIC0gRW5hYmxlIHNjYWxpbmcgb24gMi1maW5nZXIgcGluY2ggKDEgZmluZ2VyIG9ubHkgc2hhbGwgbW92ZSlcblx0ICogQHByb3Age2Jvb2xlYW59IHBpbmNoU3dpcGVFbmFibGVkPWZhbHNlIC0gRW5hYmxlIHJvdGF0aW9uIG9uIDItZmluZ2VyIHBpbmNoIChib3RoIGZpbmdlcnMgc2hhbGwgbW92ZSlcblx0ICogQHByb3Age2Jvb2xlYW59IHdoZWVsRW5hYmxlZD1mYWxzZSAtIEVuYWJsZSBzY2FsaW5nIG9uIG1vdXNlIHdoZWVsXG5cdCAqIEBwcm9wIHtib29sZWFufSBwYW5FbmFibGVkPWZhbHNlIC0gRW5hYmxlIHRyYW5zbGF0aW9uIGJhc2VkIG9uIG1vdXNlL2ZpbmdlciBkaXN0YW5jZSBmcm9tIHBpbiAocHNldWRvLWNlbnRlcilcblx0ICogQHByb3Age2Jvb2xlYW59IHRpbHRFbmFibGVkPWZhbHNlIC0gRW5hYmxlIHRyYW5zbGF0aW9uIG9uIGRldmljZSBtb3ZlbWVudFxuXHQgKiBAcHJvcCB7Ym9vbGVhbn0gZXZlbnRzUmV2ZXJzZWQ9ZmFsc2UgLSBUb2dnbGUgcmV2ZXJzZS1vcGVyYXRpb25zXG5cdCAqIEBwcm9wIHtib29sZWFufSB1c2VSaWdodD1mYWxzZSAtIFVzZSByaWdodCBjbGljayBhcyBtYWluXG5cdCAqIEBwcm9wIHtudW1iZXJbXX0gX2Nvb3JkaW5hdGVzIC0gQ3VycmVudCBldmVudCBjb29yZGluYXRlc1xuXHQgKiBAcHJvcCB7bnVtYmVyfSB0cmFuc1NwZWVkPTEgLSBUcmFuc2xhdGlvbiBzcGVlZCBmYWN0b3Jcblx0ICogQHByb3Age251bWJlcn0gc2NsU3BlZWQ9MSAtIFNjYWxpbmcgc3BlZWQgZmFjdG9yXG5cdCAqIEBwcm9wIHtPcHRzLkNvbnRyb2xsYWJsZUNhbnZhc0FkYXB0ZXJzfSBfYWRhcHRzIC0gTWFwIG9mIGFsbCBjdXJyZW50bHkgYXR0YWNoZWQgY29udHJvbCBldmVudCBhZGFwdGVyc1xuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIENvbnRyb2xsYWJsZUNhbnZhcyBpbXBsZW1lbnRzIE9wdHMuQ29udHJvbGxhYmxlQ2FudmFzT3B0aW9ucyB7XG5cdFx0dGFyZ2V0OiBIVE1MQ2FudmFzRWxlbWVudDtcblx0XHRjb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ7XG5cdFx0dHJhbnM6IG51bWJlcltdO1xuXHRcdHNjbDogbnVtYmVyW107XG5cdFx0cm90OiBudW1iZXI7XG5cdFx0cGluOiBudW1iZXJbXTtcblx0XHR0cmFuc0JvdW5kczogbnVtYmVyW107XG5cdFx0c2NsQm91bmRzOiBudW1iZXJbXTtcblx0XHRkcmFnRW5hYmxlZDogYm9vbGVhbjtcblx0XHRwaW5jaEVuYWJsZWQ6IGJvb2xlYW47XG5cdFx0cGluY2hTd2lwZUVuYWJsZWQ6IGJvb2xlYW47XG5cdFx0d2hlZWxFbmFibGVkOiBib29sZWFuO1xuXHRcdHBhbkVuYWJsZWQ6IGJvb2xlYW47XG5cdFx0dGlsdEVuYWJsZWQ6IGJvb2xlYW47XG5cdFx0ZXZlbnRzUmV2ZXJzZWQ6IGJvb2xlYW47XG5cdFx0dXNlUmlnaHQ6IGJvb2xlYW47ICAvKiogQHRvZG8gU3ltYm9sOiB1c2Vib3RoLHVzZWxlZnQsdXNlcmlnaHQgKi9cblx0XHR0cmFuc1NwZWVkOiBudW1iZXI7XG5cdFx0c2NsU3BlZWQ6IG51bWJlcjtcblx0XHRwcml2YXRlIF9oYW5kbGVkOiBib29sZWFuO1xuXHRcdHByaXZhdGUgX21vYmlsZTogYm9vbGVhbjtcblx0XHRwcml2YXRlIF9wcmVzc2VkOiBib29sZWFuO1xuXHRcdF9hZGFwdHM6IE9wdHMuQ29udHJvbGxhYmxlQ2FudmFzQWRhcHRlcnM7XG5cdFx0X2Nvb3JkaW5hdGVzOiBudW1iZXJbXTtcblxuXHRcdHByaXZhdGUgc3RhdGljIF9saW5lcGl4OiBudW1iZXI7XG5cdFx0LyoqXG5cdFx0ICogRGVmYXVsdCBvcHRpb25zIGZvciBDb250cm9sbGFibGVDYW52YXNcblx0XHQgKiBAcmVhZG9ubHlcblx0XHQgKiBAc3RhdGljXG5cdFx0ICovXG5cdFx0c3RhdGljIGRlZmF1bHRPcHRzOiBPcHRzLkNvbnRyb2xsYWJsZUNhbnZhc09wdGlvbnMgPSB7XG5cdFx0XHR0YXJnZXQ6IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2FudmFzXCIpWzBdLFxuXHRcdFx0dHJhbnM6IFswLCAwXSxcblx0XHRcdHNjbDogWzEsIDFdLFxuXHRcdFx0cm90OiAwLFxuXHRcdFx0ZHJhZ0VuYWJsZWQ6IGZhbHNlLFxuXHRcdFx0cGluY2hFbmFibGVkOiBmYWxzZSxcblx0XHRcdHBpbmNoU3dpcGVFbmFibGVkOiBmYWxzZSxcblx0XHRcdHdoZWVsRW5hYmxlZDogZmFsc2UsXG5cdFx0XHRwYW5FbmFibGVkOiBmYWxzZSxcblx0XHRcdHRpbHRFbmFibGVkOiBmYWxzZSxcblx0XHRcdGV2ZW50c1JldmVyc2VkOiBmYWxzZSxcblx0XHRcdHVzZVJpZ2h0OiBmYWxzZSxcblx0XHRcdHRyYW5zU3BlZWQ6IDEsXG5cdFx0XHRzY2xTcGVlZDogMSxcblx0XHRcdHNjbEJvdW5kczogWzAsIDAsIEluZmluaXR5LCBJbmZpbml0eV0sXG5cdFx0XHR0cmFuc0JvdW5kczogWy1JbmZpbml0eSwgLUluZmluaXR5LCBJbmZpbml0eSwgSW5maW5pdHldLFxuXHRcdFx0X2FkYXB0czoge1xuXHRcdFx0XHRkcmFnOiBmYWxzZSxcblx0XHRcdFx0cGluY2g6IGZhbHNlLFxuXHRcdFx0XHRwaW5jaFN3aXBlOiBmYWxzZSxcblx0XHRcdFx0d2hlZWw6IGZhbHNlLFxuXHRcdFx0XHRwYW46IGZhbHNlLFxuXHRcdFx0XHR0aWx0OiBmYWxzZVxyXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8qKlxyXG5cdFx0ICogQ29udHJvbGxhYmxlQ2FudmFzIGNvbnN0cnVjdG9yXHJcblx0XHQgKiBAcGFyYW0ge09wdHMuQ29udHJvbGxhYmxlQ2FudmFzT3B0aW9uc30gb3B0cz89Q29udHJvbGxhYmxlQ2FudmFzLmRlZmF1bHRPcHRzIC0gQ29udHJvbGxhYmxlQ2FudmFzIE9wdGlvbnNcclxuXHRcdCAqIEBjb25zdHJ1Y3RvclxyXG5cdFx0ICovXG5cdFx0Y29uc3RydWN0b3Iob3B0czogT3B0cy5Db250cm9sbGFibGVDYW52YXNPcHRpb25zID0gQ29udHJvbGxhYmxlQ2FudmFzLmRlZmF1bHRPcHRzKSB7XG5cdFx0XHRpbmhlcml0KG9wdHMsIENvbnRyb2xsYWJsZUNhbnZhcy5kZWZhdWx0T3B0cyk7XG5cdFx0XHRcblx0XHRcdGlmICghKG9wdHMudGFyZ2V0IGluc3RhbmNlb2YgSFRNTENhbnZhc0VsZW1lbnQpKSB7XG5cdFx0XHRcdHRocm93IEVycm9ycy5FTk9UQ0FOVjtcblx0XHRcdH0gZWxzZSBpZiAoW29wdHMudHJhbnMsIG9wdHMuc2NsLCBvcHRzLnRyYW5zQm91bmRzLCBvcHRzLnNjbEJvdW5kc10uc29tZShhcnIgPT4gIShhcnIgaW5zdGFuY2VvZiBBcnJheSB8fCA8YW55PmFyciBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSB8fCA8YW55PmFyciBpbnN0YW5jZW9mIEZsb2F0NjRBcnJheSkgfHwgYXJyLmxlbmd0aCA8IDIgfHwgQXJyYXkuZnJvbShhcnIpLnNvbWUoKG51bTogYW55KSA9PiBpc05hTihudW0pIHx8IG51bSA9PT0gJycpKSkge1xuXHRcdFx0XHR0aHJvdyBFcnJvcnMuRU5PVE5VTUFSUjI7XG5cdFx0XHR9XG5cblx0XHRcdGluaGVyaXQob3B0cy5fYWRhcHRzLCBDb250cm9sbGFibGVDYW52YXMuZGVmYXVsdE9wdHMuX2FkYXB0cyk7XG5cblx0XHRcdGlmIChvcHRzLnBpbiA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdG9wdHMucGluID0gW29wdHMudGFyZ2V0LndpZHRoIC8gMiwgb3B0cy50YXJnZXQuaGVpZ2h0IC8gMl07XHJcblx0XHRcdH0gZWxzZSBpZiAoIShvcHRzLnBpbiBpbnN0YW5jZW9mIEFycmF5IHx8IDxhbnk+b3B0cy5waW4gaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkgfHwgPGFueT5vcHRzLnBpbiBpbnN0YW5jZW9mIEZsb2F0NjRBcnJheSkgfHwgb3B0cy5waW4ubGVuZ3RoIDwgMiB8fCBBcnJheS5mcm9tKG9wdHMucGluKS5zb21lKChudW06IGFueSkgPT4gaXNOYU4obnVtKSB8fCBudW0gPT09ICcnKSkge1xuXHRcdFx0XHR0aHJvdyBFcnJvcnMuRU5PVE5VTUFSUjI7XHJcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dGhpcy50YXJnZXQgPSBvcHRzLnRhcmdldDtcblx0XHRcdHRoaXMuY29udGV4dCA9IHRoaXMudGFyZ2V0LmdldENvbnRleHQoXCIyZFwiKTtcblxuXHRcdFx0dGhpcy5fYWRhcHRzID0gPE9wdHMuQ29udHJvbGxhYmxlQ2FudmFzQWRhcHRlcnM+eyB9O1xuXHRcdFx0aW5oZXJpdCh0aGlzLl9hZGFwdHMsIG9wdHMuX2FkYXB0cyk7XG5cblx0XHRcdHRoaXMucm90ID0gb3B0cy5yb3QgKiAxO1xuXHRcdFx0dGhpcy50cmFuc1NwZWVkID0gb3B0cy50cmFuc1NwZWVkICogMTtcblx0XHRcdHRoaXMuc2NsU3BlZWQgPSBvcHRzLnNjbFNwZWVkICogMTtcblxuXHRcdFx0dGhpcy50cmFucyA9IEFycmF5LmZyb20ob3B0cy50cmFucykubWFwKE51bWJlcik7XG5cdFx0XHR0aGlzLnNjbCA9IEFycmF5LmZyb20ob3B0cy5zY2wpLm1hcChOdW1iZXIpO1xuXHRcdFx0dGhpcy5waW4gPSBBcnJheS5mcm9tKG9wdHMucGluKS5tYXAoTnVtYmVyKTtcblx0XHRcdHRoaXMudHJhbnNCb3VuZHMgPSBBcnJheS5mcm9tKG9wdHMudHJhbnNCb3VuZHMpLm1hcChOdW1iZXIpOyAgLy8geCwgeSwgWCwgWVxuXHRcdFx0dGhpcy5zY2xCb3VuZHMgPSBBcnJheS5mcm9tKG9wdHMuc2NsQm91bmRzKS5tYXAoTnVtYmVyKTsgIC8vIHgsIHksIFgsIFlcblxuXHRcdFx0dGhpcy5kcmFnRW5hYmxlZCA9ICEhb3B0cy5kcmFnRW5hYmxlZDtcblx0XHRcdHRoaXMucGluY2hFbmFibGVkID0gISFvcHRzLnBpbmNoRW5hYmxlZDtcblx0XHRcdHRoaXMucGluY2hTd2lwZUVuYWJsZWQgPSAhIW9wdHMucGluY2hTd2lwZUVuYWJsZWQ7XG5cdFx0XHR0aGlzLndoZWVsRW5hYmxlZCA9ICEhb3B0cy53aGVlbEVuYWJsZWQ7XG5cdFx0XHR0aGlzLnBhbkVuYWJsZWQgPSAhIW9wdHMucGFuRW5hYmxlZDtcblx0XHRcdHRoaXMudGlsdEVuYWJsZWQgPSAhIW9wdHMudGlsdEVuYWJsZWQ7XG5cdFx0XHR0aGlzLmV2ZW50c1JldmVyc2VkID0gISFvcHRzLmV2ZW50c1JldmVyc2VkO1xuXHRcdFx0dGhpcy51c2VSaWdodCA9ICEhb3B0cy51c2VSaWdodDtcblxuXHRcdFx0dGhpcy5faGFuZGxlZCA9IGZhbHNlO1xuXHRcdFx0dGhpcy5fbW9iaWxlID0gQ29udHJvbGxhYmxlQ2FudmFzLmlzTW9iaWxlO1xuXHRcdFx0dGhpcy5fcHJlc3NlZCA9IGZhbHNlO1xuXHRcdFx0dGhpcy5fY29vcmRpbmF0ZXMgPSBbMCwgMF07XG5cdFx0XHRpZiAoIUNvbnRyb2xsYWJsZUNhbnZhcy5fbGluZXBpeCkgQ29udHJvbGxhYmxlQ2FudmFzLl9saW5lcGl4ID0gQ29udHJvbGxhYmxlQ2FudmFzLmxpbmVUb1BpeDtcblx0XHR9IC8vY3RvclxuXG5cdFx0Z2V0IHJhdGlvKCk6IG51bWJlciB7XG5cdFx0XHRyZXR1cm4gdGhpcy50YXJnZXQud2lkdGggLyB0aGlzLnRhcmdldC5oZWlnaHQ7XG5cdFx0fSAvL2ctcmF0aW9cblxuXHRcdGdldCBtaW4oKTogbnVtYmVyIHtcblx0XHRcdHJldHVybiBNYXRoLm1pbih0aGlzLnRhcmdldC53aWR0aCwgdGhpcy50YXJnZXQuaGVpZ2h0KTtcblx0XHR9IC8vZy1taW5cblx0XHRnZXQgbWF4KCk6IG51bWJlciB7XG5cdFx0XHRyZXR1cm4gTWF0aC5tYXgodGhpcy50YXJnZXQud2lkdGgsIHRoaXMudGFyZ2V0LmhlaWdodCk7XG5cdFx0fSAvL2ctbWF4XG5cblxuXHRcdC8qKlxuXHRcdCAqIEVuYWJsZSBjb250cm9scywgY2FsbCBvbmx5IG9uY2Vcblx0XHQgKiBAcGFyYW0ge2Jvb2xlYW59IGZvcmNlPz1mYWxzZSAtIEZvcmNlIGhhbmRsZVxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufSBib3VuZD8gLSB3aGV0aGVyIGJpbmQgc3VjZWVkZWQgb3IgaXQgd2FzIGFscmVhZHkgYm91bmQgZWFybGllclxuXHRcdCAqL1xuXHRcdGhhbmRsZShmb3JjZTogYm9vbGVhbiA9IGZhbHNlKTogYm9vbGVhbiB7XG5cdFx0XHRpZiAoIXRoaXMuX2hhbmRsZWQgfHwgZm9yY2UpIHtcblx0XHRcdFx0dGhpcy5fbW9iaWxlID8gdGhpcy5fbW9iaWxlQWRhcHQoKSA6IHRoaXMuX3BjQWRhcHQoKTtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX2hhbmRsZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gLy9oYW5kbGVcblxuXG5cdFx0LyoqXG5cdFx0ICogUmUtYXBwbHkgaW50ZXJuYWwgdHJhbnNmb3JtYXRpb25zXG5cdFx0ICogQHJldHVybnMge0NvbnRyb2xsYWJsZUNhbnZhc30gdGhpcyAtIEZvciBtZXRob2QgY2hhaW5pbmdcblx0XHQgKi9cblx0XHRyZXRyYW5zZm9ybSgpOiBUaGlzVHlwZTxDb250cm9sbGFibGVDYW52YXM+IHtcblx0XHRcdHRoaXMuY29udGV4dC5zZXRUcmFuc2Zvcm0oMSwgMCwgMCwgMSwgMCwgMCk7XG5cdFx0XHR0aGlzLmNvbnRleHQudHJhbnNsYXRlKHRoaXMudHJhbnNbMF0sIHRoaXMudHJhbnNbMV0pO1xuXHRcdFx0dGhpcy5jb250ZXh0LnNjYWxlKHRoaXMuc2NsWzBdLCB0aGlzLnNjbFsxXSk7XG5cdFx0XHR0aGlzLmNvbnRleHQucm90YXRlKHRoaXMucm90KTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gLy9yZXRyYW5zZm9ybVxuXG5cdFx0LyoqXHJcblx0XHQgKiBJbnRlcm1lZGlhdGUgdHJhbnNsYXRpb24gZnVuY3Rpb24gZm9yIGljb25pYyB0cmFuc2xhdGUgYmVmb3JlIHRoZSByZWFsXHJcblx0XHQgKiBAcGFyYW0ge251bWJlcn0geD0wIC0geCB0cmFuc2xhdGlvblxyXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IHk9MCAtIHkgdHJhbnNsYXRpb25cclxuXHRcdCAqIEBwYXJhbSB7Ym9vbGVhbn0gYWJzPz1mYWxzZSAtIGFic2x1dGUgdHJhbnNsYXRpb24gb3IgcmVsYXRpdmUgdG8gY3VycmVudFxyXG5cdFx0ICogQHJldHVybnMge251bWJlcltdfSB0cmFucyAtIFJldHVybnMgY3VycmVudCB0b3RhbCB0cmFuc2xhdGlvblxyXG5cdFx0ICovXG5cdFx0dHJhbnNsYXRlKHg6IG51bWJlciA9IDAsIHk6IG51bWJlciA9IDAsIGFiczogYm9vbGVhbiA9IGZhbHNlKTogbnVtYmVyW10ge1xuXHRcdFx0bGV0IGJ5OiBudW1iZXJbXSA9IFt4LCB5XTtcblx0XHRcdHJldHVybiB0aGlzLnRyYW5zID0gdGhpcy50cmFucy5tYXAoKHRybjogbnVtYmVyLCBpZHg6IG51bWJlcikgPT4gYm91bmQoTnVtYmVyKCFhYnMgPyAodHJuICsgYnlbaWR4XSkgOiBieVtpZHhdKSwgdGhpcy50cmFuc0JvdW5kc1tpZHhdLCB0aGlzLnRyYW5zQm91bmRzW2lkeCArIDJdKSk7XG5cdFx0fSAvL3RyYW5zbGF0ZVxuXHRcdC8qKlxyXG5cdFx0ICogSW50ZXJtZWRpYXRlIHNjYWxpbmcgZnVuY3Rpb24gZm9yIGljb25pYyBzY2FsZSBiZWZvcmUgdGhlIHJlYWxcclxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSB4PTEgLSB4IHNjYWxlXHJcblx0XHQgKiBAcGFyYW0ge251bWJlcn0geT14IC0geSBzY2FsZVxyXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBhYnM/PWZhbHNlIC0gYWJzbHV0ZSBzY2FsZSBvciByZWxhdGl2ZSB0byBjdXJyZW50XHJcblx0XHQgKiBAcmV0dXJucyB7bnVtYmVyW119IHNjbCAtIFJldHVybnMgY3VycmVudCB0b3RhbCBzY2FsaW5nXHJcblx0XHQgKi9cblx0XHRzY2FsZSh4OiBudW1iZXIgPSAxLCB5OiBudW1iZXIgPSB4LCBhYnM6IGJvb2xlYW4gPSBmYWxzZSk6IG51bWJlcltdIHtcblx0XHRcdGxldCBieTogbnVtYmVyW10gPSBbeCwgeV07XG5cdFx0XHRyZXR1cm4gdGhpcy5zY2wgPSB0aGlzLnNjbC5tYXAoKHNjbDogbnVtYmVyLCBpZHg6IG51bWJlcikgPT4gYm91bmQoTnVtYmVyKCFhYnMgPyAoc2NsICogYnlbaWR4XSkgOiBieVtpZHhdKSwgdGhpcy5zY2xCb3VuZHNbaWR4XSwgdGhpcy5zY2xCb3VuZHNbaWR4ICsgMl0pKTtcclxuXHRcdH0gLy9zY2FsZVxuXG5cblx0XHRwcml2YXRlIF9tb2JpbGVBZGFwdCgpOiB2b2lkIHtcblx0XHRcdGlmICghdGhpcy5fYWRhcHRzLmRyYWcgJiYgdGhpcy5kcmFnRW5hYmxlZCkge1xuXHRcdFx0XHR0aGlzLnRhcmdldC5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hzdGFydFwiLCAoZTogVG91Y2hFdmVudCkgPT4gQ29udHJvbGxhYmxlQ2FudmFzLmRyYWdNb2JpbGVTdGFydChlLCB0aGlzKSwgeyBwYXNzaXZlOiBmYWxzZSB9KTtcblx0XHRcdFx0dGhpcy50YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLCB0aGlzLl9hZGFwdHMuZHJhZyA9IChlOiBUb3VjaEV2ZW50KSA9PiBDb250cm9sbGFibGVDYW52YXMuZHJhZ01vYmlsZU1vdmUoZSwgdGhpcyksIHsgcGFzc2l2ZTogZmFsc2UgfSk7XG5cdFx0XHRcdHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaGVuZFwiLCAoZTogVG91Y2hFdmVudCkgPT4gQ29udHJvbGxhYmxlQ2FudmFzLmRyYWdNb2JpbGVFbmQoZSwgdGhpcyksIHsgcGFzc2l2ZTogZmFsc2UgfSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIXRoaXMuX2FkYXB0cy5waW5jaCkge1xuXG5cdFx0XHR9XG5cdFx0XHRpZiAoIXRoaXMuX2FkYXB0cy5waW5jaFN3aXBlKSB7XG5cblx0XHRcdH1cblx0XHRcdGlmICghdGhpcy5fYWRhcHRzLnRpbHQpIHtcblxuXHRcdFx0fVxuXHRcdH0gLy9fbW9iaWxlQWRhcHRcblx0XHRwcml2YXRlIF9wY0FkYXB0KCk6IHZvaWQge1xuXHRcdFx0aWYgKCF0aGlzLl9hZGFwdHMuZHJhZyAmJiB0aGlzLmRyYWdFbmFibGVkKSB7XG5cdFx0XHRcdHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgdGhpcy5fYWRhcHRzLmRyYWcgPSAoZTogTW91c2VFdmVudCkgPT4gQ29udHJvbGxhYmxlQ2FudmFzLmRyYWdQQyhlLCB0aGlzKSk7XG5cdFx0XHRcdHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgKGU/OiBNb3VzZUV2ZW50KSA9PiB0aGlzLl9wcmVzc2VkID0gdHJ1ZSk7XG5cdFx0XHRcdHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIChlPzogTW91c2VFdmVudCkgPT4gdGhpcy5fcHJlc3NlZCA9IGZhbHNlKTtcblx0XHRcdFx0aWYgKHRoaXMudXNlUmlnaHQpIHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJjb250ZXh0bWVudVwiLCAoZTogTW91c2VFdmVudCkgPT4gZS5wcmV2ZW50RGVmYXVsdCgpLCB7IGNhcHR1cmU6IHRydWUsIHBhc3NpdmU6IGZhbHNlIH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCF0aGlzLl9hZGFwdHMud2hlZWwgJiYgdGhpcy53aGVlbEVuYWJsZWQpIHtcblx0XHRcdFx0dGhpcy50YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIHRoaXMuX2FkYXB0cy53aGVlbCA9IChlOiBXaGVlbEV2ZW50KSA9PiBDb250cm9sbGFibGVDYW52YXMud2hlZWwoZSwgdGhpcykpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCF0aGlzLl9hZGFwdHMudGlsdCkge1xuXG5cdFx0XHR9XG5cdFx0fSAvL19wY0FkYXB0XG5cblx0XHRzdGF0aWMgZHJhZ1BDKGV2ZW50OiBNb3VzZUV2ZW50LCBjYzogQ29udHJvbGxhYmxlQ2FudmFzKTogdm9pZCB7XG5cdFx0XHRpZiAoKCFjYy51c2VSaWdodCAmJiAoKFwiYnV0dG9uc1wiIGluIGV2ZW50KSAmJiAoZXZlbnQuYnV0dG9ucyAmIDIpID09PSAyKSB8fCAoKFwid2hpY2hcIiBpbiBldmVudCkgJiYgZXZlbnQud2hpY2ggPT09IDMpIHx8ICgoXCJidXR0b25cIiBpbiBldmVudCkgJiYgZXZlbnQuYnV0dG9uID09PSAyKSkgfHwgKGNjLnVzZVJpZ2h0ICYmICgoXCJidXR0b25zXCIgaW4gZXZlbnQpICYmIChldmVudC5idXR0b25zICYgMikgIT09IDIpICYmICgoXCJ3aGljaFwiIGluIGV2ZW50KSAmJiBldmVudC53aGljaCAhPT0gMykgJiYgKChcImJ1dHRvblwiIGluIGV2ZW50KSAmJiBldmVudC5idXR0b24gIT09IDIpKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdGxldCBjb29yZHM6IG51bWJlcltdID0gW2V2ZW50LmNsaWVudFggLSBjYy50YXJnZXQub2Zmc2V0TGVmdCwgZXZlbnQuY2xpZW50WSAtIGNjLnRhcmdldC5vZmZzZXRUb3BdO1xuXG5cdFx0XHRpZiAoY2MuX3ByZXNzZWQpIHtcblx0XHRcdFx0Y2MudHJhbnNsYXRlKGV2ZW50Lm1vdmVtZW50WCAqIGNjLnRyYW5zU3BlZWQsIGV2ZW50Lm1vdmVtZW50WSAqIGNjLnRyYW5zU3BlZWQpO1xuXHRcdFx0fVxuXG5cdFx0XHRjYy5fY29vcmRpbmF0ZXMgPSBjb29yZHM7XG5cdFx0fSAvL2RyYWdQQ1xuXG5cdFx0c3RhdGljIGRyYWdNb2JpbGVNb3ZlKGV2ZW50OiBUb3VjaEV2ZW50LCBjYzogQ29udHJvbGxhYmxlQ2FudmFzKTogdm9pZCB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRsZXQgY29vcmRzOiBudW1iZXJbXSA9IFtldmVudC50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFggLSBjYy50YXJnZXQub2Zmc2V0TGVmdCwgZXZlbnQudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRZIC0gY2MudGFyZ2V0Lm9mZnNldFRvcF07XG5cblx0XHRcdGlmIChldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRjYy50cmFuc2xhdGUoY29vcmRzWzBdIC0gY2MuX2Nvb3JkaW5hdGVzWzBdLCBjb29yZHNbMV0gLSBjYy5fY29vcmRpbmF0ZXNbMV0pO1xuXHRcdFx0fVxuXG5cdFx0XHRjYy5fY29vcmRpbmF0ZXMgPSBjb29yZHM7XG5cdFx0fSAvL2RyYWdNb2JpbGVNb3ZlXG5cdFx0c3RhdGljIGRyYWdNb2JpbGVTdGFydChldmVudDogVG91Y2hFdmVudCwgY2M6IENvbnRyb2xsYWJsZUNhbnZhcyk6IHZvaWQge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGNjLl9jb29yZGluYXRlcyA9IFtldmVudC50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFggLSBjYy50YXJnZXQub2Zmc2V0TGVmdCwgZXZlbnQudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRZIC0gY2MudGFyZ2V0Lm9mZnNldFRvcF07XG5cdFx0fSAvL2RyYWdNb2JpbGVTdGFydFxuXHRcdHN0YXRpYyBkcmFnTW9iaWxlRW5kKGV2ZW50OiBUb3VjaEV2ZW50LCBjYzogQ29udHJvbGxhYmxlQ2FudmFzKTogdm9pZCB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0aWYgKGV2ZW50LnRhcmdldFRvdWNoZXMubGVuZ3RoID09IDEpIHtcblx0XHRcdFx0Q29udHJvbGxhYmxlQ2FudmFzLmRyYWdNb2JpbGVTdGFydChldmVudCwgY2MpO1xuXHRcdFx0fVxuXHRcdH0gLy9kcmFnTW9iaWxlRW5kXG5cblx0XHRzdGF0aWMgd2hlZWwoZXZlbnQ6IFdoZWVsRXZlbnQsIGNjOiBDb250cm9sbGFibGVDYW52YXMpOiB2b2lkIHtcblx0XHRcdGxldCBkOiBudW1iZXIgPSAxIC0gY2Muc2NsU3BlZWQgKiBDb250cm9sbGFibGVDYW52YXMuZml4RGVsdGEoZXZlbnQuZGVsdGFNb2RlLCBldmVudC5kZWx0YVkpIC8gY2MubWF4LFxuXHRcdFx0XHRjb29yZHM6IG51bWJlcltdID0gW2V2ZW50LmNsaWVudFggLSBjYy50YXJnZXQub2Zmc2V0TGVmdCAtIGNjLnRyYW5zWzBdLCBldmVudC5jbGllbnRZIC0gY2MudGFyZ2V0Lm9mZnNldFRvcCAtIGNjLnRyYW5zWzFdXSxcblx0XHRcdFx0bmNvb3JkOiBudW1iZXJbXSA9IGNvb3Jkcy5tYXAoKGM6IG51bWJlciwgaWR4OiBudW1iZXIpID0+IGMgKiAoMSAtIGQpKTtcblx0XHRcdGNjLnRyYW5zbGF0ZSguLi5uY29vcmQpO1xuXHRcdFx0Y2Muc2NhbGUoZCwgZCk7XG5cdFx0XHRjb25zb2xlLmxvZyhuY29vcmQsIGNvb3Jkcyk7XG5cdFx0fSAvL3doZWVsXG5cblxuXHRcdHByaXZhdGUgc3RhdGljIGdldCBpc01vYmlsZSgpOiBib29sZWFuIHtcblx0XHRcdGlmIChuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9BbmRyb2lkL2kpIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL3dlYk9TL2kpXG5cdFx0XHRcdHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL2lQaG9uZS9pKSB8fCBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9pUGFkL2kpXG5cdFx0XHRcdHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL2lQb2QvaSkgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQmxhY2tCZXJyeS9pKSB8fCBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9XaW5kb3dzIFBob25lL2kpXG5cdFx0XHQpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fSAvL2RldGVjdE1vYmlsZVxuXG5cdFx0cHJpdmF0ZSBzdGF0aWMgZ2V0IGxpbmVUb1BpeCgpOiBudW1iZXIge1xuXHRcdFx0bGV0IHI6IG51bWJlcixcblx0XHRcdFx0aWZyYW1lOiBIVE1MSUZyYW1lRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpZnJhbWVcIik7XG5cdFx0XHRpZnJhbWUuc3JjID0gJyMnO1xuXHRcdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpZnJhbWUpO1xuXHRcdFx0bGV0IGl3aW46IFdpbmRvdyA9IGlmcmFtZS5jb250ZW50V2luZG93LFxuXHRcdFx0XHRpZG9jOiBEb2N1bWVudCA9IGl3aW4uZG9jdW1lbnQ7XG5cdFx0XHRpZG9jLm9wZW4oKTtcblx0XHRcdGlkb2Mud3JpdGUoJzwhRE9DVFlQRSBodG1sPjxodG1sPjxoZWFkPjwvaGVhZD48Ym9keT48cD5hPC9wPjwvYm9keT48L2h0bWw+Jyk7XG5cdFx0XHRpZG9jLmNsb3NlKCk7XG5cdFx0XHRsZXQgc3BhbjogSFRNTEVsZW1lbnQgPSA8SFRNTEVsZW1lbnQ+aWRvYy5ib2R5LmZpcnN0RWxlbWVudENoaWxkO1xuXHRcdFx0ciA9IHNwYW4ub2Zmc2V0SGVpZ2h0O1xuXHRcdFx0ZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChpZnJhbWUpO1xuXHRcdFx0cmV0dXJuIHI7XG5cdFx0fSAvL2xpbmVUb1BpeFxuXG5cdFx0cHJpdmF0ZSBzdGF0aWMgZml4RGVsdGEobW9kZTogbnVtYmVyLCBkZWx0YVk6IG51bWJlcik6IG51bWJlciB7XG5cdFx0XHRpZiAobW9kZSA9PT0gMSkge1xuXHRcdFx0XHRyZXR1cm4gQ29udHJvbGxhYmxlQ2FudmFzLl9saW5lcGl4ICogZGVsdGFZO1xuXHRcdFx0fSBlbHNlIGlmIChtb2RlID09PSAyKSB7XG5cdFx0XHRcdHJldHVybiB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gZGVsdGFZO1xuXHRcdFx0fVxuXHRcdH0gLy9maXhEZWx0YVxuXHRcdFxuXHR9IC8vQ29udHJvbGxhYmxlQ2FudmFzXG5cbn0gLy9DYW52YXNDb250cm9sc1xuXG5leHBvcnQgZGVmYXVsdCBDYW52YXNDb250cm9scy5Db250cm9sbGFibGVDYW52YXM7XG4iXX0=