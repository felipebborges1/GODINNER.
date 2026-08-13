import { BottomNavigation } from "./bottom-navigation";
import { DesktopHeader } from "./desktop-header";
import { ToastOutlet } from "./toast-outlet";
export function AppShell({ children }: { children: React.ReactNode }) { return <><DesktopHeader/><main className="min-h-screen pb-24 lg:pb-10">{children}</main><BottomNavigation/><ToastOutlet/></>; }
