import { useEffect, useRef, useState } from "hono/jsx";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  VRM,
  VRMLoaderPlugin,
  VRMHumanBoneName,
  VRMHumanBoneList,
} from "@pixiv/three-vrm";
import { VCCPClient, Action, SchedulerAction } from "vccp-client";

export default function CharacterRoom() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState("Disconnected");

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff));
    scene.add(new THREE.GridHelper(10, 10));

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    let vrm: VRM;
    loader.load("/AliciaSolid.vrm", (gltf) => {
      vrm = gltf.userData.vrm;
      scene.add(vrm.scene);
    });

    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      if (vrm) vrm.update(delta);
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    const client = new VCCPClient(
      { url: "ws://localhost:3000/ws" },
      {
        onOpen: () => setStatus("Connected"),
        onMessage: (data) => {
          console.log(data);
        },
        onExecute: (data) => {
          if (data.type === "play") {
            handleAction(data.action, data.properties);
          } else if (data.type === "scheduler") {
            handleScheduler(data.actions);
          }
        },
        onError: (error) => {
          console.error(error);
          setStatus("Error");
        },
      }
    );

    const connectVCCP = async () => {
      try {
        await client.connect();
        const actions: Action[] = [
          {
            title: "poseJoint",
            description: "特定の関節（ボーン）を回転させる",
            type: "object",
            properties: {
              joint: {
                type: "string",
                enum: VRMHumanBoneList,
              },
              x: { type: "number" },
              y: { type: "number" },
              z: { type: "number" },
            },
            required: ["joint", "x", "y", "z"],
          },
        ];
        const res = await client.register(actions);
        await fetch("http://localhost:3002/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: res.result.sessionId }),
        });
        setSessionId(res.result.sessionId);
      } catch (error) {
        console.error("VCCP connection failed:", error);
        setStatus("Error");
      }
    };
    connectVCCP();

    const handleAction = (action: string, properties: any) => {
      if (!vrm) return;
      if (action === "poseJoint") {
        poseJoint(properties.joint, properties.x, properties.y, properties.z);
      }
    };

    const poseJoint = (joint: string, x: number, y: number, z: number) => {
      const bone = vrm.humanoid.getNormalizedBoneNode(
        joint as VRMHumanBoneName
      );
      if (bone) {
        console.log(bone);
        bone.rotation.set(x, y, z);
      } else {
        console.warn("Bone not found:", joint);
      }
    };

    const handleScheduler = (actions: SchedulerAction[]) => {
      if (!vrm) return;
      actions.forEach((scheduledAction) => {
        const delay = scheduledAction.time;

        console.log("registered action", scheduledAction.action);
        if (delay >= 0) {
          setTimeout(() => {
            handleAction(scheduledAction.action, scheduledAction.properties);
            console.log("executed action", scheduledAction.action);
          }, delay * 1000);
        }
      });
    };
  }, []);

  return (
    <div>
      <div ref={mountRef} />
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          color: "white",
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: "10px",
          borderRadius: "5px",
        }}
      >
        <p>Status: {status}</p>
        <p>Session ID: {sessionId || "N/A"}</p>
      </div>
    </div>
  );
}
