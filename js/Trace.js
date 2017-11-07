function Trace(tool) {
	$(".toolButton[action=clear]").removeClass("disabled");
	$(".toolButton[action=share]").removeClass("disabled");
	dessin.unselectall();
	
	//Ajoute la trace aux traces
	this.id = dessin.traces.length;
	dessin.traces.push(this);
	
	//Variables
	this.points         = [];
	this.tool           = tool,
	this.isInCache      = false;
	this.icons          = new PIXI.Container();
	this.playButton     = new PIXI.Sprite.fromImage('img/tracePlay_'     + ((isTouch)?('large'):('small')) + '.png');
	this.playingButton  = new PIXI.Sprite.fromImage('img/tracePlaying_'  + ((isTouch)?('large'):('small')) + '.png');
	this.selectedButton = new PIXI.Sprite.fromImage('img/traceSelected_' + ((isTouch)?('large'):('small')) + '.png');
	this.time           = -1;
	this.isSelected     = false;

	//Points
	this.playingMode    = "tDrawing";
	this.timestamp      = moment();
	this.distance       = 0;
	
	//Synthèse
	if(this.tool.sound)
		this.synth = new TraceSynth(this.id, this.tool);
	
	//Paramètres
	this.speedFactor   = 0.5;
	this.volumeFactor  = 1;
	this.panningFactor = 0.9;
	
	//Retina
	this.playButton.scale     = new PIXI.Point(dpiScale, dpiScale);
	this.playingButton.scale  = new PIXI.Point(dpiScale, dpiScale);
	this.selectedButton.scale = new PIXI.Point(dpiScale, dpiScale);
	
	//Bouton
	this.playButton.interactive    = true;
	this.playingButton.interactive = true;
	var thiss = this;
	this.playButton.on(events.start, function(e) {
		e.stopPropagation();
		
		if(dessin.selectedTraces.indexOf(thiss) >= 0)	thiss.select(false);
		else											thiss.select();
	});
	this.playingButton.on(events.start, function(e) {
		e.stopPropagation();
		
		if(dessin.selectedTraces.indexOf(thiss) >= 0)	thiss.select(false);
		else											thiss.select();
	});
	
	//Mode de dessin
	if(this.tool.drawing.brushMode != null) {
		//Sprite
		this.brush = PIXI.Sprite.fromImage("brushes/" + this.tool.drawing.brushMode)
		this.pointIndexDraw = 0;
		//Sortie
		this.renderTexture = PIXI.RenderTexture.create(canvasContext.width, canvasContext.height);
		this.graphicsCache = new PIXI.Sprite(this.renderTexture);
	}
	else {
		this.graphics = new PIXI.Graphics();
		this.graphicsCache  = new PIXI.Sprite();
	}
	
	//Ajoute l'UI
	this.icons.addChild(this.playButton);
	this.icons.addChild(this.playingButton);
	this.icons.addChild(this.selectedButton);
	this.playButton    .visible = false;
	this.playingButton .visible = false;
	this.selectedButton.visible = false;
	if(this.graphics)
		dessin.drawing.addChild(this.graphics);
	dessin.drawing.addChild(this.graphicsCache);
	dessin.drawing.addChild(this.icons);
	
	this.restart();
}

Trace.prototype.remove = function() {
	this.select(false);
	dessin.drawing.removeChild(this.graphics);
	dessin.drawing.removeChild(this.graphicsCache);
	dessin.drawing.removeChild(this.icons);
	if(this.synth)
		this.synth.createOscillators(false);

	if(dessin.selectedTraces.indexOf(this) >= 0)
		dessin.selectedTraces.splice(dessin.selectedTraces.indexOf(this), 1);
	if(dessin.traces.indexOf(this) >= 0)
		dessin.traces.splice(dessin.traces.indexOf(this), 1);
}

//Sélection
Trace.prototype.select = function(select) {
	if(select == undefined)	select = true;
	
	if((select) && (!this.isSelected)) {
		this.isSelected = true;
		
		/*
		if(this.graphicsCache)
			this.graphicsCache.tint = 0xFFFF00;
		*/
		
		//Désélectionne les courbes
		$.each(dessin.selectedTraces, function(index, trace) {
			trace.select(false);
		});

		//Courbes éditées
		dessin.selectedTraces = [this];
		this.selectedButton.visible = true;
	
		//Fixe le range
		setRangeExp($("#traceSpeedRange input[type=range]"), this.speedFactor);
		setRangeExp($("#traceVolumeRange input[type=range]"), this.volumeFactor);
		setRangeExp($("#tracePanningRange input[type=range]"), this.panningFactor);
		$("#tracePlayingMode").prop('checked', (this.playingMode == "tDrawing"));
		
		if(((this.graphicsCache.x + this.graphicsCache.width) > (canvasContext.width * 0.75)) && ((this.graphicsCache.y + this.graphicsCache.height) > (canvasContext.height * 0.5)))
			$("#inspecteur").removeClass("right");
		else
			$("#inspecteur").addClass("right");

		$("#inspecteur").show();
		$("#inspecteur .title").html("Courbe #" + this.id);
	}
	else if((!select) && (this.isSelected)) {
		this.isSelected = false;
		this.parameterChanged();
		/*
		if(this.graphicsCache)
			this.graphicsCache.tint = 0xFFFFFF;
		*/
		
		dessin.selectedTraces = [];
		this.selectedButton.visible = false;
		$("#inspecteur").hide();
	}
}

