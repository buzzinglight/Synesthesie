function drawingInit() {
	//Preload
	new PIXI.Sprite.fromImage('img/tracePlay_large.png');
	new PIXI.Sprite.fromImage('img/tracePlaying_large.png');
	new PIXI.Sprite.fromImage('img/traceSelected_large.png');
	new PIXI.Sprite.fromImage('img/tracePlay_small.png');
	new PIXI.Sprite.fromImage('img/tracePlaying_small.png');
	new PIXI.Sprite.fromImage('img/traceSelected_small.png');

	//Start-up
	canvasContext = PIXI.autoDetectRenderer($("#canvasContainer").width() * dpi, $("#canvasContainer").height() * dpi, {
		antialias: true,
		preserveDrawingBuffer: true
	});
	canvasContext.backgroundColor   = 0xFBFBFD;
	canvasContext.view.style.width  = (canvasContext.width  / dpi) + 'px';
	canvasContext.view.style.height = (canvasContext.height / dpi) + 'px';
	canvasContext.mousePos       = {id: 0, x: 0, y: 0};
	canvasContext.touches        = {};
	canvasContext.waveformHeight = 200 * dpi;
	$("#canvasContainer").append(canvasContext.view)

	//Éléments
	stage     = new PIXI.Container();
	dessin    = new Dessin(stage);
	//waveform  = new Waveform(stage);
	timeline  = new Timeline()
	
	//Play
	var editing = false;
	$(".toolSlider input[type=range]").on("input", function() {
		var text = $(this).parent().find(".toolname");
		var val  = round(getRangeExp($(this)), 3);
		var action = $(this).parent().attr("action");
		
		if(action == "speedFactor") {
			if     (val == 1)	text.html("Vitesse normale");
			else if(val == 0)	text.html("À l’arrêt");
			else if(val > 1)	text.html("Vitesse accélérée ×" + val);
			else if(val < 0)	text.html("Vitesse inversée ×" + val);
			else if(val < 1)	text.html("Vitesse ralentie ×" + val);
		}
		else if((action == "volumeFactor") || (action == "masterFactor")) {
			var verbose = "";
			if     (val > 0.8)	verbose = "maximal";
			else if(val > 0.6)	verbose = "assez fort";
			else if(val > 0.4)	verbose = "moyen";
			else if(val > 0.2)	verbose = "faible";
			else if(val > 0.)	verbose = "très faible";
			if(action == "masterFactor") {
				text.html("Volume<br/>" + verbose + " (" + round(val*100, 0) + "%)");
				if(audioContext)
					audioContext.master.gain.value = val;
			}
			else
				text.html("Volume " + verbose + " (" + round(val*100, 0) + "% soit " + round(20 * log(val), 1) + " dB)");
		}
		else if(action == "panningFactor") {
			var verbose = "";
			if     (val > 0.9)	text.html("Très spatialisé (" + round(val*100, 0) + "%)");
			else if(val > 0.6)	text.html("Assez spatialisé (" + round(val*100, 0) + "%)");
			else if(val > 0.4)	text.html("Moyennement spatialisé (" + round(val*100, 0) + "%)");
			else if(val > 0.2)	text.html("Faiblement spatialisé (" + round(val*100, 0) + "%)");
			else if(val > 0.)	text.html("Peu spatialisé (" + round(val*100, 0) + "%)");
		}
	
		//Cas du slider avec durée
		if(!editing) {
			editing = true;
			var duree = $(this).parent().find("input[type=number]");
			if((duree) && (dessin.selectedTraces.length))
				duree.val(round(dessin.selectedTraces[0].getDuration(), 2));
			editing = false;
		}
	});
	$(".toolSlider .toolname").on(events.end, function(e) {
		setRangeExp($(this).parent().find("input[type=range]"), 1);
	});
	$(".toolSlider div").trigger(events.end);

	//Sound
	$("#syntheseChoice").change(function() {
		Dessin.palette.currentTool.sound.wavetable = $("#syntheseChoice option:selected").text();
		$("#syntheseJSON").val(JSON.stringify(Dessin.palette.currentTool, null, 2));
		$("#syntheseJSON").trigger("input");
	});
	$("#syntheseJSON").on("input propertychange", function() {
		try {
			var obj = JSON.parse($("#syntheseJSON").val());
			if(obj.sound.wavetable)
				$("#syntheseChoice").val(obj.sound.wavetable);
			Dessin.palette.currentTool = obj;
			$("#syntheseJSON").css({"background-color": "transparent"});
			$("#syntheseJSONError").html("");
		}
		catch(e) {
			$("#syntheseJSON").css({"background-color": "red"});
			$("#syntheseJSONError").html(e);
		}
		
		//Essai du son
		if(Dessin.palette.currentTool.sound) {
			var synthTest = new TraceSynth(-1, Dessin.palette.currentTool);
			synthTest.test();
			dessin.synthsTest.push(synthTest);
		}
	});
		
	//Inspecteur
	$("#traceSpeedRange input[type=range], #traceVolumeRange input[type=range], #tracePanningRange input[type=range]").on("input", function(e) {
		var propertyName  = $(this).parent().attr("action");
		var propertyValue = getRangeExp($(this));
		$.each(dessin.selectedTraces, function(index, trace) {
			trace[propertyName] = propertyValue;
			trace.parameterChanged();
		});
	});
	$("#traceSpeedRange input[type=number]").on("change", function() {
		var propertyName  = $(this).parent().attr("action");
		var propertyValue = $(this).val();
		$.each(dessin.selectedTraces, function(index, trace) {
			trace[propertyName] = trace.getDuration(true) / propertyValue;
			trace.parameterChanged();
		});

		if(!editing) {
			editing = true;
			setRangeExp($(this).parent().find("input[type=range]"), dessin.selectedTraces[0].getDuration(true) / propertyValue);
			editing = false;
		}
	});
	$("#tracePlayingMode").change(function() {
		$.each(dessin.selectedTraces, function(index, trace) {
			if($(this).is(':checked'))	trace.playingMode = "tDrawing";
			else						trace.playingMode = "tDistance";
		});
	});
	$(".close").on(events.end, function(e) {
		if($(this).attr("action"))
			$(".toolButton[action=" + $(this).attr("action") + "]").trigger(events.start).trigger(events.end);
		else {
			$.each(dessin.selectedTraces, function(index, trace) {
				trace.select(false);
			});
			$(this).parent().parent().fadeOut(500);
		}
	});
	
	

	//Oscilloscope
	var size = {
		width:  $("#oscilloscope").width(),
		height: $("#oscilloscope").height() - $("#oscilloscope .toolTitle").height() + 1
	}
	$("#oscilloscope canvas").attr("width", size.width);
	$("#oscilloscope canvas").attr("height", size.height);
	$("#oscilloscope canvas").css({
		width: size.width,
		height: size.height,
	});
	var oscilloscopeCanvas = $("#oscilloscope canvas");
	var oscilloscopeCanvasContext = oscilloscopeCanvas[0].getContext("2d");
	//$("#oscilloscope").hide();

	//Mise à jour graphiques
	requestAnimationFrame(updateCanvas);
	function updateCanvas() {
		var deltaTime = timeline.update();
	
		//Timeline
		dessin.trig(timeline.tModOld, timeline.tMod, deltaTime);
	
		//Dessin temps réel
		dessin.draw();
		//waveform.draw();
		
		//Oscilloscope
		oscilloscopeDraw(oscilloscopeCanvas, oscilloscopeCanvasContext);

		//Son temps réel
		var voicesInfos = {nbOsc: 0, voices: []};
		$.each(dessin.traces, function(index, trace) {
			if(trace.synth) {
				//Volume
				var voicesInfo = trace.synth.setVolume();
				voicesInfos.nbOsc += voicesInfo.nbOsc;
				voicesInfos.voices = voicesInfos.voices.concat(voicesInfo.voices);

				//Fréquences
				trace.synth.setFrequencies();
			}
		});
		
		//Son test
		var synthsTestToClear = -1;
		$.each(dessin.synthsTest, function(index, synth) {
			synth.setVolume();
			synth.setFrequencies();
			
			//Destroy
			if(synth.oscillators.length == 0)
				synthsTestToClear = index;
		});
		if(synthsTestToClear >= 0)
			dessin.synthsTest.splice(synthsTestToClear, 1);
		if(TraceSynth.wavetablesLoaded) {
			if(voicesInfos.nbOsc > 0)
				$("#tuner .voices").html(voicesInfos.voices.length + " voix (" + voicesInfos.nbOsc + " osc.)");
			else
				$("#tuner .voices").html("&nbsp;");
		}
		
		//Dessin
		if(dessin.export) {
			timeline.timeline.visible = false;
			$.each(dessin.traces, function(index, trace) {
				trace.icons.visible = false;
			});
			if(isSafari) {
				stage.scale.y *= -1;
				stage.position.y = canvasContext.height;
			}
		}
	    canvasContext.render(stage);
		
		//Export
		if(dessin.export) {
			//Image
			var imgData = canvasContext.view.toDataURL("image/jpeg", 0.8);
			$('#shareImg').attr('src', imgData);
			$('#shareImg').css({
				width:  canvasContext.width  * $("#share").width() * 0.75 / canvasContext.width,
				height: canvasContext.height * $("#share").width() * 0.75 / canvasContext.width
			});
			
			//Serveur
			if(isLocal) {
				$("#shareUrl").html("Téléchargement de l’image sur le serveur…");
				$("#shareQrcode").hide();
				$.ajax("share/index.php", {
					type: "POST",
					data: {
						share: 1,
						jpeg: imgData
					},
					dataType: "JSON"
				})
				.done(function(retour) {
					if(retour.error == 0) {
						$("#shareUrl").html(retour.url);
						$("#shareQrcode").attr("src", "share/qrcode.png?rnd=" + random(-99999, 99999));
						$("#shareQrcode").show();
					}
					else {
						$("#shareUrl").html("Une erreur s'est produite lors du partage.");
						console.log(retour);
					}
				})
				.fail(function(e) 	{
					$("#shareUrl").html("Une erreur s'est produite lors du partage.");
					console.log("Une erreur s’est produite.");
					console.log(e);
				})
				.always(function(e) {
				});
			}
			$('#share').show();
			
			//Rétablissement du normal
			$(".toolButton[action=share]").removeClass("disabled");
			timeline.timeline.visible = true;
			$.each(dessin.traces, function(index, trace) {
				trace.icons.visible = true;
			});
			dessin.export = false;
			if(isSafari) {
				stage.scale.y *= -1;
				stage.position.y = 0;
			}
		}
		
		//Mise à jour de la timeline
	  	requestAnimationFrame(updateCanvas);
		timeline.updateOld();
	}
}

