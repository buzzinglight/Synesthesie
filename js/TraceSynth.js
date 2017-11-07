function TraceSynth(id, tool) {
	this.id   = id;
	this.tool = tool;

	//Oscillateurs
	this.oscillatorsFrequencies = [];
	this.oscillators            = [];
	this.oscillatorsGain        = [];
	this.oscillatorsNb          = 0;
	this.gainDest = this.panningDest = 0;
	this.gainDestCoef           = 1;
	this.attackreleaseMin       = 1000;
	
	//Contexte audio présent
	if(audioContext) {
		this.out  = audioContext.createGain();
		this.panner = audioContext.createStereoPanner();
	
		//Sortie
		this.panner.connect(this.out);
		this.out.gain.value = this.gainDest;

		this.outDry = audioContext.createGain();
		this.outWet = audioContext.createGain();
		this.out.connect(this.outDry);
		this.out.connect(this.outWet);
		
		this.outDry.connect(audioContext.filter);
		this.outWet.connect(audioContext.reverb);
		//waveform.update(-1, -1, -1, -1, waveform.wavetable, this);
	}
}

TraceSynth.wavetables = {};
TraceSynth.wavetablesLoaded = false;
TraceSynth.sounds = {};
TraceSynth.soundsLoaded = false;

//Créé les oscillateurs à la demande
TraceSynth.prototype.createOscillators = function(create) {
	//Generation des oscillateurs
	if(create) {
		this.outWet.gain.value = this.tool.sound.reverb;
		this.outDry.gain.value = 1-this.tool.sound.reverb;
		if(this.tool.sound.wavetable) {
			var realCoeffs, imagCoeffs;
			var wavetable = TraceSynth.wavetables[this.tool.sound.wavetable];
			if(wavetable) {
				realCoeffs = new Float32Array(wavetable.real);
				imagCoeffs = new Float32Array(wavetable.imag);
			}
			else {
				realCoeffs = new Float32Array([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
				imagCoeffs = new Float32Array([0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
			}

			var thiss = this;
			$.each(this.tool.sound.oscillators.gain, function(i, oscGain) {
				var wave = audioContext.createPeriodicWave(realCoeffs, imagCoeffs);
				var oscillator = audioContext.createOscillator();
				var gain = audioContext.createGain();
				gain.gain.value = oscGain;
				if(wave)
					oscillator.setPeriodicWave(wave);

				//Connections
				gain.connect(thiss.panner);
				thiss.oscillatorsGain.push(gain);
				oscillator.connect(gain);
				thiss.oscillators.push(oscillator);
				thiss.oscillatorsFrequencies.push(0);
			});
	
			//Démarre les oscillateurs
			$.each(this.oscillators, function(detuneIndex, oscillator) {
				oscillator.start(0);
			});
			
			/*
			if("waveformtable") {
				for(var i = 0 ; i < 2 ; i++) {
					var oscillator = audioContext.createBufferSource();
					oscillator.frequency = audioContextData.samplerate / waveform.wavetable.length;
		
					//Wavetable
					var wavetableBuffer = audioContext.createBuffer(1, waveform.wavetable.length, audioContextData.samplerate);
					oscillator.loop   = true;
					oscillator.buffer = wavetableBuffer;
	
					//Connections
					oscillator.connect(this.panner);
					this.oscillators.push(oscillator);
				}
			}
			*/
		}
		else if(this.tool.sound.wavefile) {
			var buffer = audioContext.createBufferSource();
			buffer.buffer = TraceSynth.sounds[this.tool.sound.wavefile];
			buffer.connect(this.panner);
			buffer.loop = true;

			this.oscillators     = [buffer];
			this.oscillatorsGain = [1];

			//Démarre les sources
			$.each(this.oscillators, function(detuneIndex, oscillator) {
				oscillator.start(0);
			});
		}
	}
	else {
		if(this.tool.sound.wavetable) {
			//Destruction des oscillateurs
			$.each(this.oscillators, function(detuneIndex, oscillator) {
				oscillator.stop();
			});
			this.oscillators     = [];
			this.oscillatorsGain = [];
		}
		else if(this.tool.sound.wavefile) {
			//Destruction des oscillateurs
			$.each(this.oscillators, function(detuneIndex, oscillator) {
				oscillator.stop();
			});
			this.oscillators     = [];
			this.oscillatorsGain = [];
		}
	}
}

//Mise à jour du volume
TraceSynth.prototype.setVolume = function(gain, force) {
	if(audioContext) {
		//Vérifie le cycle de vie des oscillateurs
		if((this.out.gain.value < 0.001) && (this.oscillators.length > 0)) {
			//Destruction des oscillateurs
			this.createOscillators(false);
		}
		else if(((this.gainDest > 0) || (gain > 0)) && (this.oscillators.length == 0)) {
			//Création des oscillateurs
			this.createOscillators(true);
		}

		//Change le volume
		if(gain != undefined) {
			var newGainDest = gain / max((this.oscillators.length + 1)/2, 1);
			if(newGainDest > this.gainDest)			this.gainDestCoef = min(this.tool.sound.attackrelease[0], this.attackreleaseMin); 
			else if(newGainDest < this.gainDest)	this.gainDestCoef = min(this.tool.sound.attackrelease[1], this.attackreleaseMin); 
			this.gainDest = newGainDest;
		}
		if(force == true)
			this.out.gain.value = this.gainDest;
		this.out.gain.value = this.out.gain.value + (this.gainDest - this.out.gain.value) / this.gainDestCoef;
	}

	//Retour d'info
	return {voices: (this.oscillators.length)?([this.id]):([]), nbOsc: this.oscillators.length};
}

//Mise à jour des fréquences
TraceSynth.prototype.setFrequencies = function(gen, force) {
	if(audioContext) {
		var thiss = this;

		//Panning
		if((gen) && (gen.panning != undefined))
			this.panningDest = gen.panning;
		if(force == true)
			this.panner.pan.value = this.panningDest;
		this.panner.pan.value = this.panner.pan.value + (this.panningDest - this.panner.pan.value) / 5;
	
		//Fréquence
		$.each(this.oscillators, function(detuneIndex, oscillator) {
			if(thiss.tool.sound.wavetable) {
				if((gen) && (gen.frequency != undefined))
					thiss.oscillatorsFrequencies[detuneIndex] = (gen.frequency * (1 + thiss.tool.sound.oscillators.detune * detuneIndex));
				if(force == true)
					oscillator.frequency.value = thiss.oscillatorsFrequencies[detuneIndex];
				oscillator.frequency.value = oscillator.frequency.value + ((thiss.oscillatorsFrequencies[detuneIndex] * (1 + thiss.tool.sound.vibrato.intensity * thiss.tool.sound.oscillators.vibrato[detuneIndex] * cos(timeline.tContinu * thiss.tool.sound.vibrato.depth))) - oscillator.frequency.value) / 5;
				/*
				if(oscillator.playbackRate) {
					if(frequency != undefined)
						oscillator.playbackRate.valueDest = (gen.frequency * (1 + thiss.tool.sound.oscillators.detune * detuneIndex)) / oscillator.frequency;
					if(force == true)
						oscillator.playbackRate.value = oscillator.playbackRate.valueDest;
					oscillator.playbackRate.value = oscillator.playbackRate.value + (oscillator.playbackRate.valueDest - oscillator.playbackRate.value) / 5;
				}
				*/
			}
			else if(thiss.tool.sound.wavefile) {
				if((gen) && (gen.playback != undefined))
					thiss.oscillatorsFrequencies[detuneIndex] = gen.playback;
				if(force == true)
					oscillator.playbackRate.value = thiss.oscillatorsFrequencies[detuneIndex];
				oscillator.playbackRate.value = oscillator.playbackRate.value + (thiss.oscillatorsFrequencies[detuneIndex] - oscillator.playbackRate.value) / 5;
			}
		});
	}
}


//Teste le son
TraceSynth.prototype.test = function() {
	if(audioContext) {
		this.attackreleaseMin = 5;
		this.setVolume(this.tool.sound.gain);
		this.setFrequencies({panning: 0, playback: 1, note: 52, frequency: mtof(52)}, true);
		var thiss = this;
		setTimeout(function() {
			thiss.setVolume(0);
		}, 700);
	}
}