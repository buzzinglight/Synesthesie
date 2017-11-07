function Timeline() {
	this.t = this.tMod = this.tOld = this.tModOld = this.tContinu = 0;
	this.frame = 0;
	this.startTime  = 0;
	this.isPlaying  = false;
	this.ticker     = new PIXI.ticker.Ticker();
	this.playInLoop = false;
	
	//Dessin
	this.timeline = new PIXI.Graphics();
	dessin.drawing.addChild(this.timeline);
	this.timeline.clear();
	this.timeline.lineStyle(2 * dpi, "0x8AB1CA", 1);
	this.timeline.moveTo(0, 6*dpi);
	this.timeline.lineTo(0, dessin.papier.height);
	this.speedDom = $("#speedRange input[type=range]");

	this.pause();
}
Timeline.scoreDuration = 10;


//Redémarre une trace
Timeline.prototype.restart = function() {
	this.pause();
	websocketSend("/transport fastrewind");
	this.t = this.tMod = this.tOld = this.tModOld = 0;
	dessin.restart();
	$(".toolButton[action=ff]").addClass("disabled");
}

//Démarre la timeline
Timeline.prototype.play = function() {
	if(this.t == 0)
		this.restart();
	websocketSend("/transport play");
	this.isPlaying = true;
	$(".toolButton[action=playPause] img").attr("src", $(".toolButton[action=playPause] img").attr("base").replace("%1", "on"));
	$(".toolButton[action=playPause] .toolname").html("En lecture");
	$(".toolButton[action=ff]").removeClass("disabled");
}
Timeline.prototype.pause = function() {
	websocketSend("/transport stop");
	this.isPlaying = false;
	$(".toolButton[action=playPause] img").attr("src", $(".toolButton[action=playPause] img").attr("base").replace("%1", "off"));
	$(".toolButton[action=playPause] .toolname").html("Lecture");
}
Timeline.prototype.toggle = function() {
	if(this.isPlaying)
		this.pause();
	else
		this.play();
}

//Met à jour le temps
Timeline.prototype.update = function() {
	this.frame++;
	var deltaTime = 0;
	this.tContinu += this.ticker.elapsedMS / 1000.;
	if(this.isPlaying) {
		var noOld = false;
		deltaTime = this.ticker.elapsedMS / 1000.;
		
		//Ajout du delta + coef
		this.t += deltaTime * getRangeExp(this.speedDom);
		if(this.playInLoop) {
			while(this.t > Timeline.scoreDuration)	{ this.t -= Timeline.scoreDuration; noOld = true; }
			while(this.t < 0)						{ this.t += Timeline.scoreDuration; noOld = true; }
		}
		this.tMod = this.t / Timeline.scoreDuration;
		if(noOld)
			this.updateOld();
	}
	this.timeline.x = this.tMod * dessin.papier.width;
	return deltaTime;
}
Timeline.prototype.updateOld = function() {
	this.tOld    = this.t;
	this.tModOld = this.tMod;
}