//Traitement des informations de souris sur le canvas
function mouseMoveGeneric(e, down, offset) {
	//Position de la souris
	if(offset == undefined)	offset = {x: 0, y: 0};
	if(e.data.originalEvent.touches) {
		offset.x -= $("#canvasContainer").offset().left;
		offset.y -= $("#canvasContainer").offset().top;
		//Prépare la fin des touch
		$.each(canvasContext.touches, function(index, touch) {
			touch.now.type = "stop";
		});
		if(e.data.originalEvent.touches.length) {
			$.each(e.data.originalEvent.touches, function(index, touch) {
				//canvasContext.touches[touch.identifier] = {id: touch.identifier, x: touch.pageX * dpi, y: touch.pageY * dpi};
				
				var type = "update";
				if(canvasContext.touches[touch.identifier] == undefined) {
					canvasContext.touches[touch.identifier] = {};
					type = "start";
				}
				canvasContext.touches[touch.identifier].last = canvasContext.touches[touch.identifier].now;
				canvasContext.touches[touch.identifier].now  = {id: 0, x: (touch.pageX + offset.x) * dpi, y: (touch.pageY + offset.y) * dpi, type: type};
			});
		}
	}
	else {
		canvasContext.mousePos = {id: 0, x: e.data.global.x + offset.x, y: e.data.global.y + offset.x};
		
		var type = e.type;
		if     ((type == "mousedown") || (type == "touchstart"))
			type = "start";
		else if((type == "mouseup")   || (type == "touchend") || (type == "mouseupoutside") || (type == "touchendoutside"))
			type = "stop";
		else
			type = "update";
		
		if(canvasContext.touches["0"] == undefined)
			canvasContext.touches["0"] = {};
		canvasContext.touches["0"].last = canvasContext.touches["0"].now;
		canvasContext.touches["0"].now  = {id: 0, x: e.data.global.x + offset.x, y: e.data.global.y + offset.y, type: type};

		if((type != "stop") || (canvasContext.lastMousePos == undefined))
			canvasContext.lastMousePos = canvasContext.mousePos;
	}
}


