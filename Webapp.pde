import websockets.*;
import oscP5.*;
import netP5.*;

WebsocketServer websocket;
OscP5 osc;
NetAddress ip;
PImage image;
boolean isInit = false;
String lastMessage = "";

void setup() {
  size(192, 212);
  image = loadImage(sketchPath("favicons/android-icon-192x192.png"));
  println(sketchPath("favicons/android-icon-192x192.png"));

  surface.setTitle("Synesthésie");
}

void draw() {
  background(0);
  fill(192);
  textSize(8);
  textAlign(CENTER);
  text(lastMessage, 0, 192, width, height-width);

  if (isInit)
    tint(255, map(cos(frameCount / 30.), -1, 1, 200, 255));
  else
    tint(255, map(cos(frameCount / 10.), -1, 1, 50, 64));
  image(image, 0, 0);

  if ((!isInit) && (frameCount > 5)) {
    isInit = true;
    osc = new OscP5(this, 15555);
    websocket = new WebsocketServer(this, 1237, "");
    ip = new NetAddress("127.0.0.1", 57120);
  }
}

void webSocketServerEvent(String websocketMessage) {
  String[] websocketMessageItems = websocketMessage.split(" ");
  if (websocketMessageItems.length >= 2) {
    //String sendMessage = websocketMessageItems[0];
    String addresse = websocketMessageItems[1].replace("osc://ip_out:port_out", "");
    lastMessage = addresse;
    OscMessage message = new OscMessage(addresse);
    for (int i = 2; i < websocketMessageItems.length; i++) {
      try {
        float value = Float.parseFloat(websocketMessageItems[i]);
        message.add(value);
      }
      catch(NumberFormatException e) {
        message.add(websocketMessageItems[i]);
      }
      lastMessage += " " + websocketMessageItems[i];
    }
    osc.send(message, ip);
  }
}


void oscEvent(OscMessage oscMessage) {
  if (oscMessage.checkTypetag("f")) {
    float val = oscMessage.get(0).floatValue();
    websocket.sendMessage(oscMessage.addrPattern() + " " + val);
    return;
  } else if (oscMessage.checkTypetag("s")) {
    String val = oscMessage.get(0).stringValue();
    websocket.sendMessage(oscMessage.addrPattern() + " " + val);
    return;
  }
}