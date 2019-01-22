/*
 * Angle between 3 poins (Radians):
 * pc: center/pole
 * pn: point new coordinates
 * pp: point past coordinates
 *
 * atan2(pny - pcy, pnx - pcx) - atan2(ppy - pcy, ppx - pcx)
 */
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
     * @inner
     * @param {object} dest - destination object
     * @param {object} targ - base object
     * @param {Function} condition - inheritance condition
     * @returns {object} destination object
     */
    function inherit(dest, targ, condition = (dest, targ, prop) => dest[prop] === undefined && (dest[prop] = targ[prop])) {
        for (let i in targ) {
            condition(dest, targ, i);
        }
        return dest;
    } //inherit
    CanvasControls.inherit = inherit;
    /**
     * Restrict number's range
     * @function
     * @inner
     * @param {number} n - target number
     * @param {number} m - minimum number
     * @param {number} M - maximum number
     * @param {number} p=0 - precision
     * @returns {number} bound number
     */
    function bound(n, m, M, p = 0) {
        return n > M + p ? M : (n < m - p ? m : n);
    } //bound
    CanvasControls.bound = bound;
    /**
     * Downspeed incrementation
     * @param {number} n - number
     * @param {number} m - minimum
     * @param {number} M - Maximum
     * @param {number} op - operation
     * @returns {number} n
     */
    function block(n, m, M, op) {
        if (n > M && op > 0) {
            return n;
        }
        else if (n > M) {
            return n + op;
        }
        else if (n < m && op < 0) {
            return n;
        }
        else if (n < m) {
            return n + op;
        }
        else {
            return n + op;
        }
    } //block
    CanvasControls.block = block;
    /**
     * Calculate distance between 2 points
     * @param {number[]} Xs - X coordinates
     * @param {number[]} Ys - Y coordinates
     * @returns {number} distance
     * @function
     * @inner
     */
    function dist(Xs, Ys) {
        return Math.sqrt([Xs[1] - Xs[0], Ys[1] - Ys[0]].map((v) => Math.pow(v, 2)).reduce((acc, v) => acc + v));
    } //dist
    CanvasControls.dist = dist;
    /**
     * Checks if pointer is inside an area
     * @param {number[]} box - x,y,dx,dy
     * @param {number[]} point - x,y
     * @param {number} sensitivity - extra boundary
     * @returns boolean
     * @inner
     * @function
     */
    function isWithin(box, point, sensitivity = .5) {
        return box[0] - sensitivity <= point[0] && box[0] + box[2] + sensitivity >= point[0] && box[1] - sensitivity <= point[1] && box[1] + box[3] + sensitivity >= point[1];
    } //isWithin
    CanvasControls.isWithin = isWithin;
    /**
     * A holder for all Options
     * @namespace
     */
    let Opts;
    (function (Opts) {
        let UseButton;
        (function (UseButton) {
            UseButton[UseButton["USELEFT"] = 1] = "USELEFT";
            UseButton[UseButton["USERIGHT"] = 2] = "USERIGHT";
            UseButton[UseButton["USEBOTH"] = 3] = "USEBOTH";
        })(UseButton = Opts.UseButton || (Opts.UseButton = {})); //UseButton
        let ScaleMode;
        (function (ScaleMode) {
            ScaleMode[ScaleMode["NORMAL"] = 1] = "NORMAL";
            ScaleMode[ScaleMode["FREESCALE"] = 2] = "FREESCALE";
        })(ScaleMode = Opts.ScaleMode || (Opts.ScaleMode = {})); //ScaleMode
        let Position;
        (function (Position) {
            Position[Position["FIXED"] = 1] = "FIXED";
            Position[Position["ABSOLUTE"] = 2] = "ABSOLUTE";
            Position[Position["UNSCALABLE"] = 4] = "UNSCALABLE";
        })(Position = Opts.Position || (Opts.Position = {})); //Position
    })(Opts = CanvasControls.Opts || (CanvasControls.Opts = {})); //Opts
    /**
     * A holder for all errors
     * @namespace
     */
    let Errors;
    (function (Errors) {
        Errors.ENOTCANV = new TypeError("Not an HTMLCanvasElement.");
        Errors.ENOTCTX = new TypeError("Not a CanvasRenderingContext2D.");
        Errors.ENOTNUMARR2 = new TypeError("Not an Array of 2-at-least Numbers.");
        Errors.ENOTNUM = new TypeError("Not a valid Number.");
        Errors.EISALR = new ReferenceError("Object is already registered.");
    })(Errors = CanvasControls.Errors || (CanvasControls.Errors = {})); //Errors
    /**
     * A wrapper for the targeted canvas element
     * @class
     * @implements {Opts.ControllableCanvasOptions}
     * @prop {HTMLCanvasElement} target=firstCanvOccurInDoc - Bound canvas
     * @prop {CanvasRenderingContext2D} context?=target.getContext("2d") - The 2d context created out of `target`
     * @prop {number[]} trans=0,0 - Translation
     * @prop {number[]} scl=1,1 - Scaling
     * @prop {number[]} pin?=this.target.width/2,this.target.height/2 - Pseudo-center
     * @prop {number[]} transBound=-Infinity,-Infinity,Infinity,Infinity - Max translation boundaries
     * @prop {boolean} dragEnabled=false - Enable translation on drag
     * @prop {boolean} pinchEnabled=false - Enable scaling on 2-finger pinch (both fingers shall move)
     * @prop {boolean} wheelEnabled=false - Enable scaling on mouse wheel
     * @prop {boolean} panEnabled=false - Enable translation based on mouse/finger distance from pin (pseudo-center)
     * @prop {boolean} tiltEnabled=false - Enable translation on device movement
     * @prop {boolean} eventsReversed=false - Toggle reverse-operations
     * @prop {Opts.UseButton} useButton=Opts.UseButton.USELEFT - Respond to left-click, right or both
     * @prop {number[]} _coordinates - Current event coordinates
     * @prop {number} transSpeed=1 - Translation speed factor
     * @prop {number} sclSpeed=1 - Scaling speed factor
     * @prop {Opts.ControllableCanvasAdapters} _adapts - Map of all currently attached control event adapters
     * @prop {object} _touches - Map of all current touches
     * @prop {Class} CanvasButton - A widget-making class for canvas
     * @prop {Set<CanvasButton>} wgets - Canvas widgets
     */
    class ControllableCanvas {
        /**
         * ControllableCanvas constructor
         * @param {Opts.ControllableCanvasOptions} opts?=ControllableCanvas.defaultOpts - ControllableCanvas Options
         * @constructor
         */
        constructor(opts = ControllableCanvas.defaultOpts) {
            this.trans = [0, 0];
            this.scl = [1, 1];
            this.transBounds = [-Infinity, -Infinity, Infinity, Infinity];
            this.sclBounds = [0, 0, Infinity, Infinity];
            this.dragEnabled = false;
            this.pinchEnabled = false;
            this.wheelEnabled = false;
            this.panEnabled = false; //OBS
            this.tiltEnabled = false; //OBS
            this.eventsReversed = false;
            this.useButton = Opts.UseButton.USELEFT;
            this.scaleMode = Opts.ScaleMode.NORMAL;
            this.transSpeed = 1;
            this.sclSpeed = 1;
            this.touchSensitivity = .5;
            this.clickSensitivity = 800;
            this._zoomChanged = [false, false];
            this._mobile = false;
            this._pressed = false;
            this._clktime = 0;
            this._coordinates = [];
            this._touches = [];
            inherit(opts, ControllableCanvas.defaultOpts);
            if (!(opts.target instanceof HTMLCanvasElement)) {
                throw Errors.ENOTCANV;
            }
            else if ([opts.trans, opts.scl, opts.transBounds, opts.sclBounds].some(arr => !(arr instanceof Array || arr instanceof Float32Array || arr instanceof Float64Array) || arr.length < 2 || Array.from(arr).some((num) => isNaN(num) || num === ''))) {
                throw Errors.ENOTNUMARR2;
            }
            inherit(opts._adapts, ControllableCanvas.defaultOpts._adapts); //POSSIBLE ERROR
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
            this.transSpeed = opts.transSpeed * 1;
            this.sclSpeed = opts.sclSpeed * 1;
            this.touchSensitivity = opts.touchSensitivity * 1;
            this.clickSensitivity = opts.clickSensitivity * 1;
            this.useButton = opts.useButton | 0;
            this.scaleMode = opts.scaleMode | 0;
            this.wgets = new Set(opts.wgets);
            this.trans = Array.from(opts.trans).map(Number);
            this.scl = Array.from(opts.scl).map(Number);
            this.pin = Array.from(opts.pin).map(Number);
            this.transBounds = Array.from(opts.transBounds).map(Number); // x, y, X, Y
            this.sclBounds = Array.from(opts.sclBounds).map(Number); // x, y, X, Y
            this.dragEnabled = !!opts.dragEnabled;
            this.pinchEnabled = !!opts.pinchEnabled;
            this.wheelEnabled = !!opts.wheelEnabled;
            this.panEnabled = !!opts.panEnabled;
            this.tiltEnabled = !!opts.tiltEnabled;
            this.eventsReversed = !!opts.eventsReversed;
            this._pressed = false;
            this._coordinates = [0, 0];
            this._touches = [];
            this._mobile = ControllableCanvas.isMobile;
            if (!ControllableCanvas._linepix)
                ControllableCanvas._linepix = ControllableCanvas.lineToPix;
        } //ctor
        get ratio() {
            return this.target.width / this.target.height;
        } //g-ratio  OBS
        get min() {
            return Math.min(this.target.width, this.target.height);
        } //g-min
        get max() {
            return Math.max(this.target.width, this.target.height);
        } //g-max  OBS
        /**
         * Enable controls
         * @method
         */
        handle() {
            this._mobile ? this._mobileAdapt() : this._pcAdapt();
        } //handle
        /**
         * Add (/create) a widget in the controller
         * @param {ControllableCanvas.CanvasButton|Opts.CanvasButtonOptions} data - constructor options
         * @return {ControllableCanvas.CanvasButton} the widget
         */
        addWidget(data) {
            if (data instanceof CanvasButton && !this.wgets.has(data)) {
                data.parent = this;
                this.wgets.add(data);
            }
            else if (!(data instanceof CanvasButton)) {
                data = new ControllableCanvas.CanvasButton(data);
                data.parent = this;
                this.wgets.add(data);
            }
            else {
                throw Errors.EISALR;
            }
            return data;
        } //addWidget
        /**
         * Re-apply internal transformations
         * @method
         * @returns {ControllableCanvas} this - For method chaining
         */
        retransform() {
            this.context.setTransform(1, 0, 0, 1, 0, 0); //SKEW/ROTATE NOT IMPLEMENTED!!
            this.context.translate(this.trans[0], this.trans[1]);
            this.context.scale(this.scl[0], this.scl[1]);
            return this;
        } //retransform
        /**
         * Intermediate translation function for iconic translate before the real
         * @method
         * @param {number} x=0 - x translation
         * @param {number} y=0 - y translation
         * @param {boolean} abs?=false - absolute translation or relative to current
         * @returns {number[]} Returns current total translation
         */
        translate(x = 0, y = 0, abs = false) {
            let by = [x, y].map(Number);
            if (this.eventsReversed)
                by = by.map((b) => -b);
            return this.trans = this.trans.map((trn, idx) => bound(Number(!abs ? (trn + by[idx]) : by[idx]), this.transBounds[idx], this.transBounds[idx + 2]));
        } //translate
        /**
         * Intermediate scaling function for iconic scale before the real
         * @method
         * @param {number} x=1 - x scale
         * @param {number} y=x - y scale
         * @param {boolean} abs?=false - absolute scale or relative to current
         * @returns {number[]} Returns current total scaling
         */
        scale(x = 1, y = x, abs = false) {
            let by = [x, y].map(Number);
            if (this.eventsReversed)
                by = by.map((b) => -b);
            if (!abs) {
                let nscl = this.scl.map((scl, idx) => scl * by[idx]);
                nscl = [nscl[0] - this.scl[0], nscl[1] - this.scl[1]];
                this._zoomChanged = [this.scl[0] !== block(this.scl[0], this.sclBounds[0], this.sclBounds[2], nscl[0]), this.scl[1] !== block(this.scl[1], this.sclBounds[1], this.sclBounds[3], nscl[1])];
                return this.scl = [block(this.scl[0], this.sclBounds[0], this.sclBounds[2], nscl[0]), block(this.scl[1], this.sclBounds[1], this.sclBounds[3], nscl[1])];
            }
            else {
                this._zoomChanged = [this.scl[0] !== bound(this.scl[0], this.sclBounds[0], this.sclBounds[2]), this.scl[1] !== bound(this.scl[1], this.sclBounds[1], this.sclBounds[3])];
                return this.scl = this.scl.map((scl, idx) => bound(scl * by[idx], this.sclBounds[idx], this.sclBounds[idx + 2]));
            }
        } //scale
        _mobileAdapt() {
            if (!this._adapts.drag && this.dragEnabled) {
                this.target.addEventListener("touchstart", (e) => ControllableCanvas.dragMobileStart(e, this), { passive: false });
                this.target.addEventListener("touchmove", this._adapts.pinch = this._adapts.drag = (e) => ControllableCanvas.dragMobileMove(e, this), { passive: false });
                this.target.addEventListener("touchend", (e) => ControllableCanvas.dragMobileEnd(e, this), { passive: false });
                this.target.addEventListener("touchcancel", (e) => ControllableCanvas.dragMobileEnd(e, this), { passive: false });
            }
            if (!this._adapts.tilt && this.tiltEnabled) {
            }
        } //_mobileAdapt
        _pcAdapt() {
            if (!this._adapts.drag && this.dragEnabled) {
                this.target.addEventListener("mousemove", this._adapts.drag = (e) => ControllableCanvas.dragPC(e, this));
                this.target.addEventListener("mousedown", (e) => this._pressed = true);
                this.target.addEventListener("mouseup", (e) => this._pressed = false);
                this.target.addEventListener("mouseout", (e) => this._pressed = false);
                if ((this.useButton & Opts.UseButton.USERIGHT) === Opts.UseButton.USERIGHT)
                    this.target.addEventListener("contextmenu", (e) => e.preventDefault(), { capture: true, passive: false });
            }
            if (!this._adapts.wheel && this.wheelEnabled) {
                this.target.addEventListener("wheel", this._adapts.wheel = (e) => ControllableCanvas.wheel(e, this));
            }
            if (!this._adapts.tilt && this.tiltEnabled) {
                //TODO
            }
            if (!this._adapts.click) {
                this.target.addEventListener("click", this._adapts.click = (e) => ControllableCanvas.clickPC(e, this));
            }
        } //_pcAdapt
        static dragPC(event, cc) {
            event.preventDefault();
            let coords = [event.clientX - cc.target.offsetLeft, event.clientY - cc.target.offsetTop], rel = [], ret = false;
            cc._coordinates = coords;
            if (((cc.useButton & Opts.UseButton.USERIGHT) !== Opts.UseButton.USERIGHT && ((("buttons" in event) && (event.buttons & 2) === 2) || (("which" in event) && event.which === 3) || (("button" in event) && event.button === 2))) || ((cc.useButton & Opts.UseButton.USERIGHT) === Opts.UseButton.USERIGHT && (cc.useButton & Opts.UseButton.USEBOTH) !== Opts.UseButton.USEBOTH && (("buttons" in event) && (event.buttons & 2) !== 2) && (("which" in event) && event.which !== 3) && (("button" in event) && event.button !== 2))) {
                return;
            }
            if (cc._pressed) {
                cc.translate(event.movementX * cc.transSpeed, event.movementY * cc.transSpeed);
            }
            for (let butt of cc.wgets) {
                butt.enabled && butt._isOn(rel = coords.map((c, idx) => (c - cc.trans[idx]) / cc.scl[idx])) && !butt.pstate && (butt.pstate = true, ret = butt.focus(rel));
                if (ret)
                    break;
            }
        } //dragPC
        static dragMobileMove(event, cc) {
            function check(arr, curr) {
                if (arr.every((ar, idx) => Math.abs(ar - curr[idx]) >= cc.touchSensitivity)) {
                    return true;
                }
                return false;
            } //check
            function arraynge(tlis) {
                return [[tlis[0].clientX - cc.target.offsetLeft, tlis[0].clientY - cc.target.offsetTop], [tlis[1].clientX - cc.target.offsetLeft, tlis[1].clientY - cc.target.offsetTop]];
            } //arraynge
            function every(t, nt, all = false, once = false) {
                let out = false;
                if (all && check(t[0], nt[0]) && check(t[1], nt[1])) {
                    return true;
                }
                else if (all) {
                    return false;
                }
                if (check(t[0], nt[0])) {
                    out = once || !out;
                }
                if (check(t[1], nt[1])) {
                    out = once || !out;
                }
                return out;
            } //every
            function inh(one = false) {
                cc._touches[0] = [event.targetTouches[0].clientX - cc.target.offsetLeft, event.targetTouches[0].clientY - cc.target.offsetTop];
                if (!one)
                    cc._touches[1] = [event.targetTouches[1].clientX - cc.target.offsetLeft, event.targetTouches[1].clientY - cc.target.offsetTop];
            } //inh
            event.preventDefault();
            let coords = [event.targetTouches[event.targetTouches.length - 1].clientX - cc.target.offsetLeft, event.targetTouches[event.targetTouches.length - 1].clientY - cc.target.offsetTop];
            if (cc.dragEnabled && cc._touches.length === 1) {
                let cp = Array.from(cc.trans), dis;
                cc.translate(...[coords[0] - cc._coordinates[0], coords[1] - cc._coordinates[1]].map((v) => v * cc.transSpeed));
                dis = dist([cp[0], cc.trans[0]], [cp[1], cc.trans[1]]);
                if (dis > cc.touchSensitivity)
                    cc._clktime = 0;
                inh(true);
            }
            else if (cc.pinchEnabled && cc._touches.length === 2 && event.targetTouches.length === 2 && every(arraynge(event.targetTouches), cc._touches, false, true)) {
                if ((cc.scaleMode & Opts.ScaleMode.FREESCALE) === Opts.ScaleMode.FREESCALE) {
                    let inidist = [Math.abs(cc._touches[event.targetTouches[0].identifier][0] - cc._touches[event.targetTouches[1].identifier][0]), Math.abs(cc._touches[event.targetTouches[0].identifier][1] - cc._touches[event.targetTouches[1].identifier][1])], dis = [Math.abs(event.targetTouches[0].clientX - event.targetTouches[1].clientX - 2 * cc.target.offsetLeft), Math.abs(event.targetTouches[0].clientY - event.targetTouches[1].clientY - 2 * cc.target.offsetTop)], itouches = [cc._touches[event.targetTouches[0].identifier][0] + cc._touches[event.targetTouches[1].identifier][0], cc._touches[event.targetTouches[0].identifier][1] + cc._touches[event.targetTouches[1].identifier][1]].map((i, idx) => i / 2 - cc.trans[idx]), d = [dis[0] / inidist[0], dis[1] / inidist[1]].map((v) => v * cc.sclSpeed), ntouches = itouches.map((i, idx) => i * (1 - d[idx]));
                    if (cc._zoomChanged[0])
                        cc.translate(ntouches[0]);
                    if (cc._zoomChanged[1])
                        cc.translate(ntouches[1]);
                    cc.scale(d[0], d[1]);
                }
                else {
                    //@ts-ignore
                    let inidist = dist([cc._touches[event.targetTouches[0].identifier][0], cc._touches[event.targetTouches[1].identifier][0]], [cc._touches[event.targetTouches[0].identifier][1], cc._touches[event.targetTouches[1].identifier][1]]), dis = dist([event.targetTouches[0].clientX - cc.target.offsetLeft, event.targetTouches[1].clientX - cc.target.offsetLeft], [event.targetTouches[0].clientY - cc.target.offsetTop, event.targetTouches[1].clientY - cc.target.offsetTop]), itouches = [cc._touches[event.targetTouches[0].identifier][0] + cc._touches[event.targetTouches[1].identifier][0], cc._touches[event.targetTouches[0].identifier][1] + cc._touches[event.targetTouches[1].identifier][1]].map((i, idx) => i / 2 - cc.trans[idx]), d = cc.sclSpeed * dis / inidist, ntouches = itouches.map((i) => i * (1 - d));
                    cc.scale(d);
                    if (cc._zoomChanged.every((zm) => zm))
                        cc.translate(...ntouches);
                }
                inh();
            }
            cc._coordinates = coords;
        } //dragMobileMove
        static dragMobileStart(event, cc, cust = false) {
            event.preventDefault();
            if (!cust) {
                let coords, sorted = Array.from(cc.wgets.entries()).map((s) => s[1]).sort((a, b) => b._id - a._id), ret = false;
                Array.from(event.changedTouches).forEach((t) => cc._touches[t.identifier] = [t.clientX - cc.target.offsetLeft, t.clientY - cc.target.offsetTop]);
                for (let touch of event.changedTouches) {
                    coords = [(touch.clientX - cc.target.offsetLeft - cc.trans[0]) / cc.scl[0], (touch.clientY - cc.target.offsetTop - cc.trans[1]) / cc.scl[1]];
                    for (let butt of sorted) {
                        butt.enabled && butt._isOn(coords) && !butt.pstate && (butt.pstate = true, ret = butt.focus(coords));
                        if (ret)
                            break;
                    }
                }
            }
            if (cc._touches.length === 1) {
                cc._clktime = Date.now();
                cc._coordinates = cc._touches[cc._touches.length - 1];
            }
            else {
                cc._clktime = 0;
            }
            cc._pressed = true;
        } //dragMobileStart
        static dragMobileEnd(event, cc) {
            event.preventDefault();
            let coords, sorted = Array.from(cc.wgets.entries()).map((s) => s[1]).sort((a, b) => b._id - a._id), ret = false;
            for (let touch of event.changedTouches) {
                coords = [(touch.clientX - cc.target.offsetLeft - cc.trans[0]) / cc.scl[0], (touch.clientY - cc.target.offsetTop - cc.trans[1]) / cc.scl[1]];
                for (let butt of sorted) {
                    butt.enabled && butt._isOn(coords);
                }
            }
            if (cc._touches.length === 1 && Date.now() - cc._clktime <= cc.clickSensitivity) {
                for (let butt of sorted) {
                    butt.enabled && butt._isOn(coords) && (ret = butt.click(coords));
                    if (ret)
                        break;
                }
                cc._clktime = 0;
            }
            Array.from(event.changedTouches).forEach((t) => {
                cc._touches.splice(t.identifier, 1);
            });
            if (Object.keys(cc._touches).length == 1) {
                ControllableCanvas.dragMobileStart(event, cc, true);
            }
            cc._pressed = !!cc._touches.length;
        } //dragMobileEnd
        static wheel(event, cc) {
            event.preventDefault();
            let d = 1 - cc.sclSpeed * ControllableCanvas.fixDelta(event.deltaMode, event.deltaY) / cc.min, coords = [event.clientX - cc.target.offsetLeft - cc.trans[0], event.clientY - cc.target.offsetTop - cc.trans[1]];
            cc.scale(d);
            if (cc._zoomChanged.every((zm) => zm))
                cc.translate(...coords.map((c) => c * (1 - d)));
        } //wheel
        static clickPC(event, cc) {
            let coords = [(event.clientX - cc.target.offsetLeft - cc.trans[0]) / cc.scl[0], (event.clientY - cc.target.offsetTop - cc.trans[1]) / cc.scl[1]], sorted = Array.from(cc.wgets.entries()).map((s) => s[1]).sort((a, b) => b._id - a._id), ret = false;
            for (let butt of sorted) {
                butt.enabled && butt._isOn(coords) && (ret = butt.click(coords));
                if (ret)
                    break;
            }
        } //clickPC
        static get isMobile() {
            if (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i)
                || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)
                || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i)) {
                return true;
            }
            else {
                return false;
            }
        } //isMobile
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
    ControllableCanvas._linepix = 10;
    /**
     * Default options for ControllableCanvas
     * @readonly
     * @static
     */
    ControllableCanvas.defaultOpts = {
        target: document.getElementsByTagName("canvas")[0],
        trans: [0, 0],
        scl: [1, 1],
        dragEnabled: false,
        pinchEnabled: false,
        wheelEnabled: false,
        panEnabled: false,
        tiltEnabled: false,
        eventsReversed: false,
        useButton: 1,
        scaleMode: 1,
        transSpeed: 1,
        sclSpeed: 1,
        touchSensitivity: .35,
        clickSensitivity: 800,
        sclBounds: [0, 0, Infinity, Infinity],
        transBounds: [-Infinity, -Infinity, Infinity, Infinity],
        _adapts: {
            drag: false,
            pinch: false,
            wheel: false,
            pan: false,
            tilt: false,
            click: false
        },
        wgets: new Set()
    };
    CanvasControls.ControllableCanvas = ControllableCanvas;
    /**
     * A widget-making class for canvas
     * @memberof ControllableCanvas
     * @prop {number} x - x coordinate
     * @prop {number} y - y coordinate
     * @prop {number} dx - width
     * @prop {number} dy - height
     * @prop {number} index - equivalent to CSS z-index
     */
    class CanvasButton {
        constructor(opts = CanvasButton.defaultOpts) {
            this.x = 0;
            this.y = 0;
            this.dx = 0;
            this.dy = 0;
            this.index = -1;
            this.enabled = true;
            this.pstate = false;
            this.position = 2;
            inherit(opts, CanvasButton.defaultOpts);
            if ([opts.x, opts.y, opts.dx, opts.dy, opts.position, opts.index].some((num) => isNaN(num) || num === '')) {
                throw Errors.ENOTNUM;
            }
            this.x = opts.x * 1;
            this.y = opts.y * 1;
            this.dx = opts.dx * 1;
            this.dy = opts.dy * 1;
            this.position = opts.position | 0;
            this.index = opts.index | 0;
            this.enabled = !!opts.enabled;
            this._id = CanvasButton._idcntr++;
        } //ctor
        //@Override
        /**
         * Checks if button was exited and decides whether to propagate
         * @param any
         */
        blur(...any) {
            return true;
        } //blur
        //@Override
        /**
         * Checks if button was entered and decides whether to propagate
         * @param any
         */
        focus(...any) {
            return false;
        } //focus
        //@Override
        /**
         * Checks if button was clicked and decides whether to propagate
         * @param any
         */
        click(...any) {
            return true;
        } //click
        /**
         * Checks if pointer is above the widget
         * @param {number[]} relativeCoords
         * @method
         */
        _isOn(relativeCoords) {
            let x = (this.position & Opts.Position.FIXED) === Opts.Position.FIXED ? this.x - this.parent.trans[0] : this.x, y = (this.position & Opts.Position.FIXED) === Opts.Position.FIXED ? this.y - this.parent.trans[1] : this.y, dx = (this.position & Opts.Position.UNSCALABLE) === Opts.Position.UNSCALABLE ? this.dx * this.parent.scl[0] : this.dx, dy = (this.position & Opts.Position.UNSCALABLE) === Opts.Position.UNSCALABLE ? this.dy * this.parent.scl[1] : this.dy, out = isWithin([x, y, dx, dy], [relativeCoords[0], relativeCoords[1]], CanvasButton.sensitivity);
            if (!out && this.pstate) {
                this.blur(relativeCoords);
                this.pstate = false;
            }
            return out;
        } //_isOn
    } //CanvasButton
    CanvasButton.sensitivity = .3;
    CanvasButton._idcntr = 0;
    /**
     * Default options for CanvasButton
     * @readonly
     * @static
     */
    CanvasButton.defaultOpts = {
        x: 0,
        y: 0,
        dx: 0,
        dy: 0,
        index: -1,
        pstate: false,
        enabled: true,
        position: 2,
        parent: new ControllableCanvas
    };
    CanvasControls.CanvasButton = CanvasButton;
    ControllableCanvas.CanvasButton = CanvasButton;
    /**
     * A class offering mathematical Vector utilities
     * @inner
     * @class
     * @prop {number[]} props - vector vertices
     */
    class Vector {
        constructor(props = []) {
            this.props = Array.from(props.map(Number));
        } //ctor
        /**
         * Add a vector or number to current vector
         * @method
         * @param {Vector|number} targ - target
         * @param {number} sub - Set to `-1` to substract instead
         * @returns `this` for method chaining
         */
        add(targ, sub = 1) {
            if (targ instanceof Vector) {
                this.props.forEach((prop, idx) => {
                    this.props[idx] += sub * targ[idx];
                });
            }
            else {
                this.props.forEach((prop, idx) => {
                    this.props[idx] += sub * targ;
                });
            }
            return this;
        } //add
        /**
         * Multiply a vector or number to current vector
         * @method
         * @param {Vector|number} targ - target
         * @param {number} div - Set to `-1` to divide instead
         * @returns `this` for method chaining
         */
        mult(targ, div = 1) {
            if (targ instanceof Vector) {
                this.props.forEach((prop, idx) => {
                    this.props[idx] *= Math.pow(targ[idx], div);
                });
            }
            else {
                this.props.forEach((prop, idx) => {
                    this.props[idx] *= Math.pow(targ, div);
                });
            }
            return this;
        } //mult
        /**
         * Dot product of 2 vectors
         * @method
         * @param {Vector} targ - target
         * @returns product
         */
        dot(targ) {
            return this.props.reduce((acc, val, idx) => acc + val * targ[idx]);
        } //dot
    } //Vector
    CanvasControls.Vector = Vector;
    /**
     * @prop {HTMLElement[]} resources - All HTML resource elements with "load" listeners that will be loaded. like: audio/img
     */
    class ResourceLoader {
        constructor(resources, onload, autobind = false) {
            this.resources = [];
            this._loadcntr = 0;
            this.resources = Array.from(resources);
            this.load = onload || this.load;
            if (autobind)
                this.bind(this.load);
        } //ctor
        /**
         * Bind load events and await loadend
         * @param {Function} onload? - code to execute once loaded
         */
        bind(onload) {
            if (onload)
                this.load = onload;
            this.resources.forEach((res) => {
                res.addEventListener("load", () => {
                    if (++this._loadcntr === this.resources.length) {
                        this.load(res, this._loadcntr);
                    }
                });
            });
        } //bind
        //@Override
        load(res, load) { } //load
        /**
         * Load images by URLs
         * @method
         * @static
         * @param {string[]} urlist - list of urls
         * @param {Function} onload - callback
         * @param {boolean} autobind=true - auto bind
         * @returns {ResourceLoader} the loader
         */
        static images(urlist, onload, autobind = true) {
            let imglist = [];
            for (let url of urlist) {
                let img = new Image();
                img.src = url;
                imglist.push(img);
            }
            return new ResourceLoader(imglist, onload, autobind);
        } //images
        /**
         * Load audio by URLs
         * @method
         * @static
         * @param {string[]} urlist - list of urls
         * @param {Function} onload - callback
         * @param {boolean} autobind=true - auto bind
         * @returns {ResourceLoader} the loader
         */
        static audios(urlist, onload, autobind = true) {
            let audiolist = [];
            for (let url of urlist) {
                let audio = new Audio(url);
                audio.load();
                audiolist.push(audio);
            }
            return new ResourceLoader(audiolist, onload, autobind);
        } //audios
    } //ResourceLoader
    CanvasControls.ResourceLoader = ResourceLoader;
})(CanvasControls = exports.CanvasControls || (exports.CanvasControls = {})); //CanvasControls
exports.default = CanvasControls.ControllableCanvas;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FudmFzQ29udHJvbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvQ2FudmFzQ29udHJvbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7R0FPRztBQUVILFlBQVksQ0FBQzs7QUFDYiwyQkFBeUI7QUFFekI7Ozs7R0FJRztBQUVIOzs7OztHQUtHO0FBQ0gsSUFBYyxjQUFjLENBbzVCM0I7QUFwNUJELFdBQWMsY0FBYztJQUkzQjs7Ozs7Ozs7T0FRRztJQUNILFNBQWdCLE9BQU8sQ0FBQyxJQUFRLEVBQUUsSUFBUSxFQUFFLFlBQXNCLENBQUMsSUFBUSxFQUFFLElBQVEsRUFBRSxJQUFZLEVBQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pLLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFO1lBQ25CLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3pCO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDLENBQUMsU0FBUztJQU5LLHNCQUFPLFVBTXRCLENBQUE7SUFDRDs7Ozs7Ozs7O09BU0c7SUFDSCxTQUFnQixLQUFLLENBQUMsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTLEVBQUUsSUFBWSxDQUFDO1FBQ25FLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1QyxDQUFDLENBQUMsT0FBTztJQUZPLG9CQUFLLFFBRXBCLENBQUE7SUFDRDs7Ozs7OztPQU9HO0lBQ0gsU0FBZ0IsS0FBSyxDQUFDLENBQVMs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SSxJQUFJLEdBQWEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFXLEVBQUUsR0FBVyxFQUFVLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZGLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzTCxPQUFPLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNB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QUFRLENBQUMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ25nQixPQUFPO2FBQ1A7WUFFRCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Z0JBQ2hCLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQy9FO1lBRUQsS0FBSyxJQUFJLElBQUksSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFO2dCQUMxQixJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFTLEVBQUUsR0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FB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QUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUMzTixRQUFRLEdBQWEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFTLEVBQUUsR0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFDMVIsQ0FBQyxHQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUM1RixRQUFRLEdBQWEsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQVMsRUFBRSxHQUFXLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUVqRixJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO3dCQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xELElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7d0JBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbEQsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ3JCO3FCQUFNO29CQUNOLFlBQVk7b0JBQ1osSUFBSSxPQUFPLEdBQVcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3pPLEdBQUcsR0FBVyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUNoUCxRQUFRLEdBQWEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFTLEVBQUUsR0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFDMVIsQ0FBQyxHQUFXLEVBQUUsQ0FBQyxRQUFRLEdBQUcsR0FBRyxHQUFHLE9BQU8sRUFDdkMsUUFBUSxHQUFhLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUUvRCxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNaLElBQUksRUFBRSxDQUFD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Q0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDckgsQ0FBQyxHQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUNsSCxFQUFFLEdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQzdILEVBQUUsR0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFDN0gsR0FBRyxHQUFZLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxF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MyBwb2lucyAoUmFkaWFucyk6XG4gKiBwYzogY2VudGVyL3BvbGVcbiAqIHBuOiBwb2ludCBuZXcgY29vcmRpbmF0ZXNcbiAqIHBwOiBwb2ludCBwYXN0IGNvb3JkaW5hdGVzXG4gKiBcbiAqIGF0YW4yKHBueSAtIHBjeSwgcG54IC0gcGN4KSAtIGF0YW4yKHBweSAtIHBjeSwgcHB4IC0gcGN4KVxuICovXG5cblwidXNlIHN0cmljdFwiO1xuaW1wb3J0IFwiQGJhYmVsL3BvbHlmaWxsXCI7XG5cbi8qKlxuICogQGZpbGUgQ2FudmFzQ29udHJvbHMudHNcbiAqIEBjb3B5cmlnaHQgVmFsZW4uIEguIDJrMThcbiAqIEBhdXRob3IgVmFsZW4uSC4gPGFsdGVybmF0aXZleHh4eUBnbWFpbC5jb20+XG4gKi9cblxuLyoqXG4gKiBUaGUgcm9vdCBvZiB0aGUgbWFpbiBsaWJyYXJ5XG4gKiBAbW9kdWxlIENhbnZhc0NvbnRyb2xzXG4gKiBAbGljZW5zZSBJU0NcbiAqIEBnbG9iYWxcbiAqL1xuZXhwb3J0IG1vZHVsZSBDYW52YXNDb250cm9scyB7XG5cblx0dHlwZSBDbGFzcyA9IHsgbmV3KC4uLmFyZ3M6IGFueVtdKTogYW55OyB9O1xuXG5cdC8qKlxuXHQgKiBJZiBgZGVzdGAgbGFja3MgYSBwcm9wZXJ0eSB0aGF0IGB0YXJnYCBoYXMgdGhlbiB0aGF0IHByb3BlcnR5IGlzIGNvcGllZCBpbnRvIGBkZXN0YFxuXHQgKiBAZnVuY3Rpb25cblx0ICogQGlubmVyXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBkZXN0IC0gZGVzdGluYXRpb24gb2JqZWN0XG5cdCAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnIC0gYmFzZSBvYmplY3Rcblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY29uZGl0aW9uIC0gaW5oZXJpdGFuY2UgY29uZGl0aW9uXG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IGRlc3RpbmF0aW9uIG9iamVjdFxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGluaGVyaXQoZGVzdDoge30sIHRhcmc6IHt9LCBjb25kaXRpb246IEZ1bmN0aW9uID0gKGRlc3Q6IHt9LCB0YXJnOiB7fSwgcHJvcDogc3RyaW5nKTogYW55ID0+IGRlc3RbcHJvcF0gPT09IHVuZGVmaW5lZCAmJiAoZGVzdFtwcm9wXSA9IHRhcmdbcHJvcF0pKToge30ge1xuXHRcdGZvciAobGV0IGkgaW4gdGFyZykge1xuXHRcdFx0Y29uZGl0aW9uKGRlc3QsIHRhcmcsIGkpO1xuXHRcdH1cblxuXHRcdHJldHVybiBkZXN0O1xuXHR9IC8vaW5oZXJpdFxuXHQvKipcblx0ICogUmVzdHJpY3QgbnVtYmVyJ3MgcmFuZ2Vcblx0ICogQGZ1bmN0aW9uXG5cdCAqIEBpbm5lclxuXHQgKiBAcGFyYW0ge251bWJlcn0gbiAtIHRhcmdldCBudW1iZXJcblx0ICogQHBhcmFtIHtudW1iZXJ9IG0gLSBtaW5pbXVtIG51bWJlclxuXHQgKiBAcGFyYW0ge251bWJlcn0gTSAtIG1heGltdW0gbnVtYmVyXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBwPTAgLSBwcmVjaXNpb25cblx0ICogQHJldHVybnMge251bWJlcn0gYm91bmQgbnVtYmVyXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gYm91bmQobjogbnVtYmVyLCBtOiBudW1iZXIsIE06IG51bWJlciwgcDogbnVtYmVyID0gMCk6IG51bWJlciB7XG5cdFx0cmV0dXJuIG4gPiBNICsgcCA/IE0gOiAobiA8IG0gLSBwID8gbSA6IG4pO1xuXHR9IC8vYm91bmRcblx0LyoqXG5cdCAqIERvd25zcGVlZCBpbmNyZW1lbnRhdGlvblxuXHQgKiBAcGFyYW0ge251bWJlcn0gbiAtIG51bWJlclxuXHQgKiBAcGFyYW0ge251bWJlcn0gbSAtIG1pbmltdW1cblx0ICogQHBhcmFtIHtudW1iZXJ9IE0gLSBNYXhpbXVtXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBvcCAtIG9wZXJhdGlvblxuXHQgKiBAcmV0dXJucyB7bnVtYmVyfSBuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gYmxvY2sobjogbnVtYmVyLCBtOiBudW1iZXIsIE06IG51bWJlciwgb3A6IG51bWJlcik6IG51bWJlciB7XG5cdFx0aWYgKG4gPiBNICYmIG9wID4gMCkge1xuXHRcdFx0cmV0dXJuIG47XG5cdFx0fSBlbHNlIGlmIChuID4gTSkge1xuXHRcdFx0cmV0dXJuIG4gKyBvcDtcblx0XHR9IGVsc2UgaWYgKG4gPCBtICYmIG9wIDwgMCkge1xuXHRcdFx0cmV0dXJuIG47XG5cdFx0fSBlbHNlIGlmIChuIDwgbSkge1xuXHRcdFx0cmV0dXJuIG4gKyBvcDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIG4gKyBvcDtcblx0XHR9XG5cdH0gLy9ibG9ja1xuXHQvKipcblx0ICogQ2FsY3VsYXRlIGRpc3RhbmNlIGJldHdlZW4gMiBwb2ludHNcblx0ICogQHBhcmFtIHtudW1iZXJbXX0gWHMgLSBYIGNvb3JkaW5hdGVzXG5cdCAqIEBwYXJhbSB7bnVtYmVyW119IFlzIC0gWSBjb29yZGluYXRlc1xuXHQgKiBAcmV0dXJucyB7bnVtYmVyfSBkaXN0YW5jZVxuXHQgKiBAZnVuY3Rpb25cblx0ICogQGlubmVyXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gZGlzdChYczogbnVtYmVyW10sIFlzOiBudW1iZXJbXSk6IG51bWJlciB7XG5cdFx0cmV0dXJuIE1hdGguc3FydChbWHNbMV0gLSBYc1swXSwgWXNbMV0gLSBZc1swXV0ubWFwKCh2OiBudW1iZXIpID0+IE1hdGgucG93KHYsIDIpKS5yZWR1Y2UoKGFjYzogbnVtYmVyLCB2OiBudW1iZXIpID0+IGFjYyArIHYpKTtcblx0fSAvL2Rpc3Rcblx0LyoqXG5cdCAqIENoZWNrcyBpZiBwb2ludGVyIGlzIGluc2lkZSBhbiBhcmVhXG5cdCAqIEBwYXJhbSB7bnVtYmVyW119IGJveCAtIHgseSxkeCxkeVxuXHQgKiBAcGFyYW0ge251bWJlcltdfSBwb2ludCAtIHgseVxuXHQgKiBAcGFyYW0ge251bWJlcn0gc2Vuc2l0aXZpdHkgLSBleHRyYSBib3VuZGFyeVxuXHQgKiBAcmV0dXJucyBib29sZWFuXG5cdCAqIEBpbm5lclxuXHQgKiBAZnVuY3Rpb25cblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBpc1dpdGhpbihib3g6IG51bWJlcltdLCBwb2ludDogbnVtYmVyW10sIHNlbnNpdGl2aXR5OiBudW1iZXIgPSAuNSk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBib3hbMF0gLSBzZW5zaXRpdml0eSA8PSBwb2ludFswXSAmJiBib3hbMF0gKyBib3hbMl0gKyBzZW5zaXRpdml0eSA+PSBwb2ludFswXSAmJiBib3hbMV0gLSBzZW5zaXRpdml0eSA8PSBwb2ludFsxXSAmJiBib3hbMV0gKyBib3hbM10gKyBzZW5zaXRpdml0eSA+PSBwb2ludFsxXTtcblx0fSAvL2lzV2l0aGluXG5cblx0LyoqXG5cdCAqIEEgaG9sZGVyIGZvciBhbGwgT3B0aW9uc1xuXHQgKiBAbmFtZXNwYWNlXG5cdCAqL1xuXHRleHBvcnQgbmFtZXNwYWNlIE9wdHMge1xuXHRcdC8qKlxuXHRcdCAqIEEgd3JhcHBlciBmb3IgdGhlIHRhcmdldGVkIGNhbnZhcyBlbGVtZW50XG5cdFx0ICogQGludGVyZmFjZVxuXHRcdCAqIEBpbm5lclxuXHRcdCAqIEBtZW1iZXIge0hUTUxDYW52YXNFbGVtZW50fSB0YXJnZXQ9Zmlyc3RDYW52T2NjdXJJbkRvYyAtIEJvdW5kIGNhbnZhc1xuXHRcdCAqIEBtZW1iZXIge251bWJlcltdfSB0cmFucz0wLDAgLSBUcmFuc2xhdGlvblxuXHRcdCAqIEBtZW1iZXIge251bWJlcltdfSBzY2w9MSwxIC0gU2NhbGluZ1xuXHRcdCAqIEBtZW1iZXIge251bWJlcltdfSByb3Q9MCwwIC0gUm90YXRpb25cblx0XHQgKiBAbWVtYmVyIHtudW1iZXJbXX0gcGluPz10aGlzLnRhcmdldC53aWR0aC8yLHRoaXMudGFyZ2V0LmhlaWdodC8yIC0gUHNldWRvLWNlbnRlclxuXHRcdCAqIEBtZW1iZXIge251bWJlcltdfSB0cmFuc0JvdW5kPS1JbmZpbml0eSwtSW5maW5pdHksSW5maW5pdHksSW5maW5pdHkgLSBNYXggdHJhbnNsYXRpb24gYm91bmRhcmllc1xuXHRcdCAqIEBtZW1iZXIge2Jvb2xlYW59IGRyYWdFbmFibGVkPWZhbHNlIC0gRW5hYmxlIHRyYW5zbGF0aW9uIG9uIGRyYWdcblx0XHQgKiBAbWVtYmVyIHtib29sZWFufSBwaW5jaEVuYWJsZWQ9ZmFsc2UgLSBFbmFibGUgc2NhbGluZyBvbiAyLWZpbmdlciBwaW5jaCAoMSBmaW5nZXIgb25seSBzaGFsbCBtb3ZlKVxuXHRcdCAqIEBtZW1iZXIge2Jvb2xlYW59IHdoZWVsRW5hYmxlZD1mYWxzZSAtIEVuYWJsZSBzY2FsaW5nIG9uIG1vdXNlIHdoZWVsXG5cdFx0ICogQG1lbWJlciB7Ym9vbGVhbn0gcGFuRW5hYmxlZD1mYWxzZSAtIEVuYWJsZSB0cmFuc2xhdGlvbiBiYXNlZCBvbiBtb3VzZS9maW5nZXIgZGlzdGFuY2UgZnJvbSBwaW4gKHBzZXVkby1jZW50ZXIpXG5cdFx0ICogQG1lbWJlciB7Ym9vbGVhbn0gdGlsdEVuYWJsZWQ9ZmFsc2UgLSBFbmFibGUgdHJhbnNsYXRpb24gb24gZGV2aWNlIG1vdmVtZW50XG5cdFx0ICogQG1lbWJlciB7Ym9vbGVhbn0gZXZlbnRzUmV2ZXJzZWQ9ZmFsc2UgLSBUb2dnbGUgcmV2ZXJzZS1vcGVyYXRpb25zXG5cdFx0ICogQG1lbWJlciB7T3B0cy5Vc2VCdXR0b259IHVzZUJ1dHRvbj1PcHRzLlVzZUJ1dHRvbi5VU0VMRUZUIC0gUmVzcG9uZCB0byBsZWZ0LWNsaWNrLCByaWdodCBvciBib3RoXG5cdFx0ICogQG1lbWJlciB7bnVtYmVyfSB0cmFuc1NwZWVkPTEgLSBUcmFuc2xhdGlvbiBzcGVlZCBmYWN0b3Jcblx0XHQgKiBAbWVtYmVyIHtudW1iZXJ9IHNjbFNwZWVkPTEgLSBTY2FsaW5nIHNwZWVkIGZhY3RvclxuXHRcdCAqIEBtZW1iZXIge09wdHMuQ29udHJvbGxhYmxlQ2FudmFzQWRhcHRlcnN9IF9hZGFwdHMgLSBNYXAgb2YgYWxsIGN1cnJlbnRseSBhdHRhY2hlZCBjb250cm9sIGV2ZW50IGFkYXB0ZXJzXG5cdFx0ICogQG1lbWJlciB7U2V0PENhbnZhc0J1dHRvbj59IHdnZXRzIC0gQ2FudmFzIHdpZGdldHNcblx0XHQgKi9cblx0XHRleHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgQ29udHJvbGxhYmxlQ2FudmFzT3B0aW9ucyB7XG5cdFx0XHR0YXJnZXQ6IEhUTUxDYW52YXNFbGVtZW50O1xuXHRcdFx0dHJhbnM/OiBudW1iZXJbXTtcblx0XHRcdHNjbD86IG51bWJlcltdO1xuXHRcdFx0ZHJhZ0VuYWJsZWQ/OiBib29sZWFuO1xuXHRcdFx0cGluY2hFbmFibGVkPzogYm9vbGVhbjtcblx0XHRcdHdoZWVsRW5hYmxlZD86IGJvb2xlYW47XG5cdFx0XHRwYW5FbmFibGVkPzogYm9vbGVhbjtcblx0XHRcdHRpbHRFbmFibGVkPzogYm9vbGVhbjtcblx0XHRcdGV2ZW50c1JldmVyc2VkPzogYm9vbGVhbjtcblx0XHRcdHVzZUJ1dHRvbj86IG51bWJlcjtcblx0XHRcdHNjYWxlTW9kZT86IG51bWJlcjtcblx0XHRcdHRyYW5zQm91bmRzPzogbnVtYmVyW107XG5cdFx0XHRzY2xCb3VuZHM/OiBudW1iZXJbXTtcblx0XHRcdHRyYW5zU3BlZWQ/OiBudW1iZXI7XG5cdFx0XHRzY2xTcGVlZD86IG51bWJlcjtcblx0XHRcdHRvdWNoU2Vuc2l0aXZpdHk/OiBudW1iZXI7XG5cdFx0XHRjbGlja1NlbnNpdGl2aXR5PzogbnVtYmVyO1xuXHRcdFx0X2FkYXB0cz86IENvbnRyb2xsYWJsZUNhbnZhc0FkYXB0ZXJzO1xuXHRcdFx0d2dldHM/OiBTZXQ8Q2FudmFzQnV0dG9uPjtcblx0XHRcdFtwcm9wOiBzdHJpbmddOiBhbnk7XG5cdFx0fSAvL0NvbnRyb2xsYWJsZUNhbnZhc09wdGlvbnNcblx0XHQvKipcblx0XHQgKiBNOiBtb2JpbGVcblx0XHQgKiBQOiBwY1xuXHRcdCAqIE1QOiBib3RoXG5cdFx0ICogXG5cdFx0ICogZHJhZzpcblx0XHQgKlx0UDogbW91c2UgIGhvbGQgJiBtb3ZlXG5cdFx0ICpcdE06IHRvdWNoICBob2xkICYgbW92ZVxuXHRcdCAqIHBpbmNoOlxuXHRcdCAqXHR0b3VjaCAgMi1maW5nZXIgJiBtb3ZlXG5cdFx0ICogd2hlZWw6XG5cdFx0ICpcdHdoZWVsICBtb3ZlICBbcGMgcGluY2gtZXF1aXZhbGVudF1cblx0XHQgKiBwYW46XG5cdFx0ICpcdGRpc3Bvc2l0aW9uIGZyb20gY2VudGVyIGNhdXNlcyBjb25zdGFudCB0cmFuc2xhdGlvblxuXHRcdCAqIHRpbHQ6XG5cdFx0ICpcdGRldmljZW1vdGlvbiAgY2F1c2VzIHBhbm5pbmcqXG5cdFx0ICpcdFxuXHRcdCAqIEBpbnRlcmZhY2Vcblx0XHQgKiBAaW5uZXJcblx0XHQgKi9cblx0XHRleHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgQ29udHJvbGxhYmxlQ2FudmFzQWRhcHRlcnMge1xuXHRcdFx0ZHJhZzogRnVuY3Rpb24gfCBib29sZWFuOyAgLy9NUFxuXHRcdFx0cGluY2g/OiBGdW5jdGlvbiB8IGJvb2xlYW47ICAvL01cblx0XHRcdHdoZWVsPzogRnVuY3Rpb24gfCBib29sZWFuOyAgLy9QXG5cdFx0XHRwYW46IEZ1bmN0aW9uIHwgYm9vbGVhbjsgIC8vTVBcblx0XHRcdHRpbHQ/OiBGdW5jdGlvbiB8IGJvb2xlYW47ICAvL01QXG5cdFx0XHRjbGljazogRnVuY3Rpb24gfCBib29sZWFuOyAgLy9NUFxuXHRcdFx0W3Byb3A6IHN0cmluZ106IGFueTtcblx0XHR9IC8vQ29udHJvbGxhYmxlQ2FudmFzQWRhcHRlcnNcblx0XHQvKipcblx0XHQgKiBPcHRpb25zIG9mIENvbnRyb2xsYWJsZUNhbnZhcy5DYW52YXNCdXR0b25cblx0XHQgKiBAaW50ZXJmYWNlXG5cdFx0ICogQGlubmVyXG5cdFx0ICogQG1lbWJlciB7bnVtYmVyfSB4IC0geCBjb29yZGluYXRlXG5cdFx0ICogQG1lbWJlciB7bnVtYmVyfSB5IC0geSBjb29yZGluYXRlXG5cdFx0ICogQG1lbWJlciB7bnVtYmVyfSBkeCAtIHdpZGdldCB3aWR0aFxuXHRcdCAqIEBtZW1iZXIge251bWJlcn0gZHkgLSB3aWRnZXQgaGVpZ2h0XG5cdFx0ICogQG1lbWJlciB7bnVtYmVyfSBpbmRleCAtIHdpZGdldCBldmVudCBwcmlvcml0eVxuXHRcdCAqL1xuXHRcdGV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBDYW52YXNCdXR0b25PcHRpb25zIHtcblx0XHRcdHg6IG51bWJlcjtcblx0XHRcdHk6IG51bWJlcjtcblx0XHRcdGR4OiBudW1iZXI7XG5cdFx0XHRkeTogbnVtYmVyO1xuXHRcdFx0aW5kZXg/OiBudW1iZXI7XG5cdFx0XHRwYXJlbnQ6IENvbnRyb2xsYWJsZUNhbnZhcztcblx0XHRcdGVuYWJsZWQ/OiBib29sZWFuO1xuXHRcdFx0cG9zaXRpb24/OiBudW1iZXI7XG5cdFx0XHRbcHJvcDogc3RyaW5nXTogYW55O1xuXHRcdH0gLy9DYW52YXNCdXR0b25PcHRpb25zXG5cblx0XHRleHBvcnQgZW51bSBVc2VCdXR0b24ge1xuXHRcdFx0VVNFTEVGVCA9IDEsIFVTRVJJR0hULCBVU0VCT1RIXG5cdFx0fSAvL1VzZUJ1dHRvblxuXHRcdGV4cG9ydCBlbnVtIFNjYWxlTW9kZSB7XG5cdFx0XHROT1JNQUwgPSAxLCBGUkVFU0NBTEVcblx0XHR9IC8vU2NhbGVNb2RlXG5cdFx0ZXhwb3J0IGVudW0gUG9zaXRpb24ge1xuXHRcdFx0RklYRUQgPSAxLCBBQlNPTFVURSwgVU5TQ0FMQUJMRSA9IDRcblx0XHR9IC8vUG9zaXRpb25cblx0fSAvL09wdHNcblxuXHQvKipcblx0ICogQSBob2xkZXIgZm9yIGFsbCBlcnJvcnNcblx0ICogQG5hbWVzcGFjZVxuXHQgKi9cblx0ZXhwb3J0IG5hbWVzcGFjZSBFcnJvcnMge1xuXHRcdGV4cG9ydCBjb25zdCBFTk9UQ0FOVjogVHlwZUVycm9yID0gbmV3IFR5cGVFcnJvcihcIk5vdCBhbiBIVE1MQ2FudmFzRWxlbWVudC5cIik7XG5cdFx0ZXhwb3J0IGNvbnN0IEVOT1RDVFg6IFR5cGVFcnJvciA9IG5ldyBUeXBlRXJyb3IoXCJOb3QgYSBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQuXCIpO1xuXHRcdGV4cG9ydCBjb25zdCBFTk9UTlVNQVJSMjogVHlwZUVycm9yID0gbmV3IFR5cGVFcnJvcihcIk5vdCBhbiBBcnJheSBvZiAyLWF0LWxlYXN0IE51bWJlcnMuXCIpO1xuXHRcdGV4cG9ydCBjb25zdCBFTk9UTlVNOiBUeXBlRXJyb3IgPSBuZXcgVHlwZUVycm9yKFwiTm90IGEgdmFsaWQgTnVtYmVyLlwiKTtcblx0XHRleHBvcnQgY29uc3QgRUlTQUxSOiBSZWZlcmVuY2VFcnJvciA9IG5ldyBSZWZlcmVuY2VFcnJvcihcIk9iamVjdCBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQuXCIpO1xuXHR9IC8vRXJyb3JzXG5cblx0XG5cdC8qKlxuXHQgKiBBIHdyYXBwZXIgZm9yIHRoZSB0YXJnZXRlZCBjYW52YXMgZWxlbWVudFxuXHQgKiBAY2xhc3Ncblx0ICogQGltcGxlbWVudHMge09wdHMuQ29udHJvbGxhYmxlQ2FudmFzT3B0aW9uc31cblx0ICogQHByb3Age0hUTUxDYW52YXNFbGVtZW50fSB0YXJnZXQ9Zmlyc3RDYW52T2NjdXJJbkRvYyAtIEJvdW5kIGNhbnZhc1xuXHQgKiBAcHJvcCB7Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEfSBjb250ZXh0Pz10YXJnZXQuZ2V0Q29udGV4dChcIjJkXCIpIC0gVGhlIDJkIGNvbnRleHQgY3JlYXRlZCBvdXQgb2YgYHRhcmdldGBcblx0ICogQHByb3Age251bWJlcltdfSB0cmFucz0wLDAgLSBUcmFuc2xhdGlvblxuXHQgKiBAcHJvcCB7bnVtYmVyW119IHNjbD0xLDEgLSBTY2FsaW5nXG5cdCAqIEBwcm9wIHtudW1iZXJbXX0gcGluPz10aGlzLnRhcmdldC53aWR0aC8yLHRoaXMudGFyZ2V0LmhlaWdodC8yIC0gUHNldWRvLWNlbnRlclxuXHQgKiBAcHJvcCB7bnVtYmVyW119IHRyYW5zQm91bmQ9LUluZmluaXR5LC1JbmZpbml0eSxJbmZpbml0eSxJbmZpbml0eSAtIE1heCB0cmFuc2xhdGlvbiBib3VuZGFyaWVzXG5cdCAqIEBwcm9wIHtib29sZWFufSBkcmFnRW5hYmxlZD1mYWxzZSAtIEVuYWJsZSB0cmFuc2xhdGlvbiBvbiBkcmFnXG5cdCAqIEBwcm9wIHtib29sZWFufSBwaW5jaEVuYWJsZWQ9ZmFsc2UgLSBFbmFibGUgc2NhbGluZyBvbiAyLWZpbmdlciBwaW5jaCAoYm90aCBmaW5nZXJzIHNoYWxsIG1vdmUpXG5cdCAqIEBwcm9wIHtib29sZWFufSB3aGVlbEVuYWJsZWQ9ZmFsc2UgLSBFbmFibGUgc2NhbGluZyBvbiBtb3VzZSB3aGVlbFxuXHQgKiBAcHJvcCB7Ym9vbGVhbn0gcGFuRW5hYmxlZD1mYWxzZSAtIEVuYWJsZSB0cmFuc2xhdGlvbiBiYXNlZCBvbiBtb3VzZS9maW5nZXIgZGlzdGFuY2UgZnJvbSBwaW4gKHBzZXVkby1jZW50ZXIpXG5cdCAqIEBwcm9wIHtib29sZWFufSB0aWx0RW5hYmxlZD1mYWxzZSAtIEVuYWJsZSB0cmFuc2xhdGlvbiBvbiBkZXZpY2UgbW92ZW1lbnRcblx0ICogQHByb3Age2Jvb2xlYW59IGV2ZW50c1JldmVyc2VkPWZhbHNlIC0gVG9nZ2xlIHJldmVyc2Utb3BlcmF0aW9uc1xuXHQgKiBAcHJvcCB7T3B0cy5Vc2VCdXR0b259IHVzZUJ1dHRvbj1PcHRzLlVzZUJ1dHRvbi5VU0VMRUZUIC0gUmVzcG9uZCB0byBsZWZ0LWNsaWNrLCByaWdodCBvciBib3RoXG5cdCAqIEBwcm9wIHtudW1iZXJbXX0gX2Nvb3JkaW5hdGVzIC0gQ3VycmVudCBldmVudCBjb29yZGluYXRlc1xuXHQgKiBAcHJvcCB7bnVtYmVyfSB0cmFuc1NwZWVkPTEgLSBUcmFuc2xhdGlvbiBzcGVlZCBmYWN0b3Jcblx0ICogQHByb3Age251bWJlcn0gc2NsU3BlZWQ9MSAtIFNjYWxpbmcgc3BlZWQgZmFjdG9yXG5cdCAqIEBwcm9wIHtPcHRzLkNvbnRyb2xsYWJsZUNhbnZhc0FkYXB0ZXJzfSBfYWRhcHRzIC0gTWFwIG9mIGFsbCBjdXJyZW50bHkgYXR0YWNoZWQgY29udHJvbCBldmVudCBhZGFwdGVyc1xuXHQgKiBAcHJvcCB7b2JqZWN0fSBfdG91Y2hlcyAtIE1hcCBvZiBhbGwgY3VycmVudCB0b3VjaGVzXG5cdCAqIEBwcm9wIHtDbGFzc30gQ2FudmFzQnV0dG9uIC0gQSB3aWRnZXQtbWFraW5nIGNsYXNzIGZvciBjYW52YXNcblx0ICogQHByb3Age1NldDxDYW52YXNCdXR0b24+fSB3Z2V0cyAtIENhbnZhcyB3aWRnZXRzXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQ29udHJvbGxhYmxlQ2FudmFzIGltcGxlbWVudHMgT3B0cy5Db250cm9sbGFibGVDYW52YXNPcHRpb25zIHtcblx0XHR0YXJnZXQ6IEhUTUxDYW52YXNFbGVtZW50O1xuXHRcdGNvbnRleHQ6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRDtcblx0XHR0cmFuczogbnVtYmVyW10gPSBbMCwgMF07XG5cdFx0c2NsOiBudW1iZXJbXSA9IFsxLCAxXTtcblx0XHRwaW46IG51bWJlcltdOyAgLy9PQlNcblx0XHR0cmFuc0JvdW5kczogbnVtYmVyW10gPSBbLUluZmluaXR5LCAtSW5maW5pdHksIEluZmluaXR5LCBJbmZpbml0eV07XG5cdFx0c2NsQm91bmRzOiBudW1iZXJbXSA9IFswLCAwLCBJbmZpbml0eSwgSW5maW5pdHldO1xuXHRcdGRyYWdFbmFibGVkOiBib29sZWFuID0gZmFsc2U7XG5cdFx0cGluY2hFbmFibGVkOiBib29sZWFuID0gZmFsc2U7XG5cdFx0d2hlZWxFbmFibGVkOiBib29sZWFuID0gZmFsc2U7XG5cdFx0cGFuRW5hYmxlZDogYm9vbGVhbiA9IGZhbHNlOyAgLy9PQlNcblx0XHR0aWx0RW5hYmxlZDogYm9vbGVhbiA9IGZhbHNlOyAgLy9PQlNcblx0XHRldmVudHNSZXZlcnNlZDogYm9vbGVhbiA9IGZhbHNlO1xuXHRcdHVzZUJ1dHRvbjogbnVtYmVyID0gT3B0cy5Vc2VCdXR0b24uVVNFTEVGVDtcblx0XHRzY2FsZU1vZGU6IG51bWJlciA9IE9wdHMuU2NhbGVNb2RlLk5PUk1BTDtcblx0XHR0cmFuc1NwZWVkOiBudW1iZXIgPSAxO1xuXHRcdHNjbFNwZWVkOiBudW1iZXIgPSAxO1xuXHRcdHRvdWNoU2Vuc2l0aXZpdHk6IG51bWJlciA9IC41O1xuXHRcdGNsaWNrU2Vuc2l0aXZpdHk6IG51bWJlciA9IDgwMDtcblx0XHR3Z2V0czogU2V0PENhbnZhc0J1dHRvbj47XG5cdFx0cHJpdmF0ZSBfem9vbUNoYW5nZWQ6IGJvb2xlYW5bXSA9IFtmYWxzZSwgZmFsc2VdO1xuXHRcdHByaXZhdGUgX21vYmlsZTogYm9vbGVhbiA9IGZhbHNlO1xuXHRcdHByaXZhdGUgX3ByZXNzZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblx0XHRwcml2YXRlIF9jbGt0aW1lOiBudW1iZXIgPSAwO1xuXHRcdF9hZGFwdHM6IE9wdHMuQ29udHJvbGxhYmxlQ2FudmFzQWRhcHRlcnM7XG5cdFx0cHJpdmF0ZSBfY29vcmRpbmF0ZXM6IG51bWJlcltdID0gWyBdO1xuXHRcdHByaXZhdGUgX3RvdWNoZXM6IG51bWJlcltdW10gPSBbIF07XG5cblx0XHRwcml2YXRlIHN0YXRpYyBfbGluZXBpeDogbnVtYmVyID0gMTA7XG5cdFx0c3RhdGljIENhbnZhc0J1dHRvbjogQ2xhc3M7XG5cdFx0LyoqXG5cdFx0ICogRGVmYXVsdCBvcHRpb25zIGZvciBDb250cm9sbGFibGVDYW52YXNcblx0XHQgKiBAcmVhZG9ubHlcblx0XHQgKiBAc3RhdGljXG5cdFx0ICovXG5cdFx0c3RhdGljIGRlZmF1bHRPcHRzOiBPcHRzLkNvbnRyb2xsYWJsZUNhbnZhc09wdGlvbnMgPSB7XG5cdFx0XHR0YXJnZXQ6IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2FudmFzXCIpWzBdLFxuXHRcdFx0dHJhbnM6IFswLCAwXSxcblx0XHRcdHNjbDogWzEsIDFdLFxuXHRcdFx0ZHJhZ0VuYWJsZWQ6IGZhbHNlLFxuXHRcdFx0cGluY2hFbmFibGVkOiBmYWxzZSxcblx0XHRcdHdoZWVsRW5hYmxlZDogZmFsc2UsXG5cdFx0XHRwYW5FbmFibGVkOiBmYWxzZSxcblx0XHRcdHRpbHRFbmFibGVkOiBmYWxzZSxcblx0XHRcdGV2ZW50c1JldmVyc2VkOiBmYWxzZSxcblx0XHRcdHVzZUJ1dHRvbjogMSxcblx0XHRcdHNjYWxlTW9kZTogMSxcblx0XHRcdHRyYW5zU3BlZWQ6IDEsXG5cdFx0XHRzY2xTcGVlZDogMSxcblx0XHRcdHRvdWNoU2Vuc2l0aXZpdHk6IC4zNSxcblx0XHRcdGNsaWNrU2Vuc2l0aXZpdHk6IDgwMCxcblx0XHRcdHNjbEJvdW5kczogWzAsIDAsIEluZmluaXR5LCBJbmZpbml0eV0sXG5cdFx0XHR0cmFuc0JvdW5kczogWy1JbmZpbml0eSwgLUluZmluaXR5LCBJbmZpbml0eSwgSW5maW5pdHldLFxuXHRcdFx0X2FkYXB0czoge1xuXHRcdFx0XHRkcmFnOiBmYWxzZSxcblx0XHRcdFx0cGluY2g6IGZhbHNlLFxuXHRcdFx0XHR3aGVlbDogZmFsc2UsXG5cdFx0XHRcdHBhbjogZmFsc2UsXG5cdFx0XHRcdHRpbHQ6IGZhbHNlLFxuXHRcdFx0XHRjbGljazogZmFsc2Vcblx0XHRcdH0sXG5cdFx0XHR3Z2V0czogbmV3IFNldCgpXG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENvbnRyb2xsYWJsZUNhbnZhcyBjb25zdHJ1Y3RvclxuXHRcdCAqIEBwYXJhbSB7T3B0cy5Db250cm9sbGFibGVDYW52YXNPcHRpb25zfSBvcHRzPz1Db250cm9sbGFibGVDYW52YXMuZGVmYXVsdE9wdHMgLSBDb250cm9sbGFibGVDYW52YXMgT3B0aW9uc1xuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqL1xuXHRcdGNvbnN0cnVjdG9yKG9wdHM6IE9wdHMuQ29udHJvbGxhYmxlQ2FudmFzT3B0aW9ucyA9IENvbnRyb2xsYWJsZUNhbnZhcy5kZWZhdWx0T3B0cykge1xuXHRcdFx0aW5oZXJpdChvcHRzLCBDb250cm9sbGFibGVDYW52YXMuZGVmYXVsdE9wdHMpO1xuXHRcdFx0XG5cdFx0XHRpZiAoIShvcHRzLnRhcmdldCBpbnN0YW5jZW9mIEhUTUxDYW52YXNFbGVtZW50KSkge1xuXHRcdFx0XHR0aHJvdyBFcnJvcnMuRU5PVENBTlY7XG5cdFx0XHR9IGVsc2UgaWYgKFtvcHRzLnRyYW5zLCBvcHRzLnNjbCwgb3B0cy50cmFuc0JvdW5kcywgb3B0cy5zY2xCb3VuZHNdLnNvbWUoYXJyID0+ICEoYXJyIGluc3RhbmNlb2YgQXJyYXkgfHwgPGFueT5hcnIgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkgfHwgPGFueT5hcnIgaW5zdGFuY2VvZiBGbG9hdDY0QXJyYXkpIHx8IGFyci5sZW5ndGggPCAyIHx8IEFycmF5LmZyb20oYXJyKS5zb21lKChudW06IGFueSkgPT4gaXNOYU4obnVtKSB8fCBudW0gPT09ICcnKSkpIHtcblx0XHRcdFx0dGhyb3cgRXJyb3JzLkVOT1ROVU1BUlIyO1xuXHRcdFx0fVxuXG5cdFx0XHRpbmhlcml0KG9wdHMuX2FkYXB0cywgQ29udHJvbGxhYmxlQ2FudmFzLmRlZmF1bHRPcHRzLl9hZGFwdHMpOyAgLy9QT1NTSUJMRSBFUlJPUlxuXG5cdFx0XHRpZiAob3B0cy5waW4gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRvcHRzLnBpbiA9IFtvcHRzLnRhcmdldC53aWR0aCAvIDIsIG9wdHMudGFyZ2V0LmhlaWdodCAvIDJdO1xuXHRcdFx0fSBlbHNlIGlmICghKG9wdHMucGluIGluc3RhbmNlb2YgQXJyYXkgfHwgPGFueT5vcHRzLnBpbiBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSB8fCA8YW55Pm9wdHMucGluIGluc3RhbmNlb2YgRmxvYXQ2NEFycmF5KSB8fCBvcHRzLnBpbi5sZW5ndGggPCAyIHx8IEFycmF5LmZyb20ob3B0cy5waW4pLnNvbWUoKG51bTogYW55KSA9PiBpc05hTihudW0pIHx8IG51bSA9PT0gJycpKSB7XG5cdFx0XHRcdHRocm93IEVycm9ycy5FTk9UTlVNQVJSMjtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dGhpcy50YXJnZXQgPSBvcHRzLnRhcmdldDtcblx0XHRcdHRoaXMuY29udGV4dCA9IHRoaXMudGFyZ2V0LmdldENvbnRleHQoXCIyZFwiKTtcblxuXHRcdFx0dGhpcy5fYWRhcHRzID0gPE9wdHMuQ29udHJvbGxhYmxlQ2FudmFzQWRhcHRlcnM+eyB9O1xuXHRcdFx0aW5oZXJpdCh0aGlzLl9hZGFwdHMsIG9wdHMuX2FkYXB0cyk7XG5cblx0XHRcdHRoaXMudHJhbnNTcGVlZCA9IG9wdHMudHJhbnNTcGVlZCAqIDE7XG5cdFx0XHR0aGlzLnNjbFNwZWVkID0gb3B0cy5zY2xTcGVlZCAqIDE7XG5cdFx0XHR0aGlzLnRvdWNoU2Vuc2l0aXZpdHkgPSBvcHRzLnRvdWNoU2Vuc2l0aXZpdHkgKiAxO1xuXHRcdFx0dGhpcy5jbGlja1NlbnNpdGl2aXR5ID0gb3B0cy5jbGlja1NlbnNpdGl2aXR5ICogMTtcblx0XHRcdHRoaXMudXNlQnV0dG9uID0gb3B0cy51c2VCdXR0b24gfCAwO1xuXHRcdFx0dGhpcy5zY2FsZU1vZGUgPSBvcHRzLnNjYWxlTW9kZSB8IDA7XG5cblx0XHRcdHRoaXMud2dldHMgPSBuZXcgU2V0KG9wdHMud2dldHMpO1xuXG5cdFx0XHR0aGlzLnRyYW5zID0gQXJyYXkuZnJvbShvcHRzLnRyYW5zKS5tYXAoTnVtYmVyKTtcblx0XHRcdHRoaXMuc2NsID0gQXJyYXkuZnJvbShvcHRzLnNjbCkubWFwKE51bWJlcik7XG5cdFx0XHR0aGlzLnBpbiA9IEFycmF5LmZyb20ob3B0cy5waW4pLm1hcChOdW1iZXIpO1xuXHRcdFx0dGhpcy50cmFuc0JvdW5kcyA9IEFycmF5LmZyb20ob3B0cy50cmFuc0JvdW5kcykubWFwKE51bWJlcik7ICAvLyB4LCB5LCBYLCBZXG5cdFx0XHR0aGlzLnNjbEJvdW5kcyA9IEFycmF5LmZyb20ob3B0cy5zY2xCb3VuZHMpLm1hcChOdW1iZXIpOyAgLy8geCwgeSwgWCwgWVxuXG5cdFx0XHR0aGlzLmRyYWdFbmFibGVkID0gISFvcHRzLmRyYWdFbmFibGVkO1xuXHRcdFx0dGhpcy5waW5jaEVuYWJsZWQgPSAhIW9wdHMucGluY2hFbmFibGVkO1xuXHRcdFx0dGhpcy53aGVlbEVuYWJsZWQgPSAhIW9wdHMud2hlZWxFbmFibGVkO1xuXHRcdFx0dGhpcy5wYW5FbmFibGVkID0gISFvcHRzLnBhbkVuYWJsZWQ7XG5cdFx0XHR0aGlzLnRpbHRFbmFibGVkID0gISFvcHRzLnRpbHRFbmFibGVkO1xuXHRcdFx0dGhpcy5ldmVudHNSZXZlcnNlZCA9ICEhb3B0cy5ldmVudHNSZXZlcnNlZDtcblxuXHRcdFx0dGhpcy5fcHJlc3NlZCA9IGZhbHNlO1xuXHRcdFx0dGhpcy5fY29vcmRpbmF0ZXMgPSBbMCwgMF07XG5cdFx0XHR0aGlzLl90b3VjaGVzID0gWyBdO1xuXHRcdFx0dGhpcy5fbW9iaWxlID0gQ29udHJvbGxhYmxlQ2FudmFzLmlzTW9iaWxlO1xuXHRcdFx0aWYgKCFDb250cm9sbGFibGVDYW52YXMuX2xpbmVwaXgpIENvbnRyb2xsYWJsZUNhbnZhcy5fbGluZXBpeCA9IENvbnRyb2xsYWJsZUNhbnZhcy5saW5lVG9QaXg7XG5cdFx0fSAvL2N0b3JcblxuXHRcdGdldCByYXRpbygpOiBudW1iZXIge1xuXHRcdFx0cmV0dXJuIHRoaXMudGFyZ2V0LndpZHRoIC8gdGhpcy50YXJnZXQuaGVpZ2h0O1xuXHRcdH0gLy9nLXJhdGlvICBPQlNcblx0XHRnZXQgbWluKCk6IG51bWJlciB7XG5cdFx0XHRyZXR1cm4gTWF0aC5taW4odGhpcy50YXJnZXQud2lkdGgsIHRoaXMudGFyZ2V0LmhlaWdodCk7XG5cdFx0fSAvL2ctbWluXG5cdFx0Z2V0IG1heCgpOiBudW1iZXIge1xuXHRcdFx0cmV0dXJuIE1hdGgubWF4KHRoaXMudGFyZ2V0LndpZHRoLCB0aGlzLnRhcmdldC5oZWlnaHQpO1xuXHRcdH0gLy9nLW1heCAgT0JTXG5cblxuXHRcdC8qKlxuXHRcdCAqIEVuYWJsZSBjb250cm9sc1xuXHRcdCAqIEBtZXRob2Rcblx0XHQgKi9cblx0XHRoYW5kbGUoKTogdm9pZCB7XG5cdFx0XHR0aGlzLl9tb2JpbGUgPyB0aGlzLl9tb2JpbGVBZGFwdCgpIDogdGhpcy5fcGNBZGFwdCgpO1xuXHRcdH0gLy9oYW5kbGVcblx0XHQvKipcblx0XHQgKiBBZGQgKC9jcmVhdGUpIGEgd2lkZ2V0IGluIHRoZSBjb250cm9sbGVyXG5cdFx0ICogQHBhcmFtIHtDb250cm9sbGFibGVDYW52YXMuQ2FudmFzQnV0dG9ufE9wdHMuQ2FudmFzQnV0dG9uT3B0aW9uc30gZGF0YSAtIGNvbnN0cnVjdG9yIG9wdGlvbnNcblx0XHQgKiBAcmV0dXJuIHtDb250cm9sbGFibGVDYW52YXMuQ2FudmFzQnV0dG9ufSB0aGUgd2lkZ2V0XG5cdFx0ICovXG5cdFx0YWRkV2lkZ2V0KGRhdGE6IENhbnZhc0J1dHRvbiB8IE9wdHMuQ2FudmFzQnV0dG9uT3B0aW9ucyk6IENhbnZhc0J1dHRvbiB7XG5cdFx0XHRpZiAoZGF0YSBpbnN0YW5jZW9mIENhbnZhc0J1dHRvbiAmJiAhdGhpcy53Z2V0cy5oYXMoZGF0YSkpIHtcblx0XHRcdFx0ZGF0YS5wYXJlbnQgPSB0aGlzO1xuXHRcdFx0XHR0aGlzLndnZXRzLmFkZCg8Q2FudmFzQnV0dG9uPmRhdGEpO1xuXHRcdFx0fSBlbHNlIGlmICghKGRhdGEgaW5zdGFuY2VvZiBDYW52YXNCdXR0b24pKSB7XG5cdFx0XHRcdGRhdGEgPSBuZXcgQ29udHJvbGxhYmxlQ2FudmFzLkNhbnZhc0J1dHRvbig8T3B0cy5DYW52YXNCdXR0b25PcHRpb25zPmRhdGEpO1xuXHRcdFx0XHRkYXRhLnBhcmVudCA9IHRoaXM7XG5cdFx0XHRcdHRoaXMud2dldHMuYWRkKDxDYW52YXNCdXR0b24+ZGF0YSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBFcnJvcnMuRUlTQUxSO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIDxDYW52YXNCdXR0b24+ZGF0YTtcblx0XHR9IC8vYWRkV2lkZ2V0XG5cblxuXHRcdC8qKlxuXHRcdCAqIFJlLWFwcGx5IGludGVybmFsIHRyYW5zZm9ybWF0aW9uc1xuXHRcdCAqIEBtZXRob2Rcblx0XHQgKiBAcmV0dXJucyB7Q29udHJvbGxhYmxlQ2FudmFzfSB0aGlzIC0gRm9yIG1ldGhvZCBjaGFpbmluZ1xuXHRcdCAqL1xuXHRcdHJldHJhbnNmb3JtKCk6IFRoaXNUeXBlPENvbnRyb2xsYWJsZUNhbnZhcz4ge1xuXHRcdFx0dGhpcy5jb250ZXh0LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTsgIC8vU0tFVy9ST1RBVEUgTk9UIElNUExFTUVOVEVEISFcblx0XHRcdHRoaXMuY29udGV4dC50cmFuc2xhdGUodGhpcy50cmFuc1swXSwgdGhpcy50cmFuc1sxXSk7XG5cdFx0XHR0aGlzLmNvbnRleHQuc2NhbGUodGhpcy5zY2xbMF0sIHRoaXMuc2NsWzFdKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gLy9yZXRyYW5zZm9ybVxuXG5cdFx0LyoqXG5cdFx0ICogSW50ZXJtZWRpYXRlIHRyYW5zbGF0aW9uIGZ1bmN0aW9uIGZvciBpY29uaWMgdHJhbnNsYXRlIGJlZm9yZSB0aGUgcmVhbFxuXHRcdCAqIEBtZXRob2Rcblx0XHQgKiBAcGFyYW0ge251bWJlcn0geD0wIC0geCB0cmFuc2xhdGlvblxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSB5PTAgLSB5IHRyYW5zbGF0aW9uXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBhYnM/PWZhbHNlIC0gYWJzb2x1dGUgdHJhbnNsYXRpb24gb3IgcmVsYXRpdmUgdG8gY3VycmVudFxuXHRcdCAqIEByZXR1cm5zIHtudW1iZXJbXX0gUmV0dXJucyBjdXJyZW50IHRvdGFsIHRyYW5zbGF0aW9uXG5cdFx0ICovXG5cdFx0dHJhbnNsYXRlKHg6IG51bWJlciA9IDAsIHk6IG51bWJlciA9IDAsIGFiczogYm9vbGVhbiA9IGZhbHNlKTogbnVtYmVyW10ge1xuXHRcdFx0bGV0IGJ5OiBudW1iZXJbXSA9IFt4LCB5XS5tYXAoTnVtYmVyKTtcblx0XHRcdGlmICh0aGlzLmV2ZW50c1JldmVyc2VkKSBieSA9IGJ5Lm1hcCgoYjogbnVtYmVyKTogbnVtYmVyID0+IC1iKTtcblx0XHRcdHJldHVybiB0aGlzLnRyYW5zID0gdGhpcy50cmFucy5tYXAoKHRybjogbnVtYmVyLCBpZHg6IG51bWJlcik6IG51bWJlciA9PiBib3VuZChOdW1iZXIoIWFicyA/ICh0cm4gKyBieVtpZHhdKSA6IGJ5W2lkeF0pLCB0aGlzLnRyYW5zQm91bmRzW2lkeF0sIHRoaXMudHJhbnNCb3VuZHNbaWR4ICsgMl0pKTtcblx0XHR9IC8vdHJhbnNsYXRlXG5cdFx0LyoqXG5cdFx0ICogSW50ZXJtZWRpYXRlIHNjYWxpbmcgZnVuY3Rpb24gZm9yIGljb25pYyBzY2FsZSBiZWZvcmUgdGhlIHJlYWxcblx0XHQgKiBAbWV0aG9kXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IHg9MSAtIHggc2NhbGVcblx0XHQgKiBAcGFyYW0ge251bWJlcn0geT14IC0geSBzY2FsZVxuXHRcdCAqIEBwYXJhbSB7Ym9vbGVhbn0gYWJzPz1mYWxzZSAtIGFic29sdXRlIHNjYWxlIG9yIHJlbGF0aXZlIHRvIGN1cnJlbnRcblx0XHQgKiBAcmV0dXJucyB7bnVtYmVyW119IFJldHVybnMgY3VycmVudCB0b3RhbCBzY2FsaW5nXG5cdFx0ICovXG5cdFx0c2NhbGUoeDogbnVtYmVyID0gMSwgeTogbnVtYmVyID0geCwgYWJzOiBib29sZWFuID0gZmFsc2UpOiBudW1iZXJbXSB7XG5cdFx0XHRsZXQgYnk6IG51bWJlcltdID0gW3gsIHldLm1hcChOdW1iZXIpO1xuXHRcdFx0aWYgKHRoaXMuZXZlbnRzUmV2ZXJzZWQpIGJ5ID0gYnkubWFwKChiOiBudW1iZXIpOiBudW1iZXIgPT4gLWIpO1xuXHRcdFx0aWYgKCFhYnMpIHtcblx0XHRcdFx0bGV0IG5zY2w6IG51bWJlcltdID0gdGhpcy5zY2wubWFwKChzY2w6IG51bWJlciwgaWR4OiBudW1iZXIpOiBudW1iZXIgPT4gc2NsICogYnlbaWR4XSk7XG5cdFx0XHRcdG5zY2wgPSBbbnNjbFswXSAtIHRoaXMuc2NsWzBdLCBuc2NsWzFdIC0gdGhpcy5zY2xbMV1dO1xuXHRcdFx0XHR0aGlzLl96b29tQ2hhbmdlZCA9IFt0aGlzLnNjbFswXSAhPT0gYmxvY2sodGhpcy5zY2xbMF0sIHRoaXMuc2NsQm91bmRzWzBdLCB0aGlzLnNjbEJvdW5kc1syXSwgbnNjbFswXSksIHRoaXMuc2NsWzFdICE9PSBibG9jayh0aGlzLnNjbFsxXSwgdGhpcy5zY2xCb3VuZHNbMV0sIHRoaXMuc2NsQm91bmRzWzNdLCBuc2NsWzFdKV07XG5cdFx0XHRcdHJldHVybiB0aGlzLnNjbCA9IFtibG9jayh0aGlzLnNjbFswXSwgdGhpcy5zY2xCb3VuZHNbMF0sIHRoaXMuc2NsQm91bmRzWzJdLCBuc2NsWzBdKSwgYmxvY2sodGhpcy5zY2xbMV0sIHRoaXMuc2NsQm91bmRzWzFdLCB0aGlzLnNjbEJvdW5kc1szXSwgbnNjbFsxXSldO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fem9vbUNoYW5nZWQgPSBbdGhpcy5zY2xbMF0gIT09IGJvdW5kKHRoaXMuc2NsWzBdLCB0aGlzLnNjbEJvdW5kc1swXSwgdGhpcy5zY2xCb3VuZHNbMl0pLCB0aGlzLnNjbFsxXSAhPT0gYm91bmQodGhpcy5zY2xbMV0sIHRoaXMuc2NsQm91bmRzWzFdLCB0aGlzLnNjbEJvdW5kc1szXSldO1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5zY2wgPSB0aGlzLnNjbC5tYXAoKHNjbDogbnVtYmVyLCBpZHg6IG51bWJlcik6IG51bWJlciA9PiBib3VuZChzY2wgKiBieVtpZHhdLCB0aGlzLnNjbEJvdW5kc1tpZHhdLCB0aGlzLnNjbEJvdW5kc1tpZHggKyAyXSkpO1xuXHRcdFx0fVxuXHRcdH0gLy9zY2FsZVxuXG5cdFx0cHJpdmF0ZSBfbW9iaWxlQWRhcHQoKTogdm9pZCB7XG5cdFx0XHRpZiAoIXRoaXMuX2FkYXB0cy5kcmFnICYmIHRoaXMuZHJhZ0VuYWJsZWQpIHtcblx0XHRcdFx0dGhpcy50YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoc3RhcnRcIiwgKGU6IFRvdWNoRXZlbnQpID0+IENvbnRyb2xsYWJsZUNhbnZhcy5kcmFnTW9iaWxlU3RhcnQoZSwgdGhpcyksIHsgcGFzc2l2ZTogZmFsc2UgfSk7XG5cdFx0XHRcdHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIiwgdGhpcy5fYWRhcHRzLnBpbmNoID0gdGhpcy5fYWRhcHRzLmRyYWcgPSAoZTogVG91Y2hFdmVudCkgPT4gQ29udHJvbGxhYmxlQ2FudmFzLmRyYWdNb2JpbGVNb3ZlKGUsIHRoaXMpLCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xuXHRcdFx0XHR0aGlzLnRhcmdldC5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hlbmRcIiwgKGU6IFRvdWNoRXZlbnQpID0+IENvbnRyb2xsYWJsZUNhbnZhcy5kcmFnTW9iaWxlRW5kKGUsIHRoaXMpLCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xuXHRcdFx0XHR0aGlzLnRhcmdldC5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hjYW5jZWxcIiwgKGU6IFRvdWNoRXZlbnQpID0+IENvbnRyb2xsYWJsZUNhbnZhcy5kcmFnTW9iaWxlRW5kKGUsIHRoaXMpLCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCF0aGlzLl9hZGFwdHMudGlsdCAmJiB0aGlzLnRpbHRFbmFibGVkKSB7XG5cblx0XHRcdH1cblx0XHR9IC8vX21vYmlsZUFkYXB0XG5cdFx0cHJpdmF0ZSBfcGNBZGFwdCgpOiB2b2lkIHtcblx0XHRcdGlmICghdGhpcy5fYWRhcHRzLmRyYWcgJiYgdGhpcy5kcmFnRW5hYmxlZCkge1xuXHRcdFx0XHR0aGlzLnRhcmdldC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHRoaXMuX2FkYXB0cy5kcmFnID0gKGU6IE1vdXNlRXZlbnQpID0+IENvbnRyb2xsYWJsZUNhbnZhcy5kcmFnUEMoZSwgdGhpcykpO1xuXHRcdFx0XHR0aGlzLnRhcmdldC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIChlPzogTW91c2VFdmVudCkgPT4gdGhpcy5fcHJlc3NlZCA9IHRydWUpO1xuXHRcdFx0XHR0aGlzLnRhcmdldC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCAoZT86IE1vdXNlRXZlbnQpID0+IHRoaXMuX3ByZXNzZWQgPSBmYWxzZSk7XG5cdFx0XHRcdHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW91dFwiLCAoZT86IE1vdXNlRXZlbnQpID0+IHRoaXMuX3ByZXNzZWQgPSBmYWxzZSk7XG5cdFx0XHRcdGlmICgodGhpcy51c2VCdXR0b24gJiBPcHRzLlVzZUJ1dHRvbi5VU0VSSUdIVCkgPT09IE9wdHMuVXNlQnV0dG9uLlVTRVJJR0hUKSB0aGlzLnRhcmdldC5hZGRFdmVudExpc3RlbmVyKFwiY29udGV4dG1lbnVcIiwgKGU6IE1vdXNlRXZlbnQpID0+IGUucHJldmVudERlZmF1bHQoKSwgeyBjYXB0dXJlOiB0cnVlLCBwYXNzaXZlOiBmYWxzZSB9KTtcblx0XHRcdH1cblx0XHRcdGlmICghdGhpcy5fYWRhcHRzLndoZWVsICYmIHRoaXMud2hlZWxFbmFibGVkKSB7XG5cdFx0XHRcdHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCB0aGlzLl9hZGFwdHMud2hlZWwgPSAoZTogV2hlZWxFdmVudCkgPT4gQ29udHJvbGxhYmxlQ2FudmFzLndoZWVsKGUsIHRoaXMpKTtcblx0XHRcdH1cblx0XHRcdGlmICghdGhpcy5fYWRhcHRzLnRpbHQgJiYgdGhpcy50aWx0RW5hYmxlZCkge1xuXHRcdFx0XHQvL1RPRE9cblx0XHRcdH1cblx0XHRcdGlmICghdGhpcy5fYWRhcHRzLmNsaWNrKSB7XG5cdFx0XHRcdHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLl9hZGFwdHMuY2xpY2sgPSAoZTogTW91c2VFdmVudCkgPT4gQ29udHJvbGxhYmxlQ2FudmFzLmNsaWNrUEMoZSwgdGhpcykpO1xuXHRcdFx0fVxuXHRcdH0gLy9fcGNBZGFwdFxuXG5cdFx0cHJpdmF0ZSBzdGF0aWMgZHJhZ1BDKGV2ZW50OiBNb3VzZUV2ZW50LCBjYzogQ29udHJvbGxhYmxlQ2FudmFzKTogdm9pZCB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRsZXQgY29vcmRzOiBudW1iZXJbXSA9IFtldmVudC5jbGllbnRYIC0gY2MudGFyZ2V0Lm9mZnNldExlZnQsIGV2ZW50LmNsaWVudFkgLSBjYy50YXJnZXQub2Zmc2V0VG9wXSxcblx0XHRcdFx0cmVsOiBudW1iZXJbXSA9IFtdLFxuXHRcdFx0XHRyZXQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuXHRcdFx0Y2MuX2Nvb3JkaW5hdGVzID0gY29vcmRzO1xuXG5cdFx0XHRpZiAoKChjYy51c2VCdXR0b24gJiBPcHRzLlVzZUJ1dHRvbi5VU0VSSUdIVCkgIT09IE9wdHMuVXNlQnV0dG9uLlVTRVJJR0hUICYmICgoKFwiYnV0dG9uc1wiIGluIGV2ZW50KSAmJiAoZXZlbnQuYnV0dG9ucyAmIDIpID09PSAyKSB8fCAoKFwid2hpY2hcIiBpbiBldmVudCkgJiYgZXZlbnQud2hpY2ggPT09IDMpIHx8ICgoXCJidXR0b25cIiBpbiBldmVudCkgJiYgZXZlbnQuYnV0dG9uID09PSAyKSkpIHx8ICgoY2MudXNlQnV0dG9uICYgT3B0cy5Vc2VCdXR0b24uVVNFUklHSFQpID09PSBPcHRzLlVzZUJ1dHRvbi5VU0VSSUdIVCAmJiAoY2MudXNlQnV0dG9uICYgT3B0cy5Vc2VCdXR0b24uVVNFQk9USCkgIT09IE9wdHMuVXNlQnV0dG9uLlVTRUJPVEggJiYgKChcImJ1dHRvbnNcIiBpbiBldmVudCkgJiYgKGV2ZW50LmJ1dHRvbnMgJiAyKSAhPT0gMikgJiYgKChcIndoaWNoXCIgaW4gZXZlbnQpICYmIGV2ZW50LndoaWNoICE9PSAzKSAmJiAoKFwiYnV0dG9uXCIgaW4gZXZlbnQpICYmIGV2ZW50LmJ1dHRvbiAhPT0gMikpKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGNjLl9wcmVzc2VkKSB7XG5cdFx0XHRcdGNjLnRyYW5zbGF0ZShldmVudC5tb3ZlbWVudFggKiBjYy50cmFuc1NwZWVkLCBldmVudC5tb3ZlbWVudFkgKiBjYy50cmFuc1NwZWVkKTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yIChsZXQgYnV0dCBvZiBjYy53Z2V0cykge1xuXHRcdFx0XHRidXR0LmVuYWJsZWQgJiYgYnV0dC5faXNPbihyZWwgPSBjb29yZHMubWFwKChjOiBudW1iZXIsIGlkeDogbnVtYmVyKSA9PiAoYyAtIGNjLnRyYW5zW2lkeF0pIC8gY2Muc2NsW2lkeF0pKSAmJiAhYnV0dC5wc3RhdGUgJiYgKGJ1dHQucHN0YXRlID0gdHJ1ZSwgcmV0ID0gYnV0dC5mb2N1cyhyZWwpKTtcblx0XHRcdFx0aWYgKHJldCkgYnJlYWs7XG5cdFx0XHR9XG5cdFx0fSAvL2RyYWdQQ1xuXG5cdFx0cHJpdmF0ZSBzdGF0aWMgZHJhZ01vYmlsZU1vdmUoZXZlbnQ6IFRvdWNoRXZlbnQsIGNjOiBDb250cm9sbGFibGVDYW52YXMpOiB2b2lkIHtcblx0XHRcdGZ1bmN0aW9uIGNoZWNrKGFycjogbnVtYmVyW10sIGN1cnI6IG51bWJlcltdKTogYm9vbGVhbiB7XG5cdFx0XHRcdGlmIChhcnIuZXZlcnkoKGFyOiBudW1iZXIsIGlkeDogbnVtYmVyKSA9PiBNYXRoLmFicyhhciAtIGN1cnJbaWR4XSkgPj0gY2MudG91Y2hTZW5zaXRpdml0eSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9IC8vY2hlY2tcblx0XHRcdGZ1bmN0aW9uIGFycmF5bmdlKHRsaXM6IFRvdWNoTGlzdCk6IG51bWJlcltdW10ge1xuXHRcdFx0XHRyZXR1cm4gW1t0bGlzWzBdLmNsaWVudFggLSBjYy50YXJnZXQub2Zmc2V0TGVmdCwgdGxpc1swXS5jbGllbnRZIC0gY2MudGFyZ2V0Lm9mZnNldFRvcF0sIFt0bGlzWzFdLmNsaWVudFggLSBjYy50YXJnZXQub2Zmc2V0TGVmdCwgdGxpc1sxXS5jbGllbnRZIC0gY2MudGFyZ2V0Lm9mZnNldFRvcF1dO1xuXHRcdFx0fSAvL2FycmF5bmdlXG5cdFx0XHRmdW5jdGlvbiBldmVyeSh0OiBudW1iZXJbXVtdLCBudDogbnVtYmVyW11bXSwgYWxsOiBib29sZWFuID0gZmFsc2UsIG9uY2U6IGJvb2xlYW4gPSBmYWxzZSk6IGJvb2xlYW4ge1xuXHRcdFx0XHRsZXQgb3V0ID0gZmFsc2U7XG5cdFx0XHRcdGlmIChhbGwgJiYgY2hlY2sodFswXSwgbnRbMF0pICYmIGNoZWNrKHRbMV0sIG50WzFdKSkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGFsbCkge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoY2hlY2sodFswXSwgbnRbMF0pKSB7XG5cdFx0XHRcdFx0b3V0ID0gb25jZSB8fCAhb3V0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChjaGVjayh0WzFdLCBudFsxXSkpIHtcblx0XHRcdFx0XHRvdXQgPSBvbmNlIHx8ICFvdXQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIG91dDtcblx0XHRcdH0gLy9ldmVyeVxuXHRcdFx0ZnVuY3Rpb24gaW5oKG9uZTogYm9vbGVhbiA9IGZhbHNlKTogdm9pZCB7XG5cdFx0XHRcdGNjLl90b3VjaGVzWzBdID0gW2V2ZW50LnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WCAtIGNjLnRhcmdldC5vZmZzZXRMZWZ0LCBldmVudC50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFkgLSBjYy50YXJnZXQub2Zmc2V0VG9wXTtcblx0XHRcdFx0aWYgKCFvbmUpIGNjLl90b3VjaGVzWzFdID0gW2V2ZW50LnRhcmdldFRvdWNoZXNbMV0uY2xpZW50WCAtIGNjLnRhcmdldC5vZmZzZXRMZWZ0LCBldmVudC50YXJnZXRUb3VjaGVzWzFdLmNsaWVudFkgLSBjYy50YXJnZXQub2Zmc2V0VG9wXTtcblx0XHRcdH0gLy9pbmhcblxuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0bGV0IGNvb3JkczogbnVtYmVyW10gPSBbZXZlbnQudGFyZ2V0VG91Y2hlc1tldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCAtIDFdLmNsaWVudFggLSBjYy50YXJnZXQub2Zmc2V0TGVmdCwgZXZlbnQudGFyZ2V0VG91Y2hlc1tldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCAtIDFdLmNsaWVudFkgLSBjYy50YXJnZXQub2Zmc2V0VG9wXTtcblxuXHRcdFx0aWYgKGNjLmRyYWdFbmFibGVkICYmIGNjLl90b3VjaGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRsZXQgY3A6IG51bWJlcltdID0gQXJyYXkuZnJvbShjYy50cmFucyksXG5cdFx0XHRcdFx0ZGlzOiBudW1iZXI7XG5cdFx0XHRcdGNjLnRyYW5zbGF0ZSguLi5bY29vcmRzWzBdIC0gY2MuX2Nvb3JkaW5hdGVzWzBdLCBjb29yZHNbMV0gLSBjYy5fY29vcmRpbmF0ZXNbMV1dLm1hcCgodjogbnVtYmVyKSA9PiB2ICogY2MudHJhbnNTcGVlZCkpO1xuXHRcdFx0XHRkaXMgPSBkaXN0KFtjcFswXSwgY2MudHJhbnNbMF1dLCBbY3BbMV0sIGNjLnRyYW5zWzFdXSk7XG5cdFx0XHRcdGlmIChkaXMgPiBjYy50b3VjaFNlbnNpdGl2aXR5KSBjYy5fY2xrdGltZSA9IDA7XG5cdFx0XHRcdGluaCh0cnVlKTtcblx0XHRcdH0gZWxzZSBpZiAoY2MucGluY2hFbmFibGVkICYmIGNjLl90b3VjaGVzLmxlbmd0aCA9PT0gMiAmJiBldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCA9PT0gMiAmJiBldmVyeShhcnJheW5nZShldmVudC50YXJnZXRUb3VjaGVzKSwgY2MuX3RvdWNoZXMsIGZhbHNlLCB0cnVlKSkge1xuXHRcdFx0XHRpZiAoKGNjLnNjYWxlTW9kZSAmIE9wdHMuU2NhbGVNb2RlLkZSRUVTQ0FMRSkgPT09IE9wdHMuU2NhbGVNb2RlLkZSRUVTQ0FMRSkge1xuXHRcdFx0XHRcdGxldCBpbmlkaXN0OiBudW1iZXJbXSA9IFtNYXRoLmFicyhjYy5fdG91Y2hlc1tldmVudC50YXJnZXRUb3VjaGVzWzBdLmlkZW50aWZpZXJdWzBdIC0gY2MuX3RvdWNoZXNbZXZlbnQudGFyZ2V0VG91Y2hlc1sxXS5pZGVudGlmaWVyXVswXSksIE1hdGguYWJzKGNjLl90b3VjaGVzW2V2ZW50LnRhcmdldFRvdWNoZXNbMF0uaWRlbnRpZmllcl1bMV0gLSBjYy5fdG91Y2hlc1tldmVudC50YXJnZXRUb3VjaGVzWzFdLmlkZW50aWZpZXJdWzFdKV0sXG5cdFx0XHRcdFx0XHRkaXM6IG51bWJlcltdID0gW01hdGguYWJzKGV2ZW50LnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WCAtIGV2ZW50LnRhcmdldFRvdWNoZXNbMV0uY2xpZW50WCAtIDIgKiBjYy50YXJnZXQub2Zmc2V0TGVmdCksIE1hdGguYWJzKGV2ZW50LnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WSAtIGV2ZW50LnRhcmdldFRvdWNoZXNbMV0uY2xpZW50WSAtIDIgKiBjYy50YXJnZXQub2Zmc2V0VG9wKV0sXG5cdFx0XHRcdFx0XHRpdG91Y2hlczogbnVtYmVyW10gPSBbY2MuX3RvdWNoZXNbZXZlbnQudGFyZ2V0VG91Y2hlc1swXS5pZGVudGlmaWVyXVswXSArIGNjLl90b3VjaGVzW2V2ZW50LnRhcmdldFRvdWNoZXNbMV0uaWRlbnRpZmllcl1bMF0sIGNjLl90b3VjaGVzW2V2ZW50LnRhcmdldFRvdWNoZXNbMF0uaWRlbnRpZmllcl1bMV0gKyBjYy5fdG91Y2hlc1tldmVudC50YXJnZXRUb3VjaGVzWzFdLmlkZW50aWZpZXJdWzFdXS5tYXAoKGk6IG51bWJlciwgaWR4OiBudW1iZXIpID0+IGkgLyAyIC0gY2MudHJhbnNbaWR4XSksXG5cdFx0XHRcdFx0XHRkOiBudW1iZXJbXSA9IFtkaXNbMF0gLyBpbmlkaXN0WzBdLCBkaXNbMV0gLyBpbmlkaXN0WzFdXS5tYXAoKHY6IG51bWJlcikgPT4gdiAqIGNjLnNjbFNwZWVkKSxcblx0XHRcdFx0XHRcdG50b3VjaGVzOiBudW1iZXJbXSA9IGl0b3VjaGVzLm1hcCgoaTogbnVtYmVyLCBpZHg6IG51bWJlcikgPT4gaSAqICgxIC0gZFtpZHhdKSk7XG5cblx0XHRcdFx0XHRpZiAoY2MuX3pvb21DaGFuZ2VkWzBdKSBjYy50cmFuc2xhdGUobnRvdWNoZXNbMF0pO1xuXHRcdFx0XHRcdGlmIChjYy5fem9vbUNoYW5nZWRbMV0pIGNjLnRyYW5zbGF0ZShudG91Y2hlc1sxXSk7XG5cdFx0XHRcdFx0Y2Muc2NhbGUoZFswXSwgZFsxXSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly9AdHMtaWdub3JlXG5cdFx0XHRcdFx0bGV0IGluaWRpc3Q6IG51bWJlciA9IGRpc3QoW2NjLl90b3VjaGVzW2V2ZW50LnRhcmdldFRvdWNoZXNbMF0uaWRlbnRpZmllcl1bMF0sIGNjLl90b3VjaGVzW2V2ZW50LnRhcmdldFRvdWNoZXNbMV0uaWRlbnRpZmllcl1bMF1dLCBbY2MuX3RvdWNoZXNbZXZlbnQudGFyZ2V0VG91Y2hlc1swXS5pZGVudGlmaWVyXVsxXSwgY2MuX3RvdWNoZXNbZXZlbnQudGFyZ2V0VG91Y2hlc1sxXS5pZGVudGlmaWVyXVsxXV0pLFxuXHRcdFx0XHRcdFx0ZGlzOiBudW1iZXIgPSBkaXN0KFtldmVudC50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFggLSBjYy50YXJnZXQub2Zmc2V0TGVmdCwgZXZlbnQudGFyZ2V0VG91Y2hlc1sxXS5jbGllbnRYIC0gY2MudGFyZ2V0Lm9mZnNldExlZnRdLCBbZXZlbnQudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRZIC0gY2MudGFyZ2V0Lm9mZnNldFRvcCwgZXZlbnQudGFyZ2V0VG91Y2hlc1sxXS5jbGllbnRZIC0gY2MudGFyZ2V0Lm9mZnNldFRvcF0pLFxuXHRcdFx0XHRcdFx0aXRvdWNoZXM6IG51bWJlcltdID0gW2NjLl90b3VjaGVzW2V2ZW50LnRhcmdldFRvdWNoZXNbMF0uaWRlbnRpZmllcl1bMF0gKyBjYy5fdG91Y2hlc1tldmVudC50YXJnZXRUb3VjaGVzWzFdLmlkZW50aWZpZXJdWzBdLCBjYy5fdG91Y2hlc1tldmVudC50YXJnZXRUb3VjaGVzWzBdLmlkZW50aWZpZXJdWzFdICsgY2MuX3RvdWNoZXNbZXZlbnQudGFyZ2V0VG91Y2hlc1sxXS5pZGVudGlmaWVyXVsxXV0ubWFwKChpOiBudW1iZXIsIGlkeDogbnVtYmVyKSA9PiBpIC8gMiAtIGNjLnRyYW5zW2lkeF0pLFxuXHRcdFx0XHRcdFx0ZDogbnVtYmVyID0gY2Muc2NsU3BlZWQgKiBkaXMgLyBpbmlkaXN0LFxuXHRcdFx0XHRcdFx0bnRvdWNoZXM6IG51bWJlcltdID0gaXRvdWNoZXMubWFwKChpOiBudW1iZXIpID0+IGkgKiAoMSAtIGQpKTtcblxuXHRcdFx0XHRcdGNjLnNjYWxlKGQpO1xuXHRcdFx0XHRcdGlmIChjYy5fem9vbUNoYW5nZWQuZXZlcnkoKHptOiBib29sZWFuKTogYm9vbGVhbiA9PiB6bSkpICBjYy50cmFuc2xhdGUoLi4ubnRvdWNoZXMpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGluaCgpO1xuXHRcdFx0fVxuXG5cdFx0XHRjYy5fY29vcmRpbmF0ZXMgPSBjb29yZHM7XG5cdFx0fSAvL2RyYWdNb2JpbGVNb3ZlXG5cdFx0cHJpdmF0ZSBzdGF0aWMgZHJhZ01vYmlsZVN0YXJ0KGV2ZW50OiBUb3VjaEV2ZW50LCBjYzogQ29udHJvbGxhYmxlQ2FudmFzLCBjdXN0OiBib29sZWFuID0gZmFsc2UpOiB2b2lkIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdGlmICghY3VzdCkge1xuXHRcdFx0XHRsZXQgY29vcmRzOiBudW1iZXJbXSxcblx0XHRcdFx0XHRzb3J0ZWQgPSBBcnJheS5mcm9tKGNjLndnZXRzLmVudHJpZXMoKSkubWFwKChzOiBDYW52YXNCdXR0b25bXSkgPT4gc1sxXSkuc29ydCgoYTogQ2FudmFzQnV0dG9uLCBiOiBDYW52YXNCdXR0b24pID0+IGIuX2lkIC0gYS5faWQpLFxuXHRcdFx0XHRcdHJldDogYm9vbGVhbiA9IGZhbHNlO1xuXG5cdFx0XHRcdEFycmF5LmZyb20oZXZlbnQuY2hhbmdlZFRvdWNoZXMpLmZvckVhY2goKHQ6IFRvdWNoKSA9PiBjYy5fdG91Y2hlc1t0LmlkZW50aWZpZXJdID0gW3QuY2xpZW50WCAtIGNjLnRhcmdldC5vZmZzZXRMZWZ0LCB0LmNsaWVudFkgLSBjYy50YXJnZXQub2Zmc2V0VG9wXSk7XG5cblx0XHRcdFx0Zm9yIChsZXQgdG91Y2ggb2YgZXZlbnQuY2hhbmdlZFRvdWNoZXMpIHtcblx0XHRcdFx0XHRjb29yZHMgPSBbKHRvdWNoLmNsaWVudFggLSBjYy50YXJnZXQub2Zmc2V0TGVmdCAtIGNjLnRyYW5zWzBdKSAvIGNjLnNjbFswXSwgKHRvdWNoLmNsaWVudFkgLSBjYy50YXJnZXQub2Zmc2V0VG9wIC0gY2MudHJhbnNbMV0pIC8gY2Muc2NsWzFdXTtcblxuXHRcdFx0XHRcdGZvciAobGV0IGJ1dHQgb2Ygc29ydGVkKSB7XG5cdFx0XHRcdFx0XHRidXR0LmVuYWJsZWQgJiYgYnV0dC5faXNPbihjb29yZHMpICYmICFidXR0LnBzdGF0ZSAmJiAoYnV0dC5wc3RhdGUgPSB0cnVlLCByZXQgPSBidXR0LmZvY3VzKGNvb3JkcykpO1xuXHRcdFx0XHRcdFx0aWYgKHJldCkgYnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjYy5fdG91Y2hlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0Y2MuX2Nsa3RpbWUgPSBEYXRlLm5vdygpO1xuXHRcdFx0XHRjYy5fY29vcmRpbmF0ZXMgPSBjYy5fdG91Y2hlc1tjYy5fdG91Y2hlcy5sZW5ndGggLSAxXTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNjLl9jbGt0aW1lID0gMDtcblx0XHRcdH1cblxuXHRcdFx0Y2MuX3ByZXNzZWQgPSB0cnVlO1xuXHRcdH0gLy9kcmFnTW9iaWxlU3RhcnRcblx0XHRwcml2YXRlIHN0YXRpYyBkcmFnTW9iaWxlRW5kKGV2ZW50OiBUb3VjaEV2ZW50LCBjYzogQ29udHJvbGxhYmxlQ2FudmFzKTogdm9pZCB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRsZXQgY29vcmRzOiBudW1iZXJbXSxcblx0XHRcdFx0c29ydGVkID0gQXJyYXkuZnJvbShjYy53Z2V0cy5lbnRyaWVzKCkpLm1hcCgoczogQ2FudmFzQnV0dG9uW10pID0+IHNbMV0pLnNvcnQoKGE6IENhbnZhc0J1dHRvbiwgYjogQ2FudmFzQnV0dG9uKSA9PiBiLl9pZCAtIGEuX2lkKSxcblx0XHRcdFx0cmV0OiBib29sZWFuID0gZmFsc2U7XG5cblx0XHRcdGZvciAobGV0IHRvdWNoIG9mIGV2ZW50LmNoYW5nZWRUb3VjaGVzKSB7XG5cdFx0XHRcdGNvb3JkcyA9IFsodG91Y2guY2xpZW50WCAtIGNjLnRhcmdldC5vZmZzZXRMZWZ0IC0gY2MudHJhbnNbMF0pIC8gY2Muc2NsWzBdLCAodG91Y2guY2xpZW50WSAtIGNjLnRhcmdldC5vZmZzZXRUb3AgLSBjYy50cmFuc1sxXSkgLyBjYy5zY2xbMV1dO1xuXG5cdFx0XHRcdGZvciAobGV0IGJ1dHQgb2Ygc29ydGVkKSB7XG5cdFx0XHRcdFx0YnV0dC5lbmFibGVkICYmIGJ1dHQuX2lzT24oY29vcmRzKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoY2MuX3RvdWNoZXMubGVuZ3RoID09PSAxICYmIERhdGUubm93KCkgLSBjYy5fY2xrdGltZSA8PSBjYy5jbGlja1NlbnNpdGl2aXR5KSB7XG5cdFx0XHRcdGZvciAobGV0IGJ1dHQgb2Ygc29ydGVkKSB7XG5cdFx0XHRcdFx0YnV0dC5lbmFibGVkICYmIGJ1dHQuX2lzT24oY29vcmRzKSAmJiAocmV0ID0gYnV0dC5jbGljayhjb29yZHMpKTtcblx0XHRcdFx0XHRpZiAocmV0KSBicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNjLl9jbGt0aW1lID0gMDtcblx0XHRcdH1cblxuXHRcdFx0QXJyYXkuZnJvbShldmVudC5jaGFuZ2VkVG91Y2hlcykuZm9yRWFjaCgodDogVG91Y2gpID0+IHtcblx0XHRcdFx0Y2MuX3RvdWNoZXMuc3BsaWNlKHQuaWRlbnRpZmllciwgMSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKGNjLl90b3VjaGVzKS5sZW5ndGggPT0gMSkge1xuXHRcdFx0XHRDb250cm9sbGFibGVDYW52YXMuZHJhZ01vYmlsZVN0YXJ0KGV2ZW50LCBjYywgdHJ1ZSk7XG5cdFx0XHR9XG5cblx0XHRcdGNjLl9wcmVzc2VkID0gISFjYy5fdG91Y2hlcy5sZW5ndGg7XG5cdFx0fSAvL2RyYWdNb2JpbGVFbmRcblxuXHRcdHByaXZhdGUgc3RhdGljIHdoZWVsKGV2ZW50OiBXaGVlbEV2ZW50LCBjYzogQ29udHJvbGxhYmxlQ2FudmFzKTogdm9pZCB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0bGV0IGQ6IG51bWJlciA9IDEgLSBjYy5zY2xTcGVlZCAqIENvbnRyb2xsYWJsZUNhbnZhcy5maXhEZWx0YShldmVudC5kZWx0YU1vZGUsIGV2ZW50LmRlbHRhWSkgLyBjYy5taW4sXG5cdFx0XHRcdGNvb3JkczogbnVtYmVyW10gPSBbZXZlbnQuY2xpZW50WCAtIGNjLnRhcmdldC5vZmZzZXRMZWZ0IC0gY2MudHJhbnNbMF0sIGV2ZW50LmNsaWVudFkgLSBjYy50YXJnZXQub2Zmc2V0VG9wIC0gY2MudHJhbnNbMV1dO1xuXHRcdFx0Y2Muc2NhbGUoZCk7XG5cdFx0XHRpZiAoY2MuX3pvb21DaGFuZ2VkLmV2ZXJ5KCh6bTogYm9vbGVhbik6IGJvb2xlYW4gPT4gem0pKSBjYy50cmFuc2xhdGUoLi4uY29vcmRzLm1hcCgoYzogbnVtYmVyKSA9PiBjICogKDEgLSBkKSkpO1xuXHRcdH0gLy93aGVlbFxuXG5cdFx0cHJpdmF0ZSBzdGF0aWMgY2xpY2tQQyhldmVudDogTW91c2VFdmVudCwgY2M6IENvbnRyb2xsYWJsZUNhbnZhcyk6IHZvaWQge1xuXHRcdFx0bGV0IGNvb3JkczogbnVtYmVyW10gPSBbKGV2ZW50LmNsaWVudFggLSBjYy50YXJnZXQub2Zmc2V0TGVmdCAtIGNjLnRyYW5zWzBdKSAvIGNjLnNjbFswXSwgKGV2ZW50LmNsaWVudFkgLSBjYy50YXJnZXQub2Zmc2V0VG9wIC0gY2MudHJhbnNbMV0pIC8gY2Muc2NsWzFdXSxcblx0XHRcdFx0c29ydGVkID0gQXJyYXkuZnJvbShjYy53Z2V0cy5lbnRyaWVzKCkpLm1hcCgoczogQ2FudmFzQnV0dG9uW10pID0+IHNbMV0pLnNvcnQoKGE6IENhbnZhc0J1dHRvbiwgYjogQ2FudmFzQnV0dG9uKSA9PiBiLl9pZCAtIGEuX2lkKSxcblx0XHRcdFx0cmV0OiBib29sZWFuID0gZmFsc2U7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGJ1dHQgb2Ygc29ydGVkKSB7XG5cdFx0XHRcdGJ1dHQuZW5hYmxlZCAmJiBidXR0Ll9pc09uKGNvb3JkcykgJiYgKHJldCA9IGJ1dHQuY2xpY2soY29vcmRzKSk7XG5cdFx0XHRcdGlmIChyZXQpIGJyZWFrO1xuXHRcdFx0fVxuXHRcdH0gLy9jbGlja1BDXG5cdFx0XG5cdFx0XG5cdFx0cHJpdmF0ZSBzdGF0aWMgZ2V0IGlzTW9iaWxlKCk6IGJvb2xlYW4ge1xuXHRcdFx0aWYgKG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0FuZHJvaWQvaSkgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvd2ViT1MvaSlcblx0XHRcdFx0fHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBob25lL2kpIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL2lQYWQvaSlcblx0XHRcdFx0fHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBvZC9pKSB8fCBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9CbGFja0JlcnJ5L2kpIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL1dpbmRvd3MgUGhvbmUvaSlcblx0XHRcdCkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9IC8vaXNNb2JpbGVcblx0XHRcblx0XHRwcml2YXRlIHN0YXRpYyBnZXQgbGluZVRvUGl4KCk6IG51bWJlciB7XG5cdFx0XHRsZXQgcjogbnVtYmVyLFxuXHRcdFx0XHRpZnJhbWU6IEhUTUxJRnJhbWVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcblx0XHRcdGlmcmFtZS5zcmMgPSAnIyc7XG5cdFx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGlmcmFtZSk7XG5cdFx0XHRsZXQgaXdpbjogV2luZG93ID0gaWZyYW1lLmNvbnRlbnRXaW5kb3csXG5cdFx0XHRcdGlkb2M6IERvY3VtZW50ID0gaXdpbi5kb2N1bWVudDtcblx0XHRcdGlkb2Mub3BlbigpO1xuXHRcdFx0aWRvYy53cml0ZSgnPCFET0NUWVBFIGh0bWw+PGh0bWw+PGhlYWQ+PC9oZWFkPjxib2R5PjxwPmE8L3A+PC9ib2R5PjwvaHRtbD4nKTtcblx0XHRcdGlkb2MuY2xvc2UoKTtcblx0XHRcdGxldCBzcGFuOiBIVE1MRWxlbWVudCA9IDxIVE1MRWxlbWVudD5pZG9jLmJvZHkuZmlyc3RFbGVtZW50Q2hpbGQ7XG5cdFx0XHRyID0gc3Bhbi5vZmZzZXRIZWlnaHQ7XG5cdFx0XHRkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGlmcmFtZSk7XG5cdFx0XHRyZXR1cm4gcjtcblx0XHR9IC8vbGluZVRvUGl4XG5cdFx0XG5cdFx0cHJpdmF0ZSBzdGF0aWMgZml4RGVsdGEobW9kZTogbnVtYmVyLCBkZWx0YVk6IG51bWJlcik6IG51bWJlciB7XG5cdFx0XHRpZiAobW9kZSA9PT0gMSkge1xuXHRcdFx0XHRyZXR1cm4gQ29udHJvbGxhYmxlQ2FudmFzLl9saW5lcGl4ICogZGVsdGFZO1xuXHRcdFx0fSBlbHNlIGlmIChtb2RlID09PSAyKSB7XG5cdFx0XHRcdHJldHVybiB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gZGVsdGFZO1xuXHRcdFx0fVxuXHRcdH0gLy9maXhEZWx0YVxuXHR9IC8vQ29udHJvbGxhYmxlQ2FudmFzXG5cblx0LyoqXG5cdCAqIEEgd2lkZ2V0LW1ha2luZyBjbGFzcyBmb3IgY2FudmFzXG5cdCAqIEBtZW1iZXJvZiBDb250cm9sbGFibGVDYW52YXNcblx0ICogQHByb3Age251bWJlcn0geCAtIHggY29vcmRpbmF0ZVxuXHQgKiBAcHJvcCB7bnVtYmVyfSB5IC0geSBjb29yZGluYXRlXG5cdCAqIEBwcm9wIHtudW1iZXJ9IGR4IC0gd2lkdGhcblx0ICogQHByb3Age251bWJlcn0gZHkgLSBoZWlnaHRcblx0ICogQHByb3Age251bWJlcn0gaW5kZXggLSBlcXVpdmFsZW50IHRvIENTUyB6LWluZGV4XG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQ2FudmFzQnV0dG9uIGltcGxlbWVudHMgT3B0cy5DYW52YXNCdXR0b25PcHRpb25zIHtcblx0XHR4OiBudW1iZXIgPSAwO1xuXHRcdHk6IG51bWJlciA9IDA7XG5cdFx0ZHg6IG51bWJlciA9IDA7XG5cdFx0ZHk6IG51bWJlciA9IDA7XG5cdFx0aW5kZXg6IG51bWJlciA9IC0xO1xuXHRcdHBhcmVudDogQ29udHJvbGxhYmxlQ2FudmFzO1xuXHRcdF9pZDogbnVtYmVyO1xuXHRcdGVuYWJsZWQ6IGJvb2xlYW4gPSB0cnVlO1xuXHRcdHBzdGF0ZTogYm9vbGVhbiA9IGZhbHNlO1xuXHRcdHBvc2l0aW9uOiBudW1iZXIgPSAyO1xuXG5cdFx0c3RhdGljIHNlbnNpdGl2aXR5OiBudW1iZXIgPSAuMztcblx0XHRwcml2YXRlIHN0YXRpYyBfaWRjbnRyOiBudW1iZXIgPSAwO1xuXHRcdC8qKlxuXHRcdCAqIERlZmF1bHQgb3B0aW9ucyBmb3IgQ2FudmFzQnV0dG9uXG5cdFx0ICogQHJlYWRvbmx5XG5cdFx0ICogQHN0YXRpY1xuXHRcdCAqL1xuXHRcdHN0YXRpYyBkZWZhdWx0T3B0czogT3B0cy5DYW52YXNCdXR0b25PcHRpb25zID0ge1xuXHRcdFx0eDogMCxcblx0XHRcdHk6IDAsXG5cdFx0XHRkeDogMCxcblx0XHRcdGR5OiAwLFxuXHRcdFx0aW5kZXg6IC0xLFxuXHRcdFx0cHN0YXRlOiBmYWxzZSxcblx0XHRcdGVuYWJsZWQ6IHRydWUsXG5cdFx0XHRwb3NpdGlvbjogMixcblx0XHRcdHBhcmVudDogbmV3IENvbnRyb2xsYWJsZUNhbnZhc1xuXHRcdH07XG5cblx0XHRjb25zdHJ1Y3RvcihvcHRzOiBPcHRzLkNhbnZhc0J1dHRvbk9wdGlvbnMgPSBDYW52YXNCdXR0b24uZGVmYXVsdE9wdHMpIHsgIC8vRE9VQkxFQ0xJQ0ssIExPTkdDTElDSywgRFJBRywgLi4uIFVTRVItSU1QTEVNRU5URUQoPylcblx0XHRcdGluaGVyaXQob3B0cywgQ2FudmFzQnV0dG9uLmRlZmF1bHRPcHRzKTtcblxuXHRcdFx0aWYgKFtvcHRzLngsIG9wdHMueSwgb3B0cy5keCwgb3B0cy5keSwgb3B0cy5wb3NpdGlvbiwgb3B0cy5pbmRleF0uc29tZSgobnVtOiBhbnkpID0+IGlzTmFOKG51bSkgfHwgbnVtID09PSAnJykpIHtcblx0XHRcdFx0dGhyb3cgRXJyb3JzLkVOT1ROVU07XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMueCA9IG9wdHMueCAqIDE7XG5cdFx0XHR0aGlzLnkgPSBvcHRzLnkgKiAxO1xuXHRcdFx0dGhpcy5keCA9IG9wdHMuZHggKiAxO1xuXHRcdFx0dGhpcy5keSA9IG9wdHMuZHkgKiAxO1xuXHRcdFx0dGhpcy5wb3NpdGlvbiA9IG9wdHMucG9zaXRpb24gfCAwO1xuXHRcdFx0dGhpcy5pbmRleCA9IG9wdHMuaW5kZXggfCAwO1xuXHRcdFx0dGhpcy5lbmFibGVkID0gISFvcHRzLmVuYWJsZWQ7XG5cdFx0XHR0aGlzLl9pZCA9IENhbnZhc0J1dHRvbi5faWRjbnRyKys7XG5cdFx0fSAvL2N0b3JcblxuXHRcdC8vQE92ZXJyaWRlXG5cdFx0LyoqXG5cdFx0ICogQ2hlY2tzIGlmIGJ1dHRvbiB3YXMgZXhpdGVkIGFuZCBkZWNpZGVzIHdoZXRoZXIgdG8gcHJvcGFnYXRlXG5cdFx0ICogQHBhcmFtIGFueVxuXHRcdCAqL1xuXHRcdGJsdXIoLi4uYW55OiBhbnlbXSk6IGJvb2xlYW4ge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSAvL2JsdXJcblx0XHQvL0BPdmVycmlkZVxuXHRcdC8qKlxuXHRcdCAqIENoZWNrcyBpZiBidXR0b24gd2FzIGVudGVyZWQgYW5kIGRlY2lkZXMgd2hldGhlciB0byBwcm9wYWdhdGVcblx0XHQgKiBAcGFyYW0gYW55XG5cdFx0ICovXG5cdFx0Zm9jdXMoLi4uYW55OiBhbnlbXSk6IGJvb2xlYW4ge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gLy9mb2N1c1xuXHRcdC8vQE92ZXJyaWRlXG5cdFx0LyoqXG5cdFx0ICogQ2hlY2tzIGlmIGJ1dHRvbiB3YXMgY2xpY2tlZCBhbmQgZGVjaWRlcyB3aGV0aGVyIHRvIHByb3BhZ2F0ZVxuXHRcdCAqIEBwYXJhbSBhbnlcblx0XHQgKi9cblx0XHRjbGljayguLi5hbnk6IGFueVtdKTogYm9vbGVhbiB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IC8vY2xpY2tcblxuXHRcdC8qKlxuXHRcdCAqIENoZWNrcyBpZiBwb2ludGVyIGlzIGFib3ZlIHRoZSB3aWRnZXRcblx0XHQgKiBAcGFyYW0ge251bWJlcltdfSByZWxhdGl2ZUNvb3Jkc1xuXHRcdCAqIEBtZXRob2Rcblx0XHQgKi9cblx0XHRfaXNPbihyZWxhdGl2ZUNvb3JkczogbnVtYmVyW10pOiBib29sZWFuIHtcblx0XHRcdGxldCB4OiBudW1iZXIgPSAodGhpcy5wb3NpdGlvbiAmIE9wdHMuUG9zaXRpb24uRklYRUQpID09PSBPcHRzLlBvc2l0aW9uLkZJWEVEID8gdGhpcy54IC0gdGhpcy5wYXJlbnQudHJhbnNbMF0gOiB0aGlzLngsXG5cdFx0XHRcdHk6IG51bWJlciA9ICh0aGlzLnBvc2l0aW9uICYgT3B0cy5Qb3NpdGlvbi5GSVhFRCkgPT09IE9wdHMuUG9zaXRpb24uRklYRUQgPyB0aGlzLnkgLSB0aGlzLnBhcmVudC50cmFuc1sxXSA6IHRoaXMueSxcblx0XHRcdFx0ZHg6IG51bWJlciA9ICh0aGlzLnBvc2l0aW9uICYgT3B0cy5Qb3NpdGlvbi5VTlNDQUxBQkxFKSA9PT0gT3B0cy5Qb3NpdGlvbi5VTlNDQUxBQkxFID8gdGhpcy5keCAqIHRoaXMucGFyZW50LnNjbFswXSA6IHRoaXMuZHgsXG5cdFx0XHRcdGR5OiBudW1iZXIgPSAodGhpcy5wb3NpdGlvbiAmIE9wdHMuUG9zaXRpb24uVU5TQ0FMQUJMRSkgPT09IE9wdHMuUG9zaXRpb24uVU5TQ0FMQUJMRSA/IHRoaXMuZHkgKiB0aGlzLnBhcmVudC5zY2xbMV0gOiB0aGlzLmR5LFxuXHRcdFx0XHRvdXQ6IGJvb2xlYW4gPSBpc1dpdGhpbihbeCwgeSwgZHgsIGR5XSwgW3JlbGF0aXZlQ29vcmRzWzBdLCByZWxhdGl2ZUNvb3Jkc1sxXV0sIENhbnZhc0J1dHRvbi5zZW5zaXRpdml0eSk7XG5cblx0XHRcdGlmICghb3V0ICYmIHRoaXMucHN0YXRlKSB7XG5cdFx0XHRcdHRoaXMuYmx1cihyZWxhdGl2ZUNvb3Jkcyk7XG5cdFx0XHRcdHRoaXMucHN0YXRlID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBvdXQ7XG5cdFx0fSAvL19pc09uXG5cdH0gLy9DYW52YXNCdXR0b25cblxuXHRDb250cm9sbGFibGVDYW52YXMuQ2FudmFzQnV0dG9uID0gQ2FudmFzQnV0dG9uO1xuXG5cdC8qKlxuXHQgKiBBIGNsYXNzIG9mZmVyaW5nIG1hdGhlbWF0aWNhbCBWZWN0b3IgdXRpbGl0aWVzXG5cdCAqIEBpbm5lclxuXHQgKiBAY2xhc3Ncblx0ICogQHByb3Age251bWJlcltdfSBwcm9wcyAtIHZlY3RvciB2ZXJ0aWNlc1xuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFZlY3RvciB7XG5cdFx0cHJvcHM6IG51bWJlcltdO1xuXG5cdFx0Y29uc3RydWN0b3IocHJvcHM6IG51bWJlcltdID0gWyBdKSB7XG5cdFx0XHR0aGlzLnByb3BzID0gQXJyYXkuZnJvbShwcm9wcy5tYXAoTnVtYmVyKSk7XG5cdFx0fSAvL2N0b3JcblxuXHRcdC8qKlxuXHRcdCAqIEFkZCBhIHZlY3RvciBvciBudW1iZXIgdG8gY3VycmVudCB2ZWN0b3Jcblx0XHQgKiBAbWV0aG9kXG5cdFx0ICogQHBhcmFtIHtWZWN0b3J8bnVtYmVyfSB0YXJnIC0gdGFyZ2V0XG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IHN1YiAtIFNldCB0byBgLTFgIHRvIHN1YnN0cmFjdCBpbnN0ZWFkXG5cdFx0ICogQHJldHVybnMgYHRoaXNgIGZvciBtZXRob2QgY2hhaW5pbmdcblx0XHQgKi9cblx0XHRhZGQodGFyZzogVmVjdG9yIHwgbnVtYmVyLCBzdWI6IG51bWJlciA9IDEpOiBUaGlzVHlwZTxWZWN0b3I+IHtcblx0XHRcdGlmICh0YXJnIGluc3RhbmNlb2YgVmVjdG9yKSB7XG5cdFx0XHRcdHRoaXMucHJvcHMuZm9yRWFjaCgocHJvcDogbnVtYmVyLCBpZHg6IG51bWJlcikgPT4ge1xuXHRcdFx0XHRcdHRoaXMucHJvcHNbaWR4XSArPSBzdWIgKiB0YXJnW2lkeF07XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5wcm9wcy5mb3JFYWNoKChwcm9wOiBudW1iZXIsIGlkeDogbnVtYmVyKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5wcm9wc1tpZHhdICs9IHN1YiAqIHRhcmc7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSAvL2FkZFxuXHRcdC8qKlxuXHRcdCAqIE11bHRpcGx5IGEgdmVjdG9yIG9yIG51bWJlciB0byBjdXJyZW50IHZlY3RvclxuXHRcdCAqIEBtZXRob2Rcblx0XHQgKiBAcGFyYW0ge1ZlY3RvcnxudW1iZXJ9IHRhcmcgLSB0YXJnZXRcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gZGl2IC0gU2V0IHRvIGAtMWAgdG8gZGl2aWRlIGluc3RlYWRcblx0XHQgKiBAcmV0dXJucyBgdGhpc2AgZm9yIG1ldGhvZCBjaGFpbmluZ1xuXHRcdCAqL1xuXHRcdG11bHQodGFyZzogVmVjdG9yIHwgbnVtYmVyLCBkaXY6IG51bWJlciA9IDEpOiBUaGlzVHlwZTxWZWN0b3I+IHtcblx0XHRcdGlmICh0YXJnIGluc3RhbmNlb2YgVmVjdG9yKSB7XG5cdFx0XHRcdHRoaXMucHJvcHMuZm9yRWFjaCgocHJvcDogbnVtYmVyLCBpZHg6IG51bWJlcikgPT4ge1xuXHRcdFx0XHRcdHRoaXMucHJvcHNbaWR4XSAqPSBNYXRoLnBvdyh0YXJnW2lkeF0sIGRpdik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5wcm9wcy5mb3JFYWNoKChwcm9wOiBudW1iZXIsIGlkeDogbnVtYmVyKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5wcm9wc1tpZHhdICo9IE1hdGgucG93KHRhcmcsIGRpdik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSAvL211bHRcblx0XHQvKipcblx0XHQgKiBEb3QgcHJvZHVjdCBvZiAyIHZlY3RvcnNcblx0XHQgKiBAbWV0aG9kXG5cdFx0ICogQHBhcmFtIHtWZWN0b3J9IHRhcmcgLSB0YXJnZXRcblx0XHQgKiBAcmV0dXJucyBwcm9kdWN0XG5cdFx0ICovXG5cdFx0ZG90KHRhcmc6IFZlY3Rvcik6IG51bWJlciB7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm9wcy5yZWR1Y2UoKGFjYzogbnVtYmVyLCB2YWw6IG51bWJlciwgaWR4OiBudW1iZXIpID0+IGFjYyArIHZhbCAqIHRhcmdbaWR4XSk7XG5cdFx0fSAvL2RvdFxuXHR9IC8vVmVjdG9yXG5cblx0LyoqXG5cdCAqIEBwcm9wIHtIVE1MRWxlbWVudFtdfSByZXNvdXJjZXMgLSBBbGwgSFRNTCByZXNvdXJjZSBlbGVtZW50cyB3aXRoIFwibG9hZFwiIGxpc3RlbmVycyB0aGF0IHdpbGwgYmUgbG9hZGVkLiBsaWtlOiBhdWRpby9pbWdcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBSZXNvdXJjZUxvYWRlciB7XG5cdFx0cmVzb3VyY2VzOiBIVE1MRWxlbWVudFtdID0gWyBdO1xuXHRcdF9sb2FkY250cjogbnVtYmVyID0gMDtcblxuXHRcdGNvbnN0cnVjdG9yKHJlc291cmNlczogSFRNTEVsZW1lbnRbXSwgb25sb2FkPzogKHJlcz86IEhUTUxFbGVtZW50LCBsb2FkPzogbnVtYmVyKSA9PiB2b2lkLCBhdXRvYmluZDogYm9vbGVhbiA9IGZhbHNlKSB7XG5cdFx0XHR0aGlzLnJlc291cmNlcyA9IEFycmF5LmZyb20ocmVzb3VyY2VzKTtcblx0XHRcdHRoaXMubG9hZCA9IG9ubG9hZCB8fCB0aGlzLmxvYWQ7XG5cdFx0XHRpZiAoYXV0b2JpbmQpIHRoaXMuYmluZCh0aGlzLmxvYWQpO1xuXHRcdH0gLy9jdG9yXG5cblx0XHQvKipcblx0XHQgKiBCaW5kIGxvYWQgZXZlbnRzIGFuZCBhd2FpdCBsb2FkZW5kXG5cdFx0ICogQHBhcmFtIHtGdW5jdGlvbn0gb25sb2FkPyAtIGNvZGUgdG8gZXhlY3V0ZSBvbmNlIGxvYWRlZFxuXHRcdCAqL1xuXHRcdGJpbmQob25sb2FkOiAocmVzPzogSFRNTEVsZW1lbnQsIGxvYWQ/OiBudW1iZXIpID0+IHZvaWQpOiB2b2lkIHtcblx0XHRcdGlmIChvbmxvYWQpIHRoaXMubG9hZCA9IG9ubG9hZDtcblx0XHRcdHRoaXMucmVzb3VyY2VzLmZvckVhY2goKHJlczogSFRNTEVsZW1lbnQpID0+IHtcblx0XHRcdFx0cmVzLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsICgpOiB2b2lkID0+IHtcblx0XHRcdFx0XHRpZiAoKyt0aGlzLl9sb2FkY250ciA9PT0gdGhpcy5yZXNvdXJjZXMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHR0aGlzLmxvYWQocmVzLCB0aGlzLl9sb2FkY250cik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0gLy9iaW5kXG5cdFx0Ly9AT3ZlcnJpZGVcblx0XHRsb2FkKHJlcz86IEhUTUxFbGVtZW50LCBsb2FkPzogbnVtYmVyKTogdm9pZCB7IH0gLy9sb2FkXG5cblx0XHQvKipcblx0XHQgKiBMb2FkIGltYWdlcyBieSBVUkxzXG5cdFx0ICogQG1ldGhvZFxuXHRcdCAqIEBzdGF0aWNcblx0XHQgKiBAcGFyYW0ge3N0cmluZ1tdfSB1cmxpc3QgLSBsaXN0IG9mIHVybHNcblx0XHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvbmxvYWQgLSBjYWxsYmFja1xuXHRcdCAqIEBwYXJhbSB7Ym9vbGVhbn0gYXV0b2JpbmQ9dHJ1ZSAtIGF1dG8gYmluZFxuXHRcdCAqIEByZXR1cm5zIHtSZXNvdXJjZUxvYWRlcn0gdGhlIGxvYWRlclxuXHRcdCAqL1xuXHRcdHN0YXRpYyBpbWFnZXModXJsaXN0OiBzdHJpbmdbXSwgb25sb2FkPzogKHJlcz86IEhUTUxFbGVtZW50LCBsb2FkPzogbnVtYmVyKSA9PiB2b2lkLCBhdXRvYmluZDogYm9vbGVhbiA9IHRydWUpOiBSZXNvdXJjZUxvYWRlciB7XG5cdFx0XHRsZXQgaW1nbGlzdDogSFRNTEltYWdlRWxlbWVudFtdID0gWyBdO1xuXG5cdFx0XHRmb3IgKGxldCB1cmwgb2YgdXJsaXN0KSB7XG5cdFx0XHRcdGxldCBpbWcgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdFx0aW1nLnNyYyA9IHVybDtcblx0XHRcdFx0aW1nbGlzdC5wdXNoKGltZyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBuZXcgUmVzb3VyY2VMb2FkZXIoaW1nbGlzdCwgb25sb2FkLCBhdXRvYmluZCk7XG5cdFx0fSAvL2ltYWdlc1xuXHRcdC8qKlxuXHRcdCAqIExvYWQgYXVkaW8gYnkgVVJMc1xuXHRcdCAqIEBtZXRob2Rcblx0XHQgKiBAc3RhdGljXG5cdFx0ICogQHBhcmFtIHtzdHJpbmdbXX0gdXJsaXN0IC0gbGlzdCBvZiB1cmxzXG5cdFx0ICogQHBhcmFtIHtGdW5jdGlvbn0gb25sb2FkIC0gY2FsbGJhY2tcblx0XHQgKiBAcGFyYW0ge2Jvb2xlYW59IGF1dG9iaW5kPXRydWUgLSBhdXRvIGJpbmRcblx0XHQgKiBAcmV0dXJucyB7UmVzb3VyY2VMb2FkZXJ9IHRoZSBsb2FkZXJcblx0XHQgKi9cblx0XHRzdGF0aWMgYXVkaW9zKHVybGlzdDogc3RyaW5nW10sIG9ubG9hZD86IChyZXM/OiBIVE1MRWxlbWVudCwgbG9hZD86IG51bWJlcikgPT4gdm9pZCwgYXV0b2JpbmQ6IGJvb2xlYW4gPSB0cnVlKTogUmVzb3VyY2VMb2FkZXIge1xuXHRcdFx0bGV0IGF1ZGlvbGlzdDogSFRNTEF1ZGlvRWxlbWVudFtdID0gWyBdO1xuXG5cdFx0XHRmb3IgKGxldCB1cmwgb2YgdXJsaXN0KSB7XG5cdFx0XHRcdGxldCBhdWRpbyA9IG5ldyBBdWRpbyh1cmwpO1xuXHRcdFx0XHRhdWRpby5sb2FkKCk7XG5cdFx0XHRcdGF1ZGlvbGlzdC5wdXNoKGF1ZGlvKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG5ldyBSZXNvdXJjZUxvYWRlcihhdWRpb2xpc3QsIG9ubG9hZCwgYXV0b2JpbmQpO1xuXHRcdH0gLy9hdWRpb3Ncblx0fSAvL1Jlc291cmNlTG9hZGVyXG5cbn0gLy9DYW52YXNDb250cm9sc1xuXG5leHBvcnQgZGVmYXVsdCBDYW52YXNDb250cm9scy5Db250cm9sbGFibGVDYW52YXM7XG4iXX0=