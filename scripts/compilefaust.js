"use strict";

var isWebKitAudio = (typeof(webkitAudioContext) !== "undefined");
var isWasm = (typeof(WebAssembly) !== "undefined");
var isPoly = false;

if (!isWasm) {
	alert("WebAssembly is not supported in this browser, the page will not work !")
}

var audio_context = (isWebKitAudio) ? new webkitAudioContext() : new AudioContext();
var buffer_size = 256;
var audio_input = null;
var midi_input = [];
var factory = null;
var DSP = null;
var dsp_code = null;
var faust_svg = null;
var poly_flag = "OFF";
var ftz_flag = "2";
var poly_nvoices = 16;
var rendering_mode = "ScriptProcessor";
var output_handler = null;

// compute libraries URL relative to current page
var wurl =  window.location.href;
var libraries_url = wurl.substr(0, wurl.lastIndexOf('/')) + "/libraries/";
console.log("URL:", libraries_url);

function deleteDSP()
{
	if (DSP) {
		if (audio_input) {
			audio_input.disconnect(DSP);
		}
		DSP.disconnect(audio_context.destination);
		if (isPoly) {
			faust.deletePolyDSPInstance(DSP);
		} else {
			faust.deleteDSPInstance(DSP);
		}
		_f4u$t.hard_delete(faust_svg);

		DSP = null;
		faust_svg = null;
	}
}

function activateMonoDSP(dsp)
{
    if (!dsp) {
        alert(faust.getErrorMessage());
        // Fix me
        document.getElementById('faustuiwrapper').style.display = 'none';
        return;
    }
    
    DSP = dsp;
    if (DSP.getNumInputs() > 0) {
        activateAudioInput();
    } else {
        audio_input = null;
    }
    
    // Setup UI
    faust_svg = $('#faustui');
    output_handler = _f4u$t.main(DSP.getJSON(), $(faust_svg), function(path, val) { DSP.setParamValue(path, val); });
    DSP.setOutputParamHandler(output_handler);
    console.log(DSP.getNumInputs());
    console.log(DSP.getNumOutputs());
    //DSP.metadata({ declare: function(key, value) { console.log("key = " + key + " value = " + value); }});
    DSP.connect(audio_context.destination);
    
    loadDSPState();
}

function activatePolyDSP(dsp)
{
    if (!dsp) {
        alert(faust.getErrorMessage());
        // Fix me
        document.getElementById('faustuiwrapper').style.display = 'none';
        return;
    }
    
    checkPolyphonicDSP(dsp.getJSON());
    DSP = dsp;
    
    if (DSP.getNumInputs() > 0) {
        activateAudioInput();
    } else {
        audio_input = null;
    }
    
    // Setup UI
    faust_svg = $('#faustui');
    output_handler = _f4u$t.main(DSP.getJSON(), $(faust_svg), function(path, val) { DSP.setParamValue(path, val); });
    DSP.setOutputParamHandler(output_handler);
    console.log(DSP.getNumInputs());
    console.log(DSP.getNumOutputs());
    //DSP.metadata({ declare: function(key, value) { console.log("key = " + key + " value = " + value); }});
    DSP.connect(audio_context.destination);
    
    loadDSPState();
}

function compileMonoDSP(factory)
{
    if (rendering_mode === "ScriptProcessor") {
        console.log("ScriptProcessor createDSPInstance");
        faust.createDSPInstance(factory, audio_context, buffer_size, activateMonoDSP);
    } else {
        console.log("Worklet createDSPWorkletInstance");
        faust.createDSPWorkletInstance(factory, audio_context, activateMonoDSP);
    }
}

function compilePolyDSP(factory)
{
    if (rendering_mode === "ScriptProcessor") {
        console.log("ScriptProcessor createPolyDSPInstance");
        faust.createPolyDSPInstance(factory, audio_context, buffer_size, poly_nvoices, activatePolyDSP);
    } else {
        console.log("Worklet createPolyDSPWorkletInstance");
        faust.createPolyDSPWorkletInstance(factory, audio_context, poly_nvoices, activatePolyDSP);
    }
}

function workletAvailable()
{
    if (typeof (OfflineAudioContext) === "undefined") return false;
    var context = new OfflineAudioContext(1, 1, 44100);
    return context.audioWorklet && typeof context.audioWorklet.addModule === 'function';
}

function compileDSP()
{
	if (!dsp_code) {
		return;
	}
	
	deleteDSP();

	// Prepare argv list
	var argv = [];
	argv.push("-ftz");
	argv.push(ftz_flag);
	argv.push("-I");
	argv.push(libraries_url);

	console.log(argv);

	if (poly_flag === "ON") {

		isPoly = true;
		console.log("Poly DSP");

		// Create a poly DSP factory from the dsp code
		faust.createPolyDSPFactory(dsp_code,
			argv,
			function(factory) {
				if (!factory) {
					alert(faust.getErrorMessage());
					// Fix me
					document.getElementById('faustuiwrapper').style.display = 'none';
					return;
				}
                compilePolyDSP(factory);
			});

	} else {

		isPoly = false;
		console.log("Mono DSP");

		// Create a mono DSP factory from the dsp code
		faust.createDSPFactory(dsp_code,
			argv,
			function(factory) {
				if (!factory) {
					alert(faust.getErrorMessage());
					// Fix me
					document.getElementById('faustuiwrapper').style.display = 'none';
					return;
				}
				compileMonoDSP(factory);
			});
	}
}
