import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #be185d 0%, #9d174d 100%)",
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>🎭</span>
      </div>
    ),
    { ...size }
  );
}
