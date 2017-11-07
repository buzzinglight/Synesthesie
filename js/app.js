//Contextes
var isMobile = false, dpi = 1, isChrome = false, isSafari = false, isLocal = false, isTouch = false;
var timeline, audioContext, audioContextData, canvasContext, dessin, waveform, network, stage;
var events = {start: "mousedown", move: "mousemove", end: "mouseup", out: "mouseupoutside"};
var lowPerf = true;

$(document).ready(function() {
	//Mobile ou non
	if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) isMobile = true;
	isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
	isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
	isLocal = (((window.location+"").indexOf("192.168") >= 0) || ((window.location+"").indexOf("127.0.0.1") >= 0) || ((window.location+"").indexOf("signature/") >= 0));
	
	if('ontouchstart' in window) {
		events = {start: "touchstart", move: "touchmove", end: "touchend", out: "touchendoutside"};
		isTouch = true;
		$("*").css({cursor: "none"});
	}

	//Retina ou non
	dpi = window.devicePixelRatio;
	if(dpi == undefined)
		dpi = 1;
	if(dpi == 1)	dpiScale = 0.5;
	else  			dpiScale = 1;

	//Chargement des sons
	synthInit(false);
	
	//Expérience commencée ou non
	var hasStarted = false;
	setInterval(function() {
		if(window.innerWidth < window.innerHeight) {
			$("#experience").hide();
			$("#orientation").show();
		}
		else {
			$("#experience").show();
			$("#orientation").hide();
			if(!hasStarted) {
				hasStarted = true;
	
				//Initialisations réseau
				network = new Network();
				
				//Adaptations mobiles
				if(isMobile) {
					$(".toolButton[action=synthese]").hide();
					$(".toolButton[action=sockets]").hide();
					$("input[type=checkbox]").addClass("checkbox-ios");
				}
				if(!isLocal) {
					$(".toolButton[action=share]").hide();
				}
	
				//Touches rapides
				$(document).on("keypress", function(e) {
					if(e.which == 32)
						timeline.toggle();
					else if(e.which == 102)
						timeline.restart();
				});
	
				//Initialisations moteur
				drawingInit();
			}
		}
	}, 100);
});




function bindTools() {
	$(".toolButton").off(events.start);
	$(".toolButton").on(events.start, function(e) {
		if($(this).hasClass("disabled"))	return;


		$(this).parent().find(".toolButtonChoice").each(function(index, dom) {
			$(this).removeClass("selected");
			var img = $(this).find("img");
			if(img.length)
				img.attr("src", img.attr("base").replace("%1", "off"));
		});

		var img = $(this).find("img");
		if(($(this).hasClass("toolButtonSimple")) || ($(this).hasClass("toolButtonChoice"))) {
			if(img.length)
				img.attr("src", img.attr("base").replace("%1", "on"));
			$(this).addClass("selected");
		}
		else if($(this).hasClass("toolButtonToggle")) {
			if($(this).hasClass("selected")) {
				$(this).removeClass("selected");
				if(img.length)
					img.attr("src", img.attr("base").replace("%1", "off"));
			}
			else {
				$(this).addClass("selected");
				if(img.length)
					img.attr("src", img.attr("base").replace("%1", "on"));
			}
		}
	});


	$(".toolButton").off(events.end);
	$(".toolButton").on(events.end, function(e) {
		if($(this).hasClass("disabled"))	return;
		
		//Effet graphique
		if($(this).hasClass("toolButtonSimple")) {
			$(".toolButtonSimple img").each(function(index, dom) {
				$(this).attr("src", $(this).attr("base").replace("%1", "off"));
				$(this).removeClass("selected");
			});
		}
		
		//Actions
		if($(this).attr("action") == "playPause")
			timeline.toggle()
		else if($(this).attr("action") == "playInLoop")
			timeline.playInLoop = $(this).hasClass("selected");
		else if($(this).attr("action") == "waveform")
			waveform.oscilloscope.visible = $(this).hasClass("selected");
		else if($(this).attr("action") == "oscilloscope") {
			if($(this).hasClass("selected"))	$("#oscilloscope").show();
			else								$("#oscilloscope").hide();
		}
		else if($(this).attr("action") == "synthese") {
			if($(this).hasClass("selected"))	$("#synthese").show();
			else								$("#synthese").hide();
		}
		else if($(this).attr("action") == "sockets") {
			if(network.connected())		network.disconnect();
			else 						network.connect("ws://" + network.ip + ":1237");
		}
		else if($(this).attr("action") == "clear")
			dessin.new();
		else if($(this).attr("action") == "ff")
			timeline.restart();
		else if(($(this).attr("action") == "erase") && (dessin.selectedTraces.length)) {
			while(dessin.selectedTraces.length)
				dessin.selectedTraces[0].remove();
		}
		else if($(this).attr("action") == "share") {
			$(this).addClass("disabled");
			$.each(dessin.traces, function(index, trace) {
				trace.select(false);
			});
			dessin.export = true;
		}
		else if($(this).attr("groupId")) {
			var newGroup = Dessin.palette.tools[parseInt($(this).attr("groupId"), 10)];
			if(newGroup != Dessin.palette.currentGroup) {
				Dessin.palette.currentGroup = newGroup;
				$("#toolsDrawingColor").html("");
				$.each(Dessin.palette.currentGroup.tools, function(index, tool) {
					$("#toolsDrawingColor").append("<div class='toolButton toolButtonChoice' toolId='" + tool.id + "' title='" + tool.name  + "'><div class='toolicon'><div style='background-color: #" + tool.drawing.color + ";'></div></div><div class='toolname'>" + tool.name + "</div></div>");
				});
				$("#toolsDrawingColor .toolButton img").each(function(index, dom) {
					$(this).attr("src", $(this).attr("base").replace("%1", "off"));
				});

				//Go
				bindTools();
				$("#toolsDrawingColor .toolButton:nth-child(1)").trigger(events.start).trigger(events.end);
			
				//Placement
				$("#toolbarFloatingContainer").css({
					left: $(this).offset().left + $(this).width()/2 - $("#toolbarFloatingContainer").width() / 2
				}).show();
			}
			else {
				if($("#toolbarFloatingContainer").is(":visible"))
					$("#toolbarFloatingContainer").hide();
				else
					$("#toolbarFloatingContainer").show();
			}
		}
		else if($(this).attr("toolId")) {
			Dessin.palette.currentTool = Dessin.palette.currentGroup.tools[parseInt($(this).attr("toolId"), 10)];
			$("#syntheseJSON").val(JSON.stringify(Dessin.palette.currentTool, null, 2));
			$("#syntheseJSON").trigger("input");
		}
	});
}