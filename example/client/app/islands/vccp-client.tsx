import { useEffect, useRef } from "hono/jsx";
import * as THREE from "three";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { VCCPClient, type VCCPMessage } from "@vccp/client";

export default function VCCPClientComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    vrm: VRM | null;
    vccpClient: VCCPClient | null;
  }>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("sessionId");

    if (!sessionId) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x212121);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.6, 3);

    const orbitControls = new OrbitControls(camera, canvasRef.current);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(1, 2, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    let vrm: VRM | null = null;
    loader.load(
      "/AliciaSolid-1.0.vrm",
      (gltf) => {
        vrm = gltf.userData.vrm;
        if (vrm) {
          vrm.scene.position.set(0, 0, 0);
          scene.add(vrm.scene);
        }
      },
      (progress) => console.log("Loading progress:", progress),
      (error) => console.error("Loading error:", error)
    );

    const vccpClient = new VCCPClient(
      {
        serverUrl: "ws://localhost:3000",
        sessionId,
        autoConnect: true,
      },
      {
        onConnected: () => {
          console.log("VCCP Client connected");

          const actions = [
            {
              type: "action",
              category: "movement",
              timestamp: "2024-01-01T00:00:00Z",
              data: {
                target: {
                  x: 2.0,
                  y: 0.0,
                  z: 3.0,
                },
                speed: 1.0,
              },
            },
            {
              type: "action",
              category: "lookAt",
              timestamp: "2024-01-01T00:00:00Z",
              data: {
                target: {
                  type: "position|object",
                  value: {
                    x: 1.0,
                    y: 1.6,
                    z: 2.0,
                  },
                },
              },
            },
            {
              type: "action",
              category: "expression",
              timestamp: "2024-01-01T00:00:00Z",
              data: {
                preset: "string",
              },
            },
          ];

          vccpClient.sendCapabilityMessage(actions);

          createRoom(scene);
          createFurniture(scene, vccpClient);
        },
        onDisconnected: () => {
          console.log("VCCP Client disconnected");
        },
        onMessageReceived: (message: VCCPMessage) => {
          handleVCCPMessage(message, vrm);
        },
        onError: (error: Error) => {
          console.error("VCCP Client error:", error);
        },
      }
    );

    const animate = () => {
      requestAnimationFrame(animate);

      if (vrm) {
        vrm.update(1 / 60);
      }

      renderer.render(scene, camera);
      orbitControls.update();
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    sceneRef.current = { scene, camera, renderer, vrm, vccpClient };

    return () => {
      window.removeEventListener("resize", handleResize);
      if (vccpClient) {
        vccpClient.disconnect();
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div class="w-full h-screen relative">
      <canvas ref={canvasRef} class="w-full h-full" />
      <div class="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded">
        <h2 class="text-lg font-bold mb-2">VCCP Client</h2>
        <p class="text-sm">Three.js + VRM</p>
        <p class="text-sm">WebSocket: ws://localhost:3000/vccp</p>
      </div>
    </div>
  );
}

function createRoom(scene: THREE.Scene) {
  const roomSize = 6;

  const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
  const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
  const wallGeometry = new THREE.PlaneGeometry(roomSize, 3);

  const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
  frontWall.position.set(0, 1.5, -roomSize / 2);
  scene.add(frontWall);

  const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
  backWall.position.set(0, 1.5, roomSize / 2);
  backWall.rotation.y = Math.PI;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
  leftWall.position.set(-roomSize / 2, 1.5, 0);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
  rightWall.position.set(roomSize / 2, 1.5, 0);
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);

  const ceilingGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
  const ceilingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.position.y = 3;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);
}

function createFurniture(scene: THREE.Scene, vccpClient: VCCPClient) {
  const tableGeometry = new THREE.BoxGeometry(1.5, 0.1, 0.8);
  const tableMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
  const table = new THREE.Mesh(tableGeometry, tableMaterial);
  table.position.set(0, 0.75, -1);
  table.castShadow = true;
  scene.add(table);

  const legGeometry = new THREE.BoxGeometry(0.1, 0.7, 0.1);
  const legMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });

  const positions = [
    [-0.6, 0.35, -1.3],
    [0.6, 0.35, -1.3],
    [-0.6, 0.35, -0.7],
    [0.6, 0.35, -0.7],
  ];

  positions.forEach((pos) => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(pos[0], pos[1], pos[2]);
    leg.castShadow = true;
    scene.add(leg);
  });

  const chairGeometry = new THREE.BoxGeometry(0.5, 0.05, 0.5);
  const chairMaterial = new THREE.MeshLambertMaterial({ color: 0x4169e1 });
  const chair = new THREE.Mesh(chairGeometry, chairMaterial);
  chair.position.set(0, 0.5, 0.5);
  chair.castShadow = true;
  scene.add(chair);

  vccpClient.sendPerceptionMessage("object", {
    name: "chair",
    position: {
      x: chair.position.x,
      y: chair.position.y,
      z: chair.position.z,
    },
  });

  const backrestGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.05);
  const backrest = new THREE.Mesh(backrestGeometry, chairMaterial);
  backrest.position.set(0, 0.8, 0.225);
  backrest.castShadow = true;
  scene.add(backrest);

  const shelfGeometry = new THREE.BoxGeometry(0.3, 2, 1.2);
  const shelfMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
  const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
  shelf.position.set(-2.5, 1, -1);
  shelf.castShadow = true;
  scene.add(shelf);

  const lampBaseGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.1);
  const lampBaseMaterial = new THREE.MeshLambertMaterial({ color: 0x2f4f4f });
  const lampBase = new THREE.Mesh(lampBaseGeometry, lampBaseMaterial);
  lampBase.position.set(0.5, 0.85, -1);
  lampBase.castShadow = true;
  scene.add(lampBase);

  const lampPoleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6);
  const lampPole = new THREE.Mesh(lampPoleGeometry, lampBaseMaterial);
  lampPole.position.set(0.5, 1.15, -1);
  scene.add(lampPole);
}

function handleVCCPMessage(message: VCCPMessage, vrm: VRM | null) {
  console.log("Received VCCP message:", message);

  switch (message.type) {
    case "action":
      if (!vrm) return;

      switch (message.category) {
        case "movement":
          const { target } = message.data;
          if (target) {
            vrm.scene.position.set(target.x, target.y, target.z);
          }
          break;

        case "lookAt":
          const lookTarget = message.data.target?.value;
          if (lookTarget) {
            vrm.scene.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
          }
          break;

        case "expression":
          if (message.data.preset && vrm.expressionManager) {
            Object.keys(vrm.expressionManager.expressionMap).forEach((key) => {
              vrm.expressionManager?.setValue(key, 0);
            });
            vrm.expressionManager.setValue(message.data.preset, 1.0);
          }
          break;
      }
      break;

    case "system":
      console.log("System message:", message.data.content || message.data);
      break;

    case "perception":
      console.log("Perception data received:", message.category, message.data);
      break;
  }
}
