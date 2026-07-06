import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { LINEUP, LINEUP_THREE } from '../../styles/lineupTokens';
import { easeOutBack, makeGhostTexture, makePosterTexture, trapezoid } from './posterUtils';

const POSTERS = [
  { x: -3.4, y: 1.2, z: -9, ry: 0.34, eyebrow: 'Headlining', name: 'NIVEDITA\nEATS', size: 78, nameY: 280, role: '350K reach · Food & Travel', meta: 'Booked 41 shows', paper: LINEUP.paper, ink: LINEUP.ink, accent: LINEUP.accent },
  { x: 3.4, y: 0.7, z: -13, ry: -0.34, eyebrow: 'Support slot', name: 'ROOFTOP\nRAJA', size: 70, nameY: 270, role: '62K reach · City Life', meta: 'Booked 12 shows', paper: LINEUP.ink, ink: LINEUP.paper, accent: LINEUP.accent },
  { x: -3.2, y: 1.0, z: -18, ry: 0.3, eyebrow: 'Headlining', name: 'THE.MEHRA\nMETHOD', size: 66, nameY: 260, role: '480K reach · Fitness', meta: 'Booked 63 shows', paper: LINEUP.paper, ink: LINEUP.ink, accent: LINEUP.accent },
  { x: 3.5, y: 1.3, z: -22, ry: -0.3, eyebrow: 'Opening act', name: 'DAILY\nDOODLE.CO', size: 66, nameY: 260, role: '9K reach · Illustration', meta: 'Booked 3 shows', paper: LINEUP.paper, ink: LINEUP.ink, accent: LINEUP.accent },
  { x: -3.6, y: 1.1, z: -32, ry: 0.34, eyebrow: 'Now curating', name: 'BOAT\nAUDIO', size: 82, nameY: 280, role: 'Monsoon Drop Tour', meta: '12 creators booked', paper: LINEUP.ink, ink: LINEUP.paper, accent: LINEUP.accent },
  { x: 3.3, y: 0.8, z: -36, ry: -0.32, eyebrow: 'Now curating', name: 'MAMAEARTH\nSTAGE', size: 66, nameY: 265, role: 'Skin Season Line-up', meta: '28 creators booked', paper: LINEUP.paper, ink: LINEUP.ink, accent: LINEUP.accent },
  { x: -3.3, y: 1.2, z: -41, ry: 0.3, eyebrow: 'Now curating', name: 'ZOMATO\nGOLD BILL', size: 70, nameY: 270, role: 'City Foodie Tour', meta: '19 creators booked', paper: LINEUP.paper, ink: LINEUP.ink, accent: LINEUP.accent },
  { x: 3.5, y: 1.0, z: -51, ry: -0.34, eyebrow: 'Now opening', name: 'CAFE\nKOKO', size: 78, nameY: 275, role: 'Open Mic Deal · Meal for Reel', meta: 'Slots open weekly', paper: LINEUP.paper, ink: LINEUP.ink, accent: LINEUP.accent },
  { x: -3.4, y: 0.9, z: -55, ry: 0.32, eyebrow: 'Now opening', name: 'INKED.\nTATTOO', size: 72, nameY: 270, role: 'Guest Spot · Voucher Trade', meta: 'Slots open weekly', paper: LINEUP.ink, ink: LINEUP.paper, accent: LINEUP.accent },
  { x: 3.2, y: 1.15, z: -60, ry: -0.3, eyebrow: 'Now opening', name: 'BLOOM\nSALON', size: 74, nameY: 270, role: 'Flat Fee Deal', meta: 'Slots open weekly', paper: LINEUP.paper, ink: LINEUP.ink, accent: LINEUP.accent },
  { x: 0, y: 1.1, z: -72, ry: 0, eyebrow: 'Last call', name: 'GET ON\nTHE BILL', size: 88, nameY: 300, role: 'Free to join', meta: 'creatorsync.com', paper: LINEUP.ink, ink: LINEUP.paper, accent: LINEUP.accent, finale: true },
];

const SECTIONS = [
  { id: 'intro', peak: [0.0, 0.06], fadeOutEnd: 0.10 },
  { id: 'creators', peak: [0.16, 0.30], fadeIn: 0.11, fadeOutEnd: 0.34 },
  { id: 'brands', peak: [0.42, 0.55], fadeIn: 0.37, fadeOutEnd: 0.60 },
  { id: 'stores', peak: [0.66, 0.78], fadeIn: 0.62, fadeOutEnd: 0.83 },
  { id: 'finale', peak: [0.92, 1.0], fadeIn: 0.88, fadeOutEnd: 1.01 },
];

