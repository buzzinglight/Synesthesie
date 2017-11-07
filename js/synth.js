//Contexte audio
function synthInit(init) {
	//Initilisation du moteur audio (au clic, pour Safari)
	if((init != false) && (audioContext == undefined) && (TraceSynth.wavetablesLoaded) && (TraceSynth.soundsLoaded)) {
		console.log("Initialisation du moteur audio");
		
		try {
			window.AudioContext = window.AudioContext||window.webkitAudioContext;
			audioContext = new AudioContext();
		}
		catch(e) {
			alert('Web Audio API is not supported in this browser');
		}
		if(audioContext) {
			//Contextes
			reverbjs.extend(audioContext);
			audioContext.limiter      = audioContext.createDynamicsCompressor();
			audioContext.master       = audioContext.createGain();
			audioContext.analyser     = audioContext.createAnalyser();
			audioContext.filter       = audioContext.createBiquadFilter();
		
			//Réverb
			audioContext.reverb = audioContext.createReverbFromUrl("sounds/impulse.wav", function() {
				audioContext.reverb.connect(audioContext.filter);
			});
	
			//Filtre
			audioContext.filter.type = "lowpass";
			audioContext.filter.frequency.value = 20000;
			audioContext.filter.gain.value = 25;
			audioContext.filter.connect(audioContext.limiter);
	
			//Limiteur		
			audioContext.limiter.threshold.value = 0.0;
			audioContext.limiter.knee     .value = 0.0;
			audioContext.limiter.ratio    .value = 20.0;
			audioContext.limiter.attack   .value = 0.005;
			audioContext.limiter.release  .value = 0.050;
			audioContext.limiter.connect(audioContext.master);
			audioContext.limiter.connect(audioContext.analyser);
	
			//Analyseur
			audioContext.analyser.fftSize = 2048;
			audioContext.analyser.data = new Uint8Array(audioContext.analyser.frequencyBinCount);
	
			//Gains
			audioContext.master.gain.value = 1;
			audioContext.master.connect(audioContext.destination);
			
			//Convertit les sons
			var decodedSound = 0;
			$.each(TraceSynth.sounds, function(soundsAlias, response) {
				audioContext.decodeAudioData(response, function(buffer) {
					TraceSynth.sounds[soundsAlias] = buffer;
				}, function(e) {
					console.log("Une erreur s’est produite.");
					console.log(e);
				});
			});
		}
	}
	else if(!init) {
		console.log("Pré-initialisation du moteur audio");
		
		//Première init au démarrage
		audioContextData = {};
		audioContextData.note       = 0;
		audioContextData.volume     = 0;
		audioContextData.samplerate = 44100;
		audioContextData.notesRange = {
			low:  12*2,
			high: 12*7,
		};
		audioContextData.filterRange = {
			low:  100,
			high: 5000,
		};
		audioContextData.playbackRange = {
			low:  0.5,
			high: 1.5,
		};
		setRangeExp($("#masterRange input[type=range]"), 1);

		//Charge les wavetables
		var wavetablesFiles = ["Bass", "BassAmp360", "BassFuzz", "BassFuzz2", "BassSubDub", "BassSubDub2", "Brass", "BritBlues", "BritBluesDriven", "Buzzy1", "Buzzy2", "Celeste", "ChorusStrings", "Dissonant1", "Dissonant2", "DissonantPiano", "DroppedSaw", "DroppedSquare", "DynaEPBright", "DynaEPMed", "Ethnic33", "Full1", "Full2", "GuitarFuzz", "Harsh", "MklHard", "Noise", "Organ2", "Organ3", "PhonemeAh", "PhonemeBah", "PhonemeEe", "PhonemeO", "PhonemeOoh", "PhonemePopAhhhs", "Piano", "Pulse", "PutneyWavering", "Saw", "Square", "TB303Square", "Throaty", "Triangle", "Trombone", "TwelveOpTines", "TwelveStringGuitar1", "WarmSaw", "WarmSquare", "WarmTriangle", "Wurlitzer", "Wurlitzer2"];
		function wavetablesLoad() {
			if(wavetablesFiles.length) {
				var wavetablesAlias = wavetablesFiles[0];
				var wavetablesFile = "wavetables/" + wavetablesAlias + ".json";
				$("#intro h3").html("Chargement de la forme d’onde " + wavetablesAlias);
				wavetablesFiles.splice(0, 1);
				$.ajax(wavetablesFile, {
					type: "GET",
					dataType: "JSON"
				})
				.done(function(wavetable) {
					TraceSynth.wavetables[wavetablesAlias] = wavetable;
					$("#syntheseChoice").append("<option>" + wavetablesAlias + "</option>");
				})
				.fail(function(e) {
					console.log("Une erreur s’est produite.");
					console.log(e);
				})
				.always(function(e) {
					wavetablesLoad();
				});
			}
			else {
				TraceSynth.wavetablesLoaded = true;
				checkLoading();
			}
		}
		wavetablesLoad();
	
		//Extrait la liste des sons à charger
		$.ajax("tools.json", {
			type: "GET",
			dataType: "JSON"
		})
		.done(function(retour) {
			Dessin.palette = retour;
			var soundsFiles = [];
			$.each(retour.tools, function(i, group) {
				$.each(group.tools, function(i, tool) {
					if((tool.sound) && (tool.sound.wavefile))
						soundsFiles.push(tool.sound.wavefile);
				});
			});
			
			//Charge les sons
			function soundsLoad() {
				if(soundsFiles.length) {
					var soundsAlias = soundsFiles[0];
					var soundsAliasFile = "sounds/" + soundsAlias + ".m4a";
					$("#intro h3").html("Chargement de l’échantillon " + soundsAlias);
					soundsFiles.splice(0, 1);
					var request = new XMLHttpRequest();
					request.open('GET', soundsAliasFile, true);
					request.responseType = 'arraybuffer';
					request.onload = function() {
						TraceSynth.sounds[soundsAlias] = request.response;
						soundsLoad();
					}
					request.onerror = function() {
						soundsLoad();
					}
					request.send();
				}
				else {
					TraceSynth.soundsLoaded = true;
					checkLoading();
				}
			}
			soundsLoad();
		})
		.fail(function(e) 	{
			console.log("Une erreur s’est produite.");
			console.log(e);
		})
		.always(function(e) {
		});
	}
}
function checkLoading() {
	if((TraceSynth.soundsLoaded) && (TraceSynth.wavetablesLoaded)) {
		$("#intro").on(events.end, function(e) {
			synthInit(true);
			$("#intro").fadeOut(500);
		});
		$("#intro h3").html("Expérience agréable<br/>au casque");
		if(isMobile)	$("#intro h2").html("Appuyez pour commencer l’expérience");
		else 			$("#intro h2").html("Cliquez pour commencer l’expérience");
		$("#intro img").css({opacity: 1});		
	}
}

