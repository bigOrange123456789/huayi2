import { GLTFLoaderEx } from '../three/examples/jsm/loaders/GLTFLoaderEx.js';//import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import JSZip from 'jszip'
import {
    FileLoader,
    LoaderUtils,
    LoadingManager,
    } from '../three/build/three';
import {CrossDomain} from './CrossDomain.js';
var window={}//用于测试结果的保存
if(false&&!window.multServerTest){//只执行一次//针对多服务器协同的效果进行测试
  window.performance={
    t:0
  }
  setInterval(()=>{
    window.performance.t=window.performance.t+1
  },1)
  window.performance.now=()=>{return window.performance.t}
  
  window.multServerTest={
    packs:{},
    request:[],
    response:[],
    start:window.performance.now(),
    results:[],
    results_arr:[
      [
        'id',
        'nowTime',
        'requestCount',
        'responseCount',

        'sMin',
        'sMax-sMin',
        'sMax',
        'sAve',

        'wMin',
        'wMax-wMin',
        'wMax',
        'wAve',

        'eMin',
        'eMax-eMin',
        'eMax',
        'eAve',
        'err_time'
      ]
    ],
    err_time:0
  }
  function print0(id){
    var sMax=0,sMin=999999999,sAve=0
    var wMax=0,wMin=999999999,wAve=0
    var eMax=0,eMin=999999999,eAve=0
    var index=window.multServerTest.response
    if(index.length==0){
      sMax=sMin=sAve=null
      wMax=wMin=wAve=null
      eMax=eMin=eAve=null
    }
    for(var i=0;i<index.length;i++){
      var p=window.multServerTest.packs[index[i]]
      var s=p.start
      var w=p.wait
      var e=p.end

      if(sMax<s)sMax=s
      if(sMin>s)sMin=s
      sAve+=s

      if(wMax<w)wMax=w
      if(wMin>w)wMin=w
      wAve+=w

      if(eMax<e)eMax=e
      if(eMin>e)eMin=e
      eAve+=e
    }
    if(index.length!==0){
      sAve/=index.length
      wAve/=index.length
      eAve/=index.length
    }
    

    var result={
      id:id,
      now_time:Math.round(window.performance.now()-window.multServerTest.start),

      request_count:window.multServerTest.request.length,
      response_count:window.multServerTest.response.length,
      
      sMin:sMin,
      'sMax-sMin':sMax-sMin,
      sMax:sMax,
      sAve:sAve,

      wMin:wMin,
      'wMax-wMin':wMax-wMin,
      wMax:wMax,
      wAve:wAve,

      eMin:eMin,
      'eMax-eMin':eMax-eMin,
      eMax:eMax,
      eAve:eAve,
      err_time:window.multServerTest.err_time,

      
    }
    window.multServerTest.results.push(result)

    var result_arr=[
      id,
      result.now_time,

      window.multServerTest.request.length,
      window.multServerTest.response.length,

      sMin,
      sMax-sMin,
      sMax,
      sAve,

      wMin,
      wMax-wMin,
      wMax,
      wAve,

      eMin,
      eMax-eMin,
      eMax,
      eAve,

      window.multServerTest.err_time,
    ]
    window.multServerTest.results_arr.push(result_arr)

    console.log(id+":",window.multServerTest)
  }
  print0("0s")
  setTimeout(()=>print0("0.5s"),500)
  setTimeout(()=>print0("1s"),1000)
  setTimeout(()=>print0("2.5s"),2500)
  setTimeout(()=>print0("5s"),5000)
  setTimeout(()=>print0("7.5s"),7500)
  setTimeout(()=>print0("10s"),10*1000)
  setTimeout(()=>print0("15s"),15*1000)
  setTimeout(()=>print0("20s"),20*1000)
  setTimeout(()=>print0("25s"),25*1000)
  setTimeout(()=>print0("30s"),30*1000)
  setTimeout(()=>print0("35s"),35*1000)
  setTimeout(()=>print0("40s"),40*1000)
  setTimeout(()=>print0("50s"),50*1000)
  setTimeout(()=>print0("60s"),60*1000)
  setTimeout(()=>print0("70s"),70*1000)
  // setTimeout(()=>print0("80s"),80*1000)
  // setTimeout(()=>print0("90s"),90*1000)
  
}

var crossDomain=new CrossDomain()
class LoadModel {
  constructor(params) {

    this.url=params.url
    this.meshIndex=params.meshIndex
    this.arrayBuffers=[] //二进制数据
    this.fileMap={} //储存原始路径和对应blob
    this.modelUrl='' //gltf文件路径
    this.crossDomain=true//false //是否开启跨域请求的方式
    this.crossDomainSocket=[
      //"localhost:8081"
    ]
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
      if(window)if(window.multServerTest)window.multServerTest.err_time++
      setTimeout(()=>{
        this.request0(
          crossDomain.getSocket(),//换一台服务器请求
          cb
        )//重新请求
      },1000*(0.5*Math.random()+1))//1~1.5秒后重新加载
      console.log(e,path)
    }
    oReq.send(path);//发送请求
  }
  loadZipFile(){
    var socket0=crossDomain.getSocket()
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
          if(window.multServerTest){
            window.multServerTest.response.push(this.meshIndex)
            var pack=window.multServerTest.packs[this.meshIndex]
            var start_time=pack["start"]
            var end_time=window.performance.now()-window.multServerTest.start
            var wait_time=end_time-start_time
            window.multServerTest.packs[this.meshIndex]={
              start:start_time,
              wait:wait_time,
              end:end_time,
            }
          }//if(window.multServerTest)
        }
      )

    })

    

  }
}
onmessage=ev=>{
  if(window.multServerTest){
    window.multServerTest.request.push(ev.data.meshIndex)
    window.multServerTest.packs[ev.data.meshIndex]={}
    window.multServerTest.packs[ev.data.meshIndex]["start"]=
        window.performance.now()-window.multServerTest.start
    
  }
  new LoadModel({
    url:ev.data.url,
    meshIndex:ev.data.meshIndex,
  })
}

