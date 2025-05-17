"use client";

import { useEffect, useRef, useState } from "react";
import ROSLIB from "roslib";
import LiveMap from "./components/LiveMap";

/* ---- minimal message typings ---- */
interface NavSatFixMsg extends ROSLIB.Message {
  latitude: number;
  longitude: number;
  altitude: number;
}

interface ImuMsg extends ROSLIB.Message {
  orientation: { x: number; y: number; z: number; w: number };
}

interface CommandBoolRequest extends ROSLIB.Message {
  value: boolean;
}

interface SetModeRequest extends ROSLIB.Message {
  base_mode: number;
  custom_mode: string;
}

export default function Home() {
  /* live data */
  const [gps, setGps] = useState({ lat: 0, lon: 0, alt: 0 });
  const [hdg, setHdg] = useState("0");

  /* persistent ROS handles */
  const ros      = useRef<ROSLIB.Ros | null>(null);
  const armSrv   = useRef<ROSLIB.Service | null>(null);
  const modeSrv  = useRef<ROSLIB.Service | null>(null);
  const wpTopic  = useRef<ROSLIB.Topic | null>(null);

  /* ---------- one-time setup ---------- */
  useEffect(() => {
    /* 1 . connect */
    ros.current = new ROSLIB.Ros({ url: process.env.NEXT_PUBLIC_ROSBRIDGE! });

    /* 2 . service / topic handles */
    armSrv.current = new ROSLIB.Service({
      ros: ros.current,
      name: "/mavros/cmd/arming",
      serviceType: "mavros_msgs/srv/CommandBool",
    });
    modeSrv.current = new ROSLIB.Service({
      ros: ros.current,
      name: "/mavros/set_mode",
      serviceType: "mavros_msgs/srv/SetMode",
    });
    wpTopic.current = new ROSLIB.Topic({
      ros: ros.current,
      name: "/mavros/setpoint_position/global",
      messageType: "geometry_msgs/PoseStamped",
    });

    /* 3 . telemetry subscriptions */
    const navsat = new ROSLIB.Topic({
      ros: ros.current,
      name: "/mavros/global_position/raw/fix",
      messageType: "sensor_msgs/NavSatFix",
    });
    navsat.subscribe((m: ROSLIB.Message) => {
      const msg = m as NavSatFixMsg;
      setGps({ lat: msg.latitude, lon: msg.longitude, alt: msg.altitude });
    });

    const imu = new ROSLIB.Topic({
      ros: ros.current,
      name: "/mavros/imu/data",
      messageType: "sensor_msgs/Imu",
    });
    imu.subscribe((m: ROSLIB.Message) => {
      const msg = m as ImuMsg;
      const { x, y, z, w } = msg.orientation;
      const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
      setHdg((yaw * 180 / Math.PI).toFixed(1));
    });

    return () => {
      navsat.unsubscribe();
      imu.unsubscribe();
      ros.current?.close();
    };
  }, []);

  /* ---------- helpers ---------- */
  const arm = (v: boolean) => {
    console.log(`Attempting to ${v ? 'arm' : 'disarm'} the drone...`);
    armSrv.current?.callService(
      { value: v } as CommandBoolRequest,
      () => console.log(`Successfully ${v ? 'armed' : 'disarmed'} the drone`),
      (error: string) => console.error(`Failed to ${v ? 'arm' : 'disarm'} the drone:`, error)
    );
  };
  
  const setMode = (m: string) => {
    console.log(`Attempting to set flight mode to: ${m}`);
    modeSrv.current?.callService(
      { base_mode: 0, custom_mode: m } as SetModeRequest,
      () => console.log(`Successfully set flight mode to: ${m}`),
      (error: string) => console.error(`Failed to set flight mode to ${m}:`, error)
    );
  };

  const sendWp = (lat: number, lon: number, alt: number) => {
    console.log(`Sending waypoint: lat=${lat}, lon=${lon}, alt=${alt}`);
    wpTopic.current?.publish(
      new ROSLIB.Message({
        header: { frame_id: "map" },
        pose: {
          position: { latitude: lat, longitude: lon, altitude: alt },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
      })
    );
    console.log('Waypoint published');
  };

  /* waypoint form state */
  const [wpLat, setWpLat] = useState("");
  const [wpLon, setWpLon] = useState("");
  const [wpAlt, setWpAlt] = useState("0");

  /* ---------- UI ---------- */
  return (
    <main className="p-6 font-mono space-y-6">
      <div className="mb-6">
        <LiveMap lat={gps.lat} lon={gps.lon} hdg={parseFloat(hdg)} />
      </div>
      <h1 className="text-xl">Drone Telemetry</h1>
      <div>Lat&nbsp;{gps.lat.toFixed(6)}</div>
      <div>Lon&nbsp;{gps.lon.toFixed(6)}</div>
      <div>Alt&nbsp;{gps.alt.toFixed(1)}&nbsp;m</div>
      <div>Heading&nbsp;{hdg}°</div>

      <div className="space-x-2">
        <button 
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          onClick={() => {
            console.log('START button clicked - Initiating AUTO mode and arming');
            arm(true);
            setMode("AUTO");
          }}>
          START&nbsp;(AUTO)
        </button>
        <button 
          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          onClick={() => {
            console.log('PAUSE button clicked - Setting HOLD mode');
            setMode("HOLD");
          }}>
          PAUSE&nbsp;(HOLD)
        </button>
        <button 
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          onClick={() => {
            console.log('STOP button clicked - Disarming and setting STABILIZE mode');
            setMode("STABILIZE");
            arm(false);
          }}>
          STOP&nbsp;(DISARM)
        </button>
      </div>

      <div className="space-x-1">
        <input className="border px-1 w-28" placeholder="lat"
               value={wpLat} onChange={e => setWpLat(e.target.value)} />
        <input className="border px-1 w-28" placeholder="lon"
               value={wpLon} onChange={e => setWpLon(e.target.value)} />
        <input className="border px-1 w-20" placeholder="alt"
               value={wpAlt} onChange={e => setWpAlt(e.target.value)} />
        <button 
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          onClick={() => {
            const lat = parseFloat(wpLat);
            const lon = parseFloat(wpLon);
            const alt = parseFloat(wpAlt);
            if (isNaN(lat) || isNaN(lon) || isNaN(alt)) {
              console.error('Invalid waypoint coordinates:', { lat, lon, alt });
              return;
            }
            sendWp(lat, lon, alt);
          }}>
          SEND&nbsp;WAYPOINT
        </button>
      </div>
    </main>
  );
}





