import { ImageResponse } from "next/og";

export const alt = "GODINNER — Descubra restaurantes com quem você confia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", background: "#fafaf9", padding: 80, color: "#1c1917" }}><div style={{ display: "flex", fontSize: 66, fontWeight: 900 }}><span style={{ color: "#f97316" }}>GO</span>DINNER</div><div style={{ marginTop: 42, fontSize: 56, fontWeight: 700, maxWidth: 1000 }}>Descubra restaurantes com quem você confia.</div><div style={{ marginTop: 42, fontSize: 26, color: "#57534e" }}>www.godinner.com.br</div></div>, size);
}