function oscilloscopeDraw(canvas, canvasContext) {
	if(canvas.is(":visible")) {
		var quarterHeight = canvas.height() / 4.;
		var scaling       = canvas.height() / 256.;
		
		if(audioContext)
			audioContext.analyser.getByteTimeDomainData(audioContext.analyser.data);
		canvasContext.strokeStyle = "red";
		canvasContext.lineWidth = 1;
		canvasContext.fillStyle="#004737";
		canvasContext.fillRect(0,0,canvas.width(), canvas.height());
		canvasContext.beginPath();
		canvasContext.moveTo(0,0);
		canvasContext.lineTo(canvas.width(),0);
		canvasContext.stroke();
		canvasContext.moveTo(0,canvas.height());
		canvasContext.lineTo(canvas.width(),canvas.height());
		canvasContext.stroke();
		canvasContext.save();
		canvasContext.strokeStyle = "#006644";
		canvasContext.beginPath();
		if (canvasContext.setLineDash)
			canvasContext.setLineDash([5]);
		canvasContext.moveTo(0,quarterHeight);
		canvasContext.lineTo(canvas.width(),quarterHeight);
		canvasContext.stroke();
		canvasContext.moveTo(0,quarterHeight*3);
		canvasContext.lineTo(canvas.width(),quarterHeight*3);
		canvasContext.stroke();

		canvasContext.restore();
		canvasContext.beginPath();
		canvasContext.strokeStyle = "#006644";
		canvasContext.moveTo(0,quarterHeight*2);
		canvasContext.lineTo(canvas.width(),quarterHeight*2);
		canvasContext.stroke();

		canvasContext.strokeStyle = "#FFFD38";


		if(audioContext) {
			canvasContext.beginPath();
			var zeroCross = findFirstPositiveZeroCrossing(audioContext.analyser.data, canvas.width());

			canvasContext.moveTo(0,(256-audioContext.analyser.data[zeroCross])*scaling);
			for (var i = zeroCross, j = 0 ; (j < canvas.width()) && (i < audioContext.analyser.data.length) ; i++, j++)
				canvasContext.lineTo(j, (256-audioContext.analyser.data[i])*scaling);
			canvasContext.stroke();
		}
	}
}