//Utilitaires
var midiNotes = {"0": "C-1", "1": "C#-1", "2": "D-1", "3": "D#-1", "4": "E-1", "5": "F-1", "6": "F#-1", "7": "G-1", "8": "G#-1", "9": "A-1", "10": "A#-1", "11": "B-1", "12": "C0", "13": "C#0", "14": "D0", "15": "D#0", "16": "E0", "17": "F0", "18": "F#0", "19": "G0", "20": "G#0", "21": "A0", "22": "A#0", "23": "B0", "24": "C1", "25": "C#1", "26": "D1", "27": "D#1", "28": "E1", "29": "F1", "30": "F#1", "31": "G1", "32": "G#1", "33": "A1", "34": "A#1", "35": "B1", "36": "C2", "37": "C#2", "38": "D2", "39": "D#2", "40": "E2", "41": "F2", "42": "F#2", "43": "G2", "44": "G#2", "45": "A2", "46": "A#2", "47": "B2", "48": "C3", "49": "C#3", "50": "D3", "51": "D#3", "52": "E3", "53": "F3", "54": "F#3", "55": "G3", "56": "G#3", "57": "A3", "58": "A#3", "59": "B3", "60": "C4", "61": "C#4", "62": "D4", "63": "D#4", "64": "E4", "65": "F4", "66": "F#4", "67": "G4", "68": "G#4", "69": "A4", "70": "A#4", "71": "B4", "72": "C5", "73": "C#5", "74": "D5", "75": "D#5", "76": "E5", "77": "F5", "78": "F#5", "79": "G5", "80": "G#5", "81": "A5", "82": "A#5", "83": "B5", "84": "C6", "85": "C#6", "86": "D6", "87": "D#6", "88": "E6", "89": "F6", "90": "F#6", "91": "G6", "92": "G#6", "93": "A6", "94": "A#6", "95": "B6", "96": "C7", "97": "C#7", "98": "D7", "99": "D#7", "100": "E7", "101": "F7", "102": "F#7", "103": "G7", "104": "G#7", "105": "A7", "106": "A#7", "107": "B7", "108": "C8", "109": "C#8", "110": "D8", "111": "D#8", "112": "E8", "113": "F8", "114": "F#8", "115": "G8", "116": "G#8", "117": "A8", "118": "A#8", "119": "B8", "120": "C9", "121": "C#9", "122": "D9", "123": "D#9", "124": "E9", "125": "F9", "126": "F#9", "127": "G9"};
function mtof(m) {
	return pow(2, (m-69)/12)*440;
}
function ftom(fm) {
	var m = 12 * Math.log2(fm/440) + 69;
	var mR = round(m);
	var midiNoteName = midiNotes[mR].replace("#", "<exp>#</exp>").replace("D", "Ré").replace("A", "La").replace("B", "Si").replace("C", "Do").replace("E", "Mi").replace("F", "Fa").replace("G", "Sol");
	return {note: m, name: midiNoteName + (((mR-m)>0)?("<expp>–</expp>"):("<expp>+</expp>"))};
}



