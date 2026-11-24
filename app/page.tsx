import { uploadsOpen } from "@/lib/upload-access";
import Closed from "./closed";
import Uploader from "./uploader";

// The upload UI posts with no credentials, so it only works where uploads are open — which is
// `next dev` and nowhere else (see lib/upload-access.ts). Every deployment gets the closed notice.
export default function Home() {
  return uploadsOpen() ? <Uploader /> : <Closed />;
}