Trace.prototype.parameterChanged = function() {
	if(this.graphicsCache) {
		this.graphicsCache.alpha = this.playButton.alpha = this.playingButton.alpha = this.volumeFactor;
		if(this.graphicsCache.alphaMax)
			this.graphicsCache.alpha *= this.graphicsCache.alphaMax;
	}
}


//Met le dessin en cache pour optimisations
Trace.prototype.cache = function() {
	if(this.points.length) {
		if(this.graphics) {
			var bounds = this.graphics.getBounds();
			this.graphicsCache.texture = this.graphics.generateTexture(stage, 1/dpiScale);
			dessin.drawing.removeChild(this.graphics);
		}
		else {
			var bounds = {x: dessin.papier.width, y: dessin.papier.height, max: {x: 0, y: 0}};
			for(pointIndex = 0 ; pointIndex < this.points.length ; pointIndex++) {
				bounds.x = min(bounds.x, this.points[pointIndex].x);
				bounds.y = min(bounds.y, this.points[pointIndex].y);
				bounds.max.x = max(bounds.max.x, this.points[pointIndex].x);
				bounds.max.y = max(bounds.max.y, this.points[pointIndex].y);
			}
			//var renderTexture = new PIXI.RenderTexture();
			var factor = 100 * dpi;
			bounds.x = constrain(bounds.x - factor, 0, dessin.papier.width);
			bounds.y = constrain(bounds.y - factor, 0, dessin.papier.height);
			bounds.max.x = constrain(bounds.max.x + factor, 0, dessin.papier.width-2);
			bounds.max.y = constrain(bounds.max.y + factor, 0, dessin.papier.height-2);
			this.graphicsCache.texture = new PIXI.Texture(this.graphicsCache.texture, new PIXI.Rectangle(bounds.x, bounds.y, bounds.max.x - bounds.x, bounds.max.y - bounds.y));
		}
		this.graphicsCache.x = bounds.x;
		this.graphicsCache.y = bounds.y;
	}
	else {
		this.remove();
	}
	this.isInCache = true;
}

//Ajoute un point
Trace.prototype.addPoint = function(x, y, z, t) {
	//Paramètres par défault
	if(z == undefined)	z = 0;
	if(t == undefined)	t = moment().diff(this.timestamp) / 1000.;

	//Point
	var point = {x: x, y: y, z: z, tDrawing: t, tDistance: 0};
	if(this.lastPoint) {
		this.distance += dist(this.lastPoint.x, this.lastPoint.y, this.lastPoint.z, point.x, point.y, point.z);
		point.tDistance = this.distance;
	}

	//Ajoute le point
	this.lastPoint = point;
	this.points.push(point);
}
Trace.prototype.getDuration = function(raw) {
	if(raw)		return this.points[this.points.length-1].tDrawing;
	else		return this.points[this.points.length-1].tDrawing / this.speedFactor;
}
Trace.prototype.getDistance = function(raw) {
	return this.points[this.points.length-1].tDistance;
}


//Redémarre une trace
Trace.prototype.restart = function() {
	this.time = -1;
	this.playButton   .visible = true;
	this.playingButton.visible = false;
	this.setVolume(0);
	if(this.points.length)
		this.setFrequencies(this.points[0].x, this.points[0].y, this.points[0].z, true);
}
Trace.prototype.play = function() {
	if(this.points.length) {
		this.time = 0;
		this.playButton   .visible = false;
		this.playingButton.visible = true;
	
		this.setFrequencies(this.points[0].x, this.points[0].y, this.points[0].z, true);
		this.setVolume(1);
	}
}
Trace.prototype.stop = function() {
	this.playButton   .visible = false;
	this.playingButton.visible = false;
	this.setVolume(0);
}


//Met à jour une trace
Trace.prototype.update = function(deltaTime) {
	if(this.points.length > 0) {
		if(this.time < 0) {
			this.icons.x = this.points[0].x - this.playButton.width/2;
			this.icons.y = this.points[0].y - this.playButton.height/2;
		}
		else {
			this.time += deltaTime * this.speedFactor;
			var pointIndex = 0;
			for(pointIndex = 0 ; pointIndex < (this.points.length-1) ; pointIndex++)
				if(this.points[pointIndex][this.playingMode] >= this.time)
					break;
			if(pointIndex == this.points.length-1) {
				this.stop();
				if((this.synth) && (this.synth.oscillators.length == 0))
					this.restart();
				else if(!this.synth)
					this.restart();
			}
			else if(pointIndex > 0) {
				var x = map(min(this.time, this.points[this.points.length-1][this.playingMode]), this.points[pointIndex-1][this.playingMode], this.points[pointIndex][this.playingMode], this.points[pointIndex-1].x, this.points[pointIndex].x);
				var y = map(min(this.time, this.points[this.points.length-1][this.playingMode]), this.points[pointIndex-1][this.playingMode], this.points[pointIndex][this.playingMode], this.points[pointIndex-1].y, this.points[pointIndex].y);
				this.icons.x = x - this.playButton.width/2;
				this.icons.y = y - this.playButton.height/2;

				this.setFrequencies(x, y, 0, true);
			}
		}
	}
	
	//Sélection
	if((this.isSelected) && (this.graphicsCache)) {
		this.graphicsCache.alpha = map(cos(7 * timeline.tContinu), -1,1, this.playButton.alpha*0.5,this.playButton.alpha);
		if(this.graphicsCache.alphaMax)
			this.graphicsCache.alpha *= this.graphicsCache.alphaMax;
	}
}

