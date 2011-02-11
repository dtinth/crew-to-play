/**
 * 
 * Find more about the scrolling function at
 * http://cubiq.org/iscroll
 *
 * Copyright (c) 2010 Matteo Spinelli, http://cubiq.org/
 * Released under MIT license
 * http://cubiq.org/dropbox/mit-license.txt
 * 
 * Version 3.7.1 - Last updated: 2010.10.08
 * With a lot of modifications by Thai. Last updated: 2011.02.11
 * 
 */

(function(){

function Tracker() {
	this.list = [];
}
Tracker.prototype = {
	clear: function() {
		this.list = [];
	},
	prune: function(now) {
		while (this.list.length > 0 && now > this.list[0].time + 100) {
			this.list.shift ();
		}
	},
	track: function(x, y) {
		var now = new Date().getTime();
		this.prune (now);
		this.list.push ({
			x: x,
			y: y,
			time: now
		});
	},
	getVelocity: function() {
		var x = 0, y = 0, v, last, now = new Date().getTime();
		this.prune (now);
		last = this.list.length - 1;
		if (this.list.length >= 2) {
			v = 15 / (this.list[last].time - this.list[0].time);
			return {
				x: (this.list[last].x - this.list[0].x) * v,
				y: (this.list[last].y - this.list[0].y) * v
			};
		}
		return { x: x, y: y };
	}
};

function iScroll (el, options) {
	var that = this, i;
	that.element = typeof el == 'object' ? el : document.getElementById(el);
	that.wrapper = that.element.parentNode;

	that.element.style.webkitTransitionProperty = '-webkit-transform';
	that.element.style.webkitTransitionTimingFunction = 'cubic-bezier(0,0,0.25,1)';
	that.element.style.webkitTransitionDuration = '0';
	that.element.style.webkitTransform = translateOpen + '0,0' + translateClose;
	that.tracker = new Tracker();

	// Default options
	that.options = new iScroll.Options();
	
	// User defined options
	if (typeof options == 'object') {
		for (i in options) {
			that.options[i] = options[i];
		}
	}

	if (that.options.desktopCompatibility) {
		that.options.overflow = 'hidden';
	}
	
	that.onScrollEnd = that.options.onScrollEnd;
	delete that.options.onScrollEnd;
	
	that.wrapper.style.overflow = that.options.overflow;
	
	that.refresh();

	window.addEventListener('onorientationchange' in window ? 'orientationchange' : 'resize', that, false);

	if (isTouch || that.options.desktopCompatibility) {
		that.element.addEventListener(START_EVENT, that, true);
		that.element.addEventListener(START_EVENT, that, false);
		that.element.addEventListener(MOVE_EVENT, that, true);
		that.element.addEventListener(MOVE_EVENT, that, false);
		that.element.addEventListener(END_EVENT, that, true);
		that.element.addEventListener(END_EVENT, that, false);
	}
	
	if (that.options.checkDOMChanges) {
		that.element.addEventListener('DOMSubtreeModified', that, false);
	}
}

iScroll.Options = function() {};

function initDefaultOptions() {
	iScroll.Options.prototype = iScroll.options = {
		bounce: has3d,
		momentum: has3d,
		checkDOMChanges: true,
		checkOnStart: true,
		topOnDOMChanges: false,
		hScrollbar: has3d,
		vScrollbar: has3d,
		fadeScrollbar: isIthing || !isTouch,
		shrinkScrollbar: isIthing || !isTouch,
		desktopCompatibility: false,
		overflow: 'auto',
		snap: false,
		bounceLock: false,
		scrollbarColor: 'rgba(0,0,0,0.5)',
		onScrollEnd: function () {}
	};
}

iScroll.prototype = {

	x: 0,
	y: 0,
	enabled: true,
	scrolling: false,
	isDecelerating: false,

	handleEvent: function (e) {
		var that = this;
		
		switch (e.type) {
			case START_EVENT:
				that.touchStart(e);
				break;
			case MOVE_EVENT:
				that.touchMove(e);
				break;
			case END_EVENT:
				that.touchEnd(e);
				break;
			case 'webkitTransitionEnd':
				that.transitionEnd();
				break;				
			case 'orientationchange':
			case 'resize':
				that.refresh();
				break;
			case 'DOMSubtreeModified':
				that.onDOMModified(e);
				break;
		}
	},
	
	onDOMModified: function (e) {
		var that = this;

		// (Hopefully) execute onDOMModified only once
		if (e.target.parentNode != that.element) {
			return;
		}

		setTimeout(function () { that.refresh(); }, 0);

		if (that.options.topOnDOMChanges && (that.x!=0 || that.y!=0)) {
			that.scrollTo(0,0,'0');
		}
	},

	refresh: function () {
		var that = this,
			resetX = that.x, resetY = that.y,
			snap;
		
		that.scrollWidth = that.wrapper.clientWidth;
		that.scrollHeight = that.wrapper.clientHeight;
		that.scrollerWidth = that.element.scrollWidth;
		that.scrollerHeight = that.element.scrollHeight;
		that.maxScrollX = that.scrollWidth - that.scrollerWidth;
		that.maxScrollY = that.scrollHeight - that.scrollerHeight;
		that.directionX = 0;
		that.directionY = 0;

		if (that.scrollX) {
			if (that.maxScrollX >= 0) {
				resetX = 0;
			} else if (that.x < that.maxScrollX) {
				resetX = that.maxScrollX;
			}
		}
		if (that.scrollY) {
			if (that.maxScrollY >= 0) {
				resetY = 0;
			} else if (that.y < that.maxScrollY) {
				resetY = that.maxScrollY;
			}
		}

		// Snap
		if (that.options.snap) {
			that.maxPageX = -Math.floor(that.maxScrollX/that.scrollWidth);
			that.maxPageY = -Math.floor(that.maxScrollY/that.scrollHeight);

			snap = that.snap(resetX, resetY);
			resetX = snap.x;
			resetY = snap.y;
		}

		if (resetX!=that.x || resetY!=that.y) {
			that.setTransitionTime('0');
			that.setPosition(resetX, resetY, true);
		}
		
		that.scrollX = that.scrollerWidth > that.scrollWidth;
		that.scrollY = !that.options.bounceLock && !that.scrollX || that.scrollerHeight > that.scrollHeight;


		// Update horizontal scrollbar
		if (that.options.hScrollbar && that.scrollX) {
			that.scrollBarX = that.scrollBarX || new scrollbar('horizontal', that.wrapper, that.options.fadeScrollbar, that.options.shrinkScrollbar, that.options.scrollbarColor);
			that.scrollBarX.init(that.scrollWidth, that.scrollerWidth);
		} else if (that.scrollBarX) {
			that.scrollBarX = that.scrollBarX.remove();
		}

		// Update vertical scrollbar
		if (that.options.vScrollbar && that.scrollY && that.scrollerHeight > that.scrollHeight) {
			that.scrollBarY = that.scrollBarY || new scrollbar('vertical', that.wrapper, that.options.fadeScrollbar, that.options.shrinkScrollbar, that.options.scrollbarColor);
			that.scrollBarY.init(that.scrollHeight, that.scrollerHeight);
		} else if (that.scrollBarY) {
			that.scrollBarY = that.scrollBarY.remove();
		}
	},

	setPosition: function (x, y, hideScrollBars) {
		var that = this;
		
		that.x = x;
		that.y = y;

		that.element.style.webkitTransform = translateOpen + that.x + 'px,' + that.y + 'px' + translateClose;

		// Move the scrollbars
		if (!hideScrollBars) {
			if (that.scrollBarX) {
				that.scrollBarX.setPosition(that.x);
			}
			if (that.scrollBarY) {
				that.scrollBarY.setPosition(that.y);
			}
		}
	},

	getIdentifier: function(e) {
		return e.changedTouches[0].identifier;
	},

	pointFromEvent: function(e) {
		if (isTouch) {
			var touches = e.touches;
			e = e.targetTouches[0];
			for (var i = 0; i < touches.length; i ++) {
				if (touches[i].identifier == this.scrollingFingerIdentifier) {
					e = touches[i];
				}
			}
		}
		return { x: e.clientX, y: e.clientY };
	},

	deltaFromPoint: function(point) {
		return { x: point.x - this.position.x, y: point.y - this.position.y };
	},

	setTransitionTime: function(time) {
		var that = this;
		
		time = time || '0';
		that.element.style.webkitTransitionDuration = time;
		
		if (that.scrollBarX) {
			that.scrollBarX.bar.style.webkitTransitionDuration = time;
			that.scrollBarX.wrapper.style.webkitTransitionDuration = has3d && that.options.fadeScrollbar ? '300ms' : '0';
		}
		if (that.scrollBarY) {
			that.scrollBarY.bar.style.webkitTransitionDuration = time;
			that.scrollBarY.wrapper.style.webkitTransitionDuration = has3d && that.options.fadeScrollbar ? '300ms' : '0';
		}
	},

	touchStart: function(e) {
		var that = this;

		if (!that.enabled) {
			return;
		}

		if (e.eventPhase == e.CAPTURING_PHASE) {

			if (that.scrolling) {
				e.preventDefault();
				e.stopPropagation();
				return;
			}

			if (that.options.checkOnStart) {
				that.refresh();
			}

			that.scrolling = true;
			that.scrollingFingerIdentifier = that.getIdentifier(e);
			that.setTransitionTime();

			if (that.isDecelerating) {
				that.stopDecelerationAnimation();
				that.moved = true;
				e.preventDefault();
				e.stopPropagation();
			} else {
				that.moved = false;
			}

			that.tracker.clear();
			that.tracker.track(that.x, that.y);
			that.position = that.pointFromEvent(e);

		} else {

			e.preventDefault();
			e.stopPropagation();
			
		}

	},
	
	touchMove: function(e) {

		if (!this.scrolling) {
			return;
		}

		var that = this,
			position = that.pointFromEvent(e),
			delta = that.deltaFromPoint(position);

		if (e.eventPhase == e.CAPTURING_PHASE) {

			if (that.moved) {
				if (!that.scrollX) { delta.x = 0; } else if (that.x >= 0 || that.x < that.maxScrollX) { delta.x /= 2; }
				if (!that.scrollY) { delta.y = 0; } else if (that.y >= 0 || that.y < that.maxScrollY) { delta.y /= 2; }
				that.setPosition(that.x + delta.x, that.y + delta.y);
				that.tracker.track(that.x, that.y);
				that.position = position;
				e.preventDefault();
				e.stopPropagation();
			}

		} else {

			if (that.moved) {
				e.preventDefault();
				e.stopPropagation();
			} else if ((that.scrollX && Math.abs(delta.x) >= 5) || (that.scrollY && Math.abs(delta.y) >= 5)) {

				that.moved = true;
				that.position = position;

				var touchEvent = document.createEvent("Events");
				touchEvent.initEvent ('touchcancel', true, true);
				touchEvent.touches = [];
				touchEvent.targetTouches = [];
				touchEvent._scroll = true;
				touchEvent._fake = true;
				touchEvent.changedTouches = e.touches;
				for (var i = 0; i < e.targetTouches.length; i ++) {
					e.targetTouches[i].target.dispatchEvent(touchEvent);
				}

				e.preventDefault();
				e.stopPropagation();

			}

		}
	},
	
	touchEnd: function(e) {

		if (!this.scrolling) {
			return;
		}

		if (e.eventPhase == e.CAPTURING_PHASE) {

			var that = this, snap
				point = isTouch ? e.changedTouches[0] : e;

			if (!that.moved) {
				that.resetPosition();

				if (isTouch) {
					// Find the last touched element
					target = point.target;
					while (target.nodeType != 1) {
						target = target.parentNode;
					}

					// Create the fake event
					ev = document.createEvent('MouseEvents');
					ev.initMouseEvent('click', true, true, e.view, 1,
						point.screenX, point.screenY, point.clientX, point.clientY,
						e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
						0, null);
					ev._fake = true;
					target.dispatchEvent(ev);
				}

				return;
			} else if (that.options.snap) {
				that.velocity = that.tracker.getVelocity();
				that.directionX = that.velocity.x == 0 ? 0 : (that.velocity.x > 0 ? -1 : 1);
				that.directionY = that.velocity.y == 0 ? 0 : (that.velocity.y > 0 ? -1 : 1);
				snap = that.snap(that.x, that.y);
				that.scrollTo(snap.x, snap.y, snap.time + 'ms');
			} else {
				that.tracker.track(that.x, that.y);
				that.velocity = that.tracker.getVelocity();
				that.statusX = { bounced: false, position: that.x, min: Math.min(0, that.maxScrollX), max: 0 };
				that.statusY = { bounced: false, position: that.y, min: Math.min(0, that.maxScrollY), max: 0 };
				that.frameNumber = 0;
				that.animationStartTime = new Date().getTime();
				that.isDecelerating = true;
				that.decelerationTimer = setInterval(function() {
					that.decelerate();
				}, 1000 / 60);
			}

		} else {

			e.preventDefault();
			e.stopPropagation();

			this.scrolling = false;

		}

	},
	
	stopDecelerationAnimation: function() {
		var that = this;
		clearTimeout (that.decelerationTimer);
		that.isDecelerating = false;
	},

	decelerate: function() {
		var that = this,
			desiredFrameNumber = Math.ceil((new Date().getTime() - that.animationStartTime) / 60);
		for (that.frameNumber = Math.max(that.frameNumber, desiredFrameNumber - 12); that.frameNumber < desiredFrameNumber; that.frameNumber++) {
			if (!that.decelerationStep(false)) {
				return;
			}
		}
		if (!that.decelerationStep(true)) {
			return;
		}
	},
	getNextVelocity: function(velocity, stat) {
		var pull = 0, that = this,
			position = stat.position,
			minPosition = stat.min,
			maxPosition = stat.max;
		velocity *= 0.95;
		stat.pulling = true;
		if (position < minPosition - 0.5) {
			pull = minPosition - position;
		} else if (position > maxPosition + 0.5) {
			pull = maxPosition - position;
		} else {
			stat.pulling = false;
		}
		if (Math.abs(pull) > 0) {
			if (pull * velocity < 0) {
				velocity += pull * 0.03;
				if (pull * velocity >= 0) {
					stat.bounced = true;
				}
			} else if (stat.bounced) {
				velocity = pull * 0.08;
			} else {
				velocity = (pull > 0 ? Math.max : Math.min)(pull * 0.08, velocity);
			}
		}
		return velocity;
	},
	decelerationStep: function(shouldRender) {
		var that = this, returnValue = true;
		that.velocity.x = that.getNextVelocity(that.velocity.x, that.statusX);
		that.velocity.y = that.getNextVelocity(that.velocity.y, that.statusY);
		that.statusX.position += that.velocity.x;
		that.statusY.position += that.velocity.y;
		if (!that.statusX.pulling && !that.statusY.pulling && Math.abs(that.velocity.x) < 0.2 && Math.abs(that.velocity.y) < 0.2) {
			returnValue = false;
			shouldRender = true;
			that.stopDecelerationAnimation ();
		}
		if (shouldRender) {
			that.setPosition (Math.round(that.statusX.position), Math.round(that.statusY.position), !returnValue);
			if (returnValue == false) {
				that.resetPosition ();
			}
		}
		return returnValue;
	},

	transitionEnd: function () {
		var that = this;
		document.removeEventListener('webkitTransitionEnd', that, false);
		that.resetPosition();
	},

	resetPosition: function () {
		var that = this,
			resetX = that.x,
		 	resetY = that.y;

		if (that.x >= 0) {
			resetX = 0;
		} else if (that.x < that.maxScrollX) {
			resetX = that.maxScrollX;
		}

		if (that.y >= 0 || that.maxScrollY > 0) {
			resetY = 0;
		} else if (that.y < that.maxScrollY) {
			resetY = that.maxScrollY;
		}
		
		if (resetX != that.x || resetY != that.y) {
			that.scrollTo(resetX, resetY);
		} else {
			if (that.moved) {
				that.onScrollEnd();		// Execute custom code on scroll end
				that.moved = false;
			}

			// Hide the scrollbars
			if (that.scrollBarX) {
				that.scrollBarX.hide();
			}
			if (that.scrollBarY) {
				that.scrollBarY.hide();
			}
		}
	},
	
	snap: function (x, y) {
		var that = this, time;

		if (that.directionX > 0) {
			x = Math.floor(x/that.scrollWidth);
		} else if (that.directionX < 0) {
			x = Math.ceil(x/that.scrollWidth);
		} else {
			x = Math.round(x/that.scrollWidth);
		}
		that.pageX = -x;
		x = x * that.scrollWidth;
		if (x > 0) {
			x = that.pageX = 0;
		} else if (x < that.maxScrollX) {
			that.pageX = that.maxPageX;
			x = that.maxScrollX;
		}

		if (that.directionY > 0) {
			y = Math.floor(y/that.scrollHeight);
		} else if (that.directionY < 0) {
			y = Math.ceil(y/that.scrollHeight);
		} else {
			y = Math.round(y/that.scrollHeight);
		}
		that.pageY = -y;
		y = y * that.scrollHeight;
		if (y > 0) {
			y = that.pageY = 0;
		} else if (y < that.maxScrollY) {
			that.pageY = that.maxPageY;
			y = that.maxScrollY;
		}

		// Snap with constant speed (proportional duration)
		time = Math.round(Math.max(
				Math.abs(that.x - x) / that.scrollWidth * 500,
				Math.abs(that.y - y) / that.scrollHeight * 500
			));
			
		return { x: x, y: y, time: time };
	},

	scrollTo: function (destX, destY, runtime) {
		var that = this;

		if (that.x == destX && that.y == destY) {
			that.resetPosition();
			return;
		}

		that.moved = true;
		that.setTransitionTime(runtime || '250ms');
		that.setPosition(destX, destY);

		if (runtime==='0' || runtime=='0s' || runtime=='0ms') {
			that.resetPosition();
		} else {
			document.addEventListener('webkitTransitionEnd', that, false);	// At the end of the transition check if we are still inside of the boundaries
		}
	},
	
	scrollToPage: function (pageX, pageY, runtime) {
		var that = this, snap;

		if (!that.options.snap) {
			that.pageX = -Math.round(that.x / that.scrollWidth);
			that.pageY = -Math.round(that.y / that.scrollHeight);
		}

		if (pageX == 'next') {
			pageX = ++that.pageX;
		} else if (pageX == 'prev') {
			pageX = --that.pageX;
		}

		if (pageY == 'next') {
			pageY = ++that.pageY;
		} else if (pageY == 'prev') {
			pageY = --that.pageY;
		}

		pageX = -pageX*that.scrollWidth;
		pageY = -pageY*that.scrollHeight;

		snap = that.snap(pageX, pageY);
		pageX = snap.x;
		pageY = snap.y;

		that.scrollTo(pageX, pageY, runtime || '500ms');
	},

	scrollToElement: function (el, runtime) {
		el = typeof el == 'object' ? el : this.element.querySelector(el);

		if (!el) {
			return;
		}

		var that = this,
			x = that.scrollX ? -el.offsetLeft : 0,
			y = that.scrollY ? -el.offsetTop : 0;

		if (x >= 0) {
			x = 0;
		} else if (x < that.maxScrollX) {
			x = that.maxScrollX;
		}

		if (y >= 0) {
			y = 0;
		} else if (y < that.maxScrollY) {
			y = that.maxScrollY;
		}

		that.scrollTo(x, y, runtime);
	},

	destroy: function (full) {
		var that = this;

		window.removeEventListener('onorientationchange' in window ? 'orientationchange' : 'resize', that, false);		
		that.element.removeEventListener(START_EVENT, that, false);
		that.element.removeEventListener(MOVE_EVENT, that, false);
		that.element.removeEventListener(END_EVENT, that, false);
		document.removeEventListener('webkitTransitionEnd', that, false);

		if (that.options.checkDOMChanges) {
			that.element.removeEventListener('DOMSubtreeModified', that, false);
		}

		if (that.scrollBarX) {
			that.scrollBarX = that.scrollBarX.remove();
		}

		if (that.scrollBarY) {
			that.scrollBarY = that.scrollBarY.remove();
		}
		
		if (full) {
			that.wrapper.parentNode.removeChild(that.wrapper);
		}
		
		return null;
	}
};

function scrollbar (dir, wrapper, fade, shrink, color) {
	var that = this,
		doc = document;
	
	that.dir = dir;
	that.fade = fade;
	that.shrink = shrink;
	that.uid = ++uid;

	// Create main scrollbar
	that.bar = doc.createElement('div');

	that.bar.style.cssText = 'position:absolute;top:0;left:0;-webkit-transition-timing-function:cubic-bezier(0,0,0.25,1);pointer-events:none;-webkit-transition-duration:0;-webkit-transition-delay:0;-webkit-transition-property:-webkit-transform;z-index:10;background:' + color + ';' +
		'-webkit-transform:' + translateOpen + '0,0' + translateClose + ';' +
		(dir == 'horizontal' ? '-webkit-border-radius:3px 2px;min-width:6px;min-height:5px' : '-webkit-border-radius:2px 3px;min-width:5px;min-height:6px');

	// Create scrollbar wrapper
	that.wrapper = doc.createElement('div');
	that.wrapper.style.cssText = '-webkit-mask:-webkit-canvas(scrollbar' + that.uid + that.dir + ');position:absolute;z-index:10;pointer-events:none;overflow:hidden;opacity:0;-webkit-transition-duration:' + (fade ? '300ms' : '0') + ';-webkit-transition-delay:0;-webkit-transition-property:opacity;' +
		(that.dir == 'horizontal' ? 'bottom:2px;left:2px;right:7px;height:5px' : 'top:2px;right:2px;bottom:7px;width:5px;');

	// Add scrollbar to the DOM
	that.wrapper.appendChild(that.bar);
	wrapper.appendChild(that.wrapper);
}

scrollbar.prototype = {
	init: function (scroll, size) {
		var that = this,
			doc = document,
			pi = Math.PI,
			ctx;

		// Create scrollbar mask
		if (that.dir == 'horizontal') {
			if (that.maxSize != that.wrapper.offsetWidth) {
				that.maxSize = that.wrapper.offsetWidth;
				ctx = doc.getCSSCanvasContext("2d", "scrollbar" + that.uid + that.dir, that.maxSize, 5);
				ctx.fillStyle = "rgb(0,0,0)";
				ctx.beginPath();
				ctx.arc(2.5, 2.5, 2.5, pi/2, -pi/2, false);
				ctx.lineTo(that.maxSize-2.5, 0);
				ctx.arc(that.maxSize-2.5, 2.5, 2.5, -pi/2, pi/2, false);
				ctx.closePath();
				ctx.fill();
			}
		} else {
			if (that.maxSize != that.wrapper.offsetHeight) {
				that.maxSize = that.wrapper.offsetHeight;
				ctx = doc.getCSSCanvasContext("2d", "scrollbar" + that.uid + that.dir, 5, that.maxSize);
				ctx.fillStyle = "rgb(0,0,0)";
				ctx.beginPath();
				ctx.arc(2.5, 2.5, 2.5, pi, 0, false);
				ctx.lineTo(5, that.maxSize-2.5);
				ctx.arc(2.5, that.maxSize-2.5, 2.5, 0, pi, false);
				ctx.closePath();
				ctx.fill();
			}
		}

		that.size = Math.max(Math.round(that.maxSize * that.maxSize / size), 6);
		that.maxScroll = that.maxSize - that.size;
		that.toWrapperProp = that.maxScroll / (scroll - size);
		that.bar.style[that.dir == 'horizontal' ? 'width' : 'height'] = that.size + 'px';
	},
	
	setPosition: function (pos) {
		var that = this;
		
		if (that.wrapper.style.opacity != '1') {
			that.show();
		}

		pos = Math.round(that.toWrapperProp * pos);

		if (pos < 0) {
			pos = that.shrink ? pos + pos*3 : 0;
			if (that.size + pos < 7) {
				pos = -that.size + 6;
			}
		} else if (pos > that.maxScroll) {
			pos = that.shrink ? pos + (pos-that.maxScroll)*3 : that.maxScroll;
			if (that.size + that.maxScroll - pos < 7) {
				pos = that.size + that.maxScroll - 6;
			}
		}

		pos = that.dir == 'horizontal'
			? translateOpen + pos + 'px,0' + translateClose
			: translateOpen + '0,' + pos + 'px' + translateClose;

		that.bar.style.webkitTransform = pos;
	},

	show: function () {
		if (has3d) {
			this.wrapper.style.webkitTransitionDelay = '0';
		}
		this.wrapper.style.opacity = '1';
	},

	hide: function () {
		if (has3d) {
			this.wrapper.style.webkitTransitionDelay = '350ms';
		}
		this.wrapper.style.opacity = '0';
	},
	
	remove: function () {
		this.wrapper.parentNode.removeChild(this.wrapper);
		return null;
	}
};

// Is translate3d compatible?
var has3d = ('WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix()),
	// Device sniffing
	isIthing = (/iphone|ipad/gi).test(navigator.appVersion),
	isTouch = ('ontouchstart' in window),
	// Event sniffing
	START_EVENT = isTouch ? 'touchstart' : 'mousedown',
	MOVE_EVENT = isTouch ? 'touchmove' : 'mousemove',
	END_EVENT = isTouch ? 'touchend' : 'mouseup',
	// Translate3d helper
	translateOpen = 'translate' + (has3d ? '3d(' : '('),
	translateClose = has3d ? ',0)' : ')',
	// Unique ID
	uid = 0;

// Expose iScroll to the world
window.iScroll = iScroll;
initDefaultOptions();
})();
