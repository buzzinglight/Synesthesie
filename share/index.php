<?php
	include_once("phpqrcode/qrlib.php");
	
	if(isset($_POST["share"])) {
		$retour = array("error" => 1, "img" => mktime());
		if(isset($_POST["png"])) {
			$retour["error"] = 0;
			$data = $_POST["png"];
			$data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $data));
			$retour["img"] = $retour["img"].".png";
		}
		else if(isset($_POST["jpeg"])) {
			$retour["error"] = 0;
			$data = $_POST["jpeg"];
			$data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $data));
			$retour["img"] = $retour["img"].".jpg";
		}
		if($retour["img"] != "") {
			file_put_contents($retour["img"], $data);
			$retour["ticket"] = $retour["img"]."_ticket.jpg";
			$retour["path"] = realpath($retour["img"]);
			$retour["url"] = "http://synesthesie.iannix.org/".$retour["img"];
			
			//Impression
			QRcode::png($retour["url"], "qrcode.png", QR_ECLEVEL_H, 20, 2, false, 0xFFFFFF, 0x000000);
			$dessin =  imagecreatefromjpeg($retour["img"]);
			$qrcode  = imagecreatefrompng('qrcode.png');
			list($dessinWidth, $dessinHeight) = getimagesize($retour["img"]);
			list($qrcodeWidth, $qrcodeHeight) = getimagesize('qrcode.png');
			$image_print = imagecreatetruecolor($dessinWidth + $dessinWidth, $dessinHeight);
			imagefill($image_print, 0, 0, imagecolorallocate($image_print, 255, 255, 255));
			imagecopy($image_print, $dessin, 0,0, 0,0, $dessinWidth,$dessinHeight);
			imagecopyresampled($image_print, $qrcode, $dessinWidth,$dessinHeight-$dessinHeight/2 - 100, 0,0, $dessinHeight/2,$dessinHeight/2, $qrcodeWidth,$qrcodeHeight);
			imagettftext($image_print, 64, 0, $dessinWidth + 30, $dessinHeight - 32, imagecolorallocate($image_print, 0, 0, 0), "../font/AvenirLT-Medium.ttf", "http://synesthesie.iannix.org/1476896368.jpg");
			imagejpeg($image_print, $retour["ticket"]);
			imagedestroy($dessin);
			imagedestroy($qrcode);
			imagedestroy($image_print);
			
			//Go
			$retour["command"] = "/usr/bin/lpr -P Epson_TM_88V ".$retour["ticket"]." 2>&1";
			$retour["commandRetour"] = shell_exec($retour["command"]);
			
			//Upload en FTP
			$dest = fopen("ftp://buzzingl:Suze2805@ftp.buzzinglight.com/synesthesie/share/".$retour["img"], "wb");
			$src = file_get_contents($retour["path"]);
			fwrite($dest, $src, strlen($src));
			fclose($dest); 
		}
		echo json_encode($retour, JSON_UNESCAPED_UNICODE);
	} 
	else {
		$retour = array("img" => "1476897157.jpg");
			
		$dessin =  imagecreatefromjpeg($retour["img"]);
		$qrcode  = imagecreatefrompng('qrcode.png');
		list($dessinWidth, $dessinHeight) = getimagesize($retour["img"]);
		list($qrcodeWidth, $qrcodeHeight) = getimagesize('qrcode.png');
		$image_print = imagecreatetruecolor($dessinWidth + $dessinWidth, $dessinHeight);
		imagefill($image_print, 0, 0, imagecolorallocate($image_print, 255, 255, 255));
		imagecopy($image_print, $dessin, 0,0, 0,0, $dessinWidth,$dessinHeight);
		imagecopyresampled($image_print, $qrcode, $dessinWidth,$dessinHeight-$dessinHeight/2 - 100, 0,0, $dessinHeight/2,$dessinHeight/2, $qrcodeWidth,$qrcodeHeight);
		imagettftext($image_print, 64, 0, $dessinWidth + 30, $dessinHeight - 32, imagecolorallocate($image_print, 0, 0, 0), "../font/AvenirLT-Medium.ttf", "http://synesthesie.iannix.org/1476896368.jpg");
		
		header('Content-Type: image/jpeg');
		imagejpeg($image_print);
		
		imagedestroy($dessin);
		imagedestroy($qrcode);
		imagedestroy($image_print);
	}
?>