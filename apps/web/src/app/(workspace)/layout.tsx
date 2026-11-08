import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { WorkspaceChrome } from "@/components/workspace/chrome";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <WorkspaceChrome>{children}</WorkspaceChrome>
    </Providers>
  );
}
