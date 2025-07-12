// hooks/useMQTT.ts
import { useEffect, useRef, useState } from "react";
import { MQTT_CONFIG } from "@/lib/constants";
import { useAppStore } from "@/lib/store";

export function useMQTT() {
  const [isConnected, setIsConnected] = useState(false);
  const [mqttClient, setMqttClient] = useState<any>(null);
  const lampState = useRef(new Map<number, boolean>());
  const initRef = useRef(false);

  const { currentMesh } = useAppStore();

  useEffect(() => {
    // Prevent multiple initializations
    if (initRef.current) return;
    initRef.current = true;

    let client: any = null;

    const initMQTT = async () => {
      try {
        console.log("🔗 Initializing MQTT connection...");

        // Dynamic import for MQTT (client-side only)
        const mqtt = await import("mqtt");

        // Use default export for mqtt
        const mqttConnect = mqtt.default?.connect || mqtt.connect;

        if (!mqttConnect) {
          console.warn("⚠️ MQTT connect function not found, using mock client");
          // Create mock client for development
          const mockClient = {
            on: (event: string, callback: Function) => {
              if (event === "connect") {
                setTimeout(() => callback(), 100);
              }
            },
            subscribe: (topic: string, callback?: Function) => {
              console.log(`📡 Mock subscribe to: ${topic}`);
              callback?.(null);
            },
            publish: (topic: string, message: string, options?: any) => {
              console.log(`📤 Mock publish to ${topic}:`, message);
            },
            end: () => console.log("🔚 Mock MQTT client ended"),
          };
          setMqttClient(mockClient);
          setIsConnected(true);
          return;
        }

        client = mqttConnect(MQTT_CONFIG.URL, {
          clientId: `web_${Math.random().toString(16).slice(2)}`,
          keepalive: 60,
          clean: true,
        });

        client.on("connect", () => {
          console.log("✅ MQTT connected");
          setIsConnected(true);

          // Subscribe to lamp topic
          client.subscribe(MQTT_CONFIG.TOPICS.LAMP, (err: any) => {
            if (err) {
              console.error("MQTT subscription error:", err);
            } else {
              console.log(`📡 Subscribed to ${MQTT_CONFIG.TOPICS.LAMP}`);
            }
          });
        });

        client.on("error", (err: any) => {
          console.error("🔴 MQTT error:", err);
          setIsConnected(false);
        });

        client.on("disconnect", () => {
          console.log("🔌 MQTT disconnected");
          setIsConnected(false);
        });

        client.on("message", (topic: string, message: Buffer) => {
          handleMQTTMessage(topic, message);
        });

        setMqttClient(client);
      } catch (error) {
        console.error("❌ Failed to initialize MQTT:", error);
        // Create mock client as fallback
        const mockClient = {
          on: () => {},
          subscribe: () => {},
          publish: () => {},
          end: () => {},
        };
        setMqttClient(mockClient);
      }
    };

    initMQTT();

    return () => {
      if (client) {
        client.end();
      }
    };
  }, []);

  const handleMQTTMessage = (topic: string, message: Buffer) => {
    if (topic !== MQTT_CONFIG.TOPICS.LAMP) return;

    try {
      const { expressID, status } = JSON.parse(message.toString());

      console.log("📨 MQTT Message:", { expressID, status });

      // Update lamp state
      lampState.current.set(expressID, status);

      // For now, just log the message since IFC loader is disabled
      // Later: implement visual updates when IFC loader is available
    } catch (error) {
      console.error("❌ Error processing MQTT message:", error);
    }
  };

  const publishLampState = (expressID: number, status: boolean) => {
    if (!mqttClient || !isConnected) {
      console.warn("⚠️ MQTT not connected, cannot publish");
      return;
    }

    const message = {
      expressID,
      status,
    };

    mqttClient.publish(MQTT_CONFIG.TOPICS.LAMP, JSON.stringify(message), {
      qos: 0,
      retain: false,
    });

    // Update local state
    lampState.current.set(expressID, status);
    console.log("📤 Published lamp state:", message);
  };

  const toggleLampState = (expressID: number) => {
    const currentState = lampState.current.get(expressID) || false;
    const newState = !currentState;
    publishLampState(expressID, newState);
    return newState;
  };

  return {
    mqttClient,
    isConnected,
    publishLampState,
    toggleLampState,
    getLampState: (expressID: number) =>
      lampState.current.get(expressID) || false,
  };
}
