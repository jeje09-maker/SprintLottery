
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Runner, RaceStatus } from '../types';
import { createRunnerFrames } from './RunnerSprite';

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
    tx = -Math.sin(theta); tz = Math.sin(theta);
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
      sprite: THREE.Sprite;
      textures: { side: THREE.Texture[], back: THREE.Texture[], front: THREE.Texture[], resting: THREE.Texture[] };
    }>;
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Clear previous renderer if any
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
    const textureLoader = new THREE.TextureLoader();
    runnersRef.current.forEach((runner) => {
      const group = new THREE.Group();
      const rawSets = createRunnerFrames(runner.color, runner.id);
      const textures = {
        side: rawSets.side.map(f => textureLoader.load(f)),
        back: rawSets.back.map(f => textureLoader.load(f)),
        front: rawSets.front.map(f => textureLoader.load(f)),
        resting: rawSets.resting.map(f => textureLoader.load(f))
      };
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.side[1], transparent: true }));
      sprite.scale.set(13, 13, 1);
      sprite.position.y = 7.2; // 발 위치 상향 조정 (지면 위에 올라오도록)
      group.add(sprite);
      scene.add(group);
      runnerGroups.set(runner.id, { group, sprite, textures });
    });

    sceneRef.current = { scene, camera, renderer, runnerGroups };

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!sceneRef.current) return;
      const { camera, renderer, runnerGroups } = sceneRef.current;
      const now = Date.now();

      if (statusRef.current === RaceStatus.RACING || statusRef.current === RaceStatus.FINISHED) {
        const sorted = [...runnersRef.current].sort((a, b) => b.progress - a.progress);
        const leader = sorted[0];
        if (!leader) return;

        const lastToRest = sorted.find(r => !r.isResting) || sorted[sorted.length - 1];
        const cameraTargetRunner = (leader.isResting ? lastToRest : leader) || leader;

        // 카메라 모드 (90% 이상일 때 결승선 고정 뷰)
        const isFinishCameraActive = cameraTargetRunner.progress >= 0.90 && !cameraTargetRunner.isResting;

        runnersRef.current.forEach(runner => {
          const rData = runnerGroups.get(runner.id);
          if (rData) {
            const { group, sprite, textures } = rData;
            const pathInfo = getPathData(runner.progress, runner.lane, runner.laneOffset);
            group.position.lerp(pathInfo.position, 0.25);
            
            if (runner.isResting) {
              sprite.material.map = textures.resting[0];
              sprite.position.y = 5.8; // 서 있을 때 발 위치 최적화
            } else {
              const frameIdx = Math.floor((now * 0.03 + runner.bobOffset * 10) % (textures.side.length - 1)) + 1;
              
              if (runner.progress < 0.03) {
                sprite.material.map = textures.side[frameIdx];
              } 
              else if (runner.progress >= 0.90) {
                // 코너 막 돌았을 때(90%) 옆모습으로 질주
                sprite.material.map = textures.side[frameIdx];
              }
              else if (isFinishCameraActive && runner.progress >= 0.80) {
                sprite.material.map = textures.front[frameIdx];
              }
              else {
                sprite.material.map = textures.back[frameIdx];
              }
              
              sprite.position.y = 7.2; // 달리는 도중 발 높이 상향 고정
            }
          }
        });

        if (cameraTargetRunner) {
          const lm = runnerGroups.get(cameraTargetRunner.id)!.group;
          const targetPos = new THREE.Vector3();
          const targetLookAt = new THREE.Vector3();
          const pInfo = getPathData(cameraTargetRunner.progress, cameraTargetRunner.lane, cameraTargetRunner.laneOffset);
          
          if (cameraTargetRunner.progress < 0.03) {
            targetPos.set(lm.position.x - 50, 30, lm.position.z + 100);
            targetLookAt.set(lm.position.x + 30, 15, lm.position.z - 10);
          } else if (isFinishCameraActive) {
            targetPos.set(40, 25, finishLinePos + 80); 
            targetLookAt.set(0, 10, finishLinePos);
          } else {
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
      } else {
        const startZ = CURVE_RADIUS + trackWidth / 2;
        const idlePos = new THREE.Vector3(-180, 50, startZ + 150);
        const idleLook = new THREE.Vector3(-60, 10, startZ);
        camPosRef.current.lerp(idlePos, 0.02);
        lookAtRef.current.lerp(idleLook, 0.02);
        camera.position.copy(camPosRef.current);
        camera.lookAt(lookAtRef.current);
      }
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
