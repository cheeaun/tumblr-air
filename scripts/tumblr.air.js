/**
 * @author cheeaun
 */

var API_WRITE_URL = 'http://www.tumblr.com/api/write';
var JSON = runtime.com.adobe.serialization.json.JSON;
var email, password;
var ONLINE;
var SAVED_FILE = 'settings.sav';
var file = air.File.applicationStorageDirectory.resolvePath(SAVED_FILE);
var settings = {
	'rememberEmailPassword': false
};

window.addEvent('load',function(){
	init();
	display_version();
	monitor_http();
	init_events();
})

// Initialize settings before showing window
function init(){
	// Load settings
	load_settings();
	
	// Initialize settings
	init_settings();

	$$('#window-content div[id*="panel"]').each(function(el){
		el.addClass('h'+el.getStyle('height').toInt());
		if(!el.id.contains('login')) el.setStyle('height',0);
	});
	set_stage_height();

	nativeWindow.x = (air.Capabilities.screenResolutionX - nativeWindow.width) / 2;
	nativeWindow.y = (air.Capabilities.screenResolutionY - nativeWindow.height) / 4;
	
	nativeWindow.visible = true;
	nativeWindow.activate();
}

// Initialize events
function init_events(){
	new Tips($$('a'),{
		showDelay: 1000
	});

	$('login-button').addEvent('click', function(e){
		if(!$('email').value.length || !$('password').value.length){
			$('login-error').setHTML("Please fill in all fields.");
		}
//		else if(!ONLINE){
//			alert('Sorry, you are not connected to the Internet.');
//		}
		else{
			e = new Event(e).stop();
			this.disabled = true;
			$('email').disabled = true;
			$('password').disabled = true;
			$('login-error').empty();
			
			var variables = new air.URLVariables();
			variables.email = $('email').value.trim();
			variables.password = $('password').value.trim();
			variables.action = 'authenticate';
		
			var request = new air.URLRequest(API_WRITE_URL);
			request.data = variables;
			request.method = air.URLRequestMethod.POST;
		
			var loader = new air.URLLoader();
			loader.addEventListener(air.Event.COMPLETE, function(e){
				var data = e.target.data;
				if(data.contains('failed')){
					$('login-error').setHTML(data);
				}
				else{
					email = $('email').value.trim();
					password = $('password').value.trim();
					
					if($('remember-email-password').checked){
				        var bytes = new air.ByteArray();
				        bytes.writeUTFBytes(email);
				        air.EncryptedLocalStore.setItem('email', bytes);

				        var bytes = new air.ByteArray();
				        bytes.writeUTFBytes(password);
				        air.EncryptedLocalStore.setItem('password', bytes);
						
						settings['rememberEmailPassword'] = true;
					}
					else{
						settings['rememberEmailPassword'] = false;
						
						air.EncryptedLocalStore.removeItem('email');
						air.EncryptedLocalStore.removeItem('password');
					}
					
					// Assume 'data' is url of the tumblr site
					$('tumblr-site').setHTML('Post to: <a href="'+data+'">'+data+'</a>');
					switch_panels('login-panel','dashboard-panel');
				}
				$('login-button').disabled = false;
				$('email').disabled = false;
				$('password').disabled = false;
			});
			try{
				loader.load(request);
			}
			catch(e){
				alert('Error login!');
			}
		}
	});
	
	$$(['email','password']).addEvent('keydown', function(e){
		var e = new Event(e);
		if(e.key == 'enter'){
			$('login-button').fireEvent('click');
		}
	});
	
	$('logout-button').addEvent('click', function(e){
		e = new Event(e).stop();
		switch_panels('dashboard-panel','login-panel');
	});
	
	$$('#dashboard-panel a').addEvent('click', function(e){
		e = new Event(e).stop();
		var panel = this.getProperty('href').substring(1);

		switch_panels('dashboard-panel',panel);
	});
	
	$$('.cancel-button').addEvent('click', function(e){
		e = new Event(e).stop();
		var form = this.getParent().getParent();
		var panel = form.getParent().id;

		var empty_forms = true;
		$(form).getFormElements().each(function(el){
			if(el.getValue()){
				empty_forms = false;
				return;
			}
		});
		
		if(empty_forms)
			switch_panels(panel,'dashboard-panel');
		else if(confirm('Cancel editing this post? All changes will be lost.')){
			$(form).getFormElements().each(function(el){
				switch(el.getTag()){
					case 'input': if(!['file', 'text', 'password'].contains(el.type)) break;
					case 'textarea': el.value = '';
				}
			});
			switch_panels(panel,'dashboard-panel');
		}
	});
}

