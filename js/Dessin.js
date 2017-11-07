function Dessin(stage) {
	this.traces = [];
	this.selectedTraces = [];
	this.synthsTest = [];
	this.export = false;
	this.oscilloscopeCss = {visible: false, left: 0, width: 0};
	this.toolbarFloatingCss = {visible: false, left: 0, width: 0};
	
	//Charge la palette d'outils et de sons
	$.ajax("tools.json", {
		type: "GET",
		dataType: "JSON"
	})
	.done(function(retour) {
		Dessin.palette = retour;
	})
	.fail(function(e) 	{
		console.log("Une erreur s’est produite.");
		console.log(e);
	})
	.always(function(e) {
		//Clean les outils et créé la toolbar
		$.each(Dessin.palette.tools, function(groupIndex, group) {
			group.id = groupIndex;
			var extraClass = "";
			if((!group.isMobile) && (isMobile))
				extraClass += " invisible";
			if(group.isOnline)
				extraClass += " onlyOnline";
			$("#toolsDrawing").append("<div class='toolButton toolButtonChoice " + extraClass + "' groupId='" + group.id + "' title='" + group.name  + "'><div class='toolicon'><img draggable='false' base='img/brushes/brush" + group.toolIcon + "_%1.png'/></div><div class='toolname'>" + group.name + "</div></div>");
			$.each(group.tools, function(toolIndex, tool) {
				tool.id = toolIndex;
				if((tool.sound) && (tool.sound.gain))
					tool.sound.gain *= 0.8;
			});
		});
		$(".toolButton img").each(function(index, dom) {
			$(this).attr("src", $(this).attr("base").replace("%1", "off"));
		});
		$(".onlyOnline").hide();
		bindTools();
		dessin.new();
		
		//Auto-connect réseau
		if(getQueryVariable("socket")) {
			network.ip = getQueryVariable("socket");
			$(".toolButton[action=sockets]").trigger(events.start).trigger(events.end);
		}
	});

	//Background papier
	this.papier = new PIXI.extras.TilingSprite(new PIXI.Texture.fromImage('img/millimetrebleu.jpg'), canvasContext.width+2, canvasContext.height);
	this.papier.x = -1;
	this.papier.alpha = 0.5;
	var scaling = this.papier.width / 1920/* * dpiScale*/;
	this.papier.tileScale = new PIXI.Point(scaling, scaling);
	this.papier.interactive = true;
	stage.addChild(this.papier);
	this.drawing = new PIXI.Container();
	stage.addChild(this.drawing);

	//Événements souris
	var thiss = this;
	this.papier.on(events.start, function(e) {
		thiss.mouseMove(e, true);
	});
	this.papier.on(events.end, function(e) {
		thiss.mouseMove(e, false);
	});
	this.papier.on(events.move, function(e) {
		thiss.mouseMove(e);
	});
	this.papier.on(events.out, function(e) {
		thiss.mouseMove(e, false);
	});
}

Dessin.prototype.unselectall = function() {
	$.each(this.selectedTraces, function(index, trace) {
		trace.select(false);
	});
}

