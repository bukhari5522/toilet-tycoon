import "./globals.css";
import { GAME_NAME } from "@/lib/game/config";

export const metadata = {
  title: `${GAME_NAME} — a sparkling-clean idle tycoon`,
  description:
    "Build India's happiest public toilets, keep them sparkling, and grow from one street corner to the airport.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
