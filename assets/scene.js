/* Procedural WebGL sculpture and surrounding neural field. No remote 3D assets. */
(() => {
 'use strict';
 window.createContinuanceScene = function(host,{reduceMotion=()=>false}={}) {
   if(!window.THREE)return null;
   const test=document.createElement('canvas');
   let gl;
   try{gl=test.getContext('webgl2')||test.getContext('webgl');}catch{return null;}
   if(!gl){host.dataset.renderer='image';return null;}
   const lose=gl.getExtension('WEBGL_lose_context');if(lose)lose.loseContext();
   const T=window.THREE;
   let renderer;
   try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{host.dataset.renderer='image';return null;}
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
   const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');host.append(canvas);
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(33,1,.1,50);camera.position.set(0,.1,8.2);
   const artifact=new T.Group();scene.add(artifact);artifact.rotation.y=-.28;
   const envCanvas=document.createElement('canvas');envCanvas.width=1024;envCanvas.height=512;const e=envCanvas.getContext('2d');e.fillStyle='#22232b';e.fillRect(0,0,1024,512);const eg=e.createLinearGradient(0,0,0,512);eg.addColorStop(0,'#eeeeff');eg.addColorStop(.5,'#60616f');eg.addColorStop(1,'#161620');e.fillStyle=eg;e.fillRect(0,0,1024,512);[[100,25],[370,90],[750,50]].forEach(([x,w])=>{e.fillStyle='#ffffff';e.fillRect(x,65,w,330);});e.fillStyle='#ad8aff';e.fillRect(560,170,60,220);
   const environment=new T.CanvasTexture(envCanvas);environment.mapping=T.EquirectangularReflectionMapping;scene.environment=environment;
   const pmrem=new T.PMREMGenerator(renderer);const envTarget=pmrem.fromEquirectangular(environment);scene.environment=envTarget.texture;
   const chrome=new T.MeshStandardMaterial({color:0xd0cbd8,metalness:1,roughness:.22}),graphite=new T.MeshStandardMaterial({color:0x30303a,metalness:.88,roughness:.27}),violet=new T.MeshStandardMaterial({color:0xad8aff,emissive:0x7746db,emissiveIntensity:.9,metalness:.5,roughness:.2});
   const ambient=new T.AmbientLight(0xe4e5ff,1.8);scene.add(ambient);const key=new T.DirectionalLight(0xffffff,4);key.position.set(-3,5,5);scene.add(key);const rim=new T.PointLight(0xad8aff,35);rim.position.set(3,1,2);scene.add(rim);
   // Sculpted parametric face. Eye sockets, nose bridge, lips, chin and cheek bones.
   const geo=new T.SphereGeometry(1,112,80),p=geo.attributes.position;
   const gauss=(x,cx,sx,y,cy,sy)=>Math.exp(-((x-cx)**2/sx+(y-cy)**2/sy));
   for(let i=0;i<p.count;i++){let x=p.getX(i)*.64,y=p.getY(i)*1.03,z=p.getZ(i)*.64;
     if(z>0){const face=Math.max(0,z/.64);z+=face*(.35*gauss(x,0,.017,y,.03,.09)-.11*gauss(x,-.25,.015,y,.23,.014)-.11*gauss(x,.25,.015,y,.23,.014)+.075*gauss(x,-.36,.025,y,-.02,.05)+.075*gauss(x,.36,.025,y,-.02,.05)+.095*gauss(x,0,.05,y,-.34,.006)+.09*gauss(x,0,.04,y,-.65,.04));}
     if(y<-.55)x*=1+(y+.55)*.30;p.setXYZ(i,x,y,z);
   }geo.computeVertexNormals();const head=new T.Mesh(geo,graphite);head.position.y=.14;artifact.add(head);
   const neck=new T.Mesh(new T.CylinderGeometry(.24,.30,.53,64),graphite);neck.position.y=-.96;artifact.add(neck);
   // A fine seam through the central facial plane.
   const seamPoints=[];for(let i=0;i<=45;i++){const y=.95-i/45*1.8,z=Math.sqrt(Math.max(0,1-(y/1.03)**2))*.65+.36*gauss(0,0,.017,y,.03,.09)+.012;seamPoints.push(new T.Vector3(.012+Math.sin(y*6)*.012,y+.14,z));}
   const seam=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(seamPoints),64,.007,6,false),violet);artifact.add(seam);
   const rings=[];
   [[1.48,.045,.55,.25],[1.66,.035,1.4,-.40]].forEach(([r,t,rx,ry],i)=>{const ring=new T.Mesh(new T.TorusGeometry(r,t,12,180),chrome);ring.rotation.set(rx,ry,i*.4);artifact.add(ring);rings.push(ring);const glow=new T.Mesh(new T.TorusGeometry(r-.065,.008,6,160),violet);glow.rotation.copy(ring.rotation);artifact.add(glow);rings.push(glow);});
   const cartridge=new T.Mesh(new T.BoxGeometry(.59,.16,.35),graphite);cartridge.position.set(0,-1.47,0);artifact.add(cartridge);const strip=new T.Mesh(new T.BoxGeometry(.47,.025,.36),violet);strip.position.set(0,-1.47,0);artifact.add(strip);
   for(let i=0;i<12;i++){const t=i/12*Math.PI*2,m=new T.Mesh(new T.BoxGeometry(.025,.08,.04),chrome);m.position.set(Math.cos(t)*1.49,Math.sin(t)*1.49,0);m.rotation.z=t;rings[0].add(m);}
   const cloudGeo=new T.BufferGeometry(),pts=new Float32Array(220*3);for(let i=0;i<220;i++){const a=i*2.39996,r=2+Math.sin(i*5.7)*.9;pts[i*3]=Math.cos(a)*r;pts[i*3+1]=Math.sin(a)*r*.8;pts[i*3+2]=Math.sin(i*7.3)*1.5;}cloudGeo.setAttribute('position',new T.BufferAttribute(pts,3));const cloud=new T.Points(cloudGeo,new T.PointsMaterial({color:0x777382,size:.012,transparent:true,opacity:.4}));scene.add(cloud);
   // Rendered artwork and true geometry share a home: the artwork is the initial mode.
   artifact.visible=false;canvas.style.opacity='1';
   const toggle=document.createElement('button');toggle.type='button';toggle.className='scene-mode';toggle.textContent='◇ ОБЪЁМНАЯ МОДЕЛЬ';toggle.setAttribute('aria-pressed','false');toggle.style.cssText='position:absolute;left:50%;bottom:8%;transform:translateX(-50%);z-index:6;font:8px var(--mono);letter-spacing:.03em;padding:7px 10px;background:#e4e5e8cc;color:#343849;border:1px solid #34384933;white-space:nowrap';host.append(toggle);
   const image=host.querySelector('.hero-render');let volumetric=false;
   const changeMode=()=>{volumetric=!volumetric;artifact.visible=volumetric;image.style.opacity=volumetric?'0':'1';toggle.textContent=volumetric?'◇ ВИЗУАЛИЗАЦИЯ':'◇ ОБЪЁМНАЯ МОДЕЛЬ';toggle.setAttribute('aria-pressed',String(volumetric));};toggle.addEventListener('click',changeMode);
   let w=1,h=1,frame=0,time=0,dragging=false,lastX=0,dragRotation=0,targetX=0,targetY=0,alive=true;
   function resize(){const r=host.getBoundingClientRect();w=Math.max(1,r.width);h=Math.max(1,r.height);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
   const ro=new ResizeObserver(resize);ro.observe(host);resize();
   function move(ev){const r=host.getBoundingClientRect();targetX=((ev.clientX-r.x)/r.width-.5)*.35;targetY=((ev.clientY-r.y)/r.height-.5)*.15;if(dragging){dragRotation+=(ev.clientX-lastX)*.009;lastX=ev.clientX;}}
   function down(ev){if(!volumetric||ev.target===toggle)return;dragging=true;lastX=ev.clientX;canvas.setPointerCapture(ev.pointerId);}
   function up(){dragging=false;}
   canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
   function loop(){if(!alive)return;const still=reduceMotion()||document.hidden;if(!still){time+=.009;artifact.position.y=Math.sin(time)*.08;artifact.rotation.y+=(-.28+targetX+dragRotation-artifact.rotation.y)*.04;artifact.rotation.x+=(targetY-artifact.rotation.x)*.04;rings[0].rotation.z=time*.08;rings[1].rotation.z=time*.08;rings[2].rotation.z=-time*.1;rings[3].rotation.z=-time*.1;cloud.rotation.y=time*.025;}renderer.render(scene,camera);frame=requestAnimationFrame(loop);}loop();
   return {destroy(){alive=false;cancelAnimationFrame(frame);ro.disconnect();canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);toggle.removeEventListener('click',changeMode);scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});environment.dispose();envTarget.dispose();pmrem.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();toggle.remove();}};
 };
})();