//Événements souris
Dessin.prototype.mouseMove = function(e) {
	//Traitement de l'événement
	mouseMoveGeneric(e);
	
	//Décisions
	$.each(canvasContext.touches, function(index, touch) {
		//Nouvelle trace
		if(touch.now.type == "start") {
			touch.trace = new Trace(Dessin.palette.currentTool);
			this.oscilloscopeCss = {
				visible: $("#oscilloscope").is(":visible"),
				left: 	 $("#oscilloscope").offset().left,
				top: 	 $("#oscilloscope").offset().top,
				width: 	 $("#oscilloscope").width(),
				height:  $("#oscilloscope").height(),
			};
			this.toolbarFloatingCss = {
				visible: $("#toolbarFloatingContainer").is(":visible"),
				left: 	 $("#toolbarFloatingContainer").offset().left,
				top: 	 $("#toolbarFloatingContainer").offset().top,
				width: 	 $("#toolbarFloatingContainer").width(),
				height:  $("#toolbarFloatingContainer").height(),
			};
		}
		else if((touch.now.type == "stop") && (touch.trace))
			touch.trace.cache();
		
		var frequencies = undefined;
		if(touch.trace) {
			//Dégage l'oscilloscope
			var touchCss = { x: touch.now.x / dpi + $("#canvasContainer").offset().left, y: touch.now.y / dpi + $("#canvasContainer").offset().top};
			if(((this.oscilloscopeCss.left - this.oscilloscopeCss.width*0.2) < touchCss.x) && (touchCss.x < ((this.oscilloscopeCss.left + this.oscilloscopeCss.width*1.2))) && ((this.oscilloscopeCss.top - this.oscilloscopeCss.height*0.2) < touchCss.y) && (touchCss.y < ((this.oscilloscopeCss.top + this.oscilloscopeCss.height*1.2)))) {
				if($(".toolButton[action=oscilloscope]").hasClass("selected"))
					$(".toolButton[action=oscilloscope]").trigger(events.start).trigger(events.end);
			}
			else if((this.oscilloscopeCss.visible) && (!$(".toolButton[action=oscilloscope]").hasClass("selected")))
				$(".toolButton[action=oscilloscope]").trigger(events.start).trigger(events.end);

			if(((this.toolbarFloatingCss.left - this.toolbarFloatingCss.width*0.5) < touchCss.x) && (touchCss.x < ((this.toolbarFloatingCss.left + this.toolbarFloatingCss.width*1.5))) && ((this.toolbarFloatingCss.top - this.toolbarFloatingCss.height*0.5) < touchCss.y) && (touchCss.y < ((this.toolbarFloatingCss.top + this.toolbarFloatingCss.height*1.5))))
				$("#toolbarFloatingContainer").hide();
			else if(this.toolbarFloatingCss.visible)
				$("#toolbarFloatingContainer").show();
					
			//Volume et dessin
			if(touch.now.type != "stop")
				touch.trace.addPoint(touch.now.x, touch.now.y);
			touch.trace.setVolume((touch.now.type != "stop")?(1):(0));

			//Fréquences
			frequencies = touch.trace.setFrequencies(touch.now.x, touch.now.y, 0, (touch.now.trace != "stop"));
		}
		else
			frequencies = Trace.setFrequencies(touch.now.x, touch.now.y, 0);

		if((frequencies) && (Dessin.palette) && (Dessin.palette.currentTool)) {
			if(Dessin.palette.currentTool.sound) {
				if(Dessin.palette.currentTool.sound.wavetable) {
					frequencies.midi = ftom(frequencies.frequency);
					$("#tuner .note").html(frequencies.midi.name);
					$("#tuner .freq").html(round(frequencies.frequency, 2) + " Hz");
				}
				else if(Dessin.palette.currentTool.sound.wavefile) {
					$("#tuner .note").html(round(frequencies.playback*100) + " %");
					$("#tuner .freq").html("vitesse");
				}
			}
			else {
				var type = Dessin.palette.currentTool.type.toUpperCase().split("-")[0];
				$("#tuner .note").html(type);
				if(Dessin.palette.currentTool.type == "lpf")
					$("#tuner .freq").html(round(frequencies.filter, 0) + " Hz");
				else
					$("#tuner .freq").html(round(frequencies.x*100, 0) + "% | " + round(frequencies.y*100, 0) + "%");
			}
			if((touch.trace) && (touch.now.type != "stop"))	$("#tuner").addClass("touch");
			else											$("#tuner").removeClass("touch");
		}
		
		if(touch.now.type == "stop") {
			if(touch.trace) {
				//Harmonise les unités
				if(touch.trace.points.length) {
					var tDrawingMax  = touch.trace.getDuration(true);
					var tDistanceMax = touch.trace.getDistance();
					$.each(touch.trace.points, function(index, point) {
						point.tDistance *= (tDrawingMax / tDistanceMax);
					});
				}
				
				//Selection
				touch.trace.select();
			}

			//Remet l'oscilloscope
			if((this.oscilloscopeCss) && (this.oscilloscopeCss.visible) && (!$(".toolButton[action=oscilloscope]").hasClass("selected")))
				$(".toolButton[action=oscilloscope]").trigger(events.start).trigger(events.end);
			if((this.toolbarFloatingCss) && (this.toolbarFloatingCss.visible))
				$("#toolbarFloatingContainer").show();
			
			delete canvasContext.touches[index];
		}
	});
}



//Redémarre une trace
Dessin.prototype.restart = function() {
	$.each(this.traces, function(index, trace) {
		trace.restart();
	});
}

//Met à jour les traces
Dessin.prototype.update = function(deltaTime) {
	$.each(this.traces, function(index, trace) {
		trace.update(deltaTime);
	});
}

//Dessine en temps réel
Dessin.prototype.draw = function() {
	$.each(this.traces, function(index, trace) {
		if(!trace.isInCache)
			trace.draw();
	});
}

//Tests de trigges
Dessin.prototype.trig = function(tMin, tMax, deltaTime) {
	if(tMin > tMax)	{
		var tMinOld = tMin;
		tMin = tMax;
		tMax = tMinOld;
	}
	$.each(this.traces, function(index, trace) {
		if(trace.trigged(tMin, tMax))
			trace.play();
		trace.update(deltaTime);
	});
}

//Nouveau dessin
Dessin.prototype.new = function() {
	while(this.traces.length)
		this.traces[0].remove();
	timeline.restart();
	
	$("#intro").fadeIn(500);
	websocketSend("/transport clear");
	$(".toolButton[action=clear]").addClass("disabled");
	$(".toolButton[action=share]").addClass("disabled");

	//Faux événements
	$("#toolsDrawing .toolButton:nth-child(1)").trigger(events.start).trigger(events.end);
	/*
	if(!$(".toolButton[action=oscilloscope]").hasClass("selected"))
		$(".toolButton[action=oscilloscope]").trigger(events.start).trigger(events.end);
	*/
	//$(".toolButton[action=synthese]").trigger(events.start).trigger(events.end);
}
