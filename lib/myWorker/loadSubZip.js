import {CrossDomain} from './CrossDomain.js';
import {LoadModel} from './LoadModel.js';
import {RequestOrderManager} from './RequestOrderManager.js';
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
// var requestOrderManager=new RequestOrderManager({
//   loaded:[],
//   stackSize:1000,
//   waitNumberMax:100,
//   request:null
// })

// onmessage=ev=>{
//   if(window.multServerTest){//用于测试
//     window.multServerTest.request.push(ev.data.meshIndex)
//     window.multServerTest.packs[ev.data.meshIndex]={}
//     window.multServerTest.packs[ev.data.meshIndex]["start"]=
//         window.performance.now()-window.multServerTest.start
    
//   }
//   new LoadModel({
//     url:ev.data.url,
//     meshIndex:ev.data.meshIndex,
//   })
// }
// onmessage=ev=>{
//   if(ev.data.type==""){
//     new LoadModel({
//       url:ev.data.url,
//       meshIndex:ev.data.meshIndex,
//       crossDomain:crossDomain
//     })
//   }else if(ev.data.type=="list"){
//     // console.log(ev.data.list)
//   }
// }

var requestOrderManager=new RequestOrderManager({
  loaded:[],
  stackSize:1000,
  waitNumberMax:150,
  crossDomain:crossDomain
})
onmessage=ev=>{
  // console.log(ev)
  if(ev.data.type==""){
  }else if(ev.data.type=="list"){
    requestOrderManager.addDemand(ev.data.list)
  }
  
}