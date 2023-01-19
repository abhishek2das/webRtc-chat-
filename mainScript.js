import {WebRTCAdaptor} from "./js/webrtc_adaptor.js"
    import {getUrlParameter} from "./js/fetch.stream.js" 
    import {SoundMeter} from "./js/soundmeter.js" 
	var debug = getUrlParameter("debug");
	  if(debug == null) {
		debug = false;
		}

    function init () {
	  var id = getUrlParameter("id");
	  if(typeof id != "undefined") {
		$("#streamId").val(id);
	  }
	  else {
		id = getUrlParameter("name");
		if (typeof id != "undefined") {
			$("#streamId").val(id);
		} 
		else {
			$("#streamId").val("stream1");
		}
	  }
	  
	  $("#maxBandwidthTextBox").val(maxVideoBitrateKbps);
	  $("#max_bandwidth_apply").click(function() {
		var bitrateBoxValue = $("#maxBandwidthTextBox").val();
		if(bitrateBoxValue == "unlimited" || bitrateBoxValue == NaN){
			maxVideoBitrateKbps = "unlimited"
			console.log("input bitrate: " + maxVideoBitrateKbps);
			webRTCAdaptor.changeBandwidth(maxVideoBitrateKbps,  $("#streamId").val());
		}
		else{
			var bitrate = parseInt(bitrateBoxValue);
			if (bitrate == NaN || bitrate < 100 || bitrate > 2500) {
				maxVideoBitrateKbps = 900;
			}
			else {
				maxVideoBitrateKbps = bitrate;
			}
			console.log("input bitrate: " + maxVideoBitrateKbps);
			$("#maxBandwidthTextBox").val(maxVideoBitrateKbps)
			if (webRTCAdaptor != null) {
				webRTCAdaptor.changeBandwidth(maxVideoBitrateKbps,  $("#streamId").val());
			}
		}
	  })
    }
	$(function() {
		init();
	});

	var maxVideoBitrateKbps = 900;
	var subscriberId = getUrlParameter("subscriberId");
	var subscriberCode = getUrlParameter("subscriberCode");
	var streamName = getUrlParameter("streamName");
	
	//TODO: Migrate these methods to Jquery
	var start_publish_button = document.getElementById("start_publish_button");
	start_publish_button.addEventListener("click", startPublishing, false);
	var stop_publish_button = document.getElementById("stop_publish_button");
	stop_publish_button.addEventListener("click", stopPublishing, false);
	var options = document.getElementById("options");
	options.addEventListener("click", toggleOptions, false);
	var send = document.getElementById("send");
	send.addEventListener("click", sendData, false);
	
	document.getElementById("streamId").defaultValue = "Goofy"
	var streamIdBox = document.getElementById("streamId");
	streamIdBox.value = "stream1";
	
	/**
	 * If publishing stops for any reason, it tries to republish again.
	 */
	var autoRepublishEnabled = true;
	/**
	 * Timer job that checks the WebRTC connection 
	 */
	var autoRepublishIntervalJob = null;
	
	var streamId;
	
	var token = getUrlParameter("token");
	
	// It should be true
	var rtmpForward = getUrlParameter("rtmpForward");

	var volume_change_input = document.getElementById("volume_change_input");
	volume_change_input.addEventListener("change", changeVolume);

	function changeVolume(){
	/**
   	* Change the gain levels on the input selector.
   	*/
   		if(document.getElementById('volume_change_input') != null){
   			webRTCAdaptor.currentVolume = this.value;
        	if(webRTCAdaptor.soundOriginGainNode != null){
        		webRTCAdaptor.soundOriginGainNode.gain.value = this.value; // Any number between 0 and 1.
        	}

       		if(webRTCAdaptor.secondStreamGainNode != null){
       			webRTCAdaptor.secondStreamGainNode.gain.value = this.value; // Any number between 0 and 1.
       		}
   		}
    }

    let meterRefresh = null;

    const instantMeter = document.querySelector('#audio_level_text_container');
    const instantValueDisplay = document.querySelector('#audio_level_text');

    function enableAudioLevel() {
  	// Put variables in global scope to make them available to the
  	// browser console.
  	window.stream = webRTCAdaptor.localStream;
  	const soundMeter = window.soundMeter = new SoundMeter(webRTCAdaptor.audioContext);
  	soundMeter.connectToSource(stream, function(e) {
    if (e) {
    	alert(e);
      	return;
    }
    meterRefresh = setInterval(() => {
    	instantMeter.value = instantValueDisplay.innerText = soundMeter.instant.toFixed(2);
    }, 200);
	});
	}

	var file_input = document.getElementById("file-input");
	file_input.addEventListener("change", send_image);

	var connect_channel_button = document.getElementById("send-image-button");
    connect_channel_button.addEventListener("click", ()=>file_input.click());

	function send_image() {
      var imageURL = file_input.files[0];

      var reader = new FileReader();
      reader.onload = function (e) {
        var arrayBuffer = this.result;
        var bytes = new Uint8Array(arrayBuffer);
        var blob = new Blob([bytes.buffer]);
        var urlCreator = window.URL || window.webkitURL;
        var imageBlobUrl = urlCreator.createObjectURL(blob);

		$('<img src =' + imageBlobUrl +' style="width:100px;"><br>').appendTo($("#all-messages"));
        sendBinaryData(arrayBuffer);

      };

      reader.readAsArrayBuffer(imageURL);
    }

	function sendBinaryData(data) {
      try {
        var iceState = webRTCAdaptor.iceConnectionState(streamIdBox.value);
        if (
          iceState != null &&
          iceState != "failed" &&
          iceState != "disconnected"
        ) {
          webRTCAdaptor.sendData(streamIdBox.value, data);
        } else {
          alert("WebRTC connection is not active. Please click start first");
        }
      } catch (exception) {
        console.error(exception);
        alert(
          "Message cannot be sent. Make sure you've enabled data channel on server web panel"
        );
      }
    }

	function handleImageData(data) {
        var bytes = new Uint8Array(data);
        var blob = new Blob([bytes.buffer]);
        var urlCreator = window.URL || window.webkitURL;
        var imageUrl = urlCreator.createObjectURL(blob);

		$('<img src =' + imageUrl +' style="width:100px;"><br>').appendTo($("#all-messages"));
    }

	function startPublishing() {
		streamId = streamIdBox.value;
		webRTCAdaptor.publish(streamId, token, subscriberId, subscriberCode, streamName);
	}

	function stopPublishing() {
		if (autoRepublishIntervalJob != null) {
			clearInterval(autoRepublishIntervalJob);
			autoRepublishIntervalJob = null;
		}
		webRTCAdaptor.stop(streamId);
	}
	
  	function switchVideoMode(chbx) {
  		if(chbx.value == "screen") {
			  //webRTCAdaptor.switchDesktopWithMicAudio(streamId);
			  webRTCAdaptor.switchDesktopCapture(streamId);
  		}
  		else if(chbx.value == "screenwithcamera"){
			webRTCAdaptor.switchDesktopCaptureWithCamera(streamId);
		}
		else {
  			webRTCAdaptor.switchVideoCameraCapture(streamId, chbx.value);
  		}
	}
  	
	function switchAudioMode(chbx) {
		webRTCAdaptor.switchAudioInputSource(streamId, chbx.value);
	}

	function getCameraRadioButton(deviceName, deviceId) {
		return "<div class=\"form-check form-check-inline\">" + 	
							"<input class=\"form-check-input video-source\" name=\"videoSource\" type=\"radio\" value=\"" + deviceId + "\" id=\"" + deviceId + "\">" +
							"<label class=\"form-check-label font-weight-light\" name=\"videoSource\" for=\"" + deviceId + "\" style=\"font-weight:normal\">" +
								deviceName +
							"</label>" +		
						   "</div>";
	}
	function getScreenButton(){
		return "<div class=\"form-check form-check-inline\">" +
					"<input class=\"form-check-input video-source\" name=\"videoSource\" type=\"radio\" value=\"screen\" id=\"screen_share_checkbox\">" +
					"<label class=\"form-check-label font-weight-light\" name=\"videoSource\" for=\"screen_share_checkbox\" style=\"font-weight:normal\">" +
							"Screen" +
					"</label>" +
				"</div>"
	}
	function getScreenWithCamButton(){
		return "<div class=\"form-check form-check-inline\">" +
					"<input class=\"form-check-input video-source\" name=\"videoSource\" type=\"radio\" value=\"screenwithcamera\" id=\"screen_share_with_camera_checkbox\">" +
					"<label class=\"form-check-label font-weight-light\" name=\"videoSource\" for=\"screen_share_with_camera_checkbox\" style=\"font-weight:normal\">" +
							"Screen with Camera" +
					"</label>" +
				"</div>"
	}
	function getAudioRadioButton(deviceName, deviceId) {
		return "<div class=\"form-check form-check-inline\">" + 	
							"<input class=\"form-check-input audio-source\" name=\"audioDeviceSource\" type=\"radio\" value=\"" + deviceId + "\" id=\"" + deviceId + "\">" +
							"<label class=\"form-check-label font-weight-light\" name=\"audioDeviceSource\" for=\"" + deviceId + "\" style=\"font-weight:normal\">" +
								deviceName +
							"</label>" +		
						   "</div>";
	}

	function toggleOptions() {
		$(".options").toggle();
	}
	
	function sendData() {
		try {
			var iceState = webRTCAdaptor.iceConnectionState(streamId);
            if (iceState != null && iceState != "failed" && iceState != "disconnected") {
            
				webRTCAdaptor.sendData($("#streamId").val(), $("#dataTextbox").val());
				$("#all-messages").append("Sent: " + $("#dataTextbox").val() + "<br>");
				$("#dataTextbox").val("");
			}
			else {
				alert("WebRTC publishing is not active. Please click Start Publishing first")
			}
		}
		catch (exception) {
			console.error(exception);
			alert("Message cannot be sent. Make sure you've enabled data channel on server web panel");
		}
	}
	  
	
	function checkAndRepublishIfRequired() {
	 	var iceState = webRTCAdaptor.iceConnectionState(streamId);
		console.log("Ice state checked = " + iceState);

	  	if (iceState == null || iceState == "failed" || iceState == "disconnected"){
	  		webRTCAdaptor.stop(streamId);
	  		webRTCAdaptor.closePeerConnection(streamId);
	  		webRTCAdaptor.closeWebSocket();
	  		initWebRTCAdaptor(true, autoRepublishEnabled);
		  }	
	}

    function startAnimation() {

        $("#broadcastingInfo").fadeIn(800, function () {
          $("#broadcastingInfo").fadeOut(800, function () {
        		var state = webRTCAdaptor.signallingState(streamId);
            if (state != null && state != "closed") {
            	var iceState = webRTCAdaptor.iceConnectionState(streamId);
            	if (iceState != null && iceState != "failed" && iceState != "disconnected") {
              		startAnimation();
            	}
            }
          });
        });
      }

	var pc_config = {
			'iceServers' : [ {
				'urls' : 'stun:stun1.l.google.com:19302'
			} ]
		};
	/* 
	//sample turn configuration
	{
     var pc_config = {  iceServers: [
                    		{ 
 							  urls: "",
                      		  username: "",
                      	      credential: "",
                            }
                        ]
					};
    };
    */

	var sdpConstraints = {
		OfferToReceiveAudio : false,
		OfferToReceiveVideo : false
	};
	
	var mediaConstraints = {
		video : true,
		audio : true
	};

	var appName = location.pathname.substring(0, location.pathname.lastIndexOf("/")+1);
	var path =  location.hostname + ":" + location.port + appName + "websocket?rtmpForward=" + rtmpForward;
	var websocketURL =  "ws://" + path;
	
	if (location.protocol.startsWith("https")) {
		websocketURL = "wss://" + path;
	}

	var	webRTCAdaptor = null;
	var selectedRadio = null;
	var selectedAudio = null;

	function initWebRTCAdaptor(publishImmediately, autoRepublishEnabled) 
	{
		webRTCAdaptor = new WebRTCAdaptor({
				websocket_url : websocketURL,
				mediaConstraints : mediaConstraints,
				peerconnection_config : pc_config,
				sdp_constraints : sdpConstraints,
				localVideoId : "localVideo",
				debug:debug,
				bandwidth:maxVideoBitrateKbps,
				dataChannelEnabled : true,
				callback : (info, obj) => {
					if (info == "initialized") {
						console.log("initialized");
						start_publish_button.disabled = false;
						stop_publish_button.disabled = true;
						if (publishImmediately) {
							webRTCAdaptor.publish(streamId, token, subscriberId, subscriberCode, streamName)
						}
						
					} else if (info == "publish_started") {
						//stream is being published
						console.log("publish started");
						start_publish_button.disabled = true;
						stop_publish_button.disabled = false;
						startAnimation();
						if (autoRepublishEnabled && autoRepublishIntervalJob == null) 
						{
							autoRepublishIntervalJob = setInterval(() => {
								checkAndRepublishIfRequired();
							}, 3000);
						}
						webRTCAdaptor.enableStats(obj.streamId);
						enableAudioLevel();
					} else if (info == "publish_finished") {
						//stream is being finished
						console.log("publish finished");
						start_publish_button.disabled = false;
						stop_publish_button.disabled = true;
						$("#stats_panel").hide();
					}
					else if (info == "browser_screen_share_supported") {
						$(".video-source").prop("disabled", false);
						
						console.log("browser screen share supported");
						browser_screen_share_doesnt_support.style.display = "none";
					}
					else if (info == "screen_share_stopped") {
						//choose the first video source. It may not be correct for all cases. 
						$(".video-source").first().prop("checked", true);	
						console.log("screen share stopped");
					}
					else if (info == "closed") {
						//console.log("Connection closed");
						if (typeof obj != "undefined") {
							console.log("Connecton closed: " + JSON.stringify(obj));
						}
					}
					else if (info == "pong") {
						//ping/pong message are sent to and received from server to make the connection alive all the time
						//It's especially useful when load balancer or firewalls close the websocket connection due to inactivity
					}
					else if (info == "refreshConnection") {
						checkAndRepublishIfRequired();
					}
					else if (info == "ice_connection_state_changed") {
						console.log("iceConnectionState Changed: ",JSON.stringify(obj));
					}
					else if (info == "updated_stats") {
						//obj is the PeerStats which has fields
						 //averageOutgoingBitrate - kbits/sec
						//currentOutgoingBitrate - kbits/sec
						console.log("Average outgoing bitrate " + obj.averageOutgoingBitrate + " kbits/sec"
								+ " Current outgoing bitrate: " + obj.currentOutgoingBitrate + " kbits/sec"
								+ " video source width: " + obj.resWidth + " video source height: " + obj.resHeight
								+ "frame width: " + obj.frameWidth + " frame height: " + obj.frameHeight
								+ " video packetLost: "  + obj.videoPacketsLost + " audio packetsLost: " + obj.audioPacketsLost
								+ " video RTT: " + obj.videoRoundTripTime + " audio RTT: " + obj.audioRoundTripTime 
								+ " video jitter: " + obj.videoJitter + " audio jitter: " + obj.audioJitter);

								
						$("#average_bit_rate").text(obj.averageOutgoingBitrate);
						if (obj.averageOutgoingBitrate > 0)  {
							$("#average_bit_rate_container").show();
						}
						else {
							$("#average_bit_rate_container").hide();
						}

						$("#latest_bit_rate").text(obj.currentOutgoingBitrate);
						if (obj.currentOutgoingBitrate > 0) {
							$("#latest_bit_rate_container").show();
						}
						else {
							$("#latest_bit_rate_container").hide();
						}
						var packetLost = parseInt(obj.videoPacketsLost) + parseInt(obj.audioPacketsLost);	
						
						$("#packet_lost_text").text(packetLost);
						if (packetLost > -1) {
							$("#packet_lost_container").show();
						}
						else {
							$("#packet_lost_container").hide();
						}
						var jitter = ((parseFloat(obj.videoJitter) + parseInt(obj.audioJitter)) / 2).toPrecision(3);
						$("#jitter_text").text(jitter);
						if (jitter > 0) {
							$("#jitter_container").show();
						}
						else {
							$("#jitter_container").hide();
						}
					
						var rtt = ((parseFloat(obj.videoRoundTripTime) + parseFloat(obj.audioRoundTripTime)) / 2).toPrecision(3);
						$("#round_trip_time").text(rtt);
						if (rtt > 0) {
							$("#round_trip_time_container").show();
						}
						else {
							$("#round_trip_time_container").hide();
						}
						
						$("#source_width").text(obj.resWidth);
						$("#source_height").text(obj.resHeight);
						if (obj.resWidth > 0 && obj.resHeight > 0) {
							$("#source_resolution_container").show();
						}
						else {
							$("#source_resolution_container").hide();
						}

						$("#ongoing_width").text(obj.frameWidth);
						$("#ongoing_height").text(obj.frameHeight);	
						if (obj.frameWidth > 0 && obj.frameHeight > 0) {
							$("#ongoing_resolution_container").show();
						}
						else {
							$("#ongoing_resolution_container").hide();
						}
						
						$("#on_going_fps").text(obj.currentFPS);
						if (obj.currentFPS > 0) {
							$("#on_going_fps_container").show();
						}
						else {
							$("#on_going_fps_container").hide();
						}

						$("#stats_panel").show();
	
					}
					else if (info == "data_received") {
						var data = obj.data;
						if (data instanceof ArrayBuffer) {
							handleImageData(data);
						}
						else {
							$("#all-messages").append("Received: " + data + "<br>");
						}
					}
					else if (info == "available_devices") {
						var videoHtmlContent = "";
						var audioHtmlContent = "";
						var devices = new Array();
				
						var i = 0;
						obj.forEach(function(device) {
							var label = device.label;
							var deviceId = device.deviceId;
							var devices = new Array();

							devices.forEach(function(same){
								if (same == device.label){
									i += 1;
									label = device.label + " - " + i
									deviceId = device.deviceId + i
								}
							})
							if (device.kind == "videoinput") {
								videoHtmlContent += getCameraRadioButton(label, device.deviceId);
							}
							else if (device.kind == "audioinput"){
								audioHtmlContent += getAudioRadioButton(label, device.deviceId);
							}
							devices.push(device.label)
						}); 
						$('[name="videoSource"]').remove();
						$('[name="audioDeviceSource"]').remove();

						videoHtmlContent += getScreenButton();
						videoHtmlContent += getScreenWithCamButton();

						$(videoHtmlContent).insertAfter(".video-source-legend");
						$(".video-source").first().prop("checked", true);	
						
						$(audioHtmlContent).insertAfter(".audio-source-legend");
						$(".audio-source").first().prop("checked", true);	

						
						if (document.querySelector('input[name="videoSource"]')) {
							document.querySelectorAll('input[name="videoSource"]').forEach((elem) => {
								elem.addEventListener("change", function(event) {
								var item = event.target;
								switchVideoMode(item)
								selectedRadio = item.value;
								});
  							});
						}
						if (document.querySelector('input[name="audioDeviceSource"]')) {
							document.querySelectorAll('input[name="audioDeviceSource"]').forEach((elem) => {
								elem.addEventListener("change", function(event) {
								var item = event.target;
								switchAudioMode(item)
								selectedAudio = item.value;
								});
  							});
						}
						$(":radio[value=" + selectedRadio + "]").prop("checked", true);
						$(":radio[value=" + selectedAudio + "]").prop("checked", true);
					}
					else {
						console.log( info + " notification received");
					}
				},
				callbackError : function(error, message) {
					//some of the possible errors, NotFoundError, SecurityError,PermissionDeniedError
	
					console.log("error callback: " +  JSON.stringify(error));
					var errorMessage = JSON.stringify(error);
					if (typeof message != "undefined") {
						errorMessage = message;
					}
					var errorMessage = JSON.stringify(error);
					if (error.indexOf("NotFoundError") != -1) {
						errorMessage = "Camera or Mic are not found or not allowed in your device";
					}
					else if (error.indexOf("NotReadableError") != -1 || error.indexOf("TrackStartError") != -1) {
						errorMessage = "Camera or Mic is being used by some other process that does not let read the devices";
					}
					else if(error.indexOf("OverconstrainedError") != -1 || error.indexOf("ConstraintNotSatisfiedError") != -1) {
						errorMessage = "There is no device found that fits your video and audio constraints. You may change video and audio constraints"
					}
					else if (error.indexOf("NotAllowedError") != -1 || error.indexOf("PermissionDeniedError") != -1) {
						errorMessage = "You are not allowed to access camera and mic.";
					}
					else if (error.indexOf("TypeError") != -1) {
						errorMessage = "Video/Audio is required";
					}
					else if (error.indexOf("getUserMediaIsNotAllowed") != -1){
						errorMessage = "You are not allowed to reach devices from an insecure origin, please enable ssl";
					}
					else if (error.indexOf("ScreenSharePermissionDenied") != -1) {
						errorMessage = "You are not allowed to access screen share";
						$(".video-source").first().prop("checked", true);						
					}
					else if (error.indexOf("WebSocketNotConnected") != -1) {
						errorMessage = "WebSocket Connection is disconnected.";
					}
					alert(errorMessage);
				}
			});
	}
	
	//initialize the WebRTCAdaptor
	initWebRTCAdaptor(false, autoRepublishEnabled);