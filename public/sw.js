self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const body = typeof data.body === "string" ? data.body : "Você tem uma novidade no GODINNER.";
  const path = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";
  event.waitUntil(self.registration.showNotification("GODINNER", { body, data: { path }, tag: `godinner-${path}`, renotify: false }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = typeof event.notification.data?.path === "string" && event.notification.data.path.startsWith("/") ? event.notification.data.path : "/";
  const destination = new URL(path, self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    return existing ? existing.navigate(destination).then((client) => client?.focus()) : clients.openWindow(destination);
  }));
});
