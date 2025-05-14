"use client";
import { useEffect, useState } from "react";
import ROSLIB from "roslib";

export default function Home() {
  /* ---------- state ---------- */
  const [gps, setGps]   = useState({ lat: 0, lon: 0, alt: 0 });
  const [hdg, setHdg]   = useState("0");
  const [wp,  setWp]    = useState({ lat: "", lon: "", alt: "0" });

  /* ---------- ROS connection ---------- */
  useEffect(() => {
    const ros = new ROSLIB.Ros({
      url: process.env.NEXT_PUBLIC_ROSBRIDGE!,
    });

    /* ─ telemetry topics ─ */
    const navsat = new ROSLIB.Topic({
      ros,
      name: "/mavros/global_position/raw/fix",
      messageType: "sensor_msgs/NavSatFix",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navsat.subscribe((m: any) =>
      setGps({ lat: m.latitude, lon: m.longitude, alt: m.altitude })
    );

    const imu = new ROSLIB.Topic({
      ros,
      name: "/mavros/imu/data",
      messageType: "sensor_msgs/Imu",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    imu.subscribe((m: any) => {
      const { x, y, z, w } = m.orientation;
      const yaw = Math.atan2(
        2 * (w * z + x * y),
        1 - 2 * (y * y + z * z)
      );
      setHdg((yaw * 180 / Math.PI).toFixed(1));
    });

    /* ─ service and command handles ─ */
    const armSrv   = new ROSLIB.Service({
      ros,
      name: "/mavros/cmd/arming",
      serviceType: "mavros_msgs/srv/CommandBool",
    });
    const modeSrv  = new ROSLIB.Service({
      ros,
      name: "/mavros/set_mode",
      serviceType: "mavros_msgs/srv/SetMode",
    });
    const wpTopic  = new ROSLIB.Topic({
      ros,
      name: "/mavros/setpoint_position/global",
      messageType: "geometry_msgs/PoseStamped",
    });

    /* helper fns exposed on window for debug (optional) */
    (window as any).ros = ros;

    /* ---------- cleanup ---------- */
    return () => {
      navsat.unsubscribe();
      imu.unsubscribe();
      ros.close();
    };
  }, []);

  /* ---------- command callbacks ---------- */
  const arm    = (armed: boolean) =>
    new ROSLIB.Service({
      ros: (window as any).ros,
      name: "/mavros/cmd/arming",
      serviceType: "mavros_msgs/srv/CommandBool",
    }).callService({ value: armed });

  const setMode = (mode: string) =>
    new ROSLIB.Service({
      ros: (window as any).ros,
      name: "/mavros/set_mode",
      serviceType: "mavros_msgs/srv/SetMode",
    }).callService({ base_mode: 0, custom_mode: mode });

  const sendWaypoint = () => {
    const msg = new ROSLIB.Message({
      header: { frame_id: "map" },
      pose: {
        position: {
          latitude:  parseFloat(wp.lat),
          longitude: parseFloat(wp.lon),
          altitude:  parseFloat(wp.alt),
        },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    });
    new ROSLIB.Topic({
      ros: (window as any).ros,
      name: "/mavros/setpoint_position/global",
      messageType: "geometry_msgs/PoseStamped",
    }).publish(msg);
  };

  /* ---------- UI ---------- */
  return (
    <main className="p-6 font-mono space-y-6">
      <h1 className="text-xl">Drone Telemetry</h1>
      <div>Lat&nbsp;{gps.lat.toFixed(6)}</div>
      <div>Lon&nbsp;{gps.lon.toFixed(6)}</div>
      <div>Alt&nbsp;{gps.alt.toFixed(1)}&nbsp;m</div>
      <div>Heading&nbsp;{hdg}°</div>

      {/* controls */}
      <div className="space-x-2">
        <button className="px-3 py-1 bg-green-600 text-white rounded"
                onClick={() => { arm(true);  setMode("AUTO"); }}>
          START&nbsp;(AUTO)
        </button>
        <button className="px-3 py-1 bg-yellow-500 text-white rounded"
                onClick={() => setMode("HOLD")}>
          PAUSE&nbsp;(HOLD)
        </button>
        <button className="px-3 py-1 bg-red-600 text-white rounded"
                onClick={() => { setMode("STABILIZE"); arm(false); }}>
          STOP&nbsp;(DISARM)
        </button>
      </div>

      {/* waypoint sender */}
      <div className="space-x-1">
        <input className="border px-1 w-28"
               placeholder="lat"
               value={wp.lat}
               onChange={e => setWp({ ...wp, lat: e.target.value })} />
        <input className="border px-1 w-28"
               placeholder="lon"
               value={wp.lon}
               onChange={e => setWp({ ...wp, lon: e.target.value })} />
        <input className="border px-1 w-20"
               placeholder="alt"
               value={wp.alt}
               onChange={e => setWp({ ...wp, alt: e.target.value })} />
        <button className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={sendWaypoint}>
          SEND&nbsp;WAYPOINT
        </button>
      </div>
    </main>
  );
}



