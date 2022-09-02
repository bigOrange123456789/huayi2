import {
  DirectionalLight,
  PointLight,
  PerspectiveCamera,
  Scene,
  WebGLRendererEx,
  sRGBEncoding
} from '../lib/three/build/three';

import Stats from '../lib/three/examples/jsm/libs/stats.module.js';
//import {OrbitControls} from '../lib/three/examples/jsm/controls/OrbitControls.js';
import {PlayerControl} from '../lib/myThree/PlayerControl.js';

import { GUI } from 'dat.gui';

import { SLMLoader } from '../lib/SLMLoader';

export class Viewer 
{
  constructor (el, options) 
  {
    this.el = el;
    this.options = options;

    this.lights = [];
    this.content = null;

    this.gui = null;

    this.prevTime = 0;

    this.stats = new Stats();
    this.stats.dom.height = '48px';
    [].forEach.call(this.stats.dom.children, (child) => (child.style.display = ''));

    this.scene = new Scene();
    window.scene=this.scene

    const fov = 60;
    this.defaultCamera = new PerspectiveCamera(fov, el.clientWidth / el.clientHeight, 0.1, 10000);
    this.activeCamera = this.defaultCamera;
    this.scene.add(this.defaultCamera);
    this.activeCamera.layers.enableAll();

    this.renderer = window.renderer = new WebGLRendererEx({antialias: true});
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.setClearColor(0x56BCEF);//this.renderer.setClearColor(0xcccccc);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    this.renderer.autoClear = false;

    new PlayerControl(this.activeCamera)
    window.camera=this.activeCamera

    this.el.appendChild(this.renderer.domElement);

    this.slmLoader = new SLMLoader(
      {
        EnablePicking: true,
        renderer: this.renderer,
        scene: this.scene,
        sceneOccluder: this.scene,
        el: this.el,
        EnableCulling: true,
      }
    );

    this.showgui = true;

    if (this.showgui)
    {
      this.addGUI();
    }

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    window.addEventListener('resize', this.resize.bind(this), false);

    this.setupScene();
  }

  animate(time)
  {
    requestAnimationFrame(this.animate);

    this.stats.update();

    this.render();

    this.prevTime = time;
  }

  render() 
  {
    for(var i=0;i<this.lights.length;i++){
      this.lights[i].position.set(
        window.c.position.x,
        window.c.position.y,
        window.c.position.z
      )
    }
    this.renderer.clear();//绘制背景
    this.renderer.render(this.scene, this.activeCamera);//不知为啥有两个render
    
  }

  resize() 
  {
    const {clientHeight, clientWidth} = this.el.parentElement;

    this.defaultCamera.aspect = clientWidth / clientHeight;
    this.defaultCamera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  //被app.js调用
  load(scenes, finishCallback)//scenes
  {
    window.hasLoadingTag=0
    var scope = this;
    window.addMoment("slmLoader.LoadScene:start")
    this.slmLoader.LoadScene(
      scenes, //所有场景对应zip包的地址
      function(slmScene, _tag, bvhScene){ //singleSceneCallbackAsync, 单场景回调异步
        console.log("this.slmLoader.LoadScene 1")
        //scope.addSceneModel(slmScene,_tag);
      }, 
      function(){ //allScenesCallbackAsync, 所有场景回调异步
        console.log("this.slmLoader.LoadScene 2")
        if (finishCallback)
        {
          finishCallback();
        }
      }, 
      function(slmScene, _tag){ //singleSceneCallbackSync,单场景回调同步
        console.log("this.slmLoader.LoadScene 3")
      });
  }

  addSceneModel(sceneModel)
  {
    this.scene.add(sceneModel);
  }

  setupScene() 
  {
    this.setCamera();

    this.addLights();

    window.content = this.content;
  }

  setCamera() 
  {
    // this.defaultCamera.position.set(-459.8231509760614,  39.2496658862353,  2716.9451960982447);
    // this.defaultCamera.rotation.set( -0.18589681069184721,  0.6590683541369203,  0.11466413855442507)
    this.activeCamera = this.defaultCamera;
    window.c=this.defaultCamera
    window.c.position.set( 1829.8654993109885, 535.2076347016717, -1315.144204938446)
    window.c.rotation.set( -0.9072125912965568,  -0.43724666620216973,  -0.49636092404314786)
  }

  addLights ()
  {
    if (!this.options || !this.options.baked)
    {
      this.lights=[
        //new DirectionalLight(0xFFFFFF, 3.5),
        new PointLight(0xFFFFFF, 9,0,0.5)//color , intensity , distance , decay 
      ]
      for(var i=0;i<this.lights.length;i++)
        this.scene.add(this.lights[i])
    }
  }

  addGUI() 
  {
    const gui = this.gui = new GUI({autoPlace: false, width: 260, hideable: true});

    const perfFolder = gui.addFolder('Performance');
    const perfLi = document.createElement('li');
    this.stats.dom.style.position = 'static';
    perfLi.appendChild(this.stats.dom);
    perfLi.classList.add('gui-stats');
    perfFolder.__ul.appendChild( perfLi );

    const guiWrap = document.createElement('div');
    this.el.appendChild( guiWrap );
    guiWrap.classList.add('gui-wrap');
    guiWrap.appendChild(gui.domElement);
    gui.open();
  }
  SetComponentMatrix(componentKey,matrix){
  }
};

