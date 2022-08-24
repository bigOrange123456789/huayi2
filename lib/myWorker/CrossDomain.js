class CrossDomain{
    constructor(){
      this.crossDomainSocket=[
        // "localhost:8081",
        // "43.138.54.47:8081",//北京服务器
        // "58.34.91.211:28083",//张老师服务器
        // "114.80.207.60:8081",//家居布局

      ]
      this.crossDomainSocket_index=0
    }
    getSocket_new(){
      this.crossDomainSocket_index++
      if(this.crossDomainSocket_index===this.crossDomainSocket.length+1){
        this.crossDomainSocket_index=0
      }
      if(this.crossDomainSocket_index===this.crossDomainSocket.length){
        return false//进行一次同源请求
      }else{
        return this.crossDomainSocket[
          this.crossDomainSocket_index
        ]
      }
    }
    getSocket(){//不使用同源请求
      this.crossDomainSocket_index++
      if(this.crossDomainSocket_index===this.crossDomainSocket.length){
        this.crossDomainSocket_index=0
      }
      return this.crossDomainSocket[
        this.crossDomainSocket_index
      ]
    }
  }
export{CrossDomain}