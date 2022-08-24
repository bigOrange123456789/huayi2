/**
 * @author Takahiro / https://github.com/takahirox
 */
import {
  AmbientLight,
  AnimationMixer,
  AxesHelper,
  Box3,
  Cache,
  CubeTextureLoader,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  LinearEncoding,
  LoaderUtils,
  LoadingManager,
  DefaultLoadingManager,
  FileLoader,
  PMREMGenerator,
  PerspectiveCamera,
  RGBFormat,
  Scene,
  SkeletonHelper,
  UnsignedByteType,
  Vector3,
  WebGLRenderer,
  sRGBEncoding,
  } from '../lib/three/build/three';
  
import JSZip from 'jszip';


function ZipLoader( manager ) {

	this.manager = ( manager !== undefined ) ? manager : DefaultLoadingManager;
	this.crossOrigin=false

}

function checkJSZipAvailability( onError ) {

	if ( typeof JSZip === 'undefined' ) {

		var error = new Error( 'ZipLoader: Import JSZip https://stuk.github.io/jszip/' );

		if ( onError !== undefined ) {

			onError( error );
			return false;

		} else {

			throw error;

		}

	}

	return true;

}

Object.assign( ZipLoader.prototype, {

	constructor: ZipLoader,

	load: function ( url, onProgress, onError ) {

		if ( ! checkJSZipAvailability( onError ) ) return;

		var scope = this;

		var promise = JSZip.external.Promise;

		var baseUrl = 'blob:' + LoaderUtils.extractUrlBase( url );

		return new promise( function ( resolve, reject ) {
			console.log("url",url)
			console.log("crossOrigin",scope.crossOrigin)
			if(false){//if(scope.crossOrigin){//跨源请求
				// var oReq = new XMLHttpRequest();
				// oReq.getResponseHeader("Content-Type");
        		// oReq.open("POST", url, true);
       	 		// oReq.responseType = "arraybuffer";
        		// oReq.onload =()=>{
				// 	this.count[ip]--
				// 	var data=oReq.response;//ArrayBuffer
				// 	var imageType = oReq.getResponseHeader("Content-Type");
				// 	var blob = new Blob([data], { type: imageType });//用于图片解析
				// 	var unityArray=new Uint8Array(data)//用于glb文件解析
				// 	//callback(unityArray,blob)
				// 	console.log(unityArray)
					
				// 	// resolve(unityArray)
				// }//接收数据
        		// oReq.onerror=reject
        		// oReq.send({"test":123});//发送请求
        	
				
        	var oReq = new XMLHttpRequest();
        	oReq.open("POST", url, true);
        	oReq.responseType = "arraybuffer";
        	oReq.onload = ()=>{
            	var data=oReq.response;//ArrayBuffer
            	var imageType = oReq.getResponseHeader("Content-Type");
            	var blob = new Blob([data], { type: imageType });//用于图片解析
            	var unityArray=new Uint8Array(data)//用于glb文件解析
            	console.log(unityArray,blob)
        	}//接收数据
        	oReq.onerror=(e)=>{
            	console.log(e,url)//异常处理
        	}
        	oReq.send({"test":123});//发送请求



				
			}else{//同源请求
				var loader = new FileLoader( scope.manager );
				loader.setResponseType( 'arraybuffer' );
				loader.load( url, resolve, onProgress, reject );
			}
			
			
			
			

		} ).then( function ( buffer ) {

			return JSZip.loadAsync( buffer );

		} ).then( function ( zip ) {

			var fileMap = {};

			var pendings = [];

			for ( var file in zip.files ) {

				var entry = zip.file( file );

				if ( entry === null ) continue;

				pendings.push( entry.async( 'blob' ).then( function ( file, blob ) {

					fileMap[ baseUrl + file ] = URL.createObjectURL( blob );

				}.bind( this, file ) ) );

			}

			return promise.all( pendings ).then( function () {

				return fileMap;

			} );

		} ).then( function ( fileMap ) {

			return {

				urlResolver: function ( url ) {

					return fileMap[ url ] ? fileMap[ url ] : url;

				},

				find: function ( query ) {

					if ( typeof query === 'string' ) {

						query = new RegExp( query.replace( /\./g, '\\.' ) );

					}

					var files = [];

					for ( var key in fileMap ) {

						if ( key.match( query ) !== null ) {

							files.push( key );

						}

					}

					return files;

				}

			};

		} ).catch( onError );

	}

} );


export { ZipLoader };
