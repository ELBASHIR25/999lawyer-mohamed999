/* ==========================================================================
   المشهد ثلاثي الأبعاد بالهيرو — مطرقة قاضٍ نحاسية + خاتم ختم دوّار
   يعتمد على Three.js (يُحمَّل من cdnjs في الصفحة)
   ========================================================================== */

(function(){
  const canvas = document.getElementById('hero-canvas');
  if(!canvas || typeof THREE === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = canvas.parentElement.offsetWidth;
  let height = canvas.parentElement.offsetHeight;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x14171A, 0.045);

  const camera = new THREE.PerspectiveCamera(38, width/height, 0.1, 100);
  camera.position.set(0, 1.1, 9.5);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputEncoding = THREE.sRGBEncoding;

  /* -------- إضاءة -------- */
  scene.add(new THREE.AmbientLight(0x30302a, 1.1));
  const key = new THREE.PointLight(0xE8C374, 6, 30, 2);
  key.position.set(4, 5, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0x7A2530, 4, 30, 2);
  rim.position.set(-5, -2, -3);
  scene.add(rim);
  const fill = new THREE.PointLight(0xF1EAD9, 1.4, 30, 2);
  fill.position.set(-3, 3, 4);
  scene.add(fill);

  /* -------- خامة نحاسية -------- */
  const brass = new THREE.MeshStandardMaterial({ color:0xB8912F, metalness:0.85, roughness:0.28, emissive:0x1a1305, emissiveIntensity:0.3 });
  const brassDark = new THREE.MeshStandardMaterial({ color:0x8a6c22, metalness:0.8, roughness:0.4 });
  const wood = new THREE.MeshStandardMaterial({ color:0x241611, metalness:0.1, roughness:0.75 });

  const rig = new THREE.Group();
  scene.add(rig);

  /* -------- مطرقة القاضي -------- */
  const gavel = new THREE.Group();

  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.5, 40), brass);
  head.rotation.z = Math.PI/2;
  gavel.add(head);

  const ringGeo = new THREE.TorusGeometry(0.62, 0.05, 16, 40);
  const ringL = new THREE.Mesh(ringGeo, brassDark);
  ringL.rotation.y = Math.PI/2; ringL.position.x = -0.75;
  const ringR = ringL.clone(); ringR.position.x = 0.75;
  gavel.add(ringL, ringR);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 2.3, 24), wood);
  handle.position.set(0, -1.55, 0);
  gavel.add(handle);

  const grip = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 12, 30), brass);
  grip.rotation.x = Math.PI/2; grip.position.set(0, -0.5, 0);
  gavel.add(grip);

  gavel.rotation.z = -0.5;
  gavel.rotation.x = 0.15;
  gavel.position.set(0.4, 0.9, 0);
  rig.add(gavel);

  /* -------- قاعدة رخامية (صوت المطرقة) -------- */
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.55, 48), new THREE.MeshStandardMaterial({ color:0x2A2E32, metalness:0.15, roughness:0.55 }));
  base.position.set(0.4, -1.55, 0.1);
  rig.add(base);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.03, 16, 48), brass);
  baseRing.rotation.x = Math.PI/2; baseRing.position.copy(base.position); baseRing.position.y += 0.28;
  rig.add(baseRing);

  /* -------- خاتم ختم دوّار حول التكوين -------- */
  const sealRing = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.012, 8, 100), brass);
  sealRing.rotation.x = Math.PI/2.15;
  scene.add(sealRing);
  const sealRing2 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.006, 8, 100), brassDark);
  sealRing2.rotation.x = Math.PI/2.3;
  scene.add(sealRing2);

  /* نقاط زخرفية على الخاتم — إشارات مثل ترقيم مواد قانونية */
  const dots = new THREE.Group();
  const dotGeo = new THREE.SphereGeometry(0.035, 8, 8);
  for(let i=0;i<24;i++){
    const a = (i/24) * Math.PI*2;
    const d = new THREE.Mesh(dotGeo, brass);
    d.position.set(Math.cos(a)*3.1, Math.sin(a)*3.1*0.42, Math.sin(a)*0.4);
    dots.add(d);
  }
  scene.add(dots);

  /* -------- ذرات غبار عائمة -------- */
  const particleCount = 140;
  const positions = new Float32Array(particleCount*3);
  for(let i=0;i<particleCount;i++){
    positions[i*3] = (Math.random()-0.5)*14;
    positions[i*3+1] = (Math.random()-0.5)*8;
    positions[i*3+2] = (Math.random()-0.5)*10 - 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const pMat = new THREE.PointsMaterial({ color:0xD9B45C, size:0.02, transparent:true, opacity:0.5 });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  /* -------- تفاعل: الماوس/اللمس يحرّك زاوية النظر -------- */
  let targetX = 0, targetY = 0;
  window.addEventListener('mousemove', (e)=>{
    targetX = (e.clientX/window.innerWidth - 0.5);
    targetY = (e.clientY/window.innerHeight - 0.5);
  });
  window.addEventListener('touchmove', (e)=>{
    if(!e.touches[0]) return;
    targetX = (e.touches[0].clientX/window.innerWidth - 0.5);
    targetY = (e.touches[0].clientY/window.innerHeight - 0.5);
  }, {passive:true});

  function resize(){
    width = canvas.parentElement.offsetWidth;
    height = canvas.parentElement.offsetHeight;
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', resize);

  let t = 0;
  function animate(){
    requestAnimationFrame(animate);
    t += reduceMotion ? 0.002 : 0.0075;

    rig.rotation.y += (targetX*0.6 - rig.rotation.y) * 0.04;
    rig.position.y = Math.sin(t*1.2) * 0.12;

    sealRing.rotation.z += 0.0016;
    sealRing2.rotation.z -= 0.0011;
    dots.rotation.z += 0.0016;

    particles.rotation.y += 0.0006;

    camera.position.x += ((targetX*0.8) - camera.position.x) * 0.03;
    camera.position.y += (1.1 - (targetY*0.6) - camera.position.y) * 0.03;
    camera.lookAt(0.3, 0, 0);

    renderer.render(scene, camera);
  }
  animate();

  canvas.classList.add('ready');
})();
