import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Runner, RaceStatus } from '../types';
import { createRunner3D, Runner3DModel } from './Runner3D';

interface RaceSceneProps {
  runners: Runner[];
  status: RaceStatus;
}

const STRAIGHT_LEN = 120;
const CURVE_RADIUS = 60;
const LANE_WIDTH = 6;
const LAPS = 2;

const getPathData = (progress: number, lane: number, laneOffset: number) => {
  const laneCenter = lane * LANE_WIDTH + (LANE_WIDTH * 0.5);
  const R = CURVE_RADIUS + laneCenter + (laneOffset * LANE_WIDTH * 0.7);
  const L = STRAIGHT_LEN;
  const lapCircumference = 2 * L + 2 * Math.PI * R;
  const totalDist = lapCircumference * LAPS;
  
  const currentDist = progress * totalDist;
  const s = (currentDist + L / 2) % lapCircumference;

  let x = 0, z = 0;
  let tx = 1, tz = 0; 

  if (s < L) {
    x = -L / 2 + s; z = R; tx = 1; tz = 0;
  } else if (s < L + Math.PI * R) {
    const theta = (s - L) / R;
    x = L / 2 + R * Math.sin(theta); z = R * Math.cos(theta);
    tx = Math.cos(theta); tz = -Math.sin(theta);
  } else if (s < 2 * L + Math.PI * R) {
    x = L / 2 - (s - (L + Math.PI * R)); z = -R; tx = -1; tz = 0;
  } else {
    const theta = (s - (2 * L + Math.PI * R)) / R;
    x = -L / 2 - R * Math.sin(theta); z = -R * Math.cos(theta);
    tx = -Math.cos(theta); tz = Math.sin(theta);
  }

  return { position: new THREE.Vector3(x, 0, z), tangent: new THREE.Vector3(tx, 0, tz), s, lapCircumference };
};

