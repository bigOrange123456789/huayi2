import {CrossDomain} from './CrossDomain.js';
import {RequestOrderManager} from './RequestOrderManager.js';

var crossDomain=new CrossDomain()

var requestOrderManager=new RequestOrderManager({
  loaded:[],
  stackSize:10000,
  waitNumberMax:200,//150,
  crossDomain:crossDomain
})
setTimeout(()=>{
  requestOrderManager.waitNumberMax=150
},500)
setTimeout(()=>{
  requestOrderManager.waitNumberMax=100
},2000)


onmessage=ev=>{
  // console.log(ev)
  if(ev.data.type==""){
  }else if(ev.data.type=="start"){
    requestOrderManager.addDemand(
      //[944,907,908,909,946]
      Array.from(Array(1000)).map((e, i) => i)
    )
  }else if(ev.data.type=="list"){
    requestOrderManager.addDemand(ev.data.list)
  }
  
}