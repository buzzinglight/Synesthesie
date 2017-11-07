//Envoi de la websocket
function websocketSend(data) {
	network.send("sendMessage osc://ip_out:port_out" + data);
}
//Réception de la websocket
function websocketReception(data) {
	if((data.length > 1) && (data[0] == "/speed")) {
		$("#speedRange input[type=range]").val(parseFloat(data[1]) * 100000);
		$("#speedRange input[type=range]").trigger("input");
	}
	else if((data.length > 1) && (data[0] == "/transport")) {
		if(data[1] == "clear")
			dessin.new();
	}
}





//Network
function Network() {
	this.URI = "";
	this.ip = "127.0.0.1";
	
	this.websocket = null;
	this.intervalId = null;
	
	this.disconnectionAsked = false;
}

Network.prototype.connect = function(URI) {
	this.disconnectionAsked = false;
	if (typeof URI !== "undefined") {
		this.URI = URI;
	}

	try {
		if (this.websocket) {
			if (this.connected()) {
				this.websocket.close();
			}
			delete this.websocket;
		}
		
		if (typeof MozWebSocket === 'function')
			WebSocket = MozWebSocket;
			
		this.websocket = new WebSocket(this.URI);
		
		this.websocket.onopen = function(evt) {
			websocketChanged(this.websocket);
		}.bind(this);
		
		this.websocket.onclose = function(evt) {
			websocketChanged(this.websocket);
			if (!this.disconnectionAsked) {
				setTimeout(this.connect.bind(this), 500);
			}
			delete this.websocket;
		}.bind(this);
		
		this.websocket.onmessage = function(evt) {
			var data = evt.data.split(" ");
			data.clean();
			websocketReception(data);
		}.bind(this);
		this.websocket.onerror = function(evt) {
			console.warn("Websocket error:", evt.data);
		};
		websocketChanged(this.websocket);
	}
	catch(exception) {
		console.error("Websocket fatal error, maybe your browser can't use websockets. You can look at the javascript console for more details on the error.");
		console.error("Websocket fatal error", exception);
	}
}

Network.prototype.connected = function() {
	if (this.websocket && this.websocket.readyState == 1)
		return true;
	return false;
};

Network.prototype.reconnect = function() {
	if (this.connected())
		this.disconnect();
	this.connect();
}

Network.prototype.disconnect = function() {
	this.disconnectionAsked = true;
	if (this.connected()) {
		this.websocket.close();
		websocketChanged(this.websocket);
	}
}

Network.prototype.send = function(message) {
	if (this.connected())
		this.websocket.send(message);
};

Network.prototype.checkSocket = function() {
	if (this.websocket) {
		var stateStr;
		switch (this.websocket.readyState) {
			case 0:
				stateStr = "CONNECTING";
				break;
			case 1:
				stateStr = "OPEN";
				break;
			case 2:
				stateStr = "CLOSING";
				break;
			case 3:
				stateStr = "CLOSED";
				break;
			default:
				stateStr = "UNKNOW";
				break;
		}
		console.log("Websocket state : " + this.websocket.readyState + " (" + stateStr + ")");
	}
	else
		console.log("Websocket is not initialised");
}
function websocketChanged(websocket) {
	if (websocket != null) {
		var stateStr;
		switch (websocket.readyState) {
			case 0:
				stateStr = "CONNECTING";
				break;
			case 1:
				stateStr = "OPEN";
				break;
			case 2:
				stateStr = "CLOSING";
				break;
			case 3:
				stateStr = "CLOSED";
				break;
			default:
				stateStr = "UNKNOW";
				break;
		}
		if(websocket.readyState == 1) {
			$(".toolButton[action=sockets]").removeClass("inactive");
			$(".toolButton[action=sockets] .toolname").html("Connecté à IanniX");
			$(".onlyOnline").show();
		}
		else {
			$(".toolButton[action=sockets]").addClass("inactive");
			$(".toolButton[action=sockets] .toolname").html("Déconnecté de IanniX");
			$(".onlyOnline").hide();
		}
		//console.log("Socket state changed : " + websocket.readyState + " (" + stateStr + ")");
	}
	else {
		//console.log("3 (CLOSED)");
	}
}