const RaceScene: React.FC<RaceSceneProps> = ({ runners, status }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const runnersRef = useRef<Runner[]>(runners);
  const statusRef = useRef<RaceStatus>(status);
  
  const camPosRef = useRef(new THREE.Vector3(0, 100, 300));
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  
  useEffect(() => { runnersRef.current = runners; }, [runners]);
  useEffect(() => { statusRef.current = status; }, [status]);

  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    runnerGroups: Map<number, {
      group: THREE.Group;
      runner3D: Runner3DModel;
    }>;
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 200, 5000);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 8000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(300, 1000, 300);
    scene.add(sun);

    const createStadiumShape = (r: number) => {
      const shape = new THREE.Shape();
      const L = STRAIGHT_LEN;
      shape.moveTo(-L/2, r); shape.lineTo(L/2, r);
      shape.absarc(L/2, 0, r, Math.PI/2, -Math.PI/2, true);
      shape.lineTo(-L/2, -r); shape.absarc(-L/2, 0, r, -Math.PI/2, Math.PI/2, true);
      return shape;
    };

    const numLanes = 10;
    const trackWidth = numLanes * LANE_WIDTH;
    const outerRadius = CURVE_RADIUS + trackWidth;
    const innerRadius = CURVE_RADIUS;

    const trackMat = new THREE.MeshStandardMaterial({ color: 0x800020 });
    const trackMesh = new THREE.Mesh(new THREE.ShapeGeometry(createStadiumShape(outerRadius), 128), trackMat);
    trackMesh.rotation.x = -Math.PI / 2;
    trackMesh.position.y = 0.05;
    scene.add(trackMesh);

    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    for (let i = 0; i <= numLanes; i++) {
      const r = CURVE_RADIUS + i * LANE_WIDTH;
      const lineShape = createStadiumShape(r + 0.15);
      lineShape.holes.push(createStadiumShape(r - 0.15));
      const lineMesh = new THREE.Mesh(new THREE.ShapeGeometry(lineShape, 128), lineMat);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.position.y = 0.08;
      scene.add(lineMesh);
    }

    const turfMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
    const turfMesh = new THREE.Mesh(new THREE.ShapeGeometry(createStadiumShape(innerRadius - 0.5), 64), turfMat);
    turfMesh.rotation.x = -Math.PI / 2;
    turfMesh.position.y = 0.1;
    scene.add(turfMesh);

    const finishLinePos = CURVE_RADIUS + trackWidth / 2;
    const finishLine = new THREE.Mesh(new THREE.PlaneGeometry(5, trackWidth), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, 0.15, finishLinePos);
    scene.add(finishLine);

    const runnerGroups = new Map<number, any>();
    runnersRef.current.forEach((runner) => {
      const runner3D = createRunner3D(runner.color, runner.id, runner.name);
      runner3D.group.scale.set(0.6, 0.6, 0.6);

      const containerGroup = new THREE.Group();
      containerGroup.add(runner3D.group);
      
      scene.add(containerGroup);
      runnerGroups.set(runner.id, { group: containerGroup, runner3D });
    });

    sceneRef.current = { scene, camera, renderer, runnerGroups };

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!sceneRef.current) return;
      const { camera, renderer, runnerGroups } = sceneRef.current;
      const now = Date.now();

      if (statusRef.current === RaceStatus.RACING || statusRef.current === RaceStatus.FINISHED) {
        const sorted = [...runnersRef.current].filter(r => !r.isFallen).sort((a, b) => b.progress - a.progress);
        const leader = sorted[0] || runnersRef.current[0];
        if (leader) {
          const lastToRest = sorted.find(r => !r.isResting) || sorted[sorted.length - 1] || leader;
          const cameraTargetRunner = (leader.isResting ? lastToRest : leader) || leader;

          const isFinishCameraActive = cameraTargetRunner.progress >= 0.90 && !cameraTargetRunner.isResting;

          const runnerEntry = runnerGroups.get(cameraTargetRunner.id);
          if (runnerEntry) {
            const lm = runnerEntry.group;
            const targetPos = new THREE.Vector3();
            const targetLookAt = new THREE.Vector3();
            
            if (cameraTargetRunner.progress < 0.03) {
              targetPos.set(lm.position.x - 50, 30, lm.position.z + 100);
              targetLookAt.set(lm.position.x + 30, 15, lm.position.z - 10);
            } else if (isFinishCameraActive) {
              targetPos.set(40, 25, finishLinePos + 80); 
              targetLookAt.set(0, 10, finishLinePos);
            } else {
              const pInfo = getPathData(cameraTargetRunner.progress, cameraTargetRunner.lane, cameraTargetRunner.laneOffset);
              const camDist = 70; 
              const camHeight = 40; 
              const tangent = new THREE.Vector3().copy(pInfo.tangent);
              targetPos.copy(lm.position).sub(tangent.multiplyScalar(camDist)).add(new THREE.Vector3(0, camHeight, 0));
              targetLookAt.copy(lm.position).add(new THREE.Vector3(0, 15, 0));
            }

            camPosRef.current.lerp(targetPos, 0.04);
            lookAtRef.current.lerp(targetLookAt, 0.06);
            camera.position.copy(camPosRef.current);
            camera.lookAt(lookAtRef.current);
          }
        }
      } else {
        const startZ = CURVE_RADIUS + trackWidth / 2;
        const idlePos = new THREE.Vector3(-180, 50, startZ + 150);
        const idleLook = new THREE.Vector3(-60, 10, startZ);
        camPosRef.current.lerp(idlePos, 0.02);
        lookAtRef.current.lerp(idleLook, 0.02);
        camera.position.copy(camPosRef.current);
        camera.lookAt(lookAtRef.current);
      }

      const time = now / 1000;
      runnersRef.current.forEach(runner => {
        const rData = runnerGroups.get(runner.id);
        if (rData) {
          const { group, runner3D } = rData;
          
          const prevPos = group.position.clone();
          const pathInfo = getPathData(runner.progress, runner.lane, runner.laneOffset);
          group.position.lerp(pathInfo.position, 0.25);
          
          let targetRotation = Math.atan2(pathInfo.tangent.x, pathInfo.tangent.z) + Math.PI;
          
          if (runner.isResting) {
            targetRotation += Math.PI;
          }

          const currentRotation = group.rotation.y;
          let rotDiff = targetRotation - currentRotation;
          while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
          while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
          group.rotation.y += rotDiff * (statusRef.current === RaceStatus.IDLE ? 1.0 : 0.2);

          const dist = group.position.distanceTo(prevPos);
          const speed = (statusRef.current === RaceStatus.IDLE || runner.isFallen) ? 0 : dist * 2.0; 
          
          const isCurve = Math.abs(pathInfo.tangent.x) < 0.99 && Math.abs(pathInfo.tangent.z) < 0.99;
          const curveLeanTarget = isCurve ? 0.3 * Math.min(1, speed * 2) : 0;
          
          if (group.userData.curveLean === undefined) group.userData.curveLean = 0;
          group.userData.curveLean += (curveLeanTarget - group.userData.curveLean) * 0.1;
          
          runner3D.updateAnimation(
            time, 
            speed, 
            runner.isResting || statusRef.current === RaceStatus.IDLE, 
            group.userData.curveLean,
            runner.isFallen
          );
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight; 
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(frameId); 
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [runners.length]);

  return <div ref={mountRef} className="absolute inset-0 z-0 overflow-hidden" />;
};

export default RaceScene;
