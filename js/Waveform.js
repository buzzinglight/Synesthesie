function Waveform(stage) {
	var waveformWidth  = canvasContext.width * 2/3;
	
	//Background oscilloscope
	var marges = 0;;//(canvasContext.width - waveformWidth)/2;
	this.oscilloscope = new PIXI.extras.TilingSprite(new PIXI.Texture.fromImage('img/quadrillage.jpg'), waveformWidth, canvasContext.waveformHeight);
	this.oscilloscope.tileScale = new PIXI.Point(dpiScale, dpiScale);
	this.oscilloscope.interactive = true;
	this.oscilloscope.x = marges;
	this.oscilloscope.y = canvasContext.height - canvasContext.waveformHeight;
	this.oscilloscope.interactive = true;
	this.oscilloscope.visible = false;
	stage.addChild(this.oscilloscope);
	
	//Waveform
	this.waveform = new PIXI.Graphics();
	this.waveform.sprite = new PIXI.Sprite();
	this.oscilloscope.addChild(this.waveform.sprite);
	this.waveform.shadow = new PIXI.filters.BloomFilter()
	this.waveform.shadow.blur = this.waveform.shadow.blurX = this.waveform.shadow.blurY = 2;
	if(!isMobile)
		this.oscilloscope.filters = [this.waveform.shadow];
	
	//Wavetable
	this.wavetableDetune = 0.01;
	this.wavetable = new Float32Array(floor(audioContextData.samplerate/50));
	for(var i = 0 ; i < this.wavetable.length ; i++) {
		var t = i / (this.wavetable.length-0);
		this.wavetable[i] = t * 2 - 1;
		if((i > 0) && (i % 200 == 0))
			this.wavetable[i] += (0.5-abs(t-0.5));
		if((i > 0) && (i % 200 == 100))
			this.wavetable[i] -= (0.5-abs(t-0.5));
		this.wavetable[i] = constrain(this.wavetable[i], -1, 1);
		//this.wavetable[i] = sin(2*PI*t);
	}
	
	//Événements souris
	this.hasChanged = true;	
}

//Waveforme en temps réel
Waveform.prototype.draw = function() {
	if(this.hasChanged) {
		this.hasChanged = false;
	
		//Style de tracé
		this.waveform.clear();
		this.waveform.lineStyle(2 * dpi, "0x73B540", 1);
	
		//Dessin du trait
		this.waveform.moveTo(0, (this.oscilloscope.height/2) - (this.oscilloscope.height/2) * this.wavetable[0]);
		for(var i = 0 ; i < this.wavetable.length ; i++)
			this.waveform.lineTo(map(i, 0, this.wavetable.length, 0, this.oscilloscope.width), (this.oscilloscope.height/2) - (this.oscilloscope.height/2) * this.wavetable[i]);
	
		this.waveform.sprite.texture = this.waveform.generateTexture();
		this.waveform.sprite.y = this.waveform.getBounds().y
	}
	if(audioContextData.volume == 0)
		this.waveform.sprite.alpha = 0.5;
	else
		this.waveform.sprite.alpha = abs(cos(map(audioContextData.note, audioContextData.notesRange.low, audioContextData.notesRange.high, 0.25, 7) * timeline.frame/60 * 2 * PI)) * 0.5 + 0.5;
}

//Événements souris
Waveform.prototype.mouseMove = function(e, down) {
	//Traitement de l'événement
	mouseMoveGeneric(e, down, {x: -this.oscilloscope.x, y: -this.oscilloscope.y});
	
	//Display
	this.update(
		constrain(floor(map(canvasContext.    mousePos.x, 0, this.oscilloscope.width, 0, this.wavetable.length-1)), 0, this.wavetable.length-1),
		constrain(      map(canvasContext.    mousePos.y,    this.oscilloscope.height,0, -1,1), -1,1),
		constrain(floor(map(canvasContext.lastMousePos.x, 0, this.oscilloscope.width, 0, this.wavetable.length-1)), 0, this.wavetable.length-1),
		constrain(      map(canvasContext.lastMousePos.y,    this.oscilloscope.height,0, -1,1), -1,1)
	);

	//Boucle
	canvasContext.lastMousePos = canvasContext.mousePos;
	this.hasChanged = true;
}

//Mise à jour de la forme d'onde
Waveform.prototype.update = function(indexStart, valueStart, indexEnd, valueEnd, wavetable, traceSynth) {
	if(indexStart == -1)	indexStart = 0;
	if(indexEnd == -1)		indexEnd = this.wavetable.length;
	if(indexStart > indexEnd) {
		indexStartTmp = indexStart; valueStartTmp = valueStart;
		indexStart = indexEnd;
		valueStart = valueEnd;
		indexEnd = indexStartTmp;
		valueEnd = valueStartTmp;
	}
	else if(indexStart == indexEnd)
		indexEnd = min(this.wavetable.length-1, indexStart + 1);

	if(wavetable == undefined) {
		for(var index = indexStart ; index < indexEnd ; index++)
			this.wavetable[index] = map(index, indexStart, indexEnd, valueStart, valueEnd);
		wavetable = this.wavetable;
	}
	
	if(traceSynth == undefined) {
		$.each(dessin.traces, function(index, trace) {
			if(trace.synth) {
				$.each(trace.synth.oscillators, function(detuneIndex, oscillator) {
					var wavetableData = oscillator.buffer.getChannelData(0);
					for(var index = indexStart ; index < indexEnd ; index++)
						wavetableData[index] = wavetable[index];
				});
			}
		});
	}
	else {
		$.each(traceSynth.oscillators, function(detuneIndex, oscillator) {
			if(oscillator.buffer) {
				var wavetableData = oscillator.buffer.getChannelData(0);
				for(var index = indexStart ; index < indexEnd ; index++)
					wavetableData[index] = wavetable[index];
			}
		});
	}
}


