import type { MetadataRoute } from "next";
import { pwaManifest } from "@/lib/pwa-manifest";

export default function manifest(): MetadataRoute.Manifest {
  return pwaManifest;
}
