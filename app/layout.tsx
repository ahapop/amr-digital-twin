// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMR Digital Twin Platform",
  description: "Advanced Manufacturing Robot Digital Twin Platform",
};

// เพิ่มส่วนนี้แยกออกมา
export const viewport = {
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              imports: {
                three: "/three/build/three.module.js",
                "three/addons/": "/three/examples/jsm/",
                "three/examples/jsm/utils/BufferGeometryUtils":
                  "/three/examples/jsm/utils/BufferGeometryUtils.js",
                "three/src/helpers/": "/three/src/helpers/",
                "web-ifc": "/libs/web-ifc/web-ifc-api.js",
                "web-ifc-three": "/libs/web-ifc-three/IFCLoader.js",
                "lil-gui": "/libs/lil-gui/lil-gui.esm.js",
                "three/addons/controls/TransformControls":
                  "/three/examples/jsm/controls/TransformControls.js",
              },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