/*
setTimeout(function() {
$.each(oscillators.nodes, function(index, oscillator) {
oscillator.stop();
});
}, 1000);
*/
/*
//
var oscillator = audioContext.createOscillator();
var distorsion = audioContext.createWaveShaper();
//oscillator.connect(distorsion);
//distorsion.connect(master);

//CustomNode
var bufferSize = 4096;
var customNode = (function() {
var node = audioContext.createScriptProcessor(bufferSize, 1, 1);
node.onaudioprocess = function(e) {
var input  = e.inputBuffer .getChannelData(0);
var output = e.outputBuffer.getChannelData(0);
for (var i = 0; i < bufferSize; i++) {
output[i] = cos(input[i]);
}
}
return node;
})();

//Oscillateur
oscillator.type = 'sawtooth';
oscillator.frequency.value = 220;
oscillator.start(0);
oscillator.stop();

//Oscillateur perso
var real = new Float32Array(2);
var imag = new Float32Array(2);
real[0] = 0;
imag[0] = 0;
real[1] = 1;
imag[1] = 0;
var wave = audioContext.createPeriodicWave(real, imag);
//oscillator.setPeriodicWave(wave);

//Distorsion
function makeDistortionCurve(amount) {
var k = typeof amount === 'number' ? amount : 50,
n_samples = 44100,
curve = new Float32Array(n_samples),
deg = PI / 180,
i = 0,
x;
for ( ; i < n_samples; ++i) {
//x = i * 2 / n_samples - 1;
x = i / n_samples;
curve[i] = x;//sin(x);
}
return curve;
};
distorsion.curve = makeDistortionCurve(0);
distorsion.oversample = '4x';
*/
