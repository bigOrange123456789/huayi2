import { Viewer } from './viewer.js';

class App
{
  constructor (el) 
  {
    console.log("version:000")
    this.el = el;
    this.viewer = null;
    this.viewerEl = null;

    if (this.viewer) this.viewer.clear();

    var parseUrlParams = function()
    {
      var urlParams = window.location.href;
      var vars = {};
      var parts = urlParams.replace(/[?&]+([^=&]+)=([^&]*)/gi,
          function (m, key, value) {
              vars[key] = decodeURIComponent(value);
          });
          
      return vars;
    }

    var paramJson = parseUrlParams();

    this.createViewer(paramJson);
    
    this.viewer.load([{
      url:'assets/models/huayirvm0616-0.zip', 
      tag: 1
    }])

  }

  createViewer(paramJson) 
  {
    this.viewerEl = document.createElement('div');
    this.viewerEl.classList.add('viewer');
    this.el.appendChild(this.viewerEl);
    this.viewer = new Viewer(this.viewerEl, {
      baked: paramJson['baked'],
    });
    return this.viewer;
  }
}

var app = null;
document.addEventListener('DOMContentLoaded', () => {

  app = new App(document.body);

});
