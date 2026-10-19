import type { MetadataRoute } from "next";
import { PATHS } from "@/lib/routes";

/**
 * Web app manifest. Makes HiFiGoods installable to a phone home screen, which
 * matters here: this is a field app used by operators who open it far more
 * often on a phone than a desktop.
 *
 * `display: standalone` drops the browser chrome so it behaves like a native
 * app; `start_url` goes straight to the dashboard rather than the marketing
 * page, since anyone who installed it is already a user.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HiFiGoods — Goods Transport Management",
    short_name: "HiFiGoods",
    description:
      "Track vehicles, routes, expenses, and profit for your goods transport operation.",
    start_url: PATHS.dashboard,
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#102C3E",
    theme_color: "#102C3E",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Home-screen long-press shortcuts, sourced from the route registry.
    shortcuts: [
      { name: "Routes", url: PATHS.routes },
      { name: "Parties", url: PATHS.parties },
      { name: "Reports", url: PATHS.reports },
    ],
  };
}
