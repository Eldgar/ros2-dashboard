"use client";
import { useEffect, useState } from "react";
import ROSLIB from "roslib";

export default function Home() {
  const [gps, setGps] = useState({ lat: 0, lon: 0, alt: 0 });
  const [hdg, setHdg] = useState("0");

  useEffect(() => {
    const ros = new ROSLIB.Ros({
      url: process.env.NEXT_PUBLIC_ROSBRIDGE!,
    });

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

    return () => {
      navsat.unsubscribe();
      imu.unsubscribe();
      ros.close();
    };
  }, []);

  return (
    <main className="p-6 font-mono">
      <h1 className="text-xl mb-4">Drone Telemetry</h1>
      <div>Lat&nbsp;{gps.lat.toFixed(6)}</div>
      <div>Lon&nbsp;{gps.lon.toFixed(6)}</div>
      <div>Alt&nbsp;{gps.alt.toFixed(1)}&nbsp;m</div>
      <div>Heading&nbsp;{hdg}°</div>
    </main>
  );
}


