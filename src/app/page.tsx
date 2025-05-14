"use client";

import { useEffect, useRef, useState } from "react";
import ROSLIB from "roslib";

/* ─────────────── types for the few fields we read ─────────────── */
interface NavSatFixMsg {
  latitude: number;
  longitude: number;
  altitude: number;
}

interface ImuMsg {
  orientation: { x: number; y: number; z: number; w: number };
}

/* ───────────────────────── component ──────────────────────────── */
export default function Home() {
  /* telemetry state */
  const [gps, setGps] = useState({ lat: 0, lon: 0, alt: 0 });
  const [hdg, setHdg] = useState("0");

  /* keep ROS handles in refs (persist across renders) */
  const ros = useRef<ROSLIB.Ros>();
  const armSrv = useRef<ROSLIB.Service>();
  const modeSrv = useRef<ROSLIB.Service>();
  const wpTopic = useRef<ROSLIB.Topic>();

  /* ─────────── set up connection once ─────────── */
  useEffect((): () => void => {
    /* 1. connect */
    ros.current = new ROSLIB.Ros({
      url: process.env.NEXT_PUBLIC_ROSBRIDGE!,
    });

    /* 2. build handles */
    armSrv.current = new ROSLIB.Service({
      ros: ros.current,
      name: "/mavros/cmd/arming",
      serviceType: "mavros_msgs/srv/CommandBool",
    });

    modFailed to compile.
    ./src/app/page.tsx:24:15
    Type error: Expected 1 arguments, but got 0.
      22 |
      23 |   /* keep ROS handles in refs (persist across renders) */
    > 24 |   const ros = useRef<ROSLIB.Ros>();
         |               ^
      25 |   const armSrv = useRef<ROSLIB.Service>();
      26 |   const modeSrv = useRef<ROSLIB.Service>();
      27 |   const wpTopic = useRef<ROSLIB.Topic>();
    Next.js build worker exited with code: 1 and signal: null
    Error: Command "npm run build" exited with 1eSrv.current = new ROSLIB.Service({
      ros: ros.current,
      name: "/mavros/set_mode",
      serviceType: "mavros_msgs/srv/SetMode",
    });

    wpTopic.current = new ROSLIB.Topic({
      ros: ros.current,
      name: "/mavros/setpoint_position/global",
      messageType: "geometry_msgs/PoseStamped",
    });

    /* 3. subscribe to telemetry */
    const navsat = new ROSLIB.Topic({
      ros: ros.current,
      name: "/mavros/global_position/raw/fix",
      messageType: "sensor_msgs/NavSatFix",
    });

    navsat.subscribe((m: NavSatFixMsg) =>
      setGps({ lat: m.latitude, lon: m.longitude, alt: m.altitude })
    );

    const imu = new ROSLIB.Topic({
      ros: ros.current,
      name: "/mavros/imu/data",
      messageType: "sensor_msgs/Imu",
    });

    imu.subscribe((m: ImuMsg) => {
      const { x, y, z, w } = m.orientation;
      const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
      setHdg((yaw * 180 / Math.PI).toFixed(1));
    });

    /* 4. cleanup on unmount */
    return () => {
      navsat.unsubscribe();
      imu.unsubscribe();
      ros.current?.close();
    };
  }, []);

  /* ─────────── command helpers ─────────── */
  const arm = (value: boolean) =>
    armSrv.current?.callService({ value });

  const setMode = (mode: string) =>
    modeSrv.current?.callService({ base_mode: 0, custom_mode: mode });

  const sendWaypoint = (lat: number, lon: number, alt: number) => {
    wpTopic.current?.publish(
      new ROSLIB.Message({
        header: { frame_id: "map" },
        pose: {
          position: { latitude: lat, longitude: lon, altitude: alt },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
      })
    );
  };

  /* waypoint form state */
  const [wpLat, setWpLat] = useState("");
  const [wpLon, setWpLon] = useState("");
  const [wpAlt, setWpAlt] = useState("0");

  /* ─────────── UI ─────────── */
  return (
    <main className="p-6 font-mono space-y-6">
      <h1 className="text-xl">Drone Telemetry</h1>
      <div>Lat&nbsp;{gps.lat.toFixed(6)}</div>
      <div>Lon&nbsp;{gps.lon.toFixed(6)}</div>
      <div>Alt&nbsp;{gps.alt.toFixed(1)}&nbsp;m</div>
      <div>Heading&nbsp;{hdg}°</div>

      {/* basic controls */}
      <div className="space-x-2">
        <button
          className="px-3 py-1 bg-green-600 text-white rounded"
          onClick={() => {
            arm(true);
            setMode("AUTO");
          }}
        >
          START&nbsp;(AUTO)
        </button>
        <button
          className="px-3 py-1 bg-yellow-500 text-white rounded"
          onClick={() => setMode("HOLD")}
        >
          PAUSE&nbsp;(HOLD)
        </button>
        <button
          className="px-3 py-1 bg-red-600 text-white rounded"
          onClick={() => {
            setMode("STABILIZE");
            arm(false);
          }}
        >
          STOP&nbsp;(DISARM)
        </button>
      </div>

      {/* waypoint sender */}
      <div className="space-x-1">
        <input
          className="border px-1 w-28"
          placeholder="lat"
          value={wpLat}
          onChange={(e) => setWpLat(e.target.value)}
        />
        <input
          className="border px-1 w-28"
          placeholder="lon"
          value={wpLon}
          onChange={(e) => setWpLon(e.target.value)}
        />
        <input
          className="border px-1 w-20"
          placeholder="alt"
          value={wpAlt}
          onChange={(e) => setWpAlt(e.target.value)}
        />
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded"
          onClick={() =>
            sendWaypoint(parseFloat(wpLat), parseFloat(wpLon), parseFloat(wpAlt))
          }
        >
          SEND&nbsp;WAYPOINT
        </button>
      </div>
    </main>
  );
}




