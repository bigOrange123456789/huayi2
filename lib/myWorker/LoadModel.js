import { GLTFLoaderEx } from '../three/examples/jsm/loaders/GLTFLoaderEx.js';//import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import JSZip from 'jszip'
import {
    FileLoader,
    LoaderUtils,
    LoadingManager,
    } from '../three/build/three';

class LoadModel {//对一个构件的加载处理
  constructor(params) {
    this.crossDomain=params.crossDomain
    this.url=params.url
    this.meshIndex=params.meshIndex
    this.finish_cb=params.finish_cb
    this.arrayBuffers=[] //二进制数据
    this.fileMap={} //储存原始路径和对应blob
    this.modelUrl='' //gltf文件路径
    this.init()
  }
  async init(){
    await this.loadZipFile()
    await this.fileToBlob()
    this.findFile()
    this.runLoader()
  }
  request0(socket0,cb){//跨域访问请求
    var path="dist/assets/models/huayi/"+this.meshIndex+".zip"
    var oReq = new XMLHttpRequest();
    oReq.open("POST", "http://"+socket0, true);
    oReq.responseType = "arraybuffer";
    oReq.onload = ()=>{
        this.arrayBuffers=oReq.response;//ArrayBuffer
        cb()
    }//接收数据
    oReq.onerror=e=>{//异常处理
      setTimeout(()=>{
        this.request0(
          this.crossDomain.getSocket(),//换一台服务器请求
          cb
        )//重新请求
      },1000*(0.5*Math.random()+1))//1~1.5秒后重新加载
      console.log("error",e,path)
    }
    oReq.send(path);//发送请求
  }
  loadZipFile(){
    var socket0=this.crossDomain.getSocket()
    if(socket0){//跨域访问请求
      return new Promise(resolve=>{
        this.request0(
          socket0,
          ()=>resolve()
        )
      })
    }else{//同源访问请求
      return new Promise(resolve => {
        const fileLoader = new FileLoader()
        fileLoader
          .setResponseType("arraybuffer")
          .load(
            this.url,
            data => {
              this.arrayBuffers=data
              resolve()
            },
          )
      })
    }
  }
  async fileToBlob(){
    //zip.js加载文件流生成对应文件:
    const zip = new JSZip();
    const promise = JSZip.external.Promise;
    const baseUrl = 'blob:' + LoaderUtils.extractUrlBase(this.url);
    const pendings = [];
    await zip.loadAsync(this.arrayBuffers);
    //转成blob文件，用URL.createObjectURL创建文件的url
    for (let file in zip.files) {
      const entry = zip.file(file);
      if (entry === null) continue;
      pendings.push(entry.async('blob').then(((file, blob) => {
        this.fileMap[baseUrl + file] = URL.createObjectURL(blob);
      }).bind(this, file)))
    }
    //监听所有请求结束
    await promise.all(pendings);
  }
  findFile(){
    this.modelUrl = Object.keys(this.fileMap).find(item => /\.(glb)$/.test(item));//模型文件url
    this.jsonUrl=Object.keys(this.fileMap).find(item => /\.(json)$/.test(item));
  }
  runLoader(){
    var scope=this
    const manager = new LoadingManager();//转换处理，传入的是后台返回的路径，需找到对应blob
    manager.setURLModifier(url => {
      return this.fileMap[url] ? this.fileMap[url] : url;
    })
    this.gltfLoader = new GLTFLoaderEx(manager)
    this.gltfLoader.load(this.modelUrl, (glb)=> {
      var myArray=this.gltfLoader.myArray
          
      var loadingManager2 = new LoadingManager();
			loadingManager2.setURLModifier(url => {
        return this.fileMap[url] ? this.fileMap[url] : url;
      })
			new FileLoader(loadingManager2).load(
        scope.jsonUrl,
        data0=>{
          var json0=JSON.parse(data0)
          postMessage({
            "meshIndex":this.meshIndex,
            "myArray":myArray,
            "matrixConfig":json0.matrixConfig,//matrixConfig,
            "structdesc0":json0.structdesc0,//structdesc0
          })  
          if(scope.finish_cb)scope.finish_cb()
        }
      )

    })

    

  }
}
export{LoadModel}