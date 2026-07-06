import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { LINEUP_THREE } from '../../styles/lineupTokens';

const LineupScene3D = ({ mode = 'loading', className = '' }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth || 64, mount.clientHeight || 64);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.z = 2.2;

    const geometry = new THREE.PlaneGeometry(0.9, 1.2);
    const material = new THREE.MeshBasicMaterial({ color: LINEUP_THREE.paper, side: THREE.DoubleSide });
    const poster = new THREE.Mesh(geometry, material);
    scene.add(poster);

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (mode === 'loading') {
        poster.rotation.y = Math.sin(t * 2.4) * 0.8;
        poster.rotation.x = Math.sin(t * 1.6) * 0.15;
      }
      renderer.render(scene, camera);
    };

    const onResize = () => {
      const w = mount.clientWidth || 64;
      const h = mount.clientHeight || 64;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [mode]);

  return <div ref={mountRef} className={className} style={{ width: 64, height: 64 }} />;
};

export default LineupScene3D;