function set_stage_height(height){
	if(!$defined(height)) height = 0;
	var window_height = $('window-title').getSize().size.y + $('window-content').getSize().size.y+height;
	nativeWindow.stage.stageHeight = window_height;
}

function switch_panels(old_panel, new_panel){
	var old_panel_fx = new Fx.Style(old_panel, 'height');
	var new_panel_fx = new Fx.Style(new_panel, 'height');

	var new_panel_height = $(new_panel).className.substring(1).toInt();
//	alert(new_panel + ' ' + new_panel_height);
	old_panel_fx.start(0).chain(function(){
		set_stage_height(new_panel_height);
		new_panel_fx.start(0,new_panel_height);
	});
}

// Display version of app
function display_version() {
	var appdesc = air.Shell.shell.applicationDescriptor;
	var xmlobject = (new DOMParser()).parseFromString(appdesc, "text/xml");
	var root = xmlobject.getElementsByTagName ('application')[0];
	var ver = root.getAttribute("version");
	var version = new Element('span',{'id':'version'});
	version.injectInside($$('h1')[0]);
	version.setText(' ' + ver);
}

// Monitor HTTP connectivity
var monitor = null;
function monitor_http(){
	var request = new air.URLRequest('http://tumblr.com/');
	request.method = "HEAD"; // Tip from http://www.davidtucker.net/2007/08/21/air-tip-1-%E2%80%93-monitoring-your-internet-connection/

	monitor = new air.URLMonitor(request);
	monitor.addEventListener(air.StatusEvent.STATUS, function init_status(){
		ONLINE = monitor.available;
		if(monitor.available){
		}
		else{
		}
	});
	monitor.start();
}

// Fix web links to open in default browser
function fix_airlinks(){
	$$('a[href]').addEvent('click',function(e){
		e.preventDefault(); // prevent open INSIDE the nativeWindow
		air.navigateToURL(new air.URLRequest(this.href));
	});
}

function close_window(){
	// Save settings
	save_settings();

	nativeWindow.close();
}

// Load settings
function load_settings(){
	try{
		stream = new air.FileStream();
		stream.open(file, air.FileMode.READ);
		var str = stream.readUTFBytes(stream.bytesAvailable);
		stream.close();
		var inData = str.split(air.File.lineEnding);

		if(inData)
			settings['rememberEmailPassword'] = !!inData[0];
	}
	catch(error){
	}
}

// Save settings
function save_settings(){
	try{
		stream = new air.FileStream();
		stream.open(file, air.FileMode.WRITE);
		var br = air.File.lineEnding;
		var outData = settings['rememberEmailPassword'];
		stream.writeUTFBytes(outData);
	}
	catch(error){
	}
}

// Initialize settings
function init_settings(){
	if(settings['rememberEmailPassword'] == true){
		// Get saved email and password
		var storedValue = air.EncryptedLocalStore.getItem("email");
		if(storedValue) email = storedValue.readUTFBytes(storedValue.length);
		storedValue = air.EncryptedLocalStore.getItem("password");
		if(storedValue) password = storedValue.readUTFBytes(storedValue.length);

		$('email').value = email;
		$('password').value = password;
		$('remember-email-password').checked = true;
	}
}