const FLASH_POINTS = [0.13, 0.39, 0.65, 0.89];
const Z_START = 12;
const Z_END = -80;

const LandingCorridor = ({ onBookSlot }) => {
  const stageRef = useRef(null);
  const flashRef = useRef(null);
  const progressFillRef = useRef(null);
  const sectionRefs = useRef({});
  const loadScreenRef = useRef(null);
  const targetProgressRef = useRef(0);
  const progressRef = useRef(0);
  const firedFlashRef = useRef([false, false, false, false]);
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.touchAction = 'none';

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.body.style.touchAction = '';
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(LINEUP_THREE.paper);
    scene.fog = new THREE.Fog(LINEUP_THREE.paper, 18, 46);

    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 1.4, 12);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a28, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.35);
    dir.position.set(4, 10, 6);
    scene.add(dir);

    const floorMat = new THREE.MeshStandardMaterial({ color: LINEUP_THREE.floor, roughness: 1, metalness: 0 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 260), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -1.6, -100);
    scene.add(floor);

    const posterGroup = new THREE.Group();
    scene.add(posterGroup);
    const posters = [];

    const addPoster = (cfg) => {
      const g = new THREE.Group();
      const w = 2.6;
      const h = 2.6 * (760 / 560);

      const mainCanvas = makePosterTexture(cfg);
      const mainTex = new THREE.CanvasTexture(mainCanvas);
      mainTex.anisotropy = 4;
      const mainMat = new THREE.MeshBasicMaterial({ map: mainTex, transparent: true });
      const mainPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mainMat);
      g.add(mainPlane);

      const ghostCanvas = makeGhostTexture(cfg);
      const ghostTex = new THREE.CanvasTexture(ghostCanvas);
      ghostTex.anisotropy = 4;
      const ghostMat = new THREE.MeshBasicMaterial({ map: ghostTex, transparent: true, opacity: 0.55 });
      const ghostPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), ghostMat);
      ghostPlane.position.set(0.045, -0.035, -0.02);
      g.add(ghostPlane);

      const stapleMat = new THREE.MeshStandardMaterial({ color: LINEUP_THREE.staple, roughness: 0.6, metalness: 0.4 });
      [-1, 1].forEach((sx) => {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), stapleMat);
        s.rotation.z = Math.PI / 2;
        s.position.set(sx * (w / 2 - 0.18), h / 2 - 0.15, 0.03);
        g.add(s);
      });

      g.position.set(cfg.x, cfg.y, cfg.z);
      g.rotation.y = cfg.ry;
      if (reducedMotion.current) {
        const scale = cfg.finale ? 1.3 : 1;
        g.scale.set(scale, scale, scale);
        g.userData = { activated: true, punchStart: 0, baseZ: cfg.z, finale: cfg.finale };
      } else {
        g.scale.set(0.001, 0.001, 0.001);
        g.userData = { activated: false, punchStart: 0, baseZ: cfg.z, finale: cfg.finale };
      }
      posterGroup.add(g);
      posters.push(g);
      return g;
    };

    POSTERS.forEach(addPoster);

    const clock = new THREE.Clock();
    let mouseX = 0;
    let mouseY = 0;
    let frameId = 0;
    let touchY = null;

    const clamp01 = (v) => Math.min(1, Math.max(0, v));

    const flash = () => {
      const flashEl = flashRef.current;
      if (!flashEl) return;
      flashEl.style.transition = 'none';
      flashEl.style.opacity = '0.22';
      requestAnimationFrame(() => {
        flashEl.style.transition = 'opacity .5s ease';
        flashEl.style.opacity = '0';
      });
    };

    const onWheel = (e) => {
      targetProgressRef.current = clamp01(targetProgressRef.current + e.deltaY * 0.00035);
    };

    const onTouchStart = (e) => {
      touchY = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (touchY === null) return;
      const dy = touchY - e.touches[0].clientY;
      targetProgressRef.current = clamp01(targetProgressRef.current + dy * 0.0016);
      touchY = e.touches[0].clientY;
    };

    const onKeyDown = (e) => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        targetProgressRef.current = clamp01(targetProgressRef.current + 0.05);
      }
      if (['ArrowUp', 'PageUp'].includes(e.key)) {
        targetProgressRef.current = clamp01(targetProgressRef.current - 0.05);
      }
      if (e.key === 'Home') targetProgressRef.current = 0;
      if (e.key === 'End') targetProgressRef.current = 1;
    };

    const onMouseMove = (e) => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const motion = reducedMotion.current;

      progressRef.current += (targetProgressRef.current - progressRef.current) * (motion ? 1 : 0.08);

      const camZ = Z_START + progressRef.current * (Z_END - Z_START);
      camera.position.z = camZ;
      if (!motion) {
        camera.position.x = mouseX * 0.5;
        camera.position.y = 1.4 + mouseY * 0.25 + Math.sin(t * 0.6) * 0.02;
        camera.lookAt(mouseX * 1.2, 1.1, camera.position.z - 14);
      } else {
        camera.position.x = 0;
        camera.position.y = 1.4;
        camera.lookAt(0, 1.1, camera.position.z - 14);
      }

      posters.forEach((g) => {
        if (!g.userData.activated && camera.position.z - g.userData.baseZ < 9) {
          g.userData.activated = true;
          g.userData.punchStart = t;
        }
        if (g.userData.activated && !motion) {
          const dt = Math.min(1, (t - g.userData.punchStart) / 0.42);
          const s = easeOutBack(dt) * (g.userData.finale ? 1.3 : 1);
          g.scale.set(Math.max(0.001, s), Math.max(0.001, s), Math.max(0.001, s));
        }
      });

      SECTIONS.forEach((s) => {
        const el = sectionRefs.current[s.id];
        if (el) el.style.opacity = trapezoid(progressRef.current, s);
      });

      FLASH_POINTS.forEach((fp, i) => {
        if (!firedFlashRef.current[i] && progressRef.current > fp) {
          firedFlashRef.current[i] = true;
          if (!motion) flash();
        }
      });

      if (progressFillRef.current) {
        progressFillRef.current.style.height = `${progressRef.current * 100}%`;
      }

      renderer.render(scene, camera);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    const loadTimer = window.setTimeout(() => {
      const ls = loadScreenRef.current;
      if (!ls) return;
      ls.style.opacity = '0';
      window.setTimeout(() => ls.remove(), 650);
    }, 500);

    animate();

    return () => {
      window.clearTimeout(loadTimer);
      cancelAnimationFrame(frameId);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);

      posters.forEach((g) => {
        g.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
      });

      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  const skipToEnd = () => {
    targetProgressRef.current = 1;
  };

  return (
    <div className="fixed inset-0 bg-paper text-ink" style={{ fontFamily: "'Archivo', sans-serif" }}>
      <div
        ref={loadScreenRef}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper transition-opacity duration-[600ms] ease-linear"
      >
        <h1 className="font-display text-[clamp(40px,9vw,110px)] leading-none">THE LINEUP</h1>
        <div className="mt-3.5 font-mono-data text-[11px] uppercase tracking-[0.14em] text-inkSoft">
          pressing the bill&nbsp;&nbsp;·&nbsp;&nbsp;creatorsync
        </div>
      </div>

      <div ref={flashRef} className="pointer-events-none fixed inset-0 z-[5] bg-accent opacity-0 mix-blend-multiply" />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-[34px] py-[26px]">
        <div className="font-display flex items-center gap-2 text-xl tracking-[0.02em]">
          <span className="h-[9px] w-[9px] rounded-full bg-accent" />
          CREATORSYNC
        </div>
        <button
          type="button"
          onClick={skipToEnd}
          className="pointer-events-auto cursor-pointer border-[1.5px] border-ink bg-paper px-4 py-2 font-mono-data text-[11px] uppercase tracking-[0.1em]"
        >
          Get on the bill
        </button>
      </div>

      <div className="fixed right-[26px] top-1/2 z-20 hidden h-[200px] w-[3px] -translate-y-1/2 bg-ink/15 max-[700px]:hidden">
        <div ref={progressFillRef} className="absolute bottom-0 left-0 w-full bg-accent" style={{ height: '0%' }} />
        <div className="absolute inset-0">
          {[0, 24, 49, 74, 100].map((pos) => (
            <span
              key={pos}
              className="absolute left-[-4px] h-[2px] w-[11px] bg-inkSoft"
              style={{ bottom: `${pos}%` }}
            />
          ))}
        </div>
      </div>

      <div ref={stageRef} className="fixed inset-0 z-[1]" />

      <div className="pointer-events-none fixed inset-0 z-[10]">
        <div
          ref={(el) => { sectionRefs.current.intro = el; }}
          className="section-text fixed left-1/2 top-1/2 z-[15] w-[90%] max-w-[640px] -translate-x-1/2 -translate-y-1/2 text-center opacity-100"
        >
          <div className="mb-3.5 font-mono-data text-[11px] uppercase tracking-[0.18em] text-accent">A three-sided marketplace</div>
          <h1 className="poster-outline-text font-display text-[clamp(52px,11vw,140px)] leading-[0.88] tracking-[0.01em] text-ink">
            THE
            <br />
            LINEUP
          </h1>
          <p className="mx-auto mt-[18px] max-w-[44ch] text-base text-inkSoft">
            Every creator gets billed. Every brand curates a stage. Every local shop gets an opening slot. Scroll to walk the wall.
          </p>
          <div className="scroll-cue-bob mt-[46px] font-mono-data text-[11px] uppercase tracking-[0.14em] text-inkSoft">
            Scroll to begin ↓
          </div>
        </div>

        <div
          ref={(el) => { sectionRefs.current.creators = el; }}
          className="section-text fixed left-1/2 top-1/2 z-[15] w-[90%] max-w-[640px] -translate-x-1/2 -translate-y-1/2 text-center opacity-0"
        >
          <div className="mb-3.5 font-mono-data text-[11px] uppercase tracking-[0.18em] text-accent">Now billing</div>
          <h2 className="poster-outline-text font-display text-[clamp(34px,6vw,74px)] leading-[0.98] tracking-[0.01em] text-ink">Creators on the bill.</h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-inkSoft">
            Not followers. Not a feed. A lineup you&apos;re actually named on — headline slots for reach, support slots for the ones building toward it.
          </p>
        </div>

        <div
          ref={(el) => { sectionRefs.current.brands = el; }}
          className="section-text fixed left-1/2 top-1/2 z-[15] w-[90%] max-w-[640px] -translate-x-1/2 -translate-y-1/2 text-center opacity-0"
        >
          <div className="mb-3.5 font-mono-data text-[11px] uppercase tracking-[0.18em] text-accent">Now curating</div>
          <h2 className="poster-outline-text font-display text-[clamp(34px,6vw,74px)] leading-[0.98] tracking-[0.01em] text-ink">Brands, curate your own stage.</h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-inkSoft">
            Brief the show, book the names, approve the set before it plays live. Every campaign is a poster with your name at the top.
          </p>
        </div>

        <div
          ref={(el) => { sectionRefs.current.stores = el; }}
          className="section-text fixed left-1/2 top-1/2 z-[15] w-[90%] max-w-[640px] -translate-x-1/2 -translate-y-1/2 text-center opacity-0"
        >
          <div className="mb-3.5 font-mono-data text-[11px] uppercase tracking-[0.18em] text-accent">Now opening</div>
          <h2 className="poster-outline-text font-display text-[clamp(34px,6vw,74px)] leading-[0.98] tracking-[0.01em] text-ink">Local openers welcome.</h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-inkSoft">
            A free meal, a flat fee, a voucher — every local shop can book a creator an opening slot before the big stage ever calls.
          </p>
        </div>

        <div
          ref={(el) => { sectionRefs.current.finale = el; }}
          className="section-text fixed left-1/2 top-1/2 z-[15] w-[90%] max-w-[640px] -translate-x-1/2 -translate-y-1/2 text-center opacity-0"
        >
          <div className="mb-3.5 font-mono-data text-[11px] uppercase tracking-[0.18em] text-accent">Last call</div>
          <h2 className="poster-outline-text font-display text-[clamp(36px,7vw,90px)] leading-[0.98] tracking-[0.01em] text-ink">
            GET ON
            <br />
            THE BILL.
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-inkSoft">
            Free to join as a creator or a shop. Brands start with a guided first show.
          </p>
          {onBookSlot ? (
            <button
              type="button"
              onClick={onBookSlot}
              className="btn-stamp-ink pointer-events-auto mt-[30px] inline-block cursor-pointer bg-ink px-[30px] py-4 font-mono-data text-[13px] font-bold uppercase tracking-[0.08em] text-paper"
            >
              Book your slot →
            </button>
          ) : (
            <Link
              to="/register"
              className="btn-stamp-ink pointer-events-auto mt-[30px] inline-block bg-ink px-[30px] py-4 font-mono-data text-[13px] font-bold uppercase tracking-[0.08em] text-paper"
            >
              Book your slot →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingCorridor;
