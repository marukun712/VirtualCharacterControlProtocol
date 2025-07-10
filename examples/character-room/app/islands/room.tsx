import { useEffect, useRef, useState } from "hono/jsx";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin, VRMHumanBoneName } from "@pixiv/three-vrm";
import { VCCPClient, Action } from "../../../../packages/vccp-client";

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

    const light = new THREE.AmbientLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    let vrm: VRM;
    let mixer: THREE.AnimationMixer | null = null;
    const clock = new THREE.Clock();

    const targetPosition = new THREE.Vector3();
    let isMoving = false;
    let lookAtTarget: THREE.Object3D | THREE.Vector3 = camera;

    // 人間らしい動きのための追加変数
    let lastBlinkTime = 0;
    let nextBlinkInterval = 3000;
    let currentExpression = "neutral";
    let targetExpression = "neutral";
    let expressionTransition = 0;

    loader.load("/AliciaSolid.vrm", (gltf: GLTF) => {
      vrm = gltf.userData.vrm;
      scene.add(vrm.scene);
      vrm.scene.position.set(0, 0, 0);

      mixer = new THREE.AnimationMixer(vrm.scene);
      if (vrm.lookAt) {
        vrm.lookAt.target = camera;
      }
    });

    const animate = () => {
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      if (vrm) {
        // ランダムな瞬き
        if (elapsedTime - lastBlinkTime > nextBlinkInterval / 1000) {
          if (vrm.expressionManager) {
            vrm.expressionManager.setValue("blink", 1.0);
            setTimeout(() => {
              if (vrm.expressionManager) {
                vrm.expressionManager.setValue("blink", 0.0);
              }
            }, 200);
          }
          lastBlinkTime = elapsedTime;
          nextBlinkInterval = 2000 + Math.random() * 4000;
        }

        // 呼吸アニメーション
        const breathAmount = Math.sin(elapsedTime * 2) * 0.003;
        const chest = vrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.Chest
        );
        if (chest) {
          chest.rotation.x = breathAmount;
        }

        if (isMoving) {
          const distance = vrm.scene.position.distanceTo(targetPosition);
          if (distance < 0.05) {
            isMoving = false;
          } else {
            const direction = targetPosition
              .clone()
              .sub(vrm.scene.position)
              .normalize();
            vrm.scene.position.add(direction.multiplyScalar(2.0 * delta));

            // 滑らかな回転
            const targetRotation = Math.atan2(direction.x, direction.z);
            const currentRotation = vrm.scene.rotation.y;
            let diff = targetRotation - currentRotation;
            if (diff > Math.PI) diff -= Math.PI * 2;
            if (diff < -Math.PI) diff += Math.PI * 2;
            vrm.scene.rotation.y += diff * 0.1;
          }
        } else {
          // アイドル時の微細な動き
          const t = clock.getElapsedTime();
          const head = vrm.humanoid.getNormalizedBoneNode(
            VRMHumanBoneName.Head
          );
          if (head) {
            head.rotation.x = Math.sin(t * 0.7) * 0.02;
            head.rotation.y = Math.sin(t * 0.5) * 0.05;
          }

          if (vrm.lookAt) {
            if (lookAtTarget instanceof THREE.Object3D) {
              vrm.lookAt.target = lookAtTarget;
            } else if (
              lookAtTarget instanceof THREE.Vector3 &&
              vrm.lookAt.target
            ) {
              vrm.lookAt.target.position.lerp(lookAtTarget, 0.1);
            }
          }
        }

        // 表情の滑らかな遷移
        if (vrm.expressionManager && currentExpression !== targetExpression) {
          expressionTransition = Math.min(expressionTransition + delta * 2, 1);

          if (currentExpression !== "neutral") {
            vrm.expressionManager.setValue(
              currentExpression,
              1 - expressionTransition
            );
          }
          if (targetExpression !== "neutral") {
            vrm.expressionManager.setValue(
              targetExpression,
              expressionTransition
            );
          }

          if (expressionTransition >= 1) {
            currentExpression = targetExpression;
            expressionTransition = 0;
          }
        }

        vrm.update(delta);
      }
      controls.update();
      if (mixer) mixer.update(delta);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    const client = new VCCPClient(
      { url: `ws://localhost:3000/ws` },
      {
        onOpen: () => {
          setStatus("Connected");
        },
        onMessage: (data: Record<string, any>) => {
          if (data.type === "play") {
            handleAction(data.action, data.properties);
          } else if (data.type === "scheduler") {
            handleScheduler(data.actions);
          }
        },
        onError: (error: string) => {
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
            title: "move",
            description: "キャラクターを指定した座標に歩いて移動させる",
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              z: { type: "number" },
            },
          },
          {
            title: "speak",
            description: "キャラクターに言葉を話させる（口パク）",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          {
            title: "changeExpression",
            description: "キャラクターの表情を変化させる",
            type: "object",
            properties: {
              expression: {
                type: "string",
                enum: ["happy", "sad", "surprised", "relaxed", "neutral"],
              },
            },
          },
          {
            title: "emote",
            description: "キャラクターにジェスチャーをさせる",
            type: "object",
            properties: {
              type: { type: "string", enum: ["wave", "nod", "shakeHead"] },
            },
          },
          {
            title: "lookAt",
            description: "キャラクターの視線を指定した場所に向ける",
            type: "object",
            properties: {
              target: { type: "string", enum: ["camera", "front"] },
              x: { type: "number" },
              y: { type: "number" },
              z: { type: "number" },
            },
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
      if (!vrm || !mixer) return;

      switch (action) {
        case "move":
          targetPosition.set(properties.x, properties.y, properties.z);
          isMoving = true;
          break;
        case "speak":
          speak(properties.message);
          break;
        case "changeExpression":
          setExpression(properties.expression);
          break;
        case "emote":
          performEmote(properties.type);
          break;
        case "lookAt":
          if (properties.target === "camera") {
            lookAtTarget = camera;
          } else {
            lookAtTarget = new THREE.Vector3(
              properties.x,
              properties.y,
              properties.z
            );
          }
          break;
      }
    };

    const setExpression = (expression: string) => {
      if (!vrm.expressionManager) return;

      targetExpression = expression;
      expressionTransition = 0;

      if (expression !== "neutral") {
        setTimeout(() => {
          targetExpression = "neutral";
          expressionTransition = 0;
        }, 5000);
      }
    };

    const performEmote = (type: string) => {
      if (!vrm.humanoid) return;
      if (type === "wave") {
        const arm = vrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.RightUpperArm
        );
        if (!arm) return;
        const startRotation = arm.rotation.clone();
        const waveStartTime = clock.getElapsedTime();
        const waveDuration = 2.0;
        function waveUpdate() {
          if (!arm) return;
          const t = (clock.getElapsedTime() - waveStartTime) / waveDuration;
          if (t < 1.0) {
            arm.rotation.z = Math.sin(t * Math.PI * 4) * 0.8;
            requestAnimationFrame(waveUpdate);
          } else {
            arm.rotation.copy(startRotation);
          }
        }
        waveUpdate();
      } else if (type === "nod") {
        const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
        if (!head) return;
        const startRotation = head.rotation.clone();
        const nodStartTime = clock.getElapsedTime();
        const nodDuration = 0.5;
        function nodUpdate() {
          if (!head) return;
          const t = (clock.getElapsedTime() - nodStartTime) / nodDuration;
          if (t < 1.0) {
            head.rotation.x = Math.sin(t * Math.PI * 2) * 0.2;
            requestAnimationFrame(nodUpdate);
          } else {
            head.rotation.copy(startRotation);
          }
        }
        nodUpdate();
      }
    };

    const speak = (message: string) => {
      if (!vrm || !mixer) return;
      const lipSyncPresets = ["aa", "ih", "ou", "ee", "oh"];
      let isSpeaking = true;
      const speakDuration = 150;
      let speakTimeout: NodeJS.Timeout;

      const playNextVowel = () => {
        if (!isSpeaking || !vrm.expressionManager) return;
        const presetName =
          lipSyncPresets[Math.floor(Math.random() * lipSyncPresets.length)];

        // 滑らかな口パク
        vrm.expressionManager.setValue(presetName, 0.8);
        setTimeout(() => {
          if (vrm.expressionManager) {
            vrm.expressionManager.setValue(presetName, 0);
          }
        }, 100);

        speakTimeout = setTimeout(playNextVowel, speakDuration);
      };
      playNextVowel();
      setTimeout(() => {
        isSpeaking = false;
        clearTimeout(speakTimeout);
      }, message.length * 100);
    };

    const handleScheduler = (actions: any[]) => {
      if (!vrm) return;
      const startTime = clock.getElapsedTime();
      actions.forEach((scheduledAction) => {
        const delay = scheduledAction.time - startTime;
        if (delay >= 0) {
          setTimeout(() => {
            handleAction(scheduledAction.action, scheduledAction.properties);
          }, delay * 1000);
        }
      });
    };

    return () => {
      mountRef.current?.removeChild(renderer.domElement);
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
