export const manifests = [
  {
    name: "records",
    remoteEntry: "http://127.0.0.1:3001/remoteEntry.js",
    routeBase: "/task-summary",
    mountModule: "records/mount",
    capabilities: ["tasks.summary.read"],
    eventSubscriptions: ["TaskStatsUpdated"],
  },
  {
    name: "tools",
    remoteEntry: "http://127.0.0.1:3002/remoteEntry.js",
    routeBase: "/task-creator",
    mountModule: "tools/mount",
    capabilities: ["tasks.create"],
    eventSubscriptions: [],
  },
];
