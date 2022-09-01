import {LoadModel} from './LoadModel.js';
class  SimplifiedQueue{
    constructor(list){
        this.front=-1
        this.list=list
    }
    de(){
        this.front++
        return this.list[this.front]
    }
    isEmpty(){
        return this.front==this.list.length
    }
}
class  Stack{
    constructor(maxLength){
        this.maxLength=maxLength
        this.data=new Array(maxLength)
        this.top=-1
    }
    isEmpty(){
        return this.top==-1
    }
    isFull(){
        return this.top==this.maxLength-1
    }
    push(element){
        if(this.isFull()){
            return false
        }else{
            this.top++
            this.data[this.top]=element
            return true
        }
    }
    pop(){
        if(this.isEmpty()){
            return null
        }else{
            var element=this.data[this.top]
            this.top--
            return element
        }
    }
    show(){
        if(this.isEmpty()){
            return null
        }else{
            var element=this.data[this.top]
            return element
        }
    }
}
class RequestOrderManager{
    constructor(opt){//{loaded:[],stackSize:1000,waitNumberMax:100,request:null,crossDomain:crossDomain}
        var scope=this
        this.loaded={}
        for(var i=0;i<opt.loaded.length;i++)
            this.loaded[opt.loaded[i]]=true
        this.data=new Stack(opt.stackSize)//1000
        this.waitNumber=0
        this.waitNumberMax=opt.waitNumberMax//100
        this.crossDomain=opt.crossDomain
        this.request=(pack_id)=>{
            new LoadModel({
                url:"assets/models/huayi/"+pack_id+".zip",
                meshIndex:pack_id,
                finish_cb:()=>{scope.endOneWaiting()},
                crossDomain:scope.crossDomain
            })
        }//opt.request//null
    }
    addDemand(list){//This list is of array type
        if(list.length>0){
            this.data.push(new SimplifiedQueue(list))
            while(this.waitNumber<this.waitNumberMax&&!this.data.isEmpty())
                this._makeOneRequest()
        }
    }
    _makeOneRequest(){
        this.waitNumber++
        var element=this.data.show()
        var packId=element.de()
        if(this.request&&!this.loaded[packId]){
            this.loaded[packId]=true
            this.request(packId)
        }
        if(element.isEmpty())this.data.pop()
        return packId
    }
    endOneWaiting(){
        this.waitNumber--
        while(this.waitNumber<this.waitNumberMax&&!this.data.isEmpty())
            this._makeOneRequest()
    }
}
export{RequestOrderManager}
