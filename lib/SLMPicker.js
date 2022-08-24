import {
	FloatType,
	NearestFilter,
	Vector3,
	WebGLRendererEx,
	WebGLRenderTarget,
	DepthTexture,
	UnsignedIntType,
	MeshNormalMaterial,
	Vector4,
	Vector2,
	TextureLoader,
	Texture,
  } from '../lib/three/build/three';

import { SLMConstansts } from './SLMLoader';

var SLMPicker = function(options)
{
	var scope = this;

	this.scene = (options && options.scene !== undefined) ? options.scene : null;

	this.el = (options && options.el !== undefined) ? options.el : null;

	this.DEBUG_OFFLINE_RT = false;

	this.pickingTasks = [];

	this.activeMaterials = [];

	this.options = {};

	function Initialize(options) 
	{
		var MAX_OFFSCREEN_WIDTH = 200;
		scope.offlineWidth = MAX_OFFSCREEN_WIDTH;
		scope.offlineHeight = scope.el.clientHeight / scope.el.clientWidth * scope.offlineWidth;

		scope.offlineRenderer = new WebGLRendererEx();
		scope.offlineRenderer.setPixelRatio(window.devicePixelRatio);
		scope.offlineRenderer.setSize(scope.offlineWidth, scope.offlineHeight);
		scope.offlineRenderer.setClearColor( 0xffffff );
		scope.offlineRenderer.autoClear = false;

		// DEBUG
		if (scope.DEBUG_OFFLINE_RT)
		{
			scope.offlineRenderer.domElement.style.position = "absolute";
			scope.offlineRenderer.domElement.style.bottom = "0px";
			scope.offlineRenderer.domElement.style.left = "0px";
		}
		else
		{
			scope.offlineRenderer.domElement.style.display = 'none';
		}

		//scope.el = document.createElement('div');

		scope.el.appendChild(scope.offlineRenderer.domElement);

		//scope.offlineRendererContext = scope.offlineRenderer.domElement.getContext('2d');

		scope.pickingRenderTarget = new WebGLRenderTarget(scope.offlineWidth, scope.offlineHeight);
		scope.pickingRenderTarget.texture.generateMipmaps = false;
		scope.pickingRenderTarget.texture.minFilter = NearestFilter;
		scope.pickingRenderTarget.texture.magFilter = NearestFilter;
		scope.pickingRenderTarget.stencilBuffer = false;
		scope.pickingRenderTarget.depthBuffer = true;
		scope.pickingRenderTarget.depthTexture = new DepthTexture();
		scope.pickingRenderTarget.depthTexture.type = UnsignedIntType;

		scope.ndRenderTarget = new WebGLRenderTarget(scope.offlineWidth, scope.offlineHeight, {type: FloatType});
		scope.ndRenderTarget.texture.generateMipmaps = false;
		scope.ndRenderTarget.texture.minFilter = NearestFilter;
		scope.ndRenderTarget.texture.magFilter = NearestFilter;
		scope.ndRenderTarget.stencilBuffer = false;

		scope.pixelBuffer = new Uint8Array( 4 );

		scope.pixelBufferFloat = new Float32Array(4);

		scope.currentPickedId = 0xffffff;

		//this.MaxColorIdStep = 40;

		//scope.idColorOverrideMaterial = new MeshBasicMaterial();
	}

	this.SetupInstancedShaderWithVertexColor = function(srcMaterial, options)
	{
		this.options = options;

		/***************************************************************/
		// intstanceColor: 
		// R,G,B -> encoded Picking Id
		// W -> encoded state
		// --W = 0.0 -> invisible
		// --W != 0.0 -> visible
		// ----W > 0.0 -> Opaque
		// ----W < 0.0 -> Transparent
		// ------bit 1,2 -> wireframe
		// ------bit 3-31 -> color
		/***************************************************************/

		var decodeColor = [
			'vec3 unpackColor(float f) {',
			'vec3 color;',
			'color.b = floor(f / 16384.0);',
			'color.g = floor(f / 128.0 - color.b * 128.0);',
			'color.r = floor(f - color.b * 16384.0 - color.g * 128.0);',
			'return color / 128.0;',
			'}',
		].join('\n');

		var colorParsChunk = [
			'attribute vec4 instanceColor;',
			'varying vec4 vInstanceColor;',
			'varying vec3 vExternalColor;',
			options.wireframe ? 'attribute vec3 uv3;' + 
								'varying vec3 vBarycentric;':'',
			options.lighting ? 'varying vec2 vLightingTexcoord;' + 
								'attribute vec4 instanceTexcoord;' + 
								'varying vec4 vInstanceTexcoord;':'',
			decodeColor,
			'#include <common>'
		].join( '\n' );

		var instanceColorChunk = [
			'#include <begin_vertex>',
			'vInstanceColor = instanceColor;',
			options.wireframe ? 'vBarycentric = uv3.xyz;':'',
			options.lighting ? 'vLightingTexcoord = uv2.xy;' + 
							   'vInstanceTexcoord = instanceTexcoord;':'',
			'vExternalColor = unpackColor(floor(abs(vInstanceColor.w) * 0.25));',
		].join( '\n' );

		var uv2TransformChunk = [
			'#include <fog_vertex>',
			options.lighting ? 'float signFlag = sign(vInstanceTexcoord.z) * 0.5 + 0.5, atlasAspect = abs(vInstanceTexcoord.z), heightAspect = fract(vInstanceTexcoord.w);' + 
							   'vUv2 = vec2(vInstanceTexcoord.x + vLightingTexcoord.x * signFlag + (1.0 - signFlag) * (heightAspect - vLightingTexcoord.y * atlasAspect) , vInstanceTexcoord.y + vLightingTexcoord.y * signFlag + (1.0 - signFlag) * (vLightingTexcoord.x / atlasAspect));' + 
							   'vUv2 = vec2(vUv2.x, 1.0 - vUv2.y);': '',
		].join('\n');

		var detectEdge = [
			'float detectEdge(){',
			'vec3 d = fwidth(vBarycentric);',
			'vec3 a3 = smoothstep(vec3(0.0), d * edgeParams.w, vBarycentric);',
			'return min(min(a3.x, a3.y), a3.z);',
			'}',
		].join('\n');

		var fragmentParsChunk = [
			'varying vec4 vInstanceColor;',
			'varying vec3 vExternalColor;',
			options.wireframe ? 'varying vec3 vBarycentric;' + 
								'uniform vec4 edgeParams;' + 
								detectEdge: '',
			options.lighting ? 'varying vec2 vLightingTexcoord;' + 
							   'varying vec4 vInstanceTexcoord;':'',
			'#include <common>',
		].join( '\n' );

		var diffuseColorChunk = [
			'if (vInstanceColor.w == 0.0)discard;',
			'float opacityEpsilon = sign(vInstanceColor.w);',
			'float externalColorFlag = step(0.000001, abs(floor(vInstanceColor.w * 0.5)));',
			'vec4 diffuseColor = vec4(diffuse * (1.0 - externalColorFlag) + vExternalColor * externalColorFlag, opacity);',
		].join( '\n' );

		var fragColorChunk = [
			options.wireframe ? 'outgoingLight.xyz = mix(edgeParams.xyz, outgoingLight.xyz, max(0.0, detectEdge()));':'',
			'gl_FragColor = vec4(outgoingLight, diffuseColor.a );',
		].join( '\n' );

		srcMaterial.userData = 
		{
			edgeParams : {type: 'v', value: new Vector4(0.0, 0.0, 0.0, 2.5)}
		};

		srcMaterial.onBeforeCompile = function ( shader ) 
		{
			shader.vertexShader = shader.vertexShader
				.replace( '#include <common>', colorParsChunk )
				.replace( '#include <begin_vertex>', instanceColorChunk )
				.replace( '#include <fog_vertex>', uv2TransformChunk );

			shader.fragmentShader = shader.fragmentShader
				.replace( '#include <common>', fragmentParsChunk )
				.replace( 'vec4 diffuseColor = vec4( diffuse, opacity );', diffuseColorChunk )
				.replace( 'gl_FragColor = vec4( outgoingLight, diffuseColor.a );', fragColorChunk );

			shader.uniforms.edgeParams = srcMaterial.userData.edgeParams;
		};

		scope.activeMaterials.push(srcMaterial);

		if (options.wireframe)
		{
			srcMaterial.extensions = {
				derivatives: true
			 };
		}

		if (options.lighting)
		{
			srcMaterial.lightMap = new Texture();
		}

		if (!scope.idColorOverrideMaterial)
		{
			scope.idColorOverrideMaterial = srcMaterial.clone();
		}
	}

	this.SetupMaterials = function()
	{
		if (scope.options.lighting && scope.options.id != null)
		{
			var lightMapLoader = new TextureLoader();
			lightMapLoader.load('assets/models/' + scope.options.id + '/atlas_0_lm.png', 
				function(texture)
				{
					for (var i = 0; i < scope.activeMaterials.length; ++i)
					{
						scope.activeMaterials[i].lightMap = texture;
						scope.activeMaterials[i].lightMap.flipY = true;
					}
				}
			)
		}
	}

	this.SetGlobalEdgeColor = function(_color)
	{
		for (var i = 0; i < scope.activeMaterials.length; ++i)
		{
			scope.activeMaterials[i].userData.edgeParams.value.x = _color.r;
			scope.activeMaterials[i].userData.edgeParams.value.y = _color.g;
			scope.activeMaterials[i].userData.edgeParams.value.z = _color.b;
		}
	}

	this.SetGlobalEdgeThickness = function(_thickness)
	{
		for (var i = 0; i < scope.activeMaterials.length; ++i)
		{
			scope.activeMaterials[i].userData.edgeParams.value.w = _thickness;
		}
	}

	function RenderOfflinePickModule(currentCamera)
	{
		//if (!scope.idColorOverrideMaterial)
		//scope.idColorOverrideMaterial = new MeshBasicMaterial();

		// Must call! Different render context need to recomple materials shader
		if (scope.idColorOverrideMaterial)
		{
			var colorParsChunk = [
				'attribute vec4 instanceColor;',
				'varying vec4 vInstanceColor;',
				'#include <common>'
			].join( '\n' );
		
			var instanceColorChunk = [
				'#include <begin_vertex>',
				'\tvInstanceColor = instanceColor;'
			].join( '\n' );
		
			var fragmentParsChunk = [
				'varying vec4 vInstanceColor;',
				'#include <common>'
			].join( '\n' );
		
			var colorChunk = [
				'gl_FragColor = vec4(vInstanceColor.xyz, 1.0 );'
			].join( '\n' );
		
			scope.idColorOverrideMaterial.onBeforeCompile = function ( shader ) 
			{
				shader.vertexShader = shader.vertexShader
				.replace( '#include <common>', colorParsChunk )
				.replace( '#include <begin_vertex>', instanceColorChunk );
		
				shader.fragmentShader = shader.fragmentShader
				.replace( '#include <common>', fragmentParsChunk )
				.replace( 'gl_FragColor = vec4( outgoingLight, diffuseColor.a );', colorChunk );
			};
		}

		scope.scene.overrideMaterial = scope.idColorOverrideMaterial;

		if (scope.DEBUG_OFFLINE_RT)
		{
			scope.offlineRenderer.setRenderTarget(null);
		}
		else
		{
			scope.offlineRenderer.setRenderTarget(scope.pickingRenderTarget);
		}

		scope.offlineRenderer.clearDepth();
		scope.offlineRenderer.clear();

		scope.offlineRenderer.render( scope.scene, currentCamera);
		scope.scene.overrideMaterial = null;
	}

	function RenderOfflineNormalDepth(currentCamera)
	{
		if (!scope.normalDepthOverrideMaterial)
		scope.normalDepthOverrideMaterial = new MeshNormalMaterial();

		// Must call! Different render context need to recomple materials shader
		if (scope.normalDepthOverrideMaterial)
		{
			var vertexDefChunk = [ 
				'varying vec4 projectionPosition;',
				'varying vec4 modelviewPosition;',
				'varying vec3 worldNormal;',
				'#include <common>'
			].join('\n');

			var vertexShaderChunk = [
				'projectionPosition = projectionMatrix * mvPosition;',
				'modelviewPosition = mvPosition;',
				'#include <clipping_planes_vertex>',
				'worldNormal = normal;'
			].join('\n');

			var fragmentDefChunk = [
				'varying vec4 projectionPosition;',
            	'varying vec4 modelviewPosition;',
				'varying vec3 worldNormal;',
                'uniform sampler2D tDepth;',
				'#include <packing>',
			].join( '\n' );

			var fragmentShaderChunk = [
				'vec2 screenUV = (projectionPosition.xy / vec2( projectionPosition.w) + vec2(1.0)) * 0.5;',
                'float sceneRawDepth = texture2D( tDepth, screenUV ).x;',
				'gl_FragColor = vec4(packNormalToRGB(worldNormal), sceneRawDepth);',
			].join( '\n' );

			scope.normalDepthOverrideMaterial.onBeforeCompile = function ( shader ) 
			{
				shader.uniforms.tDepth = {value: scope.pickingRenderTarget.depthTexture};

				shader.vertexShader =shader.vertexShader.
				replace('#include <common>', vertexDefChunk).
				replace('#include <clipping_planes_vertex>', vertexShaderChunk);

				shader.fragmentShader = shader.fragmentShader
				.replace( '#include <packing>', fragmentDefChunk )
				.replace( 'gl_FragColor = vec4( packNormalToRGB( normal ), opacity );', fragmentShaderChunk );
			};
		}

		scope.scene.overrideMaterial = scope.normalDepthOverrideMaterial;

		if (scope.DEBUG_OFFLINE_RT)
		{
			scope.offlineRenderer.setRenderTarget(null);
		}
		else
		{
			scope.offlineRenderer.setRenderTarget(scope.ndRenderTarget);
		}

		scope.offlineRenderer.clearDepth();

		scope.offlineRenderer.render( scope.scene, currentCamera);
		scope.scene.overrideMaterial = null;
	}

	function getWorldPositionFromDepth(activeCamera, screenUV, depth) 
	{
		var clipPosition = new Vector4(screenUV.x * 2.0 - 1.0, -(screenUV.y * 2.0 - 1.0), depth * 2.0 - 1.0, 1.0).applyMatrix4(activeCamera.projectionMatrixInverse);
		var viewPosition = new Vector4(clipPosition.x / clipPosition.w , clipPosition.y / clipPosition.w, clipPosition.z / clipPosition.w, 1.0).applyMatrix4(activeCamera.matrixWorld);

		return viewPosition;
	}

	this.GetPickedIdByMouseEx = function(mouseX, mouseY/* 0 <= mouseX <=1, 0 <= mouseY <= 1*/, currentCamera, callback)
	{
		currentCamera.layers.set(SLMConstansts.SceneLayerMask);

		var x = mouseX * scope.offlineWidth;
		var y = mouseY * scope.offlineHeight;

		// Get picking id
		RenderOfflinePickModule(currentCamera);
		
		scope.offlineRenderer.readRenderTargetPixels(scope.pickingRenderTarget, x, scope.offlineHeight - y, 1, 1, scope.pixelBuffer);

		// Decode picking id
		var pickedId = ( scope.pixelBuffer[ 0 ] << 16 ) | ( scope.pixelBuffer[ 1 ] << 8 ) | ( scope.pixelBuffer[ 2 ] );

		// Get normal & depth
		RenderOfflineNormalDepth(currentCamera);
		
		scope.offlineRenderer.readRenderTargetPixels(scope.ndRenderTarget, x, scope.offlineHeight - y, 1, 1, scope.pixelBufferFloat);

		// Decode normal & depth
		var normal = new Vector3((scope.pixelBufferFloat[0] * 2.0 - 1.0), (scope.pixelBufferFloat[1] * 2.0 - 1.0), (scope.pixelBufferFloat[2] * 2.0 - 1.0));
		var position = getWorldPositionFromDepth(currentCamera, new Vector2(mouseX, mouseY), scope.pixelBufferFloat[3]);

		var rt = {
			pickedId: pickedId,
			normal: normal,
			position: position
		};

		if (callback)
		{
			callback(rt);
		}

		currentCamera.layers.enableAll();

		return rt;
	}

	if (options.EnablePicking)
	{
		Initialize(options);
	}
}

export { SLMPicker }