//Dessine en temps réel
Trace.prototype.draw = function() {
	if(this.tool.drawing.brushMode == null) {
		//Clear
		this.graphics.clear();

		//Style de tracé
		this.graphics.lineStyle(this.tool.drawing.width * dpi, "0x" + this.tool.drawing.color, this.tool.drawing.opacity);
	}

	//Dessin du trait
	if(this.points.length) {
		if(this.tool.drawing.brushMode != null) {
			var pointIndexDrawCpy = this.pointIndexDraw;
			for(var pointIndex = pointIndexDrawCpy ; pointIndex < this.points.length ; pointIndex++) {
				if(pointIndex < (this.points.length-1)) {
					var distance = dist(this.points[pointIndex].x, this.points[pointIndex].y, 0, this.points[pointIndex+1].x, this.points[pointIndex+1].y, 0);
					
					//Equation de droite
					for(var t = 0 ; t < 1 ; t += 1/(distance/2)) {
						var pt = {
							x: this.points[pointIndex].x * (1-t) + this.points[pointIndex+1].x * t,
							y: this.points[pointIndex].y * (1-t) + this.points[pointIndex+1].y * t
						};
						//Test
						this.brush.tint = "0x" + this.tool.drawing.color;
						this.graphicsCache.alpha = this.graphicsCache.alphaMax = this.tool.drawing.opacity;
						var factor = 10;// * constrain((distance/100), 0.5, 1.5);
						this.brush.scale = new PIXI.Point(this.tool.drawing.width/factor, this.tool.drawing.width/factor);
						this.brush.x = pt.x - 2*this.brush.scale.x;
						this.brush.y = pt.y - 2*this.brush.scale.y;
						canvasContext.render(this.brush, this.renderTexture, false);
						this.graphicsCache.setTexture(this.renderTexture);
					}
					this.pointIndexDraw = pointIndex;
				}
			}
		}
		else {
			this.graphics.moveTo(this.points[0].x, this.points[0].y);
			for(var pointIndex = 0 ; pointIndex < this.points.length ; pointIndex++) {
				var point = this.points[pointIndex];
				this.graphics.lineTo(point.x, point.y);
				var nearPoint = this.points[pointIndex-5];
				if (nearPoint) {
					this.graphics.moveTo(nearPoint.x, nearPoint.y);
					this.graphics.lineTo(this.points[pointIndex].x, this.points[pointIndex].y);
				}
			}
		}
	}
}

//Trig par la timeline
Trace.prototype.trigged = function(tMin, tMax) {
	if((this.time < 0) && (this.points.length)) {
		var traceTime = this.points[0].x / dessin.papier.width;
		if((tMin < traceTime) && (traceTime <= tMax))
			return true;
	}
	return false;
}

//Map une coordonnées sur une fréquence
Trace.prototype.setFrequencies = function(x, y, z, force) {
	return Trace.setFrequencies(x, y, z, force, this);
}
//Map une coordonnées sur une fréquence
Trace.setFrequencies = function(x, y, z, force, trace) {
	var gen = {};
	gen.x         = constrain(map(x, 0,dessin.papier.width, 0,1), 0,1);
	gen.y         = constrain(map(y, dessin.papier.height,0, 0,1), 0,1);
	gen.panning   = range(gen.x, -1,1);
	gen.playback  = range(gen.y, audioContextData.playbackRange.low, audioContextData.playbackRange.high);
	gen.note      = range(gen.y, audioContextData.notesRange.low, audioContextData.notesRange.high);
	gen.filter    = range(gen.y, audioContextData.filterRange.low, audioContextData.filterRange.high)
	gen.frequency = mtof(gen.note);
	
	if(trace) {
		gen.panning *= trace.panningFactor;
		websocketSend("/" + trace.tool.type + " " + trace.tool.id + " " + trace.id + " " + timeline.t + " " + gen.x + " " + gen.y + " " + gen.panning + " " + gen.note + " " + gen.frequency + " " + trace.volumeFactor);
		if(trace.synth)
			trace.synth.setFrequencies(gen, force);
		else if(trace.tool.type == "lpf")
			audioContext.filter.frequency.value = gen.filter;
	}
	return gen;
}
Trace.prototype.setVolume = function(gain, force) {
	//Volume
	if(this.synth)
		this.synth.setVolume(gain * this.tool.sound.gain * this.volumeFactor, force);
